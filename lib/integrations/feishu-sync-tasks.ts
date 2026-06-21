import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { feishuProvider } from "@/lib/integrations/feishu";
import { updateFeishuTask } from "@/lib/integrations/feishu-task-store";

export async function getDefaultFeishuOperatorId() {
  const users = (await prismaQueries.listUsers()) ?? repository.listUsers();
  return users.find((user) => user.role === "super_admin" && user.isActive)?.id ?? users[0]?.id ?? "system";
}

export async function runBitableSyncTask(taskId: string, quarterId: string, userId: string) {
  updateFeishuTask(taskId, { status: "running", message: "同步中" });
  try {
    const log = await feishuProvider.syncBitable(quarterId);
    const exportLog = repository.createExportLog({ ...log, exportedBy: userId });
    updateFeishuTask(taskId, { status: "success", message: exportLog.message ?? "同步成功", exportLog });
  } catch (error) {
    const exportLog = repository.createExportLog({
      id: `failed-bitable-${Date.now()}`,
      exportedBy: userId,
      exportType: "bitable_sync",
      scope: "company",
      quarterId,
      status: "failed",
      message: error instanceof Error ? `多维表格同步失败：${error.message}。请检查飞书多维表格写入权限与 Table ID 配置。` : "多维表格同步失败，请检查飞书授权与目标表权限",
      exportedAt: new Date().toISOString()
    });
    updateFeishuTask(taskId, { status: "failed", message: exportLog.message ?? "同步失败", error: exportLog.message, exportLog });
  }
}

export async function runOrganizationSyncTask(taskId: string) {
  updateFeishuTask(taskId, { status: "running", message: "同步中" });
  try {
    const organization = await feishuProvider.syncOrganization();
    updateFeishuTask(taskId, {
      status: "success",
      message: `组织同步完成：${organization.departments.length} 个部门，${organization.users.length} 个成员`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "组织同步失败，请检查飞书组织架构权限与根部门配置";
    updateFeishuTask(taskId, { status: "failed", message, error: message });
  }
}

export async function runCalendarTask(taskId: string, quarterId: string, userId: string, action: "create" | "update" | "stop") {
  updateFeishuTask(taskId, {
    status: "running",
    message: action === "create" ? "创建中" : action === "update" ? "更新中" : "终止中"
  });
  try {
    const log =
      action === "create"
        ? await feishuProvider.createCalendarEvents(quarterId)
        : action === "update"
          ? await feishuProvider.updateCalendarEvents(quarterId)
          : await feishuProvider.stopCalendarEvents(quarterId);
    const exportLog = repository.createExportLog({ ...log, exportedBy: userId });
    updateFeishuTask(taskId, {
      status: "success",
      message:
        exportLog.message ??
        (action === "create" ? "日历事件创建成功" : action === "update" ? "日历事件更新成功" : "日历事件终止成功"),
      exportLog
    });
  } catch (error) {
    const exportLog = repository.createExportLog({
      id: `failed-calendar-${action}-${Date.now()}`,
      exportedBy: userId,
      exportType: "calendar_events",
      scope: "company",
      quarterId,
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : action === "create"
            ? "飞书日历创建失败"
            : action === "update"
              ? "飞书日历更新失败"
              : "飞书日历终止失败",
      exportedAt: new Date().toISOString()
    });
    updateFeishuTask(taskId, {
      status: "failed",
      message: exportLog.message ?? "日历事件执行失败",
      error: exportLog.message,
      exportLog
    });
  }
}
