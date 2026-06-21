import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listFeishuTasks } from "@/lib/integrations/feishu-task-store";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const tasks = listFeishuTasks()
    .filter((task) => user.role === "super_admin" || task.createdBy === user.id)
    .slice(0, 20);

  return NextResponse.json({ tasks });
}
