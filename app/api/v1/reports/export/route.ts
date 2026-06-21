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
  if (user.role === "member") return NextResponse.json({ error: "无权限导出报表" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const currentQuarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const quarterId = body.quarter_id ?? currentQuarter.id;
  const scope = normalizeExportScope(body.scope, user.role === "dept_manager" ? "department" : "company");
  const departmentId = typeof body.department_id === "string" ? body.department_id : undefined;
  if (!canExportFeishuDocument(user.role, scope)) {
    return NextResponse.json({ error: "无权限导出该范围的统计报表" }, { status: 403 });
  }
  if (scope === "department") {
    if (user.role === "super_admin" && !departmentId) {
      return NextResponse.json({ error: "导出部门统计报表时必须指定目标部门" }, { status: 400 });
    }
    if (user.role === "dept_manager" && departmentId && departmentId !== user.departmentId) {
      return NextResponse.json({ error: "部门管理者只能导出本部门统计报表" }, { status: 403 });
    }
  }
  const task = createFeishuTask("v2_report_doc", "导出中", user.id);
  void runReportExportTask(task.id, quarterId, scope, user.id, departmentId);
  return NextResponse.json({ taskId: task.id, task }, { status: 202 });
}

async function runReportExportTask(taskId: string, quarterId: string, scope: "company" | "department" | "individual", userId: string, departmentId?: string) {
  updateFeishuTask(taskId, { status: "running", message: "导出中" });
  try {
    const fullUser = (await prismaQueries.getUser(userId)) ?? repository.getUser(userId);
    if (!fullUser) throw new Error("导出操作人不存在");
    const departments = (await prismaQueries.listDepartments()) ?? repository.listDepartments();
    const targetDepartment = departmentId ? departments.find((item) => item.id === departmentId) : undefined;
    const log = await feishuProvider.exportV2ReportDocument(quarterId, scope, {
      ...fullUser,
      exportDepartmentId: scope === "department" ? departmentId ?? fullUser.departmentId : undefined
    });
    const exportLog = repository.createExportLog({
      ...log,
      exportedBy: userId,
      departmentId: scope === "department" ? departmentId ?? fullUser.departmentId : undefined,
      message: describeReportExportMessage(log.message, scope, targetDepartment?.name)
    });
    updateFeishuTask(taskId, { status: "success", message: exportLog.message ?? "导出成功", exportLog });
  } catch (error) {
    const log = repository.createExportLog({
      id: `failed-v2-report-${Date.now()}`,
      exportedBy: userId,
      exportType: "v2_report_doc",
      scope,
      departmentId,
      quarterId,
      status: "failed",
      message: describeReportExportMessage(error instanceof Error ? error.message : "V2.0 报表导出失败", scope),
      exportedAt: new Date().toISOString()
    });
    updateFeishuTask(taskId, { status: "failed", message: log.message ?? "导出失败", error: log.message, exportLog: log });
  }
}

function describeReportExportMessage(baseMessage: string | undefined, scope: "company" | "department" | "individual", departmentName?: string) {
  const message = baseMessage ?? "V2.0 报表导出完成";
  if (scope === "department") {
    return `${message}（指定部门 · ${departmentName ?? "未命名部门"}）`;
  }
  return `${message}（全公司）`;
}
