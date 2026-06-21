import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { assertUniqueSuperAdminUpdate, type Role } from "@/lib/domain/rules";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser(_request);
  if (!currentUser) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  if (currentUser.role !== "super_admin" && currentUser.id !== id) return NextResponse.json({ error: "无权限查看该用户" }, { status: 403 });

  const user =
    await prisma
      .user.findUnique({ where: { id }, include: { department: true } })
      .catch(() => null);
  if (user) return NextResponse.json({ user });

  const fallbackUser = (await prismaQueries.getUser(id)) ?? repository.getUser(id);
  const department = fallbackUser?.departmentId
    ? ((await prismaQueries.listDepartments()) ?? repository.listDepartments()).find((item) => item.id === fallbackUser.departmentId)
    : undefined;
  const fallbackResult = fallbackUser ? { ...fallbackUser, department } : null;
  if (!fallbackResult) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  return NextResponse.json({ user: fallbackResult });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (currentUser.role !== "super_admin") return NextResponse.json({ error: "只有超级管理员可以更新用户" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    const activeSuperAdmins = await prisma.user.findMany({
      where: { role: "super_admin", isActive: true },
      select: { id: true }
    });
    const nextRole = normalizeRole(body.role);
    assertUniqueSuperAdminUpdate({
      targetUserId: id,
      currentRole: existing.role,
      currentIsActive: existing.isActive,
      nextRole,
      nextIsActive: typeof body.is_active === "boolean" ? body.is_active : undefined,
      activeSuperAdminIds: activeSuperAdmins.map((user) => user.id)
    });
    const user = await prisma.user.update({
      where: { id },
      data: {
        role: nextRole,
        departmentId: body.department_id,
        isActive: body.is_active
      }
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新用户失败" }, { status: 400 });
  }
}

function normalizeRole(value: unknown): Role | undefined {
  if (value === undefined) return undefined;
  if (value === "super_admin" || value === "dept_manager" || value === "member") return value;
  throw new Error("用户角色无效");
}
