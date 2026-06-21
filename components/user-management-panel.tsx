"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Department, Role, User } from "@/lib/domain/types";

type EditableRow = {
  role: Role;
  departmentId: string;
  isActive: boolean;
};

type Feedback = Record<string, { type: "success" | "error"; message: string } | undefined>;

export function UserManagementPanel({
  users,
  departments
}: {
  users: User[];
  departments: Department[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [rows, setRows] = useState<Record<string, EditableRow>>(() =>
    Object.fromEntries(
      users.map((user) => [
        user.id,
        {
          role: user.role,
          departmentId: user.departmentId ?? "",
          isActive: user.isActive
        }
      ])
    )
  );
  const departmentOptions = useMemo(
    () => departments.filter((department) => department.id !== "dept-company"),
    [departments]
  );

  async function saveUser(userId: string) {
    setFeedback((current) => ({ ...current, [userId]: undefined }));
    const row = rows[userId];
    const response = await fetch(`/api/v1/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: row.role,
        department_id: row.departmentId || null,
        is_active: row.isActive
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setFeedback((current) => ({ ...current, [userId]: { type: "error", message: result.error ?? "用户更新失败" } }));
      return;
    }
    setFeedback((current) => ({ ...current, [userId]: { type: "success", message: "用户设置已保存" } }));
    startTransition(() => router.refresh());
  }

  return (
    <section className="mt-6 rounded-lg border border-line bg-card p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">用户管理</h2>
          <p className="mt-1 text-sm text-steel">维护角色、部门归属和启用状态。超级管理员唯一性仍由服务端强校验。</p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-line">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-muted-surface text-xs text-steel">
            <tr>
              <th className="px-3 py-2 font-medium">姓名</th>
              <th className="px-3 py-2 font-medium">邮箱</th>
              <th className="px-3 py-2 font-medium">角色</th>
              <th className="px-3 py-2 font-medium">部门</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const row = rows[user.id];
              const rowFeedback = feedback[user.id];

              return (
                <tr key={user.id} className="border-t border-line align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium text-ink">{user.name}</div>
                    <div className="mt-1 text-xs text-muted">{user.feishuUserId}</div>
                  </td>
                  <td className="px-3 py-3 text-steel">{user.email ?? "-"}</td>
                  <td className="px-3 py-3">
                    <select
                      value={row.role}
                      onChange={(event) => updateRow(user.id, { role: event.target.value as Role })}
                      className="okr-input min-w-36"
                    >
                      <option value="super_admin">超级管理员</option>
                      <option value="dept_manager">部门管理者</option>
                      <option value="member">成员</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={row.departmentId}
                      onChange={(event) => updateRow(user.id, { departmentId: event.target.value })}
                      className="okr-input min-w-40"
                    >
                      <option value="">未分配</option>
                      {departmentOptions.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <label className="inline-flex items-center gap-2 text-steel">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(event) => updateRow(user.id, { isActive: event.target.checked })}
                      />
                      <span>{row.isActive ? "启用" : "停用"}</span>
                    </label>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => saveUser(user.id)}
                      className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      保存
                    </button>
                    {rowFeedback ? (
                      <div className={rowFeedback.type === "success" ? "mt-2 text-xs text-primary" : "mt-2 text-xs text-status-red"}>
                        {rowFeedback.message}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  function updateRow(userId: string, patch: Partial<EditableRow>) {
    setRows((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        ...patch
      }
    }));
  }
}
