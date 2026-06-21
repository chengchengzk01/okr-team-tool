import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { canExportFeishuDocument, normalizeExportScope } from "@/lib/domain/rules";
import { feishuProvider } from "@/lib/integrations/feishu";
import { createFeishuTask, updateFeishuTask } from "@/lib/integrations/feishu-task-store";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const currentQuarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const quarterId = body.quarter_id ?? currentQuarter.id;
  const departmentId = typeof body.department_id === "string" ? body.department_id : undefined;
  const targetUserId = typeof body.user_id === "string" ? body.user_id : undefined;
  const scope = normalizeExportScope(
    body.scope,
    user.role === "dept_manager" ? "department" : user.role === "member" ? "individual" : "company"
  );
  if (!canExportFeishuDocument(user.role, scope)) {
    return NextResponse.json({ error: "无权限导出该范围的飞书文档" }, { status: 403 });
  }
  if (scope === "department") {
    if (user.role === "super_admin" && !departmentId) {
      return NextResponse.json({ error: "导出指定部门报告时，必须选择目标部门" }, { status: 400 });
    }
    if (user.role === "dept_manager" && user.departmentId && departmentId && departmentId !== user.departmentId) {
      return NextResponse.json({ error: "部门管理者只能导出本部门季度报告" }, { status: 403 });
    }
  }
  if (scope === "individual") {
    if (user.role === "super_admin" && !targetUserId) {
      return NextResponse.json({ error: "导出个人 OKR 报告时，必须选择目标成员" }, { status: 400 });
    }
    if (user.role === "member" && targetUserId && targetUserId !== user.id) {
      return NextResponse.json({ error: "成员只能导出自己的个人 OKR 报告" }, { status: 403 });
    }
  }
  const task = createFeishuTask("feishu_doc", "导出中", user.id);
  void runDocumentExportTask(task.id, quarterId, scope, user.id, departmentId, targetUserId);
  return NextResponse.json({ taskId: task.id, task }, { status: 202 });
}

async function runDocumentExportTask(
  taskId: string,
  quarterId: string,
  scope: "company" | "department" | "individual",
  userId: string,
  departmentId?: string,
  targetUserId?: string
) {
  updateFeishuTask(taskId, { status: "running", message: "导出中" });
  try {
    const fullUser = (await prismaQueries.getUser(userId)) ?? repository.getUser(userId);
    if (!fullUser) {
      throw new Error("导出操作人不存在");
    }
    const users = (await prismaQueries.listUsers()) ?? repository.listUsers();
    const departments = (await prismaQueries.listDepartments()) ?? repository.listDepartments();
    const targetUser = targetUserId ? users.find((item) => item.id === targetUserId) : undefined;
    const targetDepartment = departmentId ? departments.find((item) => item.id === departmentId) : undefined;
    const log = await feishuProvider.exportDocument(quarterId, scope, {
      ...fullUser,
      id: scope === "individual" ? targetUserId ?? fullUser.id : fullUser.id,
      departmentId: scope === "department" ? departmentId ?? fullUser.departmentId : fullUser.departmentId,
      exportUserId: scope === "individual" ? targetUserId ?? fullUser.id : undefined,
      exportDepartmentId: scope === "department" ? departmentId ?? fullUser.departmentId : undefined
    });
    const exportLog = repository.createExportLog({
      ...log,
      exportedBy: userId,
      departmentId: scope === "department" ? departmentId ?? fullUser.departmentId : undefined,
      message: describeDocumentExportMessage(log.message, scope, targetDepartment?.name, targetUser?.name)
    });
    updateFeishuTask(taskId, { status: "success", message: exportLog.message ?? "导出成功", exportLog });
  } catch (error) {
    const log = repository.createExportLog({
      id: `failed-doc-${Date.now()}`,
      exportedBy: userId,
      exportType: "feishu_doc",
      scope,
      departmentId: scope === "department" ? departmentId : undefined,
      quarterId,
      status: "failed",
      message: describeDocumentExportMessage(error instanceof Error ? error.message : "飞书文档导出失败", scope),
      exportedAt: new Date().toISOString()
    });
    updateFeishuTask(taskId, { status: "failed", message: log.message ?? "导出失败", error: log.message, exportLog: log });
  }
}

function describeDocumentExportMessage(baseMessage: string | undefined, scope: "company" | "department" | "individual", departmentName?: string, userName?: string) {
  const message = baseMessage ?? "飞书文档导出完成";
  if (scope === "department") {
    return departmentName ? `${message}（指定部门 · ${departmentName}）` : `${message}（指定部门）`;
  }
  if (scope === "individual") {
    return userName ? `${message}（个人 OKR · ${userName}）` : `${message}（个人 OKR）`;
  }
  return `${message}（全公司）`;
}
