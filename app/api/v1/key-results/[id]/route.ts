import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const keyResult = await prisma.keyResult.findUnique({
    where: { id },
    include: { owner: true, objective: { include: { quarter: true, department: true } }, confidenceScores: true, reviews: true }
  }).catch(() => null);
  if (keyResult) {
    if (!canView(user, keyResult.objective.departmentId, keyResult.ownerId)) return NextResponse.json({ error: "无权限查看 KR" }, { status: 403 });
    return NextResponse.json({ keyResult });
  }

  const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
  const fallbackKeyResult = snapshot.getKeyResult(id);
  if (!fallbackKeyResult) return NextResponse.json({ error: "KR 不存在" }, { status: 404 });
  const objective = snapshot.getObjective(fallbackKeyResult.objectiveId);
  if (!objective || !canView(user, objective.departmentId, fallbackKeyResult.ownerId)) return NextResponse.json({ error: "无权限查看 KR" }, { status: 403 });
  return NextResponse.json({
    keyResult: {
      ...fallbackKeyResult,
      owner: snapshot.getUser(fallbackKeyResult.ownerId),
      objective: {
        ...objective,
        quarter: snapshot.getQuarter(objective.quarterId),
        department: objective.departmentId ? snapshot.listDepartments().find((item) => item.id === objective.departmentId) : undefined
      },
      confidenceScores: snapshot.listConfidenceHistory(fallbackKeyResult.id),
      reviews: snapshot.getQuarterReviewSummary(objective.quarterId).filter((item) => item.keyResult.id === fallbackKeyResult.id).map((item) => item.review).filter(Boolean)
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.keyResult.findUnique({ where: { id }, include: { objective: { include: { quarter: true } } } }).catch(() => null);
  if (!existing && !prismaQueries.enabled()) {
    const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
    const fallbackKeyResult = snapshot.getKeyResult(id);
    if (!fallbackKeyResult) return NextResponse.json({ error: "KR 不存在" }, { status: 404 });
    const objective = snapshot.getObjective(fallbackKeyResult.objectiveId);
    if (!objective) return NextResponse.json({ error: "Objective 不存在" }, { status: 404 });
    const quarter = snapshot.getQuarter(objective.quarterId);
    if (!canManage(user, objective.departmentId, fallbackKeyResult.ownerId)) return NextResponse.json({ error: "无权限更新 KR" }, { status: 403 });
    if (quarter.status === "archived") return NextResponse.json({ error: "季度已归档，只读" }, { status: 400 });
    if (quarter.status !== "planning" && user.role !== "super_admin") {
      return NextResponse.json({ error: "当前季度已进入执行阶段，仅超级管理员可继续调整 OKR" }, { status: 400 });
    }
    const keyResult = repository.updateKeyResult(id, {
      description: body.description,
      startValue: body.start_value === undefined ? undefined : Number(body.start_value),
      currentValue: body.current_value === undefined ? undefined : Number(body.current_value),
      targetValue: body.target_value === undefined ? undefined : Number(body.target_value),
      unit: body.unit,
      dueDate: body.due_date
    });
    return NextResponse.json({ keyResult });
  }
  if (!existing) return NextResponse.json({ error: "KR 不存在" }, { status: 404 });
  if (!canManage(user, existing.objective.departmentId, existing.ownerId)) return NextResponse.json({ error: "无权限更新 KR" }, { status: 403 });
  if (existing.objective.quarter.status === "archived") return NextResponse.json({ error: "季度已归档，只读" }, { status: 400 });
  if (existing.objective.quarter.status !== "planning" && user.role !== "super_admin") {
    return NextResponse.json({ error: "当前季度已进入执行阶段，仅超级管理员可继续调整 OKR" }, { status: 400 });
  }
  const keyResult = await prisma.keyResult.update({
    where: { id },
    data: {
      description: body.description,
      startValue: body.start_value === undefined ? undefined : Number(body.start_value),
      targetValue: body.target_value === undefined ? undefined : Number(body.target_value),
      currentValue: body.current_value === undefined ? undefined : Number(body.current_value),
      unit: body.unit,
      dueDate: body.due_date ? new Date(`${body.due_date}T00:00:00.000Z`) : undefined
    }
  });
  return NextResponse.json({ keyResult });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.keyResult.findUnique({ where: { id }, include: { objective: { include: { quarter: true } } } }).catch(() => null);
  if (!existing && !prismaQueries.enabled()) {
    const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
    const fallbackKeyResult = snapshot.getKeyResult(id);
    if (!fallbackKeyResult) return NextResponse.json({ error: "KR 不存在" }, { status: 404 });
    const objective = snapshot.getObjective(fallbackKeyResult.objectiveId);
    if (!objective) return NextResponse.json({ error: "Objective 不存在" }, { status: 404 });
    const quarter = snapshot.getQuarter(objective.quarterId);
    if (!canManage(user, objective.departmentId, fallbackKeyResult.ownerId)) return NextResponse.json({ error: "无权限删除 KR" }, { status: 403 });
    if (quarter.status !== "planning") return NextResponse.json({ error: "只有设定期可以删除 KR" }, { status: 400 });
    repository.deleteKeyResult(id);
    return NextResponse.json({ ok: true });
  }
  if (!existing) return NextResponse.json({ error: "KR 不存在" }, { status: 404 });
  if (!canManage(user, existing.objective.departmentId, existing.ownerId)) return NextResponse.json({ error: "无权限删除 KR" }, { status: 403 });
  if (existing.objective.quarter.status !== "planning") return NextResponse.json({ error: "只有设定期可以删除 KR" }, { status: 400 });

  await prisma.keyResult.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function canView(user: { id: string; role: string; departmentId?: string }, departmentId: string | null | undefined, ownerId: string) {
  return user.role === "super_admin" || ownerId === user.id || departmentId === user.departmentId;
}

function canManage(user: { id: string; role: string; departmentId?: string }, departmentId: string | null | undefined, ownerId: string) {
  return user.role === "super_admin" || ownerId === user.id || (user.role === "dept_manager" && departmentId === user.departmentId);
}
