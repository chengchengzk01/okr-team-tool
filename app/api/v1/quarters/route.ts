import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({ quarters: (await prismaQueries.listQuarters()) ?? repository.listQuarters() });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "无权限执行该操作" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const quarter = repository.createQuarter({ ...body, createdBy: currentUser.id });
    return NextResponse.json({ quarter }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败";
}
