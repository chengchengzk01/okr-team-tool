import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { runBitableSyncTask } from "@/lib/integrations/feishu-sync-tasks";
import { createFeishuTask } from "@/lib/integrations/feishu-task-store";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "无权限执行该操作" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const currentQuarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const quarterId = body.quarter_id ?? currentQuarter.id;
  const task = createFeishuTask("bitable_sync", "同步中", user.id);

  void runBitableSyncTask(task.id, quarterId, user.id);

  return NextResponse.json({ taskId: task.id, task }, { status: 202 });
}
