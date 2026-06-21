export type ThresholdType = "gte" | "lte" | "between";
export type HealthStatus = "healthy" | "warning" | "exceeded";
export type ConfidenceColor = "green" | "yellow" | "red" | "gray";
export type QuarterStatus = "planning" | "active" | "reviewing" | "archived";
export type ExportScope = "company" | "department" | "individual";
export type Role = "super_admin" | "dept_manager" | "member";

export type HealthThreshold =
  | { thresholdType: "gte"; thresholdValue: number; thresholdMin?: never; thresholdMax?: never }
  | { thresholdType: "lte"; thresholdValue: number; thresholdMin?: never; thresholdMax?: never }
  | { thresholdType: "between"; thresholdValue?: never; thresholdMin: number; thresholdMax: number };

export function assertKeyResultLimit(existingCount: number) {
  if (existingCount >= 5) {
    throw new Error("每个 Objective 最多 5 个关键结果");
  }
}

export function assertAlignmentLimit(nextCount: number) {
  if (nextCount > 3) {
    throw new Error("每个 Objective 最多对齐 3 个上级 KR");
  }
}

export function assertObjectiveAlignmentImmutable(existingAlignmentCount: number) {
  if (existingAlignmentCount > 0) {
    throw new Error("季度内不可修改对齐关系");
  }
}

export function assertRequiredObjectiveAlignment(level: "company" | "department" | "individual", parentKeyResultCount: number) {
  if ((level === "department" || level === "individual") && parentKeyResultCount === 0) {
    throw new Error("部门级和个人级 Objective 必须对齐上级 KR");
  }
}

export function canEditConfidenceScore(now = new Date()) {
  const localDay = getChinaDayOfWeek(now);
  return localDay >= 1 && localDay <= 3;
}

export function canEditWeeklyCommitment(submittedAt: Date, now = new Date()) {
  return toChinaDateKey(submittedAt) === toChinaDateKey(now);
}

export function calculateHealthStatus(threshold: HealthThreshold, currentValue: number): HealthStatus {
  if (threshold.thresholdType === "gte" && threshold.thresholdValue === 7) {
    if (currentValue >= 7) return "healthy";
    if (currentValue >= 4) return "warning";
    return "exceeded";
  }

  if (threshold.thresholdType === "gte") {
    if (currentValue >= threshold.thresholdValue) return "healthy";
    if (currentValue >= threshold.thresholdValue * 0.85) return "warning";
    return "exceeded";
  }

  if (threshold.thresholdType === "lte") {
    if (currentValue <= threshold.thresholdValue) return "healthy";
    if (currentValue <= threshold.thresholdValue * 1.15) return "warning";
    return "exceeded";
  }

  if (currentValue >= threshold.thresholdMin && currentValue <= threshold.thresholdMax) {
    return "healthy";
  }

  const lowerWarningFloor = threshold.thresholdMin * 0.85;
  const upperWarningCeiling = threshold.thresholdMax * 1.15;

  if (
    (currentValue < threshold.thresholdMin && currentValue >= lowerWarningFloor) ||
    (currentValue > threshold.thresholdMax && currentValue <= upperWarningCeiling)
  ) {
    return "warning";
  }

  return "exceeded";
}

export function assertActiveQuarterTransition(nextStatus: QuarterStatus, hasAnotherActiveQuarter: boolean) {
  if (nextStatus === "active" && hasAnotherActiveQuarter) {
    throw new Error("同一时间只能有一个 active 季度");
  }
}

export function assertQuarterStatusTransition(currentStatus: QuarterStatus, nextStatus: QuarterStatus) {
  if (currentStatus === nextStatus) return;
  if (currentStatus === "archived") {
    throw new Error("季度已归档，只读");
  }
  const allowedNextStatus: Record<QuarterStatus, QuarterStatus | null> = {
    planning: "active",
    active: "reviewing",
    reviewing: "archived",
    archived: null
  };
  if (allowedNextStatus[currentStatus] !== nextStatus) {
    throw new Error("季度状态只能按 planning → active → reviewing → archived 流转");
  }
}

export function assertReviewRequiredFields(whatWorked: string | null | undefined, whatDidnt: string | null | undefined) {
  if (!whatWorked?.trim() || !whatDidnt?.trim()) {
    throw new Error("what_worked 和 what_didnt 为必填项");
  }
}

export function assertUniqueSuperAdminUpdate(input: {
  targetUserId: string;
  currentRole: Role;
  currentIsActive: boolean;
  nextRole?: Role;
  nextIsActive?: boolean;
  activeSuperAdminIds: string[];
}) {
  const finalRole = input.nextRole ?? input.currentRole;
  const finalIsActive = input.nextIsActive ?? input.currentIsActive;
  const otherActiveSuperAdmins = input.activeSuperAdminIds.filter((id) => id !== input.targetUserId);

  if (finalRole === "super_admin" && finalIsActive && otherActiveSuperAdmins.length > 0) {
    throw new Error("系统只能有一个超级管理员");
  }

  if (
    input.currentRole === "super_admin" &&
    input.currentIsActive &&
    input.activeSuperAdminIds.includes(input.targetUserId) &&
    (finalRole !== "super_admin" || !finalIsActive) &&
    otherActiveSuperAdmins.length === 0
  ) {
    throw new Error("至少保留一个超级管理员");
  }
}

export function assertOkrCreationOpenForRole(status: QuarterStatus, role: Role) {
  if (status === "archived") {
    throw new Error("季度已归档，只读");
  }
  if (status !== "planning" && role !== "super_admin") {
    throw new Error("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
  }
}

export function assertQuarterWritable(status: QuarterStatus) {
  if (status === "archived") {
    throw new Error("季度已归档，只读");
  }
}

export function calculateCompletionRate(finalValue: number, targetValue: number) {
  if (targetValue === 0) return 0;
  return roundTo(finalValue / targetValue, 4);
}

export function getConfidenceColor(score: number | null | undefined): ConfidenceColor {
  if (!score) return "gray";
  if (score >= 7) return "green";
  if (score >= 4) return "yellow";
  return "red";
}

export function getQuarterWeekNumber(startDate: Date, currentDate = new Date()) {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const current = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate());
  const days = Math.max(0, Math.floor((current - start) / 86_400_000));
  return Math.floor(days / 7) + 1;
}

export function isQuarterSprintWindow(startDate: Date, endDate: Date, currentDate = new Date()) {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  const current = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate());

  if (current < start || current > end) return false;
  const daysUntilEnd = Math.floor((end - current) / 86_400_000);
  return daysUntilEnd <= 13;
}

export function isQuarterReadOnly(status: QuarterStatus) {
  return status === "archived";
}

export function shouldStopCalendarEventsOnQuarterStatusChange(previousStatus: QuarterStatus, nextStatus: QuarterStatus) {
  return previousStatus !== "archived" && nextStatus === "archived";
}

export function canExportFeishuDocument(role: Role, scope: ExportScope) {
  if (role === "super_admin") return scope === "company" || scope === "department" || scope === "individual";
  if (role === "dept_manager") return scope === "department";
  if (role === "member") return scope === "individual";
  return false;
}

export function normalizeExportScope(value: unknown, fallback: ExportScope): ExportScope {
  return value === "company" || value === "department" || value === "individual" ? value : fallback;
}

function getChinaDayOfWeek(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short"
  });
  const weekday = formatter.format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function toChinaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
