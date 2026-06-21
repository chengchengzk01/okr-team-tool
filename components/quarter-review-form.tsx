"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { QuarterReview } from "@/lib/domain/types";

type Props = {
  quarterId: string;
  quarterStatus: "planning" | "active" | "reviewing" | "archived";
  role: "super_admin" | "dept_manager" | "member";
  review?: QuarterReview;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function QuarterReviewForm({ quarterId, quarterStatus, role, review }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function submitReview(formData: FormData) {
    setFeedback(null);
    const response = await fetch(`/api/v1/quarters/${quarterId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: review?.id,
        what_worked: formData.get("whatWorked"),
        what_didnt: formData.get("whatDidnt"),
        health_summary: formData.get("healthSummary"),
        next_quarter_insights: formData.get("nextQuarterInsights")
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error ?? "季度 Review 保存失败" });
      return;
    }
    setFeedback({ type: "success", message: "季度 Review 已保存" });
    startTransition(() => router.refresh());
  }

  if (quarterStatus === "archived") {
    return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">季度已归档，整体 Review 只读。</div>;
  }

  if (quarterStatus !== "reviewing") {
    return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">季度尚未进入复盘阶段，整体季度 Review 入口暂未开放。</div>;
  }

  return (
    <form action={submitReview} className="rounded-lg border border-line bg-card p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">{reviewTitle(role)}</h2>
      <p className="mt-1 text-sm text-steel">沉淀本季度有效做法、主要问题、健康指标表现和下季度启示。</p>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">有效做法</span>
          <textarea
            name="whatWorked"
            required
            defaultValue={review?.whatWorked ?? ""}
            className="min-h-24 rounded border border-line bg-card px-3 py-2 outline-none transition focus:border-primary"
            placeholder="本季度哪些做法值得保留"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">问题与阻碍</span>
          <textarea
            name="whatDidnt"
            required
            defaultValue={review?.whatDidnt ?? ""}
            className="min-h-24 rounded border border-line bg-card px-3 py-2 outline-none transition focus:border-primary"
            placeholder="本季度哪些问题需要下次避免"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">健康指标表现回顾</span>
          <textarea
            name="healthSummary"
            defaultValue={review?.healthSummary ?? ""}
            className="min-h-20 rounded border border-line bg-card px-3 py-2 outline-none transition focus:border-primary"
            placeholder="可选"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">下季度启示</span>
          <textarea
            name="nextQuarterInsights"
            defaultValue={review?.nextQuarterInsights ?? ""}
            className="min-h-20 rounded border border-line bg-card px-3 py-2 outline-none transition focus:border-primary"
            placeholder="可选"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button disabled={isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "保存中..." : review ? "更新季度 Review" : "提交季度 Review"}
        </button>
        {feedback ? <p className={feedback.type === "success" ? "text-sm text-primary" : "text-sm text-status-red"}>{feedback.message}</p> : null}
      </div>
    </form>
  );
}

function reviewTitle(role: Props["role"]) {
  if (role === "super_admin") return "公司级季度 Review";
  if (role === "dept_manager") return "部门级季度 Review";
  return "个人季度 Review";
}
