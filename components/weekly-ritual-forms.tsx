"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ConfidenceScore, KeyResult, Mood, WeeklyCelebration, WeeklyCommitment } from "@/lib/domain/types";

type Props = {
  quarterId: string;
  weekNumber: number;
  commitment?: WeeklyCommitment;
  previousCommitment?: WeeklyCommitment;
  celebration?: WeeklyCelebration;
  keyResults: Array<KeyResult & { confidenceScore?: ConfidenceScore; confidenceColor: string }>;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

const moods: Array<{ value: Mood; label: string }> = [
  { value: "energized", label: "充满能量" },
  { value: "steady", label: "稳步前进" },
  { value: "calm", label: "平静" },
  { value: "tired", label: "有些疲惫" },
  { value: "need_support", label: "需要支持" }
];

export function WeeklyRitualForms({ quarterId, weekNumber, commitment, previousCommitment, celebration, keyResults }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [commitmentFeedback, setCommitmentFeedback] = useState<Feedback | null>(null);
  const [celebrationFeedback, setCelebrationFeedback] = useState<Feedback | null>(null);
  const [confidenceFeedback, setConfidenceFeedback] = useState<Record<string, Feedback | null>>({});

  async function submitCommitment(formData: FormData) {
    setCommitmentFeedback(null);
    const response = await fetch("/api/v1/weekly-commitments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quarter_id: quarterId,
        week_number: weekNumber,
        priority_1: formData.get("priority1"),
        priority_2: formData.get("priority2"),
        priority_3: formData.get("priority3"),
        prior_self_review: {
          priority_1_result: formData.get("review1") || undefined,
          priority_2_result: formData.get("review2") || undefined,
          priority_3_result: formData.get("review3") || undefined
        }
      })
    });

    const result = await response.json();
    if (!response.ok) {
      setCommitmentFeedback({ type: "error", message: result.error ?? "提交失败" });
      return;
    }

    setCommitmentFeedback({ type: "success", message: "周一承诺已保存" });
    startTransition(() => router.refresh());
  }

  async function submitCelebration(formData: FormData) {
    setCelebrationFeedback(null);
    const achievements = String(formData.get("achievements") ?? "")
      .split("\n")
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ text }));

    const response = await fetch("/api/v1/weekly-celebrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quarter_id: quarterId,
        week_number: weekNumber,
        achievements,
        obstacles: formData.get("obstacles"),
        mood: formData.get("mood")
      })
    });

    const result = await response.json();
    if (!response.ok) {
      setCelebrationFeedback({ type: "error", message: result.error ?? "提交失败" });
      return;
    }

    setCelebrationFeedback({ type: "success", message: "周五庆祝已提交" });
    startTransition(() => router.refresh());
  }

  async function submitConfidenceScore(keyResultId: string, score: number, note: string) {
    setConfidenceFeedback((current) => ({ ...current, [keyResultId]: null }));
    const response = await fetch(`/api/v1/key-results/${keyResultId}/confidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quarter_id: quarterId,
        week_number: weekNumber,
        score,
        note
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setConfidenceFeedback((current) => ({
        ...current,
        [keyResultId]: { type: "error", message: result.error ?? "信心值更新失败" }
      }));
      return;
    }
    setConfidenceFeedback((current) => ({
      ...current,
      [keyResultId]: { type: "success", message: "信心值已更新" }
    }));
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">周一承诺</h2>
          <p className="mt-1 text-sm text-steel">填写本周最重要的 Top 3 优先级。</p>
        </div>
        <form action={submitCommitment} className="space-y-3">
          {previousCommitment ? (
            <div className="rounded-md border border-line bg-hover p-3">
              <div className="mb-2 text-sm font-semibold text-ink">上周回顾（可选）</div>
              {[previousCommitment.priority1, previousCommitment.priority2, previousCommitment.priority3].map((priority, index) => {
                const reviewKey = `priority_${index + 1}_result`;
                return (
                <label key={`${priority}-${index}`} className="mb-2 grid gap-2 text-sm lg:grid-cols-[1fr_160px]">
                  <span className="text-steel">Top {index + 1}：{priority}</span>
                  <select name={`review${index + 1}`} className="border border-line px-2 py-1" defaultValue={commitment?.priorSelfReview?.[reviewKey] ?? ""}>
                    <option value="">不填写</option>
                    <option value="completed">完成</option>
                    <option value="partial">部分完成</option>
                    <option value="missed">未完成</option>
                  </select>
                </label>
                );
              })}
            </div>
          ) : null}
          <Field name="priority1" label="Top 1" defaultValue={commitment?.priority1 ?? ""} placeholder="本周第一优先级" />
          <Field name="priority2" label="Top 2" defaultValue={commitment?.priority2 ?? ""} placeholder="本周第二优先级" />
          <Field name="priority3" label="Top 3" defaultValue={commitment?.priority3 ?? ""} placeholder="本周第三优先级" />
          <SubmitButton pending={isPending} label={commitment ? "更新承诺" : "提交承诺"} />
          <FeedbackMessage feedback={commitmentFeedback} />
        </form>
      </section>

      <section className="rounded-lg border border-line bg-card p-5 shadow-panel lg:col-span-2">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">更新 KR 信心值</h2>
          <p className="mt-1 text-sm text-steel">按你负责的 KR 更新本周信心值，窗口期为周一至周三。</p>
        </div>
        {keyResults.length ? (
          <div className="space-y-4">
            {keyResults.map((keyResult) => (
              <ConfidenceRow
                key={keyResult.id}
                keyResult={keyResult}
                feedback={confidenceFeedback[keyResult.id] ?? null}
                pending={isPending}
                onSubmit={submitConfidenceScore}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-line bg-hover p-4 text-sm text-steel">你当前没有负责的 KR。</div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">周五庆祝</h2>
          <p className="mt-1 text-sm text-steel">记录完成事项、障碍和当前心情。</p>
        </div>
        {celebration ? (
          <div className="border border-line bg-paper p-4 text-sm leading-6 text-steel">
            本周已提交周五庆祝。当前版本按 PRD 限制同一用户同一周只能提交一次。
          </div>
        ) : (
          <form action={submitCelebration} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">完成事项</span>
              <textarea
                name="achievements"
                required
                className="min-h-28 w-full border border-line px-3 py-2"
                placeholder="每行一条完成事项"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">障碍（可选）</span>
              <textarea name="obstacles" className="min-h-20 w-full border border-line px-3 py-2" placeholder="本周遇到的障碍" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">心情</span>
              <select name="mood" className="w-full border border-line px-3 py-2" defaultValue="steady">
                {moods.map((mood) => (
                  <option key={mood.value} value={mood.value}>
                    {mood.label}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton pending={isPending} label="提交庆祝" />
            <FeedbackMessage feedback={celebrationFeedback} />
          </form>
        )}
      </section>
    </div>
  );
}

function ConfidenceRow({
  keyResult,
  feedback,
  pending,
  onSubmit
}: {
  keyResult: KeyResult & { confidenceScore?: ConfidenceScore; confidenceColor: string };
  feedback: Feedback | null;
  pending: boolean;
  onSubmit: (keyResultId: string, score: number, note: string) => void;
}) {
  const [selectedScore, setSelectedScore] = useState<number | null>(keyResult.confidenceScore?.score ?? null);
  const [note, setNote] = useState(keyResult.confidenceScore?.note ?? "");

  return (
    <div className="rounded-md border border-line bg-hover p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-medium text-ink">{keyResult.description}</div>
          <div className="mt-1 text-xs text-muted">
            当前 {keyResult.currentValue}
            {keyResult.unit} / 目标 {keyResult.targetValue}
            {keyResult.unit}
          </div>
        </div>
        <div className="text-xs text-muted">{keyResult.confidenceScore ? `已更新：${keyResult.confidenceScore.score}` : "本周未更新"}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => setSelectedScore(selectedScore === score ? null : score)}
            className={confidenceButtonClass(score, selectedScore === score)}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto]">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="okr-input"
          placeholder="备注，可选"
        />
        <button
          type="button"
          disabled={pending || selectedScore === null}
          onClick={() => selectedScore !== null && onSubmit(keyResult.id, selectedScore, note)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          更新信心值
        </button>
      </div>
      <FeedbackMessage feedback={feedback} />
    </div>
  );
}

function confidenceButtonClass(score: number, selected: boolean) {
  const statusClass =
    score >= 7
      ? selected
        ? "border-status-green bg-status-green text-white"
        : "border-status-green text-status-green hover:bg-status-green-bg"
      : score >= 4
        ? selected
          ? "border-status-yellow bg-status-yellow text-white"
          : "border-status-yellow text-status-yellow hover:bg-status-yellow-bg"
        : selected
          ? "border-status-red bg-status-red text-white"
          : "border-status-red text-status-red hover:bg-status-red-bg";

  return `h-9 w-9 rounded border text-sm font-medium transition ${statusClass}`;
}

function Field({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      <input
        name={name}
        required
        maxLength={100}
        className="w-full border border-line px-3 py-2"
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button disabled={pending} className="rounded-md bg-primary px-4 py-2 text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? "提交中..." : label}
    </button>
  );
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return (
    <p className={feedback.type === "success" ? "text-sm font-semibold text-primary" : "text-sm font-semibold text-status-red"}>
      {feedback.message}
    </p>
  );
}
