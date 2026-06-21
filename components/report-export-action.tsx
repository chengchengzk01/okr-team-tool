"use client";

import { useState, useTransition } from "react";

type ExportScope = "company" | "department" | "individual";

export function ReportExportAction({
  canExport,
  quarterId,
  scope,
  departmentId
}: {
  canExport: boolean;
  quarterId: string;
  scope: ExportScope;
  departmentId?: string;
}) {
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!canExport) return null;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setMessage("");
            setUrl("");
            const response = await fetch("/api/v1/reports/export", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                quarter_id: quarterId,
                scope,
                department_id: scope === "department" ? departmentId : undefined
              })
            });
            const result = await response.json();
            if (!response.ok) {
              setMessage(result.error ?? "导出失败");
              return;
            }
            if (result.taskId) {
              await pollTask(result.taskId);
              return;
            }
            setMessage(result.exportLog?.feishuDocUrl ? "V2.0 报表已导出" : "导出任务已完成");
            setUrl(result.exportLog?.feishuDocUrl ?? "");
          });
        }}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "导出中..." : scope === "department" ? "导出当前部门 V2.0 报表" : "导出 V2.0 报表"}
      </button>
      {message ? <div className="text-xs font-medium text-primary">{message}</div> : null}
      {url ? <a className="text-xs font-medium text-primary underline" href={url} target="_blank" rel="noreferrer">打开飞书文档</a> : null}
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
        setMessage(task.error ?? task.message ?? "导出失败");
        return;
      }
      setMessage(task.exportLog?.message ?? "导出完成");
      setUrl(task.exportLog?.feishuDocUrl ?? "");
      return;
    }
    setMessage("任务仍在执行，请稍后查看导出日志");
  }
}
