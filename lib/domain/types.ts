export type Role = "super_admin" | "dept_manager" | "member";
export type ObjectiveLevel = "company" | "department" | "individual";
export type Mood = "energized" | "steady" | "calm" | "tired" | "need_support";
export type ExportStatus = "pending" | "success" | "failed";

export type User = {
  id: string;
  feishuUserId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: Role;
  departmentId?: string;
  isActive: boolean;
};

export type Department = {
  id: string;
  feishuDeptId?: string;
  name: string;
  parentId?: string;
  managerId?: string;
};

export type Quarter = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "planning" | "active" | "reviewing" | "archived";
  createdBy: string;
};

export type Objective = {
  id: string;
  quarterId: string;
  level: ObjectiveLevel;
  departmentId?: string;
  ownerId: string;
  title: string;
};

export type KeyResult = {
  id: string;
  objectiveId: string;
  description: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit?: string;
  ownerId: string;
  dueDate: string;
  sortOrder: number;
};

export type OKRAlignment = {
  id: string;
  childObjectiveId: string;
  parentKeyResultId: string;
};

export type ConfidenceScore = {
  id: string;
  keyResultId: string;
  userId: string;
  weekNumber: number;
  quarterId: string;
  score: number;
  note?: string;
  isLocked: boolean;
  submittedAt: string;
  updatedAt: string;
};

export type WeeklyCommitment = {
  id: string;
  userId: string;
  quarterId: string;
  weekNumber: number;
  priority1: string;
  priority2: string;
  priority3: string;
  priorSelfReview?: Record<string, string>;
  submittedAt: string;
  updatedAt: string;
};

export type WeeklyCelebration = {
  id: string;
  userId: string;
  quarterId: string;
  weekNumber: number;
  achievements: { text: string }[];
  obstacles?: string;
  mood: Mood;
  submittedAt: string;
  updatedAt: string;
};

export type HealthMetric = {
  id: string;
  name: string;
  description?: string;
  level: "company" | "department";
  departmentId?: string;
  ownerId: string;
  thresholdType: "gte" | "lte" | "between";
  thresholdMin?: number;
  thresholdMax?: number;
  thresholdValue?: number;
  inputMin?: number;
  inputMax?: number;
  updateFrequency: "weekly" | "monthly" | "quarterly";
  isActive: boolean;
};

export type HealthMetricRecord = {
  id: string;
  healthMetricId: string;
  currentValue: number;
  status: "healthy" | "warning" | "exceeded";
  note?: string;
  recordedBy: string;
  recordedAt: string;
};

export type KeyResultReview = {
  id: string;
  keyResultId: string;
  quarterId: string;
  reviewerId: string;
  finalValue: number;
  completionRate: number;
  confidenceScore: number;
  whatWorked: string;
  whatDidnt: string;
  nextStep?: string;
  submittedAt: string;
  updatedAt: string;
};

export type QuarterReview = {
  id: string;
  quarterId: string;
  level: ObjectiveLevel;
  ownerId: string;
  departmentId?: string;
  whatWorked?: string;
  whatDidnt?: string;
  healthSummary?: string;
  nextQuarterInsights?: string;
  submittedAt?: string;
  updatedAt: string;
};

export type ExportLog = {
  id: string;
  exportedBy: string;
  exportType: "bitable_sync" | "feishu_doc" | "calendar_events" | "v2_report_doc";
  scope: "company" | "department" | "individual";
  departmentId?: string;
  quarterId?: string;
  status: ExportStatus;
  feishuDocUrl?: string;
  message?: string;
  exportedAt: string;
};

export type QuarterReportSummary = {
  quarterId: string;
  quarterName: string;
  quarterStatus: Quarter["status"];
  objectiveCount: number;
  keyResultCount: number;
  averageKrCompletionRate: number;
  averageConfidenceScore: number | null;
  weeklyCommitmentRate: number;
  weeklyCelebrationRate: number;
  healthStatusCounts: {
    healthy: number;
    warning: number;
    exceeded: number;
    unrecorded: number;
  };
};

export type ConfidenceAlert = {
  id: string;
  keyResultId: string;
  keyResultDescription: string;
  quarterId: string;
  quarterName: string;
  ownerName: string;
  departmentName?: string;
  severity: "critical" | "warning" | "missing";
  reason: "low_score" | "medium_score" | "declining_trend" | "progress_lagging" | "missing_this_week";
  latestScore?: number;
  recentScores: number[];
  completionRate: number;
};

export type ConfidenceTrend = {
  keyResultId: string;
  keyResultDescription: string;
  objectiveTitle: string;
  quarterId: string;
  ownerName: string;
  departmentName?: string;
  scores: Array<{
    weekNumber: number;
    score: number;
    note?: string;
  }>;
};

export type DepartmentReportSummary = {
  departmentId: string;
  departmentName: string;
  objectiveCount: number;
  keyResultCount: number;
  averageKrCompletionRate: number;
  averageConfidenceScore: number | null;
  alertCount: number;
};
