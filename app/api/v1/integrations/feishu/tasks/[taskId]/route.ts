import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFeishuTask } from "@/lib/integrations/feishu-task-store";

export async function GET(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { taskId } = await params;
  const task = getFeishuTask(taskId);
  if (!task) return NextResponse.json({ error: "任务不存在或已过期" }, { status: 404 });
  if (user.role !== "super_admin" && task.createdBy !== user.id) {
    return NextResponse.json({ error: "无权限查看该任务" }, { status: 403 });
  }

  return NextResponse.json({ task });
}
