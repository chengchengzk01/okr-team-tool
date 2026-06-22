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
    if (existing.isArchived) return NextResponse.json({ error: "部门已删除" }, { status: 400 });

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
      select: { id: true, feishuDeptId: true, name: true, isArchived: true }
    });
    if (!existing) return NextResponse.json({ error: "部门不存在" }, { status: 404 });
    if (existing.isArchived) return NextResponse.json({ success: true, softDeleted: true });

    await prisma.department.update({
      where: { id },
      data: { isArchived: true }
    });
    return NextResponse.json({ success: true, softDeleted: true });
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
