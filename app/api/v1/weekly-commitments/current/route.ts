import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const dashboard = (await prismaQueries.getDashboard(user.id)) ?? repository.getDashboard(user.id);
  const commitment = await prisma.weeklyCommitment.findFirst({
    where: { userId: user.id, quarterId: dashboard.quarter.id, weekNumber: dashboard.weekNumber }
  });
  return NextResponse.json({ commitment: commitment ?? dashboard.commitments.find((item) => item.userId === user.id) ?? null });
}
