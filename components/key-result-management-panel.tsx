"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  keyResultId: string;
  initialValues: {
    description: string;
    startValue: number;
    currentValue: number;
    targetValue: number;
    unit?: string;
    dueDate: string;
  };
  canEdit: boolean;
  canDelete: boolean;
  isReadOnly: boolean;
  readOnlyMessage?: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function KeyResultManagementPanel({ keyResultId, initialValues, canEdit, canDelete, isReadOnly, readOnlyMessage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function updateKeyResult(formData: FormData) {
    setFeedback(null);
    const response = await fetch(`/api/v1/key-results/${keyResultId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: formData.get("description"),
        start_value: formData.get("startValue"),
        current_value: formData.get("currentValue"),
        target_value: formData.get("targetValue"),
        unit: formData.get("unit"),
        due_date: formData.get("dueDate")
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error ?? "KR 更新失败" });
      return;
    }
    setFeedback({ type: "success", message: "KR 已更新" });
    startTransition(() => router.refresh());
  }

  async function deleteKeyResult() {
    setFeedback(null);
    const response = await fetch(`/api/v1/key-results/${keyResultId}`, {
      method: "DELETE"
    });
    const result = await response.json();
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error ?? "KR 删除失败" });
      return;
    }
    router.push("/okr");
    router.refresh();
  }

  if (!canEdit && !canDelete) {
    if (readOnlyMessage) {
      return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">{readOnlyMessage}</div>;
    }
    return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">你可以查看该 KR，但没有编辑权限。</div>;
  }

  if (isReadOnly) {
    return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">{readOnlyMessage ?? "季度已归档，KR 只读。"}</div>;
  }

  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">KR 管理</h2>
      <p className="mt-1 text-sm text-steel">可更新 KR 目标与当前值；当前季度已进入执行阶段，仅超级管理员可继续调整 OKR，删除仅在季度设定期开放。</p>
      <form action={updateKeyResult} className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span className="text-steel">KR 描述</span>
          <input name="description" required maxLength={100} defaultValue={initialValues.description} className="okr-input" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">起始值</span>
          <input name="startValue" type="number" step="0.1" required defaultValue={initialValues.startValue} className="okr-input" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">当前值</span>
          <input name="currentValue" type="number" step="0.1" required defaultValue={initialValues.currentValue} className="okr-input" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">目标值</span>
          <input name="targetValue" type="number" step="0.1" required defaultValue={initialValues.targetValue} className="okr-input" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">单位</span>
          <input name="unit" defaultValue={initialValues.unit ?? ""} className="okr-input" />
        </label>
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span className="text-steel">截止日期</span>
          <input name="dueDate" type="date" required defaultValue={initialValues.dueDate} className="okr-input" />
        </label>
        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button
            type="submit"
            disabled={!canEdit || isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "保存中..." : "更新 KR"}
          </button>
          <button
            type="button"
            disabled={!canDelete || isPending}
            onClick={deleteKeyResult}
            className="rounded-md border border-status-red px-4 py-2 text-sm font-medium text-status-red disabled:cursor-not-allowed disabled:opacity-60"
          >
            删除 KR
          </button>
          {feedback ? (
            <p className={feedback.type === "success" ? "text-sm text-primary" : "text-sm text-status-red"}>{feedback.message}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
