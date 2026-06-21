"use client";

import { useState, useTransition } from "react";

type ExportScope = "company" | "department" | "individual";
type ScopeOption = { value: ExportScope; label: string };
type DepartmentOption = { id: string; name: string };
type UserOption = { id: string; name: string };

export function QuarterDocumentExportAction({
  canExport,
  quarterId,
  scope,
  availableScopes = [{ value: scope, label: scopeLabel(scope) }],
  availableDepartments = [],
  defaultDepartmentId,
  availableUsers = [],
  defaultUserId
}: {
  canExport: boolean;
  quarterId: string;
  scope: ExportScope;
  availableScopes?: ScopeOption[];
  availableDepartments?: DepartmentOption[];
  defaultDepartmentId?: string;
  availableUsers?: UserOption[];
  defaultUserId?: string;
}) {
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [selectedScope, setSelectedScope] = useState<ExportScope>(scope);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId ?? availableDepartments[0]?.id ?? "");
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId ?? availableUsers[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  if (!canExport) return null;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {availableScopes.length > 1 ? (
        <label className="flex w-full flex-col gap-1 text-xs text-steel sm:items-end">
          <span>导出范围</span>
          <select
            value={selectedScope}
            onChange={(event) => setSelectedScope(event.target.value as ExportScope)}
            className="okr-input min-w-40 text-sm"
            disabled={isPending}
          >
            {availableScopes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selectedScope === "department" && availableDepartments.length > 0 ? (
        <label className="flex w-full flex-col gap-1 text-xs text-steel sm:items-end">
          <span>目标部门</span>
          <select
            value={selectedDepartmentId}
            onChange={(event) => setSelectedDepartmentId(event.target.value)}
            className="okr-input min-w-40 text-sm"
            disabled={isPending}
          >
            {availableDepartments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selectedScope === "individual" && availableUsers.length > 0 ? (
        <label className="flex w-full flex-col gap-1 text-xs text-steel sm:items-end">
          <span>目标成员</span>
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            className="okr-input min-w-40 text-sm"
            disabled={isPending}
          >
            {availableUsers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setMessage("");
            setUrl("");
            const response = await fetch("/api/v1/integrations/feishu/doc/export", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                quarter_id: quarterId,
                scope: selectedScope,
                department_id: selectedScope === "department" ? selectedDepartmentId : undefined,
                user_id: selectedScope === "individual" ? selectedUserId : undefined
              })
            });
            const result = await response.json();
            if (!response.ok) {
              setMessage(`${result.error ?? "导出失败"}；请到 /settings 查看最近集成任务和导出日志`);
              return;
            }
            if (result.taskId) {
              await pollTask(result.taskId);
              return;
            }
            setMessage(result.exportLog?.feishuDocUrl ? "季度报告已导出" : "导出任务已完成");
            setUrl(result.exportLog?.feishuDocUrl ?? "");
          });
        }}
        className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "导出中..." : "导出季度报告"}
      </button>
      <div className="text-xs leading-5 text-steel">
        导出任务会同步写入设置页的“最近集成任务”和“导出日志”，失败时优先回到 /settings 查看错误原文。
      </div>
      {message ? <div className={url ? "text-xs font-medium text-primary" : "text-xs font-medium text-steel"}>{message}</div> : null}
      {url ? (
        <a className="text-xs font-medium text-primary underline" href={url} target="_blank" rel="noreferrer">
          打开飞书文档
        </a>
      ) : null}
    </div>
  );

  async function pollTask(taskId: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      setMessage(attempt === 0 ? "导出中..." : "仍在导出中...");
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 300 : 1000));
      const response = await fetch(`/api/v1/integrations/feishu/tasks/${taskId}`);
      const result = await response.json();
      const task = result.task;
      if (!response.ok || !task) {
        setMessage(result.error ?? "任务状态读取失败");
        return;
      }
      if (task.status === "pending" || task.status === "running") continue;
      if (task.status === "failed") {
        setMessage(`${task.error ?? task.message ?? "导出失败"}；请到 /settings 查看最近集成任务和导出日志`);
        return;
      }
      setMessage(task.exportLog?.message ?? "导出完成");
      setUrl(task.exportLog?.feishuDocUrl ?? "");
      return;
    }
    setMessage("任务仍在执行，请稍后到 /settings 查看最近集成任务和导出日志");
  }
}

function scopeLabel(scope: ExportScope) {
  if (scope === "company") return "全公司季度报告";
  if (scope === "department") return "指定部门季度报告";
  return "个人 OKR 报告";
}
