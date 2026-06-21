import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { assertActiveQuarterTransition, assertQuarterStatusTransition, shouldStopCalendarEventsOnQuarterStatusChange } from "@/lib/domain/rules";
import type { Quarter } from "@/lib/domain/types";
import { feishuProvider } from "@/lib/integrations/feishu";
import { prisma } from "@/lib/prisma";

const validStatuses = new Set<Quarter["status"]>(["planning", "active", "reviewing", "archived"]);

export async function PATCH(request: Request, context: { params: Promise<{ quarterId: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限执行该操作" }, { status: 403 });
  }

  try {
    const { quarterId } = await context.params;
    const body = await request.json();
    if (!validStatuses.has(body.status)) throw new Error("季度状态不合法");
    const existingQuarter = await prisma.quarter.findUnique({ where: { id: quarterId } }).catch(() => null);

    let previousStatus: Quarter["status"];
    let quarter: { status: Quarter["status"] } & Record<string, unknown>;

    if (existingQuarter) {
      previousStatus = existingQuarter.status as Quarter["status"];
      assertQuarterStatusTransition(previousStatus, body.status);
      const hasOtherActive = Boolean(await prisma.quarter.findFirst({ where: { status: "active", id: { not: quarterId } } }));
      assertActiveQuarterTransition(body.status, hasOtherActive);
      quarter = await prisma.quarter.update({
        where: { id: quarterId },
        data: { status: body.status }
      });
    } else {
      const fallbackQuarter = ((await prismaQueries.listQuarters()) ?? repository.listQuarters()).find((item) => item.id === quarterId);
      if (!fallbackQuarter) {
        return NextResponse.json({ error: "季度不存在" }, { status: 404 });
      }
      previousStatus = fallbackQuarter.status;
      assertQuarterStatusTransition(previousStatus, body.status);
      quarter = repository.updateQuarterStatus(quarterId, body.status);
    }

    let calendarStopLog = null;
    if (shouldStopCalendarEventsOnQuarterStatusChange(previousStatus, body.status)) {
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}
