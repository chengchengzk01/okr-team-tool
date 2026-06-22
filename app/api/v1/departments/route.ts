import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({ departments: (await prismaQueries.listDepartments()) ?? repository.listDepartments() });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (currentUser.role !== "super_admin") return NextResponse.json({ error: "只有超级管理员可以新增部门" }, { status: 403 });

  try {
    const body = await request.json();
    const name = normalizeDepartmentName(body.name);
    const department = await prisma.department.create({
      data: {
        name
      }
    });
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "新增部门失败" }, { status: 400 });
  }
}

function normalizeDepartmentName(value: unknown) {
  if (typeof value !== "string") throw new Error("部门名称不能为空");
  const name = value.trim();
  if (!name) throw new Error("部门名称不能为空");
  if (name.length > 50) throw new Error("部门名称不能超过 50 个字符");
  return name;
}
