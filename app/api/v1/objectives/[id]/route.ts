import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const objective = await prisma.objective.findUnique({ where: { id }, include: { owner: true, department: true, keyResults: true } }).catch(() => null);
  if (objective) {
    if (!canView(user, objective.departmentId, objective.ownerId)) return NextResponse.json({ error: "无权限查看 Objective" }, { status: 403 });
    return NextResponse.json({ objective });
  }

  const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
  const fallbackObjective = snapshot.getObjective(id);
  if (!fallbackObjective) return NextResponse.json({ error: "Objective 不存在" }, { status: 404 });
  if (!canView(user, fallbackObjective.departmentId, fallbackObjective.ownerId)) return NextResponse.json({ error: "无权限查看 Objective" }, { status: 403 });
  return NextResponse.json({
    objective: {
      ...fallbackObjective,
      owner: snapshot.getUser(fallbackObjective.ownerId),
      department: fallbackObjective.departmentId ? snapshot.listDepartments().find((item) => item.id === fallbackObjective.departmentId) : undefined,
      keyResults: snapshot.listKeyResultsByObjective(fallbackObjective.id)
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.objective.findUnique({ where: { id }, include: { quarter: true } }).catch(() => null);
  if (!existing && !prismaQueries.enabled()) {
    const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
    const fallbackObjective = snapshot.getObjective(id);
    if (!fallbackObjective) return NextResponse.json({ error: "Objective 不存在" }, { status: 404 });
    const quarter = snapshot.getQuarter(fallbackObjective.quarterId);
    if (!canEdit(user, fallbackObjective.ownerId, fallbackObjective.departmentId)) return NextResponse.json({ error: "无权限更新 Objective" }, { status: 403 });
    if (quarter.status === "archived") return NextResponse.json({ error: "季度已归档，只读" }, { status: 400 });
    if (quarter.status !== "planning" && user.role !== "super_admin") {
      return NextResponse.json({ error: "当前季度已进入执行阶段，仅超级管理员可继续调整 OKR" }, { status: 400 });
    }
    const objective = repository.updateObjective(id, { title: String(body.title ?? "") });
    return NextResponse.json({ objective });
  }
  if (!existing) return NextResponse.json({ error: "Objective 不存在" }, { status: 404 });
  if (!canEdit(user, existing.ownerId, existing.departmentId)) return NextResponse.json({ error: "无权限更新 Objective" }, { status: 403 });
  if (existing.quarter.status === "archived") return NextResponse.json({ error: "季度已归档，只读" }, { status: 400 });
  if (existing.quarter.status !== "planning" && user.role !== "super_admin") {
    return NextResponse.json({ error: "当前季度已进入执行阶段，仅超级管理员可继续调整 OKR" }, { status: 400 });
  }
  const objective = await prisma.objective.update({ where: { id }, data: { title: body.title } });
  return NextResponse.json({ objective });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.objective.findUnique({ where: { id }, include: { quarter: true } }).catch(() => null);
  if (!existing && !prismaQueries.enabled()) {
    const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
    const fallbackObjective = snapshot.getObjective(id);
    if (!fallbackObjective) return NextResponse.json({ error: "Objective 不存在" }, { status: 404 });
    const quarter = snapshot.getQuarter(fallbackObjective.quarterId);
    if (!canEdit(user, fallbackObjective.ownerId, fallbackObjective.departmentId)) return NextResponse.json({ error: "无权限删除 Objective" }, { status: 403 });
    if (quarter.status !== "planning") return NextResponse.json({ error: "只有设定期可以删除 Objective" }, { status: 400 });
    repository.deleteObjective(id);
    return NextResponse.json({ ok: true });
  }
  if (!existing) return NextResponse.json({ error: "Objective 不存在" }, { status: 404 });
  if (!canEdit(user, existing.ownerId, existing.departmentId)) return NextResponse.json({ error: "无权限删除 Objective" }, { status: 403 });
  if (existing.quarter.status !== "planning") return NextResponse.json({ error: "只有设定期可以删除 Objective" }, { status: 400 });

  await prisma.objective.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function canView(user: { id: string; role: string; departmentId?: string }, departmentId: string | null | undefined, ownerId: string) {
  return user.role === "super_admin" || ownerId === user.id || departmentId === user.departmentId;
}

function canEdit(user: { id: string; role: string; departmentId?: string }, ownerId: string, departmentId: string | null | undefined) {
  return user.role === "super_admin" || ownerId === user.id || (user.role === "dept_manager" && departmentId === user.departmentId);
}
