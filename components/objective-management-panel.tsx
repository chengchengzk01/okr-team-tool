"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  objectiveId: string;
  initialTitle: string;
  canEdit: boolean;
  canDelete: boolean;
  isReadOnly: boolean;
  readOnlyMessage?: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function ObjectiveManagementPanel({ objectiveId, initialTitle, canEdit, canDelete, isReadOnly, readOnlyMessage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function updateObjective(formData: FormData) {
    setFeedback(null);
    const response = await fetch(`/api/v1/objectives/${objectiveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title")
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error ?? "Objective 更新失败" });
      return;
    }
    setFeedback({ type: "success", message: "Objective 已更新" });
    startTransition(() => router.refresh());
  }

  async function deleteObjective() {
    setFeedback(null);
    const response = await fetch(`/api/v1/objectives/${objectiveId}`, {
      method: "DELETE"
    });
    const result = await response.json();
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error ?? "Objective 删除失败" });
      return;
    }
    router.push("/okr");
    router.refresh();
  }

  if (!canEdit && !canDelete) {
    if (readOnlyMessage) {
      return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">{readOnlyMessage}</div>;
    }
    return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">你可以查看该 Objective，但没有编辑权限。</div>;
  }

  if (isReadOnly) {
    return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">{readOnlyMessage ?? "季度已归档，Objective 只读。"}</div>;
  }

  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Objective 管理</h2>
      <p className="mt-1 text-sm text-steel">可更新 Objective 标题；当前季度已进入执行阶段，仅超级管理员可继续调整 OKR，删除仅在季度设定期开放。</p>
      <form action={updateObjective} className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="grid gap-1 text-sm">
          <span className="text-steel">Objective 标题</span>
          <input name="title" required maxLength={50} defaultValue={initialTitle} className="okr-input" />
        </label>
        <button
          type="submit"
          disabled={!canEdit || isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "保存中..." : "更新 Objective"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canDelete || isPending}
          onClick={deleteObjective}
          className="rounded-md border border-status-red px-4 py-2 text-sm font-medium text-status-red disabled:cursor-not-allowed disabled:opacity-60"
        >
          删除 Objective
        </button>
        {feedback ? (
          <p className={feedback.type === "success" ? "text-sm text-primary" : "text-sm text-status-red"}>{feedback.message}</p>
        ) : null}
      </div>
    </section>
  );
}
