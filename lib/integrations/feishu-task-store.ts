import type { ExportLog } from "@/lib/domain/types";

export type FeishuTaskStatus = "pending" | "running" | "success" | "failed";
export type FeishuTaskType = ExportLog["exportType"] | "directory_sync";

export type FeishuTask = {
  id: string;
  type: FeishuTaskType;
  status: FeishuTaskStatus;
  message: string;
  exportLog?: ExportLog;
  error?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

const globalForFeishuTasks = globalThis as unknown as { okrFeishuTasks?: Map<string, FeishuTask> };

function getTaskMap() {
  globalForFeishuTasks.okrFeishuTasks ??= new Map<string, FeishuTask>();
  return globalForFeishuTasks.okrFeishuTasks;
}

export function createFeishuTask(type: FeishuTaskType, message = "任务已创建", createdBy?: string) {
  const now = new Date().toISOString();
  const task: FeishuTask = {
    id: `task-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    status: "pending",
    message,
    createdBy,
    createdAt: now,
    updatedAt: now
  };
  getTaskMap().set(task.id, task);
  return task;
}

export function updateFeishuTask(id: string, patch: Partial<Pick<FeishuTask, "status" | "message" | "exportLog" | "error">>) {
  const current = getTaskMap().get(id);
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  getTaskMap().set(id, next);
  return next;
}

export function getFeishuTask(id: string) {
  return getTaskMap().get(id) ?? null;
}

export function listFeishuTasks() {
  return [...getTaskMap().values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
