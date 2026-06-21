import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const alignments = await prisma.oKRAlignment.findMany({
    where: { parentKeyResultId: id },
    include: { childObjective: { include: { owner: true, department: true, keyResults: true } } }
  }).catch(() => null);
  if (!alignments) {
    const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
    if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
    return NextResponse.json({ objectives: snapshot.listAlignedObjectives(id, fullUser) });
  }
  const objectives = alignments
    .map((alignment) => alignment.childObjective)
    .filter((objective) => user.role === "super_admin" || objective.ownerId === user.id || objective.departmentId === user.departmentId);
  return NextResponse.json({ objectives });
}
