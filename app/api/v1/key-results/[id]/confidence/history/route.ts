import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(_);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { id } = await context.params;
    const snapshot = await prismaQueries.getRepositorySnapshot();
    const source = snapshot ?? repository;
    const fullUser = source.getUser(user.id);
    if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    return NextResponse.json({ history: source.listVisibleConfidenceHistory(id, fullUser) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求失败";
    return NextResponse.json({ error: message }, { status: message.includes("不存在") ? 404 : 403 });
  }
}
