import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  if (user.role === "member" && user.id !== id) return NextResponse.json({ error: "成员只能查看自己的信心值概览" }, { status: 403 });
  if (user.role === "dept_manager") {
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.departmentId !== user.departmentId && user.id !== id) return NextResponse.json({ error: "只能查看本部门成员" }, { status: 403 });
  }

  const currentQuarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const keyResults = await prisma.keyResult.findMany({
    where: { ownerId: id, objective: { quarterId: currentQuarter.id } },
    include: { objective: true, confidenceScores: { orderBy: { weekNumber: "asc" } } }
  });
  return NextResponse.json({
    summary: keyResults.map((keyResult) => ({
      keyResult,
      latestScore: keyResult.confidenceScores.at(-1)?.score ?? null,
      history: keyResult.confidenceScores
    }))
  });
}
