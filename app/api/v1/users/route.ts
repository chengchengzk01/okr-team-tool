import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "无权限执行该操作" }, { status: 403 });
  }

  return NextResponse.json({ users: (await prismaQueries.listUsers()) ?? repository.listUsers() });
}
