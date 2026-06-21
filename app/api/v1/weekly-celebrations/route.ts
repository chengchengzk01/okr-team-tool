import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({ celebrations: ((await prismaQueries.getDashboard(user.id)) ?? repository.getDashboard(user.id)).celebrations });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const body = await request.json();
    const celebration = repository.submitWeeklyCelebration({
      userId: user.id,
      quarterId: body.quarter_id,
      weekNumber: Number(body.week_number),
      achievements: body.achievements ?? [],
      obstacles: body.obstacles,
      mood: body.mood
    });
    return NextResponse.json({ celebration });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}
