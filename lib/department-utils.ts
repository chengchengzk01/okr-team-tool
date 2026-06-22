import type { Department } from "@/lib/domain/types";

const GENERIC_DEPARTMENT_NAME = "未命名部门";

export function isGenericDepartmentName(name?: string | null) {
  return !name || name.trim() === "" || name.trim() === GENERIC_DEPARTMENT_NAME;
}

export function getDepartmentDisplayName(department: Department, duplicateCount: number) {
  if (duplicateCount <= 1 && !isGenericDepartmentName(department.name)) return department.name;
  const suffix = department.feishuDeptId?.slice(-6) ?? department.id.slice(-6);
  return `${department.name} (${suffix})`;
}

export function normalizeDepartmentName(name?: string | null) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : GENERIC_DEPARTMENT_NAME;
}
