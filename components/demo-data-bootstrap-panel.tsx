"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Summary = {
  quarter: string;
  department: string;
  manager: string;
  member: string;
  createdObjectives: number;
  createdKeyResults: number;
  createdAlignments: number;
  createdMetrics: number;
  createdMetricRecords: number;
  currentWeek: number;
};

export function DemoDataBootstrapPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  async function bootstrapDemoData() {
    setMessage("");
    setSummary(null);
    const response = await fetch("/api/v1/demo/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "补齐演示数据失败");
      return;
    }
    setMessage(result.message ?? "最小演示数据已补齐");
    setSummary(result.summary ?? null);
    startTransition(() => router.refresh());
  }

  return (
    <section className="mt-6 rounded-lg border border-line bg-card p-5 shadow-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold text-ink">演示数据</h2>
          <p className="mt-1 text-sm text-steel">
            一键补齐最小业务样例，给看板、报表、季度导出和健康指标提供可展示内容。重复执行时会尽量复用已有演示数据，不会无限追加。
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(bootstrapDemoData)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "补齐中..." : "补齐最小演示数据"}
        </button>
      </div>
      {message ? <div className="mt-3 text-sm text-steel">{message}</div> : null}
      {summary ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DemoItem label="季度" value={summary.quarter} />
          <DemoItem label="部门" value={summary.department} />
          <DemoItem label="演示负责人" value={`${summary.manager} / ${summary.member}`} />
          <DemoItem label="当前周次" value={`第 ${summary.currentWeek} 周`} />
          <DemoItem label="新增 Objective" value={String(summary.createdObjectives)} />
          <DemoItem label="新增 KR" value={String(summary.createdKeyResults)} />
          <DemoItem label="新增对齐" value={String(summary.createdAlignments)} />
          <DemoItem label="新增健康数据" value={`${summary.createdMetrics} / ${summary.createdMetricRecords}`} />
        </div>
      ) : null}
    </section>
  );
}

function DemoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-hover p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
