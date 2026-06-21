"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type Props = {
  metricId: string;
  isActive: boolean;
  canManage: boolean;
  initialValues: {
    name: string;
    description?: string;
    ownerId: string;
    thresholdType: "gte" | "lte" | "between";
    thresholdValue?: number;
    thresholdMin?: number;
    thresholdMax?: number;
    updateFrequency: "weekly" | "monthly" | "quarterly";
    level: "company" | "department";
    departmentId?: string;
  };
  users: Array<{ id: string; name: string; departmentId?: string }>;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function HealthMetricManagementPanel({ metricId, isActive, canManage, initialValues, users }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [thresholdType, setThresholdType] = useState(initialValues.thresholdType);
  const ownerOptions = useMemo(() => {
    if (initialValues.level === "company") return users;
    return users.filter((user) => user.departmentId === initialValues.departmentId);
  }, [initialValues.departmentId, initialValues.level, users]);

  async function updateMetric(formData: FormData) {
    setFeedback(null);
    const response = await fetch(`/api/v1/health-metrics/${metricId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
        owner_id: formData.get("ownerId"),
        threshold_type: thresholdType,
        threshold_value: thresholdType === "between" ? undefined : formData.get("thresholdValue"),
        threshold_min: thresholdType === "between" ? formData.get("thresholdMin") : undefined,
        threshold_max: thresholdType === "between" ? formData.get("thresholdMax") : undefined,
        update_frequency: formData.get("updateFrequency")
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error ?? "健康指标更新失败" });
      return;
    }
    setFeedback({ type: "success", message: "健康指标配置已更新" });
    startTransition(() => router.refresh());
  }

  async function archiveMetric() {
    setFeedback(null);
    const response = await fetch(`/api/v1/health-metrics/${metricId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error ?? "健康指标归档失败" });
      return;
    }
    router.push("/health");
    router.refresh();
  }

  if (!canManage) {
    return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">只有部门管理者或超级管理员可以修改或归档该健康指标。</div>;
  }

  if (!isActive) {
    return <div className="rounded-lg border border-line bg-paper p-4 text-sm text-steel">该健康指标已归档，只读。</div>;
  }

  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">健康指标管理</h2>
      <p className="mt-1 text-sm text-steel">可更新指标配置；归档后历史记录保留，但不再允许继续录入。</p>

      <form action={updateMetric} className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span className="text-steel">指标名称</span>
          <input name="name" required maxLength={40} defaultValue={initialValues.name} className="okr-input" />
        </label>
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span className="text-steel">说明</span>
          <input name="description" maxLength={120} defaultValue={initialValues.description ?? ""} className="okr-input" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">负责人</span>
          <select name="ownerId" defaultValue={initialValues.ownerId} className="okr-input">
            {ownerOptions.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">更新频率</span>
          <select name="updateFrequency" defaultValue={initialValues.updateFrequency} className="okr-input">
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
            <option value="quarterly">每季度</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">阈值类型</span>
          <select value={thresholdType} onChange={(event) => setThresholdType(event.target.value as typeof thresholdType)} className="okr-input">
            <option value="gte">不低于</option>
            <option value="lte">不超过</option>
            <option value="between">保持区间</option>
          </select>
        </label>
        <div className="grid gap-3 lg:grid-cols-2">
          {thresholdType === "between" ? (
            <>
              <NumberField name="thresholdMin" label="区间下限" defaultValue={initialValues.thresholdMin} />
              <NumberField name="thresholdMax" label="区间上限" defaultValue={initialValues.thresholdMax} />
            </>
          ) : (
            <NumberField name="thresholdValue" label="阈值" defaultValue={initialValues.thresholdValue} />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "保存中..." : "更新健康指标"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={archiveMetric}
            className="rounded-md border border-status-red px-4 py-2 text-sm font-medium text-status-red disabled:cursor-not-allowed disabled:opacity-60"
          >
            归档健康指标
          </button>
          {feedback ? (
            <p className={feedback.type === "success" ? "text-sm text-primary" : "text-sm text-status-red"}>{feedback.message}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function NumberField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: number }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-steel">{label}</span>
      <input name={name} type="number" min="0" max="10" step="0.1" required defaultValue={defaultValue} className="okr-input" />
    </label>
  );
}
