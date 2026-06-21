import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertActiveQuarterTransition, assertQuarterStatusTransition, assertQuarterWritable, shouldStopCalendarEventsOnQuarterStatusChange } from "@/lib/domain/rules";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { feishuProvider } from "@/lib/integrations/feishu";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ quarterId: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { quarterId } = await params;
  const quarter = await prisma
    .quarter.findUnique({
      where: { id: quarterId },
      include: { objectives: { include: { keyResults: true } }, quarterReviews: true }
    })
    .catch(() => null);
  if (quarter) return NextResponse.json({ quarter });

  const fallbackQuarter = ((await prismaQueries.listQuarters()) ?? repository.listQuarters()).find((item) => item.id === quarterId);
  if (!fallbackQuarter) return NextResponse.json({ error: "季度不存在" }, { status: 404 });
  const objectives = ((await prismaQueries.listObjectives(quarterId)) ?? repository.listObjectives(quarterId)).map((objective) => ({
    ...objective,
    keyResults: repository.listKeyResultsByObjective(objective.id)
  }));
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id)!;
  const quarterReviews = (await prismaQueries.listQuarterReviews(fullUser, quarterId)) ?? [];
  return NextResponse.json({ quarter: { ...fallbackQuarter, objectives, quarterReviews } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ quarterId: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "只有超级管理员可以更新季度" }, { status: 403 });

  try {
    const { quarterId } = await params;
    const body = await request.json();
    const existingQuarter = await prisma.quarter.findUnique({ where: { id: quarterId } });
    if (!existingQuarter) return NextResponse.json({ error: "季度不存在" }, { status: 404 });
    if (!body.status) {
      assertQuarterWritable(existingQuarter.status);
    }
    if (body.status) {
      assertQuarterStatusTransition(existingQuarter.status, body.status);
      const hasOtherActive = Boolean(await prisma.quarter.findFirst({ where: { status: "active", id: { not: quarterId } } }));
      assertActiveQuarterTransition(body.status, hasOtherActive);
    }
    const quarter = await prisma.quarter.update({
      where: { id: quarterId },
      data: {
        name: body.name,
        startDate: body.start_date ? toDbDate(body.start_date) : undefined,
        endDate: body.end_date ? toDbDate(body.end_date) : undefined,
        status: body.status
      }
    });
    let calendarStopLog = null;
    if (body.status && shouldStopCalendarEventsOnQuarterStatusChange(existingQuarter.status, body.status)) {
      try {
        calendarStopLog = await feishuProvider.stopCalendarEvents(quarterId);
        repository.createExportLog({ ...calendarStopLog, exportedBy: user.id });
      } catch (error) {
        calendarStopLog = repository.createExportLog({
          id: `failed-calendar-stop-${Date.now()}`,
          exportedBy: user.id,
          exportType: "calendar_events",
          scope: "company",
          quarterId,
          status: "failed",
          message: error instanceof Error ? error.message : "日历事件终止失败",
          exportedAt: new Date().toISOString()
        });
      }
    }
    return NextResponse.json({ quarter, calendarStopLog });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新季度失败" }, { status: 400 });
  }
}

function toDbDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
