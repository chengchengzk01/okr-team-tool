"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Department, ObjectiveLevel, Quarter, User } from "@/lib/domain/types";
import type { SessionUser } from "@/lib/auth";

type Props = {
  quarterId: string;
  quarterStatus: Quarter["status"];
  currentUser: SessionUser | null;
  users: User[];
  departments: Department[];
  objectives: Array<{ id: string; title: string; level: ObjectiveLevel; ownerId: string }>;
  parentKeyResults: Array<{ id: string; label: string }>;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function OkrAuthoringForms({ quarterId, quarterStatus, currentUser, users, departments, objectives, parentKeyResults }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [objectiveFeedback, setObjectiveFeedback] = useState<Feedback | null>(null);
  const [keyResultFeedback, setKeyResultFeedback] = useState<Feedback | null>(null);
  const allowedLevels = getAllowedObjectiveLevels(currentUser?.role);
  const allowedDepartments = getAllowedDepartments(departments, currentUser);
  const allowedUsers = getAllowedUsers(users, currentUser);
  const defaultDepartmentId = allowedDepartments[0]?.id ?? "";
  const defaultUserId = allowedUsers[0]?.id ?? currentUser?.id ?? users[0]?.id;
  const creationClosedForNonAdmin = quarterStatus !== "planning" && currentUser?.role !== "super_admin";

  async function createObjective(formData: FormData) {
    setObjectiveFeedback(null);
    const response = await fetch(`/api/v1/quarters/${quarterId}/objectives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        level: formData.get("level"),
        departmentId: formData.get("departmentId") || undefined,
        ownerId: formData.get("ownerId"),
        parentKeyResultIds: formData.getAll("parentKeyResultIds")
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setObjectiveFeedback({ type: "error", message: result.error ?? "Objective 创建失败" });
      return;
    }
    setObjectiveFeedback({ type: "success", message: "Objective 已创建" });
    startTransition(() => router.refresh());
  }

  async function createKeyResult(formData: FormData) {
    setKeyResultFeedback(null);
    const objectiveId = String(formData.get("objectiveId") ?? "");
    const response = await fetch(`/api/v1/objectives/${objectiveId}/key-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: formData.get("description"),
        startValue: formData.get("startValue"),
        targetValue: formData.get("targetValue"),
        currentValue: formData.get("startValue"),
        unit: formData.get("unit"),
        ownerId: formData.get("ownerId"),
        dueDate: formData.get("dueDate")
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setKeyResultFeedback({ type: "error", message: result.error ?? "KR 创建失败" });
      return;
    }
    setKeyResultFeedback({ type: "success", message: "KR 已创建" });
    startTransition(() => router.refresh());
  }

  if (creationClosedForNonAdmin) {
    return (
      <div className="mb-6 rounded-lg border border-line bg-card p-5 text-sm text-steel shadow-panel">
        当前季度已进入执行阶段，仅超级管理员可继续调整 OKR；本阶段请继续推进周仪式、信心值和复盘工作。
      </div>
    );
  }

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">创建 Objective</h2>
        <form action={createObjective} className="mt-4 grid gap-3">
          <input name="title" required maxLength={50} className="okr-input" placeholder="Objective 文本，最多 50 字" />
          <div className="grid gap-3 sm:grid-cols-3">
            <select name="level" required className="okr-input" defaultValue={allowedLevels[0].value}>
              {allowedLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            <select name="departmentId" className="okr-input" defaultValue={defaultDepartmentId}>
              {currentUser?.role === "super_admin" ? <option value="">不指定部门</option> : null}
              {allowedDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <select name="ownerId" required className="okr-input" defaultValue={defaultUserId}>
              {allowedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-steel">对齐上级 KR（部门级/个人级必选）</span>
            <select name="parentKeyResultIds" multiple className="okr-input min-h-28">
              {parentKeyResults.map((keyResult) => (
                <option key={keyResult.id} value={keyResult.id}>
                  {keyResult.label}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton pending={isPending} label="创建 Objective" />
          <FeedbackMessage feedback={objectiveFeedback} />
        </form>
      </section>

      <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">创建 KR</h2>
        <form action={createKeyResult} className="mt-4 grid gap-3">
          <select name="objectiveId" required className="okr-input" defaultValue={objectives[0]?.id}>
            {objectives.map((objective) => (
              <option key={objective.id} value={objective.id}>
                {objective.title}
              </option>
            ))}
          </select>
          <input name="description" required maxLength={100} className="okr-input" placeholder="KR 描述，最多 100 字" />
          <div className="grid gap-3 sm:grid-cols-4">
            <input name="startValue" required type="number" step="0.1" className="okr-input" placeholder="起始值" />
            <input name="targetValue" required type="number" step="0.1" className="okr-input" placeholder="目标值" />
            <input name="unit" className="okr-input" placeholder="单位" />
            <input name="dueDate" required type="date" className="okr-input" />
          </div>
          <select name="ownerId" required className="okr-input" defaultValue={defaultUserId}>
            {allowedUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <SubmitButton pending={isPending} label="创建 KR" />
          <FeedbackMessage feedback={keyResultFeedback} />
        </form>
      </section>
    </div>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-60">
      {pending ? "创建中..." : label}
    </button>
  );
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return <p className={feedback.type === "success" ? "text-sm font-medium text-primary" : "text-sm font-medium text-status-red"}>{feedback.message}</p>;
}

function getAllowedObjectiveLevels(role: string | undefined) {
  if (role === "super_admin") {
    return [
      { value: "company", label: "公司级" },
      { value: "department", label: "部门级" },
      { value: "individual", label: "个人级" }
    ];
  }
  if (role === "dept_manager") {
    return [
      { value: "department", label: "部门级" },
      { value: "individual", label: "个人级" }
    ];
  }
  return [{ value: "individual", label: "个人级" }];
}

function getAllowedDepartments(departments: Department[], user: SessionUser | null) {
  if (!user || user.role === "super_admin") return departments;
  return departments.filter((department) => department.id === user.departmentId);
}

function getAllowedUsers(users: User[], user: SessionUser | null) {
  if (!user) return users;
  if (user.role === "super_admin") return users;
  if (user.role === "dept_manager") return users.filter((item) => item.departmentId === user.departmentId);
  return users.filter((item) => item.id === user.id);
}
