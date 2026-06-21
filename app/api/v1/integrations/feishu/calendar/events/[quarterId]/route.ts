import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runCalendarTask } from "@/lib/integrations/feishu-sync-tasks";
import { createFeishuTask } from "@/lib/integrations/feishu-task-store";

export async function PATCH(_request: Request, { params }: { params: Promise<{ quarterId: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "无权限执行该操作" }, { status: 403 });

  const { quarterId } = await params;
  const task = createFeishuTask("calendar_events", "更新中", user.id);
  void runCalendarTask(task.id, quarterId, user.id, "update");
  return NextResponse.json({ taskId: task.id, task }, { status: 202 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ quarterId: string }> }) {
  const user = await getCurrentUser(_request);
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "无权限执行该操作" }, { status: 403 });

  const { quarterId } = await params;
  const task = createFeishuTask("calendar_events", "终止中", user.id);
  void runCalendarTask(task.id, quarterId, user.id, "stop");
  return NextResponse.json({ taskId: task.id, task }, { status: 202 });
}
