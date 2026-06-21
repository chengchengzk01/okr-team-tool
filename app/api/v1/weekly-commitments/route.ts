import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({ commitments: ((await prismaQueries.getDashboard(user.id)) ?? repository.getDashboard(user.id)).commitments });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const body = await request.json();
    const commitment = repository.submitWeeklyCommitment({
      userId: user.id,
      quarterId: body.quarter_id,
      weekNumber: Number(body.week_number),
      priority1: body.priority_1,
      priority2: body.priority_2,
      priority3: body.priority_3,
      priorSelfReview: body.prior_self_review
    });
    return NextResponse.json({ commitment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}
