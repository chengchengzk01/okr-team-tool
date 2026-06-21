import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { assertAlignmentLimit, assertObjectiveAlignmentImmutable, assertRequiredObjectiveAlignment } from "@/lib/domain/rules";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!["dept_manager", "member", "super_admin"].includes(user.role)) return NextResponse.json({ error: "无权限建立对齐关系" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const parentKeyResultIds = body.parent_key_result_ids ?? [];
    assertAlignmentLimit(parentKeyResultIds.length);
    const objective = await prisma.objective.findUnique({ where: { id }, include: { quarter: true } }).catch(() => null);
    if (!objective && !prismaQueries.enabled()) {
      const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
      const fallbackObjective = snapshot.getObjective(id);
      if (!fallbackObjective) return NextResponse.json({ error: "Objective 不存在" }, { status: 404 });
      const quarter = snapshot.getQuarter(fallbackObjective.quarterId);
      if (quarter.status === "archived") return NextResponse.json({ error: "季度已归档，只读" }, { status: 400 });
      if (quarter.status !== "planning" && user.role !== "super_admin") {
        return NextResponse.json({ error: "当前季度已进入执行阶段，仅超级管理员可继续调整 OKR" }, { status: 400 });
      }
      if (user.role === "member" && fallbackObjective.ownerId !== user.id) return NextResponse.json({ error: "成员只能给自己的 Objective 建立对齐" }, { status: 403 });
      if (user.role === "dept_manager" && fallbackObjective.departmentId !== user.departmentId && fallbackObjective.ownerId !== user.id) {
        return NextResponse.json({ error: "只能管理本部门对齐关系" }, { status: 403 });
      }
      const alignments = repository.createObjectiveAlignments(id, parentKeyResultIds);
      return NextResponse.json({ alignments }, { status: 201 });
    }
    if (!objective) return NextResponse.json({ error: "Objective 不存在" }, { status: 404 });
    if (objective.quarter.status === "archived") return NextResponse.json({ error: "季度已归档，只读" }, { status: 400 });
    if (objective.quarter.status !== "planning" && user.role !== "super_admin") {
      return NextResponse.json({ error: "当前季度已进入执行阶段，仅超级管理员可继续调整 OKR" }, { status: 400 });
    }
    if (user.role === "member" && objective.ownerId !== user.id) return NextResponse.json({ error: "成员只能给自己的 Objective 建立对齐" }, { status: 403 });
    if (user.role === "dept_manager" && objective.departmentId !== user.departmentId && objective.ownerId !== user.id) {
      return NextResponse.json({ error: "只能管理本部门对齐关系" }, { status: 403 });
    }
    assertRequiredObjectiveAlignment(objective.level, parentKeyResultIds.length);
    const existingAlignmentCount = await prisma.oKRAlignment.count({ where: { childObjectiveId: id } });
    assertObjectiveAlignmentImmutable(existingAlignmentCount);

    const alignments = await Promise.all(
      parentKeyResultIds.map((parentKeyResultId: string) =>
        prisma.oKRAlignment.create({
          data: {
            id: `al-${id}-${parentKeyResultId}`,
            childObjectiveId: id,
            parentKeyResultId
          }
        })
      )
    );
    return NextResponse.json({ alignments }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "建立对齐关系失败" }, { status: 400 });
  }
}
