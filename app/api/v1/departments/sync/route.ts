import { NextResponse } from "next/server";
import { assertRole, getCurrentUser } from "@/lib/auth";
import { runOrganizationSyncTask } from "@/lib/integrations/feishu-sync-tasks";
import { createFeishuTask } from "@/lib/integrations/feishu-task-store";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  try {
    assertRole(user, ["super_admin"]);
    const task = createFeishuTask("directory_sync", "同步中", user?.id);
    void runOrganizationSyncTask(task.id);
    return NextResponse.json({ taskId: task.id, task }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "同步失败" }, { status: user ? 400 : 401 });
  }
}
