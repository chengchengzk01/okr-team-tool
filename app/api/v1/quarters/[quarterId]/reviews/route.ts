import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { assertReviewRequiredFields } from "@/lib/domain/rules";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ quarterId: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { quarterId } = await params;
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  const where =
    user.role === "super_admin"
      ? { quarterId }
      : user.role === "dept_manager"
        ? { quarterId, OR: [{ departmentId: user.departmentId }, { ownerId: user.id }] }
        : { quarterId, ownerId: user.id };

  const reviews = await prisma
    .quarterReview.findMany({
      where,
      include: { owner: true, department: true, krReviews: { include: { keyResult: true } } },
      orderBy: { updatedAt: "desc" }
    })
    .catch(() => null);
  if (!reviews) return NextResponse.json({ reviews: repository.listQuarterReviews(fullUser, quarterId) });
  return NextResponse.json({ reviews });
}

export async function POST(request: Request, { params }: { params: Promise<{ quarterId: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { quarterId } = await params;
    const body = await request.json();
    const level = body.level ?? (user.role === "super_admin" ? "company" : user.role === "dept_manager" ? "department" : "individual");
    const departmentId = level === "department" ? body.department_id ?? user.departmentId : body.department_id;
    const ownerId = body.owner_id ?? user.id;
    assertReviewRequiredFields(body.what_worked, body.what_didnt);
    const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
    if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    if (!prismaQueries.enabled()) {
      const review = repository.submitQuarterReview(fullUser, {
        id: body.id,
        quarterId,
        level,
        ownerId,
        departmentId,
        whatWorked: body.what_worked,
        whatDidnt: body.what_didnt,
        healthSummary: body.health_summary,
        nextQuarterInsights: body.next_quarter_insights
      });
      return NextResponse.json({ review }, { status: 201 });
    }
    const quarter = await prisma.quarter.findUnique({ where: { id: quarterId } });
    if (!quarter) return NextResponse.json({ error: "季度不存在" }, { status: 404 });
    if (quarter.status === "archived") return NextResponse.json({ error: "季度已归档，复盘只读" }, { status: 400 });
    if (quarter.status !== "reviewing") return NextResponse.json({ error: "季度尚未进入复盘阶段" }, { status: 400 });
    const permissionError = validateReviewPermission(user, { level, departmentId, ownerId });
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 });

    const review = await prisma.quarterReview.upsert({
      where: { id: body.id ?? `qr-${quarterId}-${ownerId}-${level}` },
      update: {
        whatWorked: body.what_worked,
        whatDidnt: body.what_didnt,
        healthSummary: body.health_summary,
        nextQuarterInsights: body.next_quarter_insights,
        submittedAt: new Date()
      },
      create: {
        id: body.id ?? `qr-${quarterId}-${ownerId}-${level}`,
        quarterId,
        level,
        ownerId,
        departmentId,
        whatWorked: body.what_worked,
        whatDidnt: body.what_didnt,
        healthSummary: body.health_summary,
        nextQuarterInsights: body.next_quarter_insights,
        submittedAt: new Date()
      }
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "季度 Review 提交失败" }, { status: 400 });
  }
}

function validateReviewPermission(
  user: { id: string; role: string; departmentId?: string },
  input: { level: string; departmentId?: string; ownerId: string }
) {
  if (user.role === "super_admin") return null;
  if (user.role === "dept_manager") {
    if (input.level === "company") return "部门管理者不能提交公司级 Review";
    if (input.departmentId && input.departmentId !== user.departmentId) return "只能提交本部门 Review";
    return null;
  }
  if (input.level !== "individual") return "成员只能提交个人 Review";
  if (input.ownerId !== user.id) return "成员只能提交自己的 Review";
  return null;
}
