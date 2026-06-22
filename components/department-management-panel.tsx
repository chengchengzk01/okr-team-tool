"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { getDepartmentDisplayName } from "@/lib/department-utils";
import type { Department } from "@/lib/domain/types";

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function DepartmentManagementPanel({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [globalFeedback, setGlobalFeedback] = useState<Feedback | null>(null);
  const [rowFeedback, setRowFeedback] = useState<Record<string, Feedback | undefined>>({});
  const [draftNames, setDraftNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(departments.map((department) => [department.id, department.name]))
  );
  const departmentNameCounts = useMemo(
    () =>
      departments.reduce<Record<string, number>>((counts, department) => {
        counts[department.name] = (counts[department.name] ?? 0) + 1;
        return counts;
      }, {}),
    [departments]
  );

  async function createDepartment() {
    setGlobalFeedback(null);
    const response = await fetch("/api/v1/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDepartmentName })
    });
    const result = await response.json();
    if (!response.ok) {
      setGlobalFeedback({ type: "error", message: result.error ?? "新增部门失败" });
      return;
    }
    setNewDepartmentName("");
    setGlobalFeedback({ type: "success", message: "部门已新增" });
    startTransition(() => router.refresh());
  }

  async function saveDepartment(id: string) {
    setRowFeedback((current) => ({ ...current, [id]: undefined }));
    const response = await fetch(`/api/v1/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draftNames[id] })
    });
    const result = await response.json();
    if (!response.ok) {
      setRowFeedback((current) => ({ ...current, [id]: { type: "error", message: result.error ?? "部门保存失败" } }));
      return;
    }
    setRowFeedback((current) => ({ ...current, [id]: { type: "success", message: "部门名称已保存" } }));
    startTransition(() => router.refresh());
  }

  async function deleteDepartment(id: string) {
    setRowFeedback((current) => ({ ...current, [id]: undefined }));
    const response = await fetch(`/api/v1/departments/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setRowFeedback((current) => ({ ...current, [id]: { type: "error", message: result.error ?? "删除部门失败" } }));
      return;
    }
    setRowFeedback((current) => ({ ...current, [id]: { type: "success", message: "部门已删除" } }));
    startTransition(() => router.refresh());
  }

  return (
    <section className="mt-6 rounded-lg border border-line bg-card p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-semibold text-ink">部门管理</h2>
          <p className="mt-1 text-sm text-steel">支持手动新增部门、修改名称；删除仅开放给本地新建部门，飞书同步部门保留同步关系。</p>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <input
            value={newDepartmentName}
            onChange={(event) => setNewDepartmentName(event.target.value)}
            className="okr-input flex-1"
            placeholder="输入新部门名称"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={createDepartment}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            新增部门
          </button>
        </div>
      </div>
      {globalFeedback ? (
        <div className={globalFeedback.type === "success" ? "mt-3 text-sm text-primary" : "mt-3 text-sm text-status-red"}>
          {globalFeedback.message}
        </div>
      ) : null}
      <div className="mt-4 overflow-x-auto rounded-md border border-line">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-muted-surface text-xs text-steel">
            <tr>
              <th className="px-3 py-2 font-medium">当前显示</th>
              <th className="px-3 py-2 font-medium">来源</th>
              <th className="px-3 py-2 font-medium">名称修改</th>
              <th className="px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => {
              const feedback = rowFeedback[department.id];
              const isSynced = Boolean(department.feishuDeptId);
              const canDelete = !isSynced;
              return (
                <tr key={department.id} className="border-t border-line align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium text-ink">
                      {getDepartmentDisplayName(department, departmentNameCounts[department.name] ?? 0)}
                    </div>
                    <div className="mt-1 text-xs text-muted">{department.feishuDeptId ?? department.id}</div>
                  </td>
                  <td className="px-3 py-3 text-steel">{isSynced ? "飞书同步" : "本地新增"}</td>
                  <td className="px-3 py-3">
                    <input
                      value={draftNames[department.id] ?? ""}
                      onChange={(event) =>
                        setDraftNames((current) => ({
                          ...current,
                          [department.id]: event.target.value
                        }))
                      }
                      className="okr-input min-w-56"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => saveDepartment(department.id)}
                        className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        保存名称
                      </button>
                      <button
                        type="button"
                        disabled={isPending || !canDelete}
                        onClick={() => deleteDepartment(department.id)}
                        className="rounded-md border border-line px-3 py-2 text-sm font-medium text-steel transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        删除
                      </button>
                    </div>
                    {feedback ? (
                      <div className={feedback.type === "success" ? "mt-2 text-xs text-primary" : "mt-2 text-xs text-status-red"}>
                        {feedback.message}
                      </div>
                    ) : null}
                    {!canDelete ? <div className="mt-2 text-xs text-muted">飞书同步部门不支持删除。</div> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs leading-5 text-muted">
        如果飞书同步回来的部门名缺失，系统会保留你手动改过的名称，不会再被泛化成重复的“未命名部门”。
      </div>
    </section>
  );
}
