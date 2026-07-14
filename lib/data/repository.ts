import {
  createSeedState,
  demoNow,
  type SeedState
} from "@/lib/mock/seed";
import { prismaPersistence } from "@/lib/data/prisma-persistence";
import type {
  ConfidenceAlert,
  ConfidenceScore,
  ConfidenceTrend,
  DepartmentReportSummary,
  ExportLog,
  HealthMetricRecord,
  KeyResultReview,
  KeyResult,
  Objective,
  QuarterReportSummary,
  QuarterReview,
  Quarter,
  User,
  WeeklyCelebration,
  WeeklyCommitment
} from "@/lib/domain/types";
import {
  assertActiveQuarterTransition,
  assertAlignmentLimit,
  assertKeyResultLimit,
  assertObjectiveAlignmentImmutable,
  assertQuarterStatusTransition,
  assertQuarterWritable,
  assertRequiredObjectiveAlignment,
  assertReviewRequiredFields,
  calculateCompletionRate,
  calculateHealthStatus,
  canEditConfidenceScore,
  canEditWeeklyCommitment,
  getConfidenceColor,
  isQuarterSprintWindow,
  getQuarterWeekNumber
} from "@/lib/domain/rules";

export type OkrTreeNode = Objective & {
  owner?: User;
  keyResults: Array<KeyResult & {
    confidenceScore?: ConfidenceScore;
    confidenceColor: string;
    sprintWarning?: { tone: "yellow" | "red"; label: string };
    children: OkrTreeNode[];
  }>;
};

export type OkrTreeFilter = {
  query?: string;
  departmentId?: string;
};

export type ReportScopeFilter = {
  departmentId?: string;
};

export function getVisibleOkrTreeFilter(user: Pick<User, "role" | "departmentId">, requested: OkrTreeFilter = {}): OkrTreeFilter {
  if (user.role === "super_admin") return requested;
  return {
    query: requested.query,
    departmentId: user.departmentId
  };
}

class InMemoryRepository {
  constructor(
    private readonly state: SeedState,
    private readonly now: () => Date = demoNow
  ) {}

  getCurrentQuarter() {
    return this.state.quarters.find((quarter) => quarter.status === "active") ?? this.state.quarters[0];
  }

  getQuarter(id: string) {
    const quarter = this.state.quarters.find((item) => item.id === id);
    if (!quarter) throw new Error("季度不存在");
    return quarter;
  }

  listQuarters() {
    return this.state.quarters;
  }

  createQuarter(input: Pick<Quarter, "name" | "startDate" | "endDate" | "status" | "createdBy">) {
    assertActiveQuarterTransition(input.status, input.status === "active" && this.state.quarters.some((quarter) => quarter.status === "active"));
    const quarter: Quarter = { id: `q-${Date.now()}`, ...input };
    this.state.quarters.unshift(quarter);
    void prismaPersistence.upsertQuarter(quarter);
    return quarter;
  }

  updateQuarterStatus(id: string, status: Quarter["status"]) {
    const quarter = this.state.quarters.find((item) => item.id === id);
    if (!quarter) throw new Error("季度不存在");
    assertQuarterStatusTransition(quarter.status, status);
    assertActiveQuarterTransition(status, this.state.quarters.some((item) => item.status === "active" && item.id !== id));
    quarter.status = status;
    void prismaPersistence.upsertQuarter(quarter);
    return quarter;
  }

  getUser(id: string) {
    return this.state.users.find((user) => user.id === id);
  }

  listUsers() {
    return this.state.users;
  }

  listDepartments() {
    return this.state.departments;
  }

  listObjectives(quarterId = this.getCurrentQuarter().id) {
    return this.state.objectives.filter((objective) => objective.quarterId === quarterId);
  }

  getObjective(id: string) {
    return this.state.objectives.find((objective) => objective.id === id);
  }

  updateObjective(id: string, input: Pick<Objective, "title">) {
    const objective = this.getObjective(id);
    if (!objective) throw new Error("Objective 不存在");
    assertQuarterWritable(this.getQuarter(objective.quarterId).status);
    if (input.title.length > 50) throw new Error("Objective 文本不超过 50 字");
    objective.title = input.title;
    void prismaPersistence.upsertObjective(objective);
    return objective;
  }

  deleteObjective(id: string) {
    const objective = this.getObjective(id);
    if (!objective) throw new Error("Objective 不存在");
    if (this.getQuarter(objective.quarterId).status !== "planning") throw new Error("只有设定期可以删除 Objective");

    const keyResultIds = new Set(this.state.keyResults.filter((item) => item.objectiveId === id).map((item) => item.id));
    this.state.objectives = this.state.objectives.filter((item) => item.id !== id);
    this.state.keyResults = this.state.keyResults.filter((item) => item.objectiveId !== id);
    this.state.alignments = this.state.alignments.filter((item) => item.childObjectiveId !== id && !keyResultIds.has(item.parentKeyResultId));
    this.state.confidenceScores = this.state.confidenceScores.filter((item) => !keyResultIds.has(item.keyResultId));
    this.state.keyResultReviews = this.state.keyResultReviews.filter((item) => !keyResultIds.has(item.keyResultId));
    return true;
  }

  createObjective(input: Omit<Objective, "id">, parentKeyResultIds: string[] = []) {
    assertQuarterWritable(this.getQuarter(input.quarterId).status);
    if (input.title.length > 50) throw new Error("Objective 文本不超过 50 字");
    assertRequiredObjectiveAlignment(input.level, parentKeyResultIds.length);
    assertAlignmentLimit(parentKeyResultIds.length);

    const objective: Objective = { id: `obj-${Date.now()}`, ...input };
    this.state.objectives.push(objective);
    void prismaPersistence.upsertObjective(objective);
    for (const parentKeyResultId of parentKeyResultIds) {
      const alignment = {
        id: `al-${objective.id}-${parentKeyResultId}`,
        childObjectiveId: objective.id,
        parentKeyResultId
      };
      this.state.alignments.push(alignment);
      void prismaPersistence.upsertAlignment(alignment);
    }
    return objective;
  }

  createKeyResult(input: Omit<KeyResult, "id" | "sortOrder">) {
    const objective = this.getObjective(input.objectiveId);
    if (!objective) throw new Error("Objective 不存在");
    assertQuarterWritable(this.getQuarter(objective.quarterId).status);
    const existingCount = this.state.keyResults.filter((keyResult) => keyResult.objectiveId === input.objectiveId).length;
    assertKeyResultLimit(existingCount);
    if (input.description.length > 100) throw new Error("KR 描述不超过 100 字");
    const keyResult: KeyResult = {
      id: `kr-${Date.now()}`,
      sortOrder: existingCount + 1,
      ...input
    };
    this.state.keyResults.push(keyResult);
    void prismaPersistence.upsertKeyResult(keyResult);
    return keyResult;
  }

  getKeyResult(id: string) {
    return this.state.keyResults.find((keyResult) => keyResult.id === id);
  }

  updateKeyResult(
    id: string,
    input: Partial<Pick<KeyResult, "description" | "startValue" | "currentValue" | "targetValue" | "unit" | "dueDate">>
  ) {
    const keyResult = this.getKeyResult(id);
    if (!keyResult) throw new Error("KR 不存在");
    const objective = this.getObjective(keyResult.objectiveId);
    if (!objective) throw new Error("Objective 不存在");
    assertQuarterWritable(this.getQuarter(objective.quarterId).status);
    if (input.description !== undefined && input.description.length > 100) throw new Error("KR 描述不超过 100 字");

    Object.assign(keyResult, {
      description: input.description ?? keyResult.description,
      startValue: input.startValue ?? keyResult.startValue,
      currentValue: input.currentValue ?? keyResult.currentValue,
      targetValue: input.targetValue ?? keyResult.targetValue,
      unit: input.unit ?? keyResult.unit,
      dueDate: input.dueDate ?? keyResult.dueDate
    });
    void prismaPersistence.upsertKeyResult(keyResult);
    return keyResult;
  }

  deleteKeyResult(id: string) {
    const keyResult = this.getKeyResult(id);
    if (!keyResult) throw new Error("KR 不存在");
    const objective = this.getObjective(keyResult.objectiveId);
    if (!objective) throw new Error("Objective 不存在");
    if (this.getQuarter(objective.quarterId).status !== "planning") throw new Error("只有设定期可以删除 KR");

    this.state.keyResults = this.state.keyResults.filter((item) => item.id !== id);
    this.state.alignments = this.state.alignments.filter((item) => item.parentKeyResultId !== id);
    this.state.confidenceScores = this.state.confidenceScores.filter((item) => item.keyResultId !== id);
    this.state.keyResultReviews = this.state.keyResultReviews.filter((item) => item.keyResultId !== id);
    return true;
  }

  canViewKeyResult(keyResultId: string, user: User) {
    const keyResult = this.getKeyResult(keyResultId);
    if (!keyResult) return false;
    const objective = this.getObjective(keyResult.objectiveId);
    if (!objective) return false;
    return user.role === "super_admin" || keyResult.ownerId === user.id || objective.ownerId === user.id || objective.departmentId === user.departmentId;
  }

  canViewConfidenceHistory(keyResultId: string, user: User) {
    const keyResult = this.getKeyResult(keyResultId);
    if (!keyResult) return false;
    const objective = this.getObjective(keyResult.objectiveId);
    if (!objective) return false;
    if (user.role === "super_admin") return true;
    if (user.role === "dept_manager") return objective.departmentId === user.departmentId;
    return keyResult.ownerId === user.id;
  }

  listAlignedObjectives(parentKeyResultId: string, user: User) {
    return this.state.alignments
      .filter((alignment) => alignment.parentKeyResultId === parentKeyResultId)
      .map((alignment) => this.state.objectives.find((objective) => objective.id === alignment.childObjectiveId))
      .filter((objective): objective is Objective => Boolean(objective))
      .filter((objective) => user.role === "super_admin" || objective.ownerId === user.id || objective.departmentId === user.departmentId)
      .map((objective) => ({
        ...objective,
        owner: this.getUser(objective.ownerId),
        keyResults: this.state.keyResults.filter((keyResult) => keyResult.objectiveId === objective.id)
      }));
  }

  createObjectiveAlignments(objectiveId: string, parentKeyResultIds: string[]) {
    const objective = this.getObjective(objectiveId);
    if (!objective) throw new Error("Objective 不存在");
    assertQuarterWritable(this.getQuarter(objective.quarterId).status);
    assertRequiredObjectiveAlignment(objective.level, parentKeyResultIds.length);
    assertAlignmentLimit(parentKeyResultIds.length);
    const existingAlignmentCount = this.state.alignments.filter((item) => item.childObjectiveId === objectiveId).length;
    assertObjectiveAlignmentImmutable(existingAlignmentCount);

    const alignments = parentKeyResultIds.map((parentKeyResultId) => ({
      id: `al-${objectiveId}-${parentKeyResultId}`,
      childObjectiveId: objectiveId,
      parentKeyResultId
    }));
    this.state.alignments.push(...alignments);
    for (const alignment of alignments) {
      void prismaPersistence.upsertAlignment(alignment);
    }
    return alignments;
  }

  listKeyResultsForUser(userId: string, quarterId = this.getCurrentQuarter().id) {
    const objectiveIds = new Set(this.listObjectives(quarterId).map((objective) => objective.id));
    return this.state.keyResults
      .filter((keyResult) => keyResult.ownerId === userId && objectiveIds.has(keyResult.objectiveId))
      .map((keyResult) => {
        const confidenceScore = this.getLatestConfidenceScore(keyResult.id);
        return {
          ...keyResult,
          confidenceScore,
          confidenceColor: getConfidenceColor(confidenceScore?.score)
        };
      });
  }

  listKeyResultsByObjective(objectiveId: string) {
    const objective = this.getObjective(objectiveId);
    if (!objective) return [];

    return this.state.keyResults
      .filter((keyResult) => keyResult.objectiveId === objectiveId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((keyResult) => {
        const confidenceScore = this.getLatestConfidenceScore(keyResult.id);
        return {
          ...keyResult,
          confidenceScore,
          confidenceColor: getConfidenceColor(confidenceScore?.score)
        };
      });
  }

  buildOkrTree(quarterId = this.getCurrentQuarter().id, filter: OkrTreeFilter = {}) {
    const scopedObjectives = this.listObjectives(quarterId);
    const quarter = this.getQuarter(quarterId);
    const sprintWindow =
      quarter.status === "active" &&
      isQuarterSprintWindow(new Date(quarter.startDate), new Date(quarter.endDate), this.now());
    const byObjectiveId = new Map(scopedObjectives.map((objective) => [objective.id, objective]));

    const buildNode = (objective: Objective): OkrTreeNode => {
      const objectiveKeyResults = this.state.keyResults
        .filter((keyResult) => keyResult.objectiveId === objective.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((keyResult) => {
          const confidenceScore = this.getLatestConfidenceScore(keyResult.id);
          const sprintWarning =
            sprintWindow && confidenceScore && confidenceScore.score < 5
              ? {
                  tone: confidenceScore.score <= 3 ? "red" as const : "yellow" as const,
                  label: "冲刺关注"
                }
              : undefined;
          const childObjectiveIds = this.state.alignments
            .filter((alignment) => alignment.parentKeyResultId === keyResult.id)
            .map((alignment) => alignment.childObjectiveId);
          const children = childObjectiveIds
            .map((childId) => byObjectiveId.get(childId))
            .filter(Boolean)
            .map((child) => buildNode(child as Objective));

          return {
            ...keyResult,
            confidenceScore,
            confidenceColor: getConfidenceColor(confidenceScore?.score),
            sprintWarning,
            children
          };
        });

      return {
        ...objective,
        owner: this.getUser(objective.ownerId),
        keyResults: objectiveKeyResults
      };
    };

    const tree = scopedObjectives.filter((objective) => objective.level === "company").map(buildNode);
    return filterOkrTree(tree, normalizeOkrTreeFilter(filter));
  }

  submitConfidenceScore(input: Omit<ConfidenceScore, "id" | "isLocked" | "submittedAt" | "updatedAt">) {
    const quarter = this.getQuarter(input.quarterId);
    assertQuarterWritable(quarter.status);
    if (!canEditConfidenceScore(this.now())) throw new Error("本周窗口期已关闭");
    const currentWeek = getQuarterWeekNumber(new Date(quarter.startDate), this.now());
    if (input.weekNumber !== currentWeek) throw new Error("历史周次信心值已锁定");
    if (input.score < 1 || input.score > 10 || !Number.isInteger(input.score)) throw new Error("信心值必须是 1-10 的整数");

    const existing = this.state.confidenceScores.find(
      (item) =>
        item.keyResultId === input.keyResultId &&
        item.userId === input.userId &&
        item.weekNumber === input.weekNumber &&
        item.quarterId === input.quarterId
    );
    const now = this.now().toISOString();
    if (existing) {
      existing.score = input.score;
      existing.note = input.note;
      existing.updatedAt = now;
      void prismaPersistence.upsertConfidenceScore(existing);
      return existing;
    }

    const score: ConfidenceScore = {
      id: `cs-${Date.now()}`,
      ...input,
      isLocked: false,
      submittedAt: now,
      updatedAt: now
    };
    this.state.confidenceScores.push(score);
    void prismaPersistence.upsertConfidenceScore(score);
    return score;
  }

  listConfidenceHistory(keyResultId: string) {
    return this.state.confidenceScores.filter((score) => score.keyResultId === keyResultId).sort((a, b) => a.weekNumber - b.weekNumber);
  }

  listVisibleConfidenceHistory(keyResultId: string, user: User) {
    if (!this.getKeyResult(keyResultId)) throw new Error("KR 不存在");
    if (!this.canViewConfidenceHistory(keyResultId, user)) throw new Error("无权限查看 KR 信心值历史");
    return this.listConfidenceHistory(keyResultId);
  }

  getLatestConfidenceScore(keyResultId: string) {
    return this.state.confidenceScores
      .filter((score) => score.keyResultId === keyResultId)
      .sort((a, b) => b.weekNumber - a.weekNumber)[0];
  }

  submitWeeklyCommitment(input: Omit<WeeklyCommitment, "id" | "submittedAt" | "updatedAt">) {
    const quarter = this.getQuarter(input.quarterId);
    assertQuarterWritable(quarter.status);
    const currentWeek = getQuarterWeekNumber(new Date(quarter.startDate), this.now());
    if (input.weekNumber !== currentWeek) throw new Error("历史周次周一承诺已锁定");
    for (const value of [input.priority1, input.priority2, input.priority3]) {
      if (!value.trim()) throw new Error("三条优先级均为必填");
      if (value.length > 100) throw new Error("单条优先级不超过 100 字");
    }

    const existing = this.state.weeklyCommitments.find(
      (item) => item.userId === input.userId && item.quarterId === input.quarterId && item.weekNumber === input.weekNumber
    );
    const now = this.now().toISOString();
    if (existing) {
      if (!canEditWeeklyCommitment(new Date(existing.submittedAt), this.now())) throw new Error("今日提交窗口已关闭");
      Object.assign(existing, input, { updatedAt: now });
      void prismaPersistence.upsertWeeklyCommitment(existing);
      return existing;
    }

    const commitment: WeeklyCommitment = { id: `wc-${Date.now()}`, ...input, submittedAt: now, updatedAt: now };
    this.state.weeklyCommitments.push(commitment);
    void prismaPersistence.upsertWeeklyCommitment(commitment);
    return commitment;
  }

  getPreviousWeeklyCommitment(userId: string, quarterId: string, weekNumber: number) {
    return this.state.weeklyCommitments.find(
      (item) => item.userId === userId && item.quarterId === quarterId && item.weekNumber === weekNumber - 1
    );
  }

  submitWeeklyCelebration(input: Omit<WeeklyCelebration, "id" | "submittedAt" | "updatedAt">) {
    const quarter = this.getQuarter(input.quarterId);
    assertQuarterWritable(quarter.status);
    const currentWeek = getQuarterWeekNumber(new Date(quarter.startDate), this.now());
    if (input.weekNumber !== currentWeek) throw new Error("历史周次周五庆祝已锁定");
    if (!input.mood) throw new Error("心情选项为必选");
    if (input.achievements.some((achievement) => achievement.text.length > 100)) throw new Error("单条完成事项不超过 100 字");
    if (this.state.weeklyCelebrations.some((item) => item.userId === input.userId && item.quarterId === input.quarterId && item.weekNumber === input.weekNumber)) {
      throw new Error("同一用户同一周只能提交一次");
    }

    const now = this.now().toISOString();
    const celebration: WeeklyCelebration = { id: `wce-${Date.now()}`, ...input, submittedAt: now, updatedAt: now };
    this.state.weeklyCelebrations.push(celebration);
    void prismaPersistence.upsertWeeklyCelebration(celebration);
    return celebration;
  }

  listWeeklyObstacles(user: User, quarterId = this.getCurrentQuarter().id, weekNumber = getQuarterWeekNumber(new Date(this.getCurrentQuarter().startDate), this.now())) {
    const visibleUserIds = new Set(this.getVisibleUsers(user).map((item) => item.id));
    return this.state.weeklyCelebrations
      .filter((item) => item.quarterId === quarterId && item.weekNumber === weekNumber && visibleUserIds.has(item.userId) && item.obstacles?.trim())
      .map((item) => ({
        user: this.getUser(item.userId),
        obstacles: item.obstacles,
        mood: item.mood,
        submittedAt: item.submittedAt
      }));
  }

  getDashboard(userId: string) {
    const user = this.getUser(userId) ?? this.state.users[0];
    const quarter = this.getCurrentQuarter();
    const weekNumber = getQuarterWeekNumber(new Date(quarter.startDate), this.now());
    const visibleUsers = this.getVisibleUsers(user);
    const visibleUserIds = new Set(visibleUsers.map((item) => item.id));
    const okrTreeFilter = user.role === "super_admin" ? {} : { departmentId: user.departmentId };

    return {
      user,
      quarter,
      weekNumber,
      currentDate: this.now().toISOString(),
      visibleUsers,
      commitments: this.state.weeklyCommitments.filter((item) => item.quarterId === quarter.id && item.weekNumber === weekNumber && visibleUserIds.has(item.userId)),
      celebrations: this.state.weeklyCelebrations.filter((item) => item.quarterId === quarter.id && item.weekNumber === weekNumber && visibleUserIds.has(item.userId)),
      okrTree: this.buildOkrTree(quarter.id, okrTreeFilter),
      healthMetrics: this.listHealthMetrics(user),
      exportLogs: this.state.exportLogs
    };
  }

  listHealthMetrics(user: User) {
    return this.state.healthMetrics
      .filter((metric) => metric.level === "company" || user.role === "super_admin" || metric.departmentId === user.departmentId)
      .map((metric) => ({
        ...metric,
        latestRecord: this.state.healthMetricRecords
          .filter((record) => record.healthMetricId === metric.id)
          .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0]
      }));
  }

  getHealthMetricDetail(user: User, id: string) {
    const metric = this.state.healthMetrics.find((item) => item.id === id && item.isActive);
    if (!metric) throw new Error("健康指标不存在");
    if (metric.level === "department" && user.role !== "super_admin" && metric.departmentId !== user.departmentId) {
      throw new Error("无权限查看该健康指标");
    }
    return {
      ...metric,
      records: this.state.healthMetricRecords
        .filter((record) => record.healthMetricId === id)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    };
  }

  createHealthMetric(user: User, input: {
    name: string;
    description?: string;
    level: "company" | "department";
    departmentId?: string;
    ownerId: string;
    thresholdType: "gte" | "lte" | "between";
    thresholdMin?: number;
    thresholdMax?: number;
    thresholdValue?: number;
    updateFrequency: "weekly" | "monthly" | "quarterly";
  }) {
    if (user.role === "member") throw new Error("无权限创建健康指标");
    if (input.level === "company" && user.role !== "super_admin") throw new Error("只有超级管理员可以创建公司级健康指标");
    const departmentId = input.level === "department" ? (user.role === "dept_manager" ? user.departmentId : input.departmentId) : undefined;
    if (input.level === "department" && !departmentId) throw new Error("部门级健康指标必须指定部门");
    this.assertHealthThreshold(input);
    const metric = {
      id: `hm-${Date.now()}`,
      ...input,
      departmentId,
      inputMin: 0,
      inputMax: 10,
      isActive: true
    };
    this.state.healthMetrics.push(metric);
    void prismaPersistence.upsertHealthMetric(metric);
    return metric;
  }

  updateHealthMetric(user: User, id: string, input: Partial<{
    name: string;
    description?: string;
    ownerId: string;
    thresholdType: "gte" | "lte" | "between";
    thresholdMin?: number;
    thresholdMax?: number;
    thresholdValue?: number;
    updateFrequency: "weekly" | "monthly" | "quarterly";
  }>) {
    const metric = this.state.healthMetrics.find((item) => item.id === id && item.isActive);
    if (!metric) throw new Error("健康指标不存在");
    if (!this.canManageHealthMetric(user, metric)) throw new Error("只有部门管理者或超级管理员可以更新该健康指标");
    const next = { ...metric, ...input };
    this.assertHealthThreshold(next);
    Object.assign(metric, input);
    void prismaPersistence.upsertHealthMetric(metric);
    return metric;
  }

  archiveHealthMetric(user: User, id: string) {
    const metric = this.state.healthMetrics.find((item) => item.id === id && item.isActive);
    if (!metric) throw new Error("健康指标不存在");
    if (!this.canManageHealthMetric(user, metric)) throw new Error("只有部门管理者或超级管理员可以归档该健康指标");
    metric.isActive = false;
    void prismaPersistence.upsertHealthMetric(metric);
    return metric;
  }

  private canManageHealthMetric(user: User, metric: Pick<HealthMetricRecord, never> & { ownerId: string; level: "company" | "department"; departmentId?: string }) {
    return (
      user.role === "super_admin" ||
      (user.role === "dept_manager" && metric.level === "department" && metric.departmentId === user.departmentId)
    );
  }

  submitHealthMetricRecord(input: Omit<HealthMetricRecord, "id" | "status" | "recordedAt">) {
    const metric = this.state.healthMetrics.find((item) => item.id === input.healthMetricId);
    if (!metric) throw new Error("健康指标不存在");
    if (!metric.isActive) throw new Error("健康指标已归档，只读");
    const recorder = this.getUser(input.recordedBy);
    if (!recorder) throw new Error("用户不存在");
    const canDepartmentManagerUpdate =
      recorder.role === "dept_manager" &&
      metric.level === "department" &&
      metric.departmentId === recorder.departmentId;
    if (recorder.role !== "super_admin" && metric.ownerId !== recorder.id && !canDepartmentManagerUpdate) {
      throw new Error("只有指标负责人、部门管理者或超级管理员可以更新该健康指标");
    }
    if (metric.inputMin !== undefined && input.currentValue < metric.inputMin) {
      throw new Error(`数值不能低于 ${metric.inputMin}`);
    }
    if (metric.inputMax !== undefined && input.currentValue > metric.inputMax) {
      throw new Error(`数值不能高于 ${metric.inputMax}`);
    }
    const currentValue = roundToOneDecimal(input.currentValue);

    const status = calculateHealthStatus(
      metric.thresholdType === "between"
        ? { thresholdType: "between", thresholdMin: metric.thresholdMin ?? 0, thresholdMax: metric.thresholdMax ?? 0 }
        : { thresholdType: metric.thresholdType, thresholdValue: metric.thresholdValue ?? 0 },
      currentValue
    );
    const record: HealthMetricRecord = {
      id: `hmr-${Date.now()}`,
      ...input,
      currentValue,
      status,
      recordedAt: this.now().toISOString()
    };
    this.state.healthMetricRecords.push(record);
    void prismaPersistence.upsertHealthMetricRecord(record);
    return record;
  }

  createExportLog(log: ExportLog) {
    this.state.exportLogs.unshift(log);
    void prismaPersistence.upsertExportLog(log);
    return log;
  }

  getV2Report(userId: string, quarterId = this.getCurrentQuarter().id, filter: ReportScopeFilter = {}) {
    const user = this.getUser(userId) ?? this.state.users[0];
    const scopedFilter = this.resolveReportScopeFilter(user, filter);
    const quarterSummaries = this.listQuarterReportSummaries(user, scopedFilter);
    return {
      quarterSummaries,
      departmentSummaries: this.listDepartmentReportSummaries(user, quarterId, scopedFilter),
      confidenceAlerts: this.listConfidenceAlerts(user, quarterId, scopedFilter),
      confidenceTrends: this.listConfidenceTrends(user, quarterId, scopedFilter),
      healthTrends: this.listHealthMetricTrends(user, scopedFilter),
      exportLogs: this.state.exportLogs.filter((log) => log.exportType === "v2_report_doc")
    };
  }

  listQuarterReportSummaries(user: User, filter: ReportScopeFilter = {}): QuarterReportSummary[] {
    const scopedFilter = this.resolveReportScopeFilter(user, filter);
    return this.state.quarters
      .filter((quarter) => quarter.status !== "planning")
      .map((quarter) => this.buildQuarterReportSummary(user, quarter.id, scopedFilter))
      .sort((a, b) => b.quarterName.localeCompare(a.quarterName));
  }

  listDepartmentReportSummaries(user: User, quarterId = this.getCurrentQuarter().id, filter: ReportScopeFilter = {}): DepartmentReportSummary[] {
    const scopedFilter = this.resolveReportScopeFilter(user, filter);
    const visibleDepartments = scopedFilter.departmentId
      ? this.state.departments.filter((department) => department.id === scopedFilter.departmentId)
      : user.role === "super_admin"
        ? this.state.departments.filter((department) => department.id !== "dept-company")
        : this.state.departments.filter((department) => department.id === user.departmentId);

    return visibleDepartments.map((department) => {
      const objectives = this.getVisibleObjectives(user, quarterId, scopedFilter).filter((objective) => objective.departmentId === department.id);
      const objectiveIds = new Set(objectives.map((objective) => objective.id));
      const keyResults = this.state.keyResults.filter((keyResult) => objectiveIds.has(keyResult.objectiveId));
      const confidenceScores = keyResults.map((keyResult) => this.getLatestConfidenceScore(keyResult.id)).filter(Boolean) as ConfidenceScore[];
      const alerts = this.listConfidenceAlerts(user, quarterId, scopedFilter).filter((alert) => alert.departmentName === department.name);

      return {
        departmentId: department.id,
        departmentName: department.name,
        objectiveCount: objectives.length,
        keyResultCount: keyResults.length,
        averageKrCompletionRate: average(keyResults.map((keyResult) => this.calculateKeyResultCompletionRate(keyResult))),
        averageConfidenceScore: nullableAverage(confidenceScores.map((score) => score.score)),
        alertCount: alerts.length
      };
    });
  }

  listConfidenceAlerts(user: User, quarterId = this.getCurrentQuarter().id, filter: ReportScopeFilter = {}): ConfidenceAlert[] {
    const scopedFilter = this.resolveReportScopeFilter(user, filter);
    const quarter = this.state.quarters.find((item) => item.id === quarterId) ?? this.getCurrentQuarter();
    const currentWeek = quarter.status === "active" ? getQuarterWeekNumber(new Date(quarter.startDate), this.now()) : 13;
    const alerts: ConfidenceAlert[] = [];

    for (const { keyResult, objective } of this.getConfidenceVisibleKeyResults(user, quarter.id, scopedFilter)) {
      const owner = this.getUser(keyResult.ownerId);
      const department = objective?.departmentId ? this.state.departments.find((item) => item.id === objective.departmentId) : undefined;
      const history = this.state.confidenceScores
        .filter((score) => score.keyResultId === keyResult.id && score.quarterId === quarter.id)
        .sort((a, b) => a.weekNumber - b.weekNumber);
      const latest = history[history.length - 1];
      const recentScores = history.slice(-3).map((score) => score.score);
      const completionRate = this.calculateKeyResultCompletionRate(keyResult);

      if (!latest || latest.weekNumber < currentWeek) {
        alerts.push(this.createConfidenceAlert(keyResult, quarter, owner, department, "missing", "missing_this_week", undefined, recentScores, completionRate));
        continue;
      }

      if (latest.score < 4) {
        alerts.push(this.createConfidenceAlert(keyResult, quarter, owner, department, "critical", "low_score", latest.score, recentScores, completionRate));
        continue;
      }

      if (recentScores.length === 3 && recentScores[0] > recentScores[1] && recentScores[1] > recentScores[2]) {
        alerts.push(this.createConfidenceAlert(
          keyResult,
          quarter,
          owner,
          department,
          latest.score < 4 ? "critical" : "warning",
          "declining_trend",
          latest.score,
          recentScores,
          completionRate
        ));
        continue;
      }

      if (latest.score <= 6 && completionRate < 0.6) {
        alerts.push(this.createConfidenceAlert(keyResult, quarter, owner, department, "warning", "progress_lagging", latest.score, recentScores, completionRate));
        continue;
      }

      if (latest.score <= 6) {
        alerts.push(this.createConfidenceAlert(keyResult, quarter, owner, department, "warning", "medium_score", latest.score, recentScores, completionRate));
      }
    }

    return alerts;
  }

  listConfidenceTrends(user: User, quarterId = this.getCurrentQuarter().id, filter: ReportScopeFilter = {}): ConfidenceTrend[] {
    const scopedFilter = this.resolveReportScopeFilter(user, filter);
    return this.getConfidenceVisibleKeyResults(user, quarterId, scopedFilter)
      .map(({ keyResult, objective }) => {
        const owner = this.getUser(keyResult.ownerId);
        const department = objective.departmentId ? this.state.departments.find((item) => item.id === objective.departmentId) : undefined;
        return {
          keyResultId: keyResult.id,
          keyResultDescription: keyResult.description,
          objectiveTitle: objective.title,
          quarterId,
          ownerName: owner?.name ?? "未指定",
          departmentName: department?.name,
          scores: this.state.confidenceScores
            .filter((score) => score.keyResultId === keyResult.id && score.quarterId === quarterId)
            .sort((a, b) => a.weekNumber - b.weekNumber)
            .map((score) => ({
              weekNumber: score.weekNumber,
              score: score.score,
              note: score.note
            }))
        };
      })
      .filter((trend) => trend.scores.length > 0);
  }

  listHealthMetricTrends(user: User, filter: ReportScopeFilter = {}) {
    const scopedFilter = this.resolveReportScopeFilter(user, filter);
    const visibleMetrics = this.listHealthMetrics(user).filter((metric) => {
      if (!scopedFilter.departmentId) return true;
      return metric.level === "department" && metric.departmentId === scopedFilter.departmentId;
    });
    return visibleMetrics.map((metric) => ({
      metricId: metric.id,
      metricName: metric.name,
      level: metric.level,
      records: this.state.healthMetricRecords
        .filter((record) => record.healthMetricId === metric.id)
        .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
        .map((record) => ({
          value: record.currentValue,
          status: record.status,
          recordedAt: record.recordedAt
        }))
    }));
  }

  getQuarterReviewSummary(quarterId = this.getCurrentQuarter().id, user?: User) {
    return this.state.keyResults
      .filter((keyResult) => {
        const objective = this.state.objectives.find((item) => item.id === keyResult.objectiveId);
        if (objective?.quarterId !== quarterId) return false;
        if (!user) return true;
        if (user.role === "super_admin") return true;
        if (user.role === "dept_manager") return objective.departmentId === user.departmentId;
        return keyResult.ownerId === user.id;
      })
      .map((keyResult) => {
        const review = this.state.keyResultReviews.find((item) => item.keyResultId === keyResult.id);
        return {
          keyResult,
          review,
          completionRate: calculateCompletionRate(review?.finalValue ?? keyResult.currentValue, keyResult.targetValue)
        };
      });
  }

  listQuarterReviews(user: User, quarterId = this.getCurrentQuarter().id) {
    return this.state.quarterReviews
      .filter((review) => {
        if (review.quarterId !== quarterId) return false;
        if (user.role === "super_admin") return true;
        if (user.role === "dept_manager") return review.departmentId === user.departmentId || review.ownerId === user.id;
        return review.ownerId === user.id;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  submitQuarterReview(reviewer: User, input: Omit<QuarterReview, "id" | "submittedAt" | "updatedAt"> & { id?: string }) {
    assertReviewRequiredFields(input.whatWorked, input.whatDidnt);
    const quarter = this.state.quarters.find((item) => item.id === input.quarterId);
    if (!quarter) throw new Error("季度不存在");
    if (quarter.status === "archived") throw new Error("季度已归档，复盘只读");
    if (quarter.status !== "reviewing") throw new Error("季度尚未进入复盘阶段");

    const permissionError = validateQuarterReviewPermission(reviewer, input);
    if (permissionError) throw new Error(permissionError);

    const now = this.now().toISOString();
    const id = input.id ?? `qr-${input.quarterId}-${input.ownerId}-${input.level}`;
    const existing = this.state.quarterReviews.find((item) => item.id === id);
    if (existing) {
      Object.assign(existing, input, { id, submittedAt: now, updatedAt: now });
      void prismaPersistence.upsertQuarterReview(existing);
      return existing;
    }

    const review: QuarterReview = {
      id,
      ...input,
      submittedAt: now,
      updatedAt: now
    };
    this.state.quarterReviews.push(review);
    void prismaPersistence.upsertQuarterReview(review);
    return review;
  }

  submitKeyResultReview(input: Omit<KeyResultReview, "id" | "completionRate" | "submittedAt" | "updatedAt">) {
    assertReviewRequiredFields(input.whatWorked, input.whatDidnt);
    if (input.confidenceScore < 1 || input.confidenceScore > 10 || !Number.isInteger(input.confidenceScore)) {
      throw new Error("复盘信心值必须是 1-10 的整数");
    }

    const quarter = this.state.quarters.find((item) => item.id === input.quarterId);
    if (!quarter) throw new Error("季度不存在");
    if (quarter.status === "archived") throw new Error("季度已归档，复盘只读");
    if (quarter.status !== "reviewing") throw new Error("季度尚未进入复盘阶段");

    const keyResult = this.state.keyResults.find((item) => item.id === input.keyResultId);
    if (!keyResult) throw new Error("KR 不存在");
    const reviewer = this.getUser(input.reviewerId);
    if (!reviewer) throw new Error("用户不存在");
    const objective = this.getObjective(keyResult.objectiveId);
    const canDepartmentManagerReview =
      reviewer.role === "dept_manager" &&
      objective?.departmentId === reviewer.departmentId;
    if (reviewer.role !== "super_admin" && keyResult.ownerId !== reviewer.id && !canDepartmentManagerReview) {
      throw new Error("只有 KR 负责人、部门管理者或超级管理员可以提交复盘");
    }

    const now = this.now().toISOString();
    const completionRate = calculateCompletionRate(input.finalValue, keyResult.targetValue);
    const existing = this.state.keyResultReviews.find((item) => item.keyResultId === input.keyResultId && item.quarterId === input.quarterId);
    if (existing) {
      Object.assign(existing, input, { completionRate, updatedAt: now });
      void prismaPersistence.upsertKeyResultReview(existing);
      return existing;
    }

    const review: KeyResultReview = {
      id: `krr-${Date.now()}`,
      ...input,
      completionRate,
      submittedAt: now,
      updatedAt: now
    };
    this.state.keyResultReviews.push(review);
    void prismaPersistence.upsertKeyResultReview(review);
    return review;
  }

  private getVisibleUsers(user: User) {
    if (user.role === "super_admin") return this.state.users;
    return this.state.users.filter((item) => item.departmentId === user.departmentId);
  }

  private buildQuarterReportSummary(user: User, quarterId: string, filter: ReportScopeFilter = {}): QuarterReportSummary {
    const scopedFilter = this.resolveReportScopeFilter(user, filter);
    const quarter = this.state.quarters.find((item) => item.id === quarterId) ?? this.getCurrentQuarter();
    const objectives = this.getVisibleObjectives(user, quarter.id, scopedFilter);
    const objectiveIds = new Set(objectives.map((objective) => objective.id));
    const keyResults = this.state.keyResults.filter((keyResult) => objectiveIds.has(keyResult.objectiveId));
    const confidenceScores = keyResults
      .flatMap((keyResult) => this.state.confidenceScores.filter((score) => score.keyResultId === keyResult.id && score.quarterId === quarter.id));
    const visibleUsers = this.getVisibleUsers(user).filter((item) => !scopedFilter.departmentId || item.departmentId === scopedFilter.departmentId);
    const visibleUserIds = new Set(visibleUsers.map((item) => item.id));
    const commitments = this.state.weeklyCommitments.filter((item) => item.quarterId === quarter.id && visibleUserIds.has(item.userId));
    const celebrations = this.state.weeklyCelebrations.filter((item) => item.quarterId === quarter.id && visibleUserIds.has(item.userId));
    const observedWeeks = new Set([...commitments, ...celebrations, ...confidenceScores].map((item) => item.weekNumber));
    const expectedSubmissions = Math.max(1, observedWeeks.size || 1) * Math.max(1, visibleUsers.length);
    const metricIds = new Set(
      this.listHealthMetrics(user)
        .filter((metric) => !scopedFilter.departmentId || (metric.level === "department" && metric.departmentId === scopedFilter.departmentId))
        .map((metric) => metric.id)
    );
    const healthRecords = this.state.healthMetricRecords.filter((record) => metricIds.has(record.healthMetricId) && isDateInsideQuarter(record.recordedAt, quarter));

    return {
      quarterId: quarter.id,
      quarterName: quarter.name,
      quarterStatus: quarter.status,
      objectiveCount: objectives.length,
      keyResultCount: keyResults.length,
      averageKrCompletionRate: average(keyResults.map((keyResult) => this.calculateKeyResultCompletionRate(keyResult))),
      averageConfidenceScore: nullableAverage(confidenceScores.map((score) => score.score)),
      weeklyCommitmentRate: roundTo(commitments.length / expectedSubmissions, 4),
      weeklyCelebrationRate: roundTo(celebrations.length / expectedSubmissions, 4),
      healthStatusCounts: {
        healthy: healthRecords.filter((record) => record.status === "healthy").length,
        warning: healthRecords.filter((record) => record.status === "warning").length,
        exceeded: healthRecords.filter((record) => record.status === "exceeded").length,
        unrecorded: Math.max(0, metricIds.size - healthRecords.length)
      }
    };
  }

  private getVisibleObjectives(user: User, quarterId: string, filter: ReportScopeFilter = {}) {
    const scopedFilter = this.resolveReportScopeFilter(user, filter);
    return this.state.objectives.filter((objective) => {
      if (objective.quarterId !== quarterId) return false;
      if (scopedFilter.departmentId) return objective.level !== "company" && objective.departmentId === scopedFilter.departmentId;
      if (user.role === "super_admin") return true;
      if (objective.level === "company") return true;
      return objective.departmentId === user.departmentId || objective.ownerId === user.id;
    });
  }

  private getConfidenceVisibleKeyResults(user: User, quarterId: string, filter: ReportScopeFilter = {}) {
    const scopedFilter = this.resolveReportScopeFilter(user, filter);
    const objectives = this.state.objectives.filter((objective) => objective.quarterId === quarterId);
    const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]));
    return this.state.keyResults
      .map((keyResult) => ({ keyResult, objective: objectiveById.get(keyResult.objectiveId) }))
      .filter((item): item is { keyResult: KeyResult; objective: Objective } => Boolean(item.objective))
      .filter(({ keyResult, objective }) => {
        if (scopedFilter.departmentId) return objective.level !== "company" && objective.departmentId === scopedFilter.departmentId;
        if (user.role === "super_admin") return true;
        if (user.role === "dept_manager") return objective.departmentId === user.departmentId;
        return keyResult.ownerId === user.id;
      });
  }

  private resolveReportScopeFilter(user: User, filter: ReportScopeFilter = {}) {
    if (user.role === "super_admin") {
      return {
        departmentId: filter.departmentId && filter.departmentId !== "all" ? filter.departmentId : undefined
      };
    }
    return { departmentId: user.departmentId };
  }

  private calculateKeyResultCompletionRate(keyResult: KeyResult) {
    const review = this.state.keyResultReviews.find((item) => item.keyResultId === keyResult.id);
    const finalValue = review?.finalValue ?? keyResult.currentValue;
    const improvingDown = keyResult.targetValue < keyResult.startValue;
    if (improvingDown) {
      if (finalValue <= keyResult.targetValue) return 1;
      if (finalValue <= 0) return 1;
      return roundTo(Math.min(1, keyResult.targetValue / finalValue), 4);
    }
    if (keyResult.targetValue === 0) return 0;
    return roundTo(Math.min(1, finalValue / keyResult.targetValue), 4);
  }

  private createConfidenceAlert(
    keyResult: KeyResult,
    quarter: Quarter,
    owner: User | undefined,
    department: { name: string } | undefined,
    severity: ConfidenceAlert["severity"],
    reason: ConfidenceAlert["reason"],
    latestScore: number | undefined,
    recentScores: number[],
    completionRate: number
  ): ConfidenceAlert {
    return {
      id: `alert-${keyResult.id}-${reason}`,
      keyResultId: keyResult.id,
      keyResultDescription: keyResult.description,
      quarterId: quarter.id,
      quarterName: quarter.name,
      ownerName: owner?.name ?? "未指定",
      departmentName: department?.name,
      severity,
      reason,
      latestScore,
      recentScores,
      completionRate
    };
  }

  private assertHealthThreshold(input: {
    thresholdType: "gte" | "lte" | "between";
    thresholdMin?: number;
    thresholdMax?: number;
    thresholdValue?: number;
  }) {
    if (input.thresholdType === "between" && (input.thresholdMin === undefined || input.thresholdMax === undefined)) {
      throw new Error("between 类型必须填写 threshold_min 和 threshold_max");
    }
    if (input.thresholdType !== "between" && input.thresholdValue === undefined) {
      throw new Error("阈值不能为空");
    }
  }
}

export function createRepository(state: SeedState = createSeedState(), now?: () => Date) {
  return new InMemoryRepository(state, now);
}

export const repository = createRepository();

function normalizeOkrTreeFilter(filter: OkrTreeFilter) {
  return {
    query: filter.query?.trim().toLowerCase() ?? "",
    departmentId: filter.departmentId && filter.departmentId !== "all" ? filter.departmentId : ""
  };
}

function filterOkrTree(tree: OkrTreeNode[], filter: Required<OkrTreeFilter>) {
  if (!filter.query && !filter.departmentId) return tree;

  return tree.map((node) => filterObjectiveNode(node, filter)).filter(Boolean) as OkrTreeNode[];
}

function filterObjectiveNode(node: OkrTreeNode, filter: Required<OkrTreeFilter>): OkrTreeNode | null {
  const matchedKeyResults = node.keyResults
    .map((keyResult) => {
      const children = keyResult.children
        .map((child) => filterObjectiveNode(child, filter))
        .filter(Boolean) as OkrTreeNode[];
      const selfMatches = matchesObjective(node, filter) || matchesKeyResultForNode(node, keyResult, filter);

      if (selfMatches || children.length > 0) {
        return { ...keyResult, children };
      }

      return null;
    })
    .filter(Boolean) as OkrTreeNode["keyResults"];

  if (matchesObjective(node, filter) || matchedKeyResults.length > 0) {
    return { ...node, keyResults: matchedKeyResults };
  }

  return null;
}

function matchesObjective(node: OkrTreeNode, filter: Required<OkrTreeFilter>) {
  return Boolean(filter.query) && matchesDepartment(node, filter.departmentId) && matchesQuery([node.title, node.owner?.name], filter.query);
}

function matchesKeyResultForNode(node: OkrTreeNode, keyResult: OkrTreeNode["keyResults"][number], filter: Required<OkrTreeFilter>) {
  const companyContextOnly = node.level === "company" && Boolean(filter.departmentId);
  if (companyContextOnly && !filter.query) return false;
  return matchesDepartment(node, filter.departmentId) && matchesQuery([keyResult.description, keyResult.unit], filter.query);
}

function matchesDepartment(node: OkrTreeNode, departmentId: string) {
  if (!departmentId) return true;
  if (node.level === "company") return true;
  return node.departmentId === departmentId;
}

function matchesQuery(values: Array<string | undefined>, query: string) {
  if (!query) return true;
  return values.some((value) => value?.toLowerCase().includes(query));
}

function validateQuarterReviewPermission(
  user: Pick<User, "id" | "role" | "departmentId">,
  input: Pick<QuarterReview, "level" | "departmentId" | "ownerId">
) {
  if (user.role === "super_admin") return null;
  if (user.role === "dept_manager") {
    if (input.level === "company") return "部门管理者不能提交公司级 Review";
    if (input.departmentId && input.departmentId !== user.departmentId) return "只能提交本部门 Review";
    return null;
  }
  if (input.level !== "individual") return "成员只能提交个人 Review";
  if (input.ownerId !== user.id) return "成员只能提交自己的 Review";
  return null;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return roundTo(values.reduce((sum, value) => sum + value, 0) / values.length, 4);
}

function nullableAverage(values: number[]) {
  if (!values.length) return null;
  return average(values);
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isDateInsideQuarter(dateValue: string, quarter: Quarter) {
  const time = new Date(dateValue).getTime();
  return time >= new Date(quarter.startDate).getTime() && time <= new Date(`${quarter.endDate}T23:59:59.999`).getTime();
}
