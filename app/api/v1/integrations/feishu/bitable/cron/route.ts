import { NextResponse } from "next/server";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { getDefaultFeishuOperatorId, runBitableSyncTask } from "@/lib/integrations/feishu-sync-tasks";
import { createFeishuTask } from "@/lib/integrations/feishu-task-store";

export async function POST(request: Request) {
  const authError = assertCronAuthorized(request);
  if (authError) return authError;

  const currentQuarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const userId = await getDefaultFeishuOperatorId();
  const task = createFeishuTask("bitable_sync", "定时同步中", userId);
  void runBitableSyncTask(task.id, currentQuarter.id, userId);

  return NextResponse.json({ taskId: task.id, task }, { status: 202 });
}

export async function GET(request: Request) {
  return POST(request);
}

function assertCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return null;
  const expected = `Bearer ${secret}`;
  if (secret && request.headers.get("authorization") === expected) return null;
  return NextResponse.json({ error: "无权限执行定时同步" }, { status: 403 });
}
