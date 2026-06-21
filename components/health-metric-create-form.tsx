"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type Props = {
  canCreate: boolean;
  role: string;
  departments: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; departmentId?: string }>;
  currentDepartmentId?: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function HealthMetricCreateForm({ canCreate, role, departments, users, currentDepartmentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [level, setLevel] = useState(role === "super_admin" ? "company" : "department");
  const [thresholdType, setThresholdType] = useState("gte");
  const visibleDepartments = role === "super_admin" ? departments : departments.filter((department) => department.id === currentDepartmentId);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(visibleDepartments[0]?.id ?? "");
  const ownerOptions = useMemo(() => {
    if (level === "company") return users;
    return users.filter((user) => user.departmentId === selectedDepartmentId);
  }, [level, selectedDepartmentId, users]);

  async function createMetric(formData: FormData) {
    setFeedback(null);
    const response = await fetch("/api/v1/health-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
        level,
        department_id: level === "department" ? formData.get("departmentId") : undefined,
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
      setFeedback({ type: "error", message: result.error ?? "创建失败" });
      return;
    }

    setFeedback({ type: "success", message: "健康指标已创建" });
    startTransition(() => router.refresh());
  }

  if (!canCreate) return null;

  return (
    <form action={createMetric} className="rounded-lg border border-line bg-card p-4 shadow-panel">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-steel">指标名称</span>
          <input name="name" required maxLength={40} className="h-9 w-full rounded border border-line bg-card px-3 text-sm outline-none focus:border-primary" placeholder="例如：客户满意度健康度" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-steel">层级</span>
            <select
              value={level}
              onChange={(event) => {
                setLevel(event.target.value);
                if (event.target.value === "department" && !selectedDepartmentId) setSelectedDepartmentId(visibleDepartments[0]?.id ?? "");
              }}
              className="h-9 w-full rounded border border-line bg-card px-3 text-sm outline-none focus:border-primary"
            >
            {role === "super_admin" ? <option value="company">公司级</option> : null}
            <option value="department">部门级</option>
          </select>
        </label>
        {level === "department" ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-steel">部门</span>
            <select
              name="departmentId"
              value={selectedDepartmentId}
              onChange={(event) => setSelectedDepartmentId(event.target.value)}
              className="h-9 w-full rounded border border-line bg-card px-3 text-sm outline-none focus:border-primary"
            >
              {visibleDepartments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-steel">负责人</span>
          <select name="ownerId" required className="h-9 w-full rounded border border-line bg-card px-3 text-sm outline-none focus:border-primary">
            {ownerOptions.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-steel">阈值类型</span>
          <select value={thresholdType} onChange={(event) => setThresholdType(event.target.value)} className="h-9 w-full rounded border border-line bg-card px-3 text-sm outline-none focus:border-primary">
            <option value="gte">不低于</option>
            <option value="lte">不超过</option>
            <option value="between">保持区间</option>
          </select>
        </label>
        {thresholdType === "between" ? (
          <>
            <NumberField name="thresholdMin" label="区间下限" />
            <NumberField name="thresholdMax" label="区间上限" />
          </>
        ) : (
          <NumberField name="thresholdValue" label="阈值" defaultValue="7" />
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-steel">更新频率</span>
          <select name="updateFrequency" defaultValue="weekly" className="h-9 w-full rounded border border-line bg-card px-3 text-sm outline-none focus:border-primary">
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
            <option value="quarterly">每季度</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-steel">说明</span>
        <input name="description" maxLength={120} className="h-9 w-full rounded border border-line bg-card px-3 text-sm outline-none focus:border-primary" placeholder="说明这个底线指标为什么重要" />
      </label>
      <div className="mt-2 text-xs text-muted">健康度按 0-10 录入，最多保留 1 位小数；默认 7.0-10.0 为健康，4.0-6.9 为预警，0-3.9 为超限。</div>
      <div className="mt-4 flex items-center gap-3">
        <button disabled={isPending} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60">
          {isPending ? "创建中..." : "创建健康指标"}
        </button>
        {feedback ? <span className={feedback.type === "success" ? "text-xs font-medium text-primary" : "text-xs font-medium text-status-red"}>{feedback.message}</span> : null}
      </div>
    </form>
  );
}

function NumberField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-steel">{label}</span>
      <input name={name} type="number" min="0" max="10" step="0.1" required defaultValue={defaultValue} className="h-9 w-full rounded border border-line bg-card px-3 text-sm outline-none focus:border-primary" />
    </label>
  );
}
