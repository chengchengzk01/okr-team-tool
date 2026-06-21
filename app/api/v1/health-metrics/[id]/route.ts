import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  try {
    const { id } = await params;
    return NextResponse.json({ healthMetric: (await prismaQueries.getHealthMetricDetail(fullUser, id)) ?? repository.getHealthMetricDetail(fullUser, id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  try {
    const { id } = await params;
    const body = await request.json();
    const metric = repository.updateHealthMetric(fullUser, id, {
      name: body.name,
      description: body.description,
      ownerId: body.owner_id,
      thresholdType: body.threshold_type,
      thresholdMin: body.threshold_min === undefined ? undefined : Number(body.threshold_min),
      thresholdMax: body.threshold_max === undefined ? undefined : Number(body.threshold_max),
      thresholdValue: body.threshold_value === undefined ? undefined : Number(body.threshold_value),
      updateFrequency: body.update_frequency
    });
    return NextResponse.json({ healthMetric: metric });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  try {
    const { id } = await params;
    return NextResponse.json({ healthMetric: repository.archiveHealthMetric(fullUser, id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}
