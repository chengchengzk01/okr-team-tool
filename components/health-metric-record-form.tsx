"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  metricId: string;
  canUpdate: boolean;
  latestValue?: number;
  thresholdType: "gte" | "lte" | "between";
  thresholdValue?: number;
  thresholdMin?: number;
  thresholdMax?: number;
  inputMin?: number;
  inputMax?: number;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function HealthMetricRecordForm({
  metricId,
  canUpdate,
  latestValue,
  thresholdType,
  thresholdValue,
  thresholdMin,
  thresholdMax,
  inputMin,
  inputMax
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const guidance = getThresholdGuidance({ thresholdType, thresholdValue, thresholdMin, thresholdMax, inputMin, inputMax });

  async function submitRecord(formData: FormData) {
    setFeedback(null);
    const response = await fetch(`/api/v1/health-metrics/${metricId}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_value: formData.get("currentValue"),
        note: formData.get("note")
      })
    });

    const result = await response.json();
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error ?? "更新失败" });
      return;
    }

    setFeedback({ type: "success", message: "健康度已更新" });
    startTransition(() => router.refresh());
  }

  if (!canUpdate) {
    return <div className="mt-3 text-xs text-muted">仅指标负责人或超级管理员可更新。</div>;
  }

  return (
    <form action={submitRecord} className="mt-4 rounded-md border border-line bg-hover p-4">
      <div className="grid gap-3 lg:grid-cols-[180px_minmax(260px,1fr)_auto] lg:items-start">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-steel">最新健康度</span>
          <input
            name="currentValue"
            type="number"
            step="0.1"
            min={inputMin ?? 0}
            max={inputMax}
            required
            className="h-9 w-full rounded border border-line bg-card px-3 text-sm text-ink outline-none transition focus:border-primary"
            defaultValue={latestValue ?? ""}
            placeholder="0-10"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-steel">备注</span>
          <input
            name="note"
            className="h-9 w-full rounded border border-line bg-card px-3 text-sm text-ink outline-none transition focus:border-primary"
            placeholder="说明本次变化原因"
          />
        </label>
        <button
          disabled={isPending}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "更新中..." : "确认更新健康度"}
        </button>
      </div>
      <div className="mt-2 text-xs leading-5 text-muted">{guidance}</div>
      {feedback ? (
        <p className={feedback.type === "success" ? "mt-2 text-xs font-medium text-primary" : "mt-2 text-xs font-medium text-status-red"}>
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}

function getThresholdGuidance({
  thresholdType,
  thresholdValue,
  thresholdMin,
  thresholdMax,
  inputMin,
  inputMax
}: {
  thresholdType: "gte" | "lte" | "between";
  thresholdValue?: number;
  thresholdMin?: number;
  thresholdMax?: number;
  inputMin?: number;
  inputMax?: number;
}) {
  const inputRange = getInputRangeText(inputMin, inputMax);

  if (thresholdType === "gte") {
    const target = thresholdValue ?? 0;
    if (target === 7 && inputMax === 10) {
      return `${inputRange}，最多保留 1 位小数。7.0 至 10.0 为健康；4.0 至 6.9 为预警；0 至 3.9 为超限。`;
    }
    const warningFloor = round(target * 0.85);
    return `${inputRange}。${target} 及以上为健康；${warningFloor} 至 ${round(target - 0.01)} 为预警；低于 ${warningFloor} 为超限。`;
  }

  if (thresholdType === "lte") {
    const target = thresholdValue ?? 0;
    const warningCeiling = round(target * 1.15);
    return `${inputRange}。${target} 及以下为健康；高于 ${target} 且不超过 ${warningCeiling} 为预警；高于 ${warningCeiling} 为超限。`;
  }

  const min = thresholdMin ?? 0;
  const max = thresholdMax ?? 0;
  const lowerWarningFloor = round(min * 0.85);
  const upperWarningCeiling = round(max * 1.15);
  return `${inputRange}。${min} 至 ${max} 为健康；${lowerWarningFloor} 至 ${round(min - 0.01)} 或 ${round(max + 0.01)} 至 ${upperWarningCeiling} 为预警；超出预警范围为超限。`;
}

function getInputRangeText(inputMin?: number, inputMax?: number) {
  if (inputMin !== undefined && inputMax !== undefined) return `可填 ${inputMin} 至 ${inputMax} 的数字`;
  if (inputMin !== undefined) return `可填 ${inputMin} 及以上数字`;
  if (inputMax !== undefined) return `可填不超过 ${inputMax} 的数字`;
  return "可填 0 及以上数字";
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
