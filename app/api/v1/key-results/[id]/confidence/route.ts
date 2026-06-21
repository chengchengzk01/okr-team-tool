import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = await request.json();
    const keyResult = repository.getKeyResult(id);
    if (!keyResult) throw new Error("KR 不存在");
    if (keyResult.ownerId !== user.id) {
      return NextResponse.json({ error: "只能更新自己负责 KR 的信心值" }, { status: 403 });
    }
    const confidenceScore = repository.submitConfidenceScore({
      keyResultId: id,
      userId: user.id,
      quarterId: body.quarter_id,
      weekNumber: Number(body.week_number),
      score: Number(body.score),
      note: body.note
    });
    return NextResponse.json({ confidenceScore });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}
