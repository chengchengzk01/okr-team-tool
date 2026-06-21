"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { KeyResultReview } from "@/lib/domain/types";

type Props = {
  keyResultId: string;
  quarterId: string;
  canReview: boolean;
  isReadOnly: boolean;
  isReviewing: boolean;
  currentValue: number;
  review?: KeyResultReview;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function KeyResultReviewForm({ keyResultId, quarterId, canReview, isReadOnly, isReviewing, currentValue, review }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function submitReview(formData: FormData) {
    setFeedback(null);
    const response = await fetch(`/api/v1/key-results/${keyResultId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quarter_id: quarterId,
        final_value: formData.get("finalValue"),
        confidence_score: formData.get("confidenceScore"),
        what_worked: formData.get("whatWorked"),
        what_didnt: formData.get("whatDidnt"),
        next_step: formData.get("nextStep")
      })
    });

    const result = await response.json();
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error ?? "提交失败" });
      return;
    }

    setFeedback({ type: "success", message: "KR 复盘已保存" });
    startTransition(() => router.refresh());
  }

  if (isReadOnly) {
    return <div className="mt-4 border border-line bg-paper p-3 text-sm text-steel">季度已归档，复盘只读。</div>;
  }

  if (!isReviewing) {
    return <div className="mt-4 border border-line bg-paper p-3 text-sm text-steel">季度尚未进入复盘阶段，KR 最终复盘入口暂未开放。</div>;
  }

  if (!canReview) {
    return <div className="mt-4 border border-line bg-paper p-3 text-sm text-steel">仅 KR 负责人、部门管理者或超级管理员可提交复盘。</div>;
  }

  return (
    <form action={submitReview} className="mt-4 grid gap-3 border border-line bg-paper p-4 lg:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">最终值</span>
        <input
          name="finalValue"
          type="number"
          step="0.01"
          required
          className="w-full rounded border border-line bg-card px-3 py-2 outline-none transition focus:border-primary"
          defaultValue={review?.finalValue ?? currentValue}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">复盘信心值</span>
        <input
          name="confidenceScore"
          type="number"
          min={1}
          max={10}
          step={1}
          required
          className="w-full rounded border border-line bg-card px-3 py-2 outline-none transition focus:border-primary"
          defaultValue={review?.confidenceScore ?? 7}
        />
      </label>
      <label className="block lg:col-span-2">
        <span className="mb-1 block text-sm font-semibold text-ink">有效做法</span>
        <textarea
          name="whatWorked"
          required
          className="min-h-20 w-full rounded border border-line bg-card px-3 py-2 outline-none transition focus:border-primary"
          defaultValue={review?.whatWorked ?? ""}
          placeholder="哪些做法值得保留"
        />
      </label>
      <label className="block lg:col-span-2">
        <span className="mb-1 block text-sm font-semibold text-ink">问题与阻碍</span>
        <textarea
          name="whatDidnt"
          required
          className="min-h-20 w-full rounded border border-line bg-card px-3 py-2 outline-none transition focus:border-primary"
          defaultValue={review?.whatDidnt ?? ""}
          placeholder="哪些地方没有达到预期"
        />
      </label>
      <label className="block lg:col-span-2">
        <span className="mb-1 block text-sm font-semibold text-ink">下季度动作</span>
        <textarea
          name="nextStep"
          className="min-h-16 w-full rounded border border-line bg-card px-3 py-2 outline-none transition focus:border-primary"
          defaultValue={review?.nextStep ?? ""}
          placeholder="可选"
        />
      </label>
      <div className="flex items-center gap-3 lg:col-span-2">
        <button disabled={isPending} className="rounded-md bg-primary px-4 py-2 text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "保存中..." : review ? "更新复盘" : "提交复盘"}
        </button>
        {feedback ? (
          <p className={feedback.type === "success" ? "text-sm font-semibold text-primary" : "text-sm font-semibold text-status-red"}>
            {feedback.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
