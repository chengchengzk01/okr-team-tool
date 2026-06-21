import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  return NextResponse.json({ healthMetrics: fullUser ? ((await prismaQueries.listHealthMetrics(fullUser)) ?? repository.listHealthMetrics(fullUser)) : [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  try {
    const body = await request.json();
    const metric = repository.createHealthMetric(fullUser, {
      name: body.name,
      description: body.description,
      level: body.level,
      departmentId: body.department_id,
      ownerId: body.owner_id ?? user.id,
      thresholdType: body.threshold_type ?? "gte",
      thresholdMin: body.threshold_min === undefined ? undefined : Number(body.threshold_min),
      thresholdMax: body.threshold_max === undefined ? undefined : Number(body.threshold_max),
      thresholdValue: body.threshold_value === undefined ? 7 : Number(body.threshold_value),
      updateFrequency: body.update_frequency ?? "weekly"
    });
    return NextResponse.json({ healthMetric: metric });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}
