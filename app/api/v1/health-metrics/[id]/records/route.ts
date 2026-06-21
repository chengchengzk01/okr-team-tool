import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = await request.json();
    const record = repository.submitHealthMetricRecord({
      healthMetricId: id,
      currentValue: Number(body.current_value),
      note: body.note,
      recordedBy: user.id
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求失败";
    const status = message.includes("只有指标负责人") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
