"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Quarter } from "@/lib/domain/types";

type Props = {
  canManage: boolean;
  quarters: Quarter[];
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function QuarterEditorPanel({ canManage, quarters }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createFeedback, setCreateFeedback] = useState<Feedback | null>(null);
  const [editFeedback, setEditFeedback] = useState<Record<string, Feedback | null>>({});

  async function createQuarter(formData: FormData) {
    setCreateFeedback(null);
    const response = await fetch("/api/v1/quarters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        status: formData.get("status")
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setCreateFeedback({ type: "error", message: result.error ?? "季度创建失败" });
      return;
    }
    setCreateFeedback({ type: "success", message: "季度已创建" });
    startTransition(() => router.refresh());
  }

  async function updateQuarter(quarterId: string, formData: FormData) {
    setEditFeedback((current) => ({ ...current, [quarterId]: null }));
    const response = await fetch(`/api/v1/quarters/${quarterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        start_date: formData.get("startDate"),
        end_date: formData.get("endDate")
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setEditFeedback((current) => ({
        ...current,
        [quarterId]: { type: "error", message: result.error ?? "季度更新失败" }
      }));
      return;
    }
    setEditFeedback((current) => ({
      ...current,
      [quarterId]: { type: "success", message: "季度已更新" }
    }));
    startTransition(() => router.refresh());
  }

  if (!canManage) return null;

  return (
    <section className="mb-4 rounded-lg border border-line bg-card p-5 shadow-panel">
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div>
          <h2 className="font-semibold text-ink">创建季度</h2>
          <p className="mt-1 text-sm text-steel">用于启动新的季度节奏。状态建议先设为 planning，再逐步推进。</p>
          <form action={createQuarter} className="mt-4 grid gap-3">
            <input name="name" required className="okr-input" placeholder="如 2026 Q3" />
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-steel">开始日期</span>
                <input name="startDate" type="date" required className="okr-input" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-steel">结束日期</span>
                <input name="endDate" type="date" required className="okr-input" />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-steel">初始状态</span>
              <select name="status" defaultValue="planning" className="okr-input">
                <option value="planning">planning</option>
                <option value="active">active</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPending ? "提交中..." : "创建季度"}
            </button>
            <FeedbackMessage feedback={createFeedback} />
          </form>
        </div>

        <div>
          <h2 className="font-semibold text-ink">更新季度</h2>
          <p className="mt-1 text-sm text-steel">可修改季度名称和起止日期；归档季度仍保持只读。</p>
          <div className="mt-4 space-y-3">
            {quarters.map((quarter) => (
              <form key={quarter.id} action={(formData) => updateQuarter(quarter.id, formData)} className="rounded-md border border-line bg-hover p-4">
                <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-end">
                  <label className="grid gap-1 text-sm">
                    <span className="text-steel">季度名称</span>
                    <input name="name" required defaultValue={quarter.name} className="okr-input" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-steel">开始日期</span>
                    <input name="startDate" type="date" required defaultValue={quarter.startDate} className="okr-input" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-steel">结束日期</span>
                    <input name="endDate" type="date" required defaultValue={quarter.endDate} className="okr-input" />
                  </label>
                  <button
                    type="submit"
                    disabled={isPending || quarter.status === "archived"}
                    className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    更新季度
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                  <span>当前状态：{quarter.status}</span>
                  {quarter.status === "archived" ? <span>已归档，只读</span> : null}
                </div>
                <div className="mt-2">
                  <FeedbackMessage feedback={editFeedback[quarter.id] ?? null} />
                </div>
              </form>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return <p className={feedback.type === "success" ? "text-sm text-primary" : "text-sm text-status-red"}>{feedback.message}</p>;
}
