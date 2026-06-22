import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (currentUser.role !== "super_admin") return NextResponse.json({ error: "只有超级管理员可以修改部门" }, { status: 403 });

  try {
    const { id } = await params;
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "部门不存在" }, { status: 404 });

    const body = await request.json();
    const name = normalizeDepartmentName(body.name);
    const department = await prisma.department.update({
      where: { id },
      data: { name }
    });
    return NextResponse.json({ department });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "修改部门失败" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (currentUser.role !== "super_admin") return NextResponse.json({ error: "只有超级管理员可以删除部门" }, { status: 403 });

  try {
    const { id } = await params;
    const existing = await prisma.department.findUnique({
      where: { id },
      select: { id: true, feishuDeptId: true, name: true }
    });
    if (!existing) return NextResponse.json({ error: "部门不存在" }, { status: 404 });
    if (existing.feishuDeptId) {
      return NextResponse.json({ error: "飞书同步部门不支持删除，可通过改名调整展示" }, { status: 400 });
    }

    const [memberCount, childCount, objectiveCount, metricCount, reviewCount, exportCount] = await Promise.all([
      prisma.user.count({ where: { departmentId: id } }),
      prisma.department.count({ where: { parentId: id } }),
      prisma.objective.count({ where: { departmentId: id } }),
      prisma.healthMetric.count({ where: { departmentId: id } }),
      prisma.quarterReview.count({ where: { departmentId: id } }),
      prisma.exportLog.count({ where: { departmentId: id } })
    ]);

    if (memberCount > 0) return NextResponse.json({ error: "该部门下仍有成员，先完成人员迁移后再删除" }, { status: 400 });
    if (childCount > 0) return NextResponse.json({ error: "该部门下仍有子部门，先调整层级后再删除" }, { status: 400 });
    if (objectiveCount > 0 || metricCount > 0 || reviewCount > 0 || exportCount > 0) {
      return NextResponse.json({ error: "该部门已有业务数据，暂不支持直接删除" }, { status: 400 });
    }

    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除部门失败" }, { status: 400 });
  }
}

function normalizeDepartmentName(value: unknown) {
  if (typeof value !== "string") throw new Error("部门名称不能为空");
  const name = value.trim();
  if (!name) throw new Error("部门名称不能为空");
  if (name.length > 50) throw new Error("部门名称不能超过 50 个字符");
  return name;
}
