"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Quarter } from "@/lib/domain/types";

type Props = {
  quarterId: string;
  currentStatus: Quarter["status"];
  canManage: boolean;
};

const nextActions: Record<Quarter["status"], { status: Quarter["status"]; label: string } | null> = {
  planning: { status: "active", label: "启动季度" },
  active: { status: "reviewing", label: "进入复盘" },
  reviewing: { status: "archived", label: "归档本季度" },
  archived: null
};

export function QuarterStatusActions({ quarterId, currentStatus, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const action = nextActions[currentStatus];

  async function updateStatus() {
    if (!action) return;
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/v1/quarters/${quarterId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action.status })
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "状态更新失败");
      return;
    }
    if (result.calendarStopLog?.message) {
      setMessage(result.calendarStopLog.message);
    } else if (action.status === "archived") {
      setMessage("季度已归档");
    } else {
      setMessage(`季度状态已更新为${action.label}`);
    }
    startTransition(() => router.refresh());
  }

  if (!canManage) return <span className="text-xs text-muted">仅超级管理员可调整</span>;
  if (!action) return <span className="text-xs text-muted">已归档，只读</span>;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={updateStatus}
        disabled={isPending}
        className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "更新中..." : action.label}
      </button>
      {message ? <div className="text-xs text-steel">{message}</div> : null}
      {error ? <div className="text-xs text-status-red">{error}</div> : null}
    </div>
  );
}
