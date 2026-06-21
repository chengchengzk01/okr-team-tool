"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Action = {
  id: string;
  title: string;
  mockDescription: string;
  realDescription: string;
  endpoint: string;
  buttonLabel: string;
  method?: "POST" | "PATCH" | "DELETE";
  readiness?: Array<"oauthReady" | "orgSyncReady" | "calendarReady" | "bitableReady" | "driveReady">;
};

const actions: Action[] = [
  {
    id: "org-sync",
    title: "同步组织架构",
    mockDescription: "模拟同步飞书部门和用户，用于刷新本地组织架构与角色映射。",
    realDescription: "从飞书重新同步部门和用户，用于刷新本地组织架构与角色映射。",
    endpoint: "/api/v1/departments/sync",
    buttonLabel: "同步组织架构",
    readiness: ["oauthReady", "orgSyncReady"]
  },
  {
    id: "calendar",
    title: "创建季度日历事件",
    mockDescription: "模拟为当前季度创建规划、周仪式和复盘日历事件。",
    realDescription: "为当前季度创建规划、周仪式和复盘日历事件。",
    endpoint: "/api/v1/integrations/feishu/calendar/create-events",
    buttonLabel: "创建日历事件",
    readiness: ["oauthReady", "calendarReady"]
  },
  {
    id: "calendar-refresh",
    title: "更新日历事件",
    mockDescription: "模拟把最新的时间、描述和受邀范围同步到当前季度已创建的飞书日历事件。",
    realDescription: "把最新的时间、描述和受邀范围同步到当前季度已创建的飞书日历事件。",
    endpoint: "/api/v1/integrations/feishu/calendar/events",
    buttonLabel: "更新日历事件",
    method: "PATCH",
    readiness: ["oauthReady", "calendarReady"]
  },
  {
    id: "calendar-stop",
    title: "终止日历事件",
    mockDescription: "模拟终止当前季度已创建的飞书重复日历事件。",
    realDescription: "终止当前季度已创建的飞书重复日历事件，防止归档后继续重复提醒。",
    endpoint: "/api/v1/integrations/feishu/calendar/events",
    buttonLabel: "终止日历事件",
    method: "DELETE",
    readiness: ["oauthReady", "calendarReady"]
  },
  {
    id: "bitable",
    title: "同步到多维表格",
    mockDescription: "模拟将 OKR、周仪式、健康指标和复盘数据同步到多维表格。",
    realDescription: "将 OKR、周仪式、健康指标和复盘数据同步到多维表格。",
    endpoint: "/api/v1/integrations/feishu/bitable/sync",
    buttonLabel: "同步到多维表格",
    readiness: ["oauthReady", "bitableReady"]
  },
  {
    id: "doc",
    title: "导出飞书文档",
    mockDescription: "模拟生成季度复盘文档，并返回可查看的飞书文档链接。",
    realDescription: "生成季度复盘文档，并返回可查看的飞书文档链接。",
    endpoint: "/api/v1/integrations/feishu/doc/export",
    buttonLabel: "导出季度报告",
    readiness: ["oauthReady", "driveReady"]
  }
];

type Feedback = Record<string, { type: "success" | "error"; message: string; url?: string }>;

type TaskResponse = {
  task?: {
    status: "pending" | "running" | "success" | "failed";
    message: string;
    exportLog?: { message?: string; feishuDocUrl?: string };
    error?: string;
  };
};

export function FeishuIntegrationActions({
  mode,
  quarterId,
  readiness
}: {
  mode: "mock" | "real";
  quarterId: string;
  readiness: { oauthReady: boolean; orgSyncReady: boolean; calendarReady: boolean; bitableReady: boolean; driveReady: boolean };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({});

  async function runAction(action: Action) {
    setRunningId(action.id);
    setFeedback((current) => ({ ...current, [action.id]: { type: "success", message: "任务执行中..." } }));
    const endpoint =
      (action.method === "PATCH" || action.method === "DELETE") && action.endpoint.endsWith("/calendar/events")
        ? `${action.endpoint}/${quarterId}`
        : action.endpoint;

    const response = await fetch(endpoint, {
      method: action.method ?? "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const result = await response.json();

    if (!response.ok) {
      setFeedback((current) => ({
        ...current,
        [action.id]: { type: "error", message: result.error ?? "任务执行失败" }
      }));
      setRunningId(null);
      return;
    }

    if (result.taskId) {
      await pollTask(action.id, result.taskId);
      return;
    }

    const url = result.exportLog?.feishuDocUrl;
    setFeedback((current) => ({
      ...current,
      [action.id]: {
        type: "success",
        message: result.exportLog?.message ?? "任务已完成",
        url
      }
    }));
    setRunningId(null);
    startTransition(() => router.refresh());
  }

  async function pollTask(actionId: string, taskId: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 300 : 1000));
      const response = await fetch(`/api/v1/integrations/feishu/tasks/${taskId}`);
      const result = (await response.json()) as TaskResponse;
      const task = result.task;
      if (!response.ok || !task) {
        setFeedback((current) => ({ ...current, [actionId]: { type: "error", message: "任务状态读取失败" } }));
        setRunningId(null);
        return;
      }
      if (task.status === "pending" || task.status === "running") {
        setFeedback((current) => ({ ...current, [actionId]: { type: "success", message: task.message } }));
        continue;
      }
      if (task.status === "failed") {
        setFeedback((current) => ({ ...current, [actionId]: { type: "error", message: task.error ?? task.message } }));
      } else {
        setFeedback((current) => ({
          ...current,
          [actionId]: { type: "success", message: task.exportLog?.message ?? task.message, url: task.exportLog?.feishuDocUrl }
        }));
      }
      setRunningId(null);
      startTransition(() => router.refresh());
      return;
    }
    setFeedback((current) => ({ ...current, [actionId]: { type: "error", message: "任务仍在执行，请稍后查看导出日志" } }));
    setRunningId(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {actions.map((action) => {
        const itemFeedback = feedback[action.id];
        const blockedByReadiness = mode === "real" && Boolean(action.readiness?.some((item) => !readiness[item]));
        const loading = runningId === action.id || isPending;
        return (
          <section key={action.id} className="rounded-lg border border-line bg-card p-5 shadow-panel">
            <h2 className="font-semibold text-ink">{action.title}</h2>
            <p className="mt-2 text-sm leading-6 text-steel">{mode === "mock" ? action.mockDescription : action.realDescription}</p>
            <button
              type="button"
              onClick={() => runAction(action)}
              disabled={loading || blockedByReadiness}
              className="mt-4 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningId === action.id ? "执行中..." : action.buttonLabel}
            </button>
            {blockedByReadiness ? (
              <p className="mt-3 text-xs leading-5 text-muted">当前真实飞书配置未就绪，请先完成上方配置检查对应项目。</p>
            ) : null}
            {itemFeedback ? (
              <div className={itemFeedback.type === "success" ? "mt-3 text-xs leading-5 text-primary" : "mt-3 text-xs leading-5 text-status-red"}>
                <p>{itemFeedback.message}</p>
                {itemFeedback.url ? (
                  <a className="mt-1 inline-block underline" href={itemFeedback.url} target="_blank" rel="noreferrer">
                    打开飞书文档
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
