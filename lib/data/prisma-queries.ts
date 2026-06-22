import { createRepository, type OkrTreeFilter, type ReportScopeFilter } from "@/lib/data/repository";
import type { Department, Quarter, QuarterReview, User } from "@/lib/domain/types";
import type { SeedState } from "@/lib/mock/seed";
import { prisma } from "@/lib/prisma";

function enabled() {
  return Boolean(process.env.DATABASE_URL) && process.env.NODE_ENV !== "test";
}

export const prismaQueries = {
  enabled,

  async getUser(id: string): Promise<User | null> {
    if (!enabled()) return null;
    return prisma.user.findUnique({ where: { id } }) as Promise<User | null>;
  },

  async listUsers(): Promise<User[] | null> {
    if (!enabled()) return null;
    return prisma.user.findMany({ orderBy: { name: "asc" } }) as Promise<User[]>;
  },

  async listDepartments(): Promise<Department[] | null> {
    if (!enabled()) return null;
    return prisma.department.findMany({ where: { isArchived: false }, orderBy: { name: "asc" } }) as Promise<Department[]>;
  },

  async listQuarters(): Promise<Quarter[] | null> {
    if (!enabled()) return null;
    return prisma.quarter.findMany({ orderBy: { startDate: "desc" } }).then((quarters) =>
      quarters.map((quarter) => ({
        id: quarter.id,
        name: quarter.name,
        startDate: formatDate(quarter.startDate),
        endDate: formatDate(quarter.endDate),
        status: quarter.status,
        createdBy: quarter.createdBy
      }))
    );
  },

  async getCurrentQuarter(): Promise<Quarter | null> {
    if (!enabled()) return null;
    const quarter = await prisma.quarter.findFirst({
      where: { status: "active" },
      orderBy: { startDate: "desc" }
    });
    if (!quarter) return null;
    return {
      id: quarter.id,
      name: quarter.name,
      startDate: formatDate(quarter.startDate),
      endDate: formatDate(quarter.endDate),
      status: quarter.status,
      createdBy: quarter.createdBy
    };
  },

  async getRepositorySnapshot() {
    if (!enabled()) return null;
    return createRepository(await loadSeedStateFromPrisma());
  },

  async getDashboard(userId: string) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.getDashboard(userId) ?? null;
  },

  async buildOkrTree(quarterId: string, filter: OkrTreeFilter = {}) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.buildOkrTree(quarterId, filter) ?? null;
  },

  async listObjectives(quarterId: string) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.listObjectives(quarterId) ?? null;
  },

  async listHealthMetrics(user: User) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.listHealthMetrics(user) ?? null;
  },

  async getHealthMetricDetail(user: User, id: string) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.getHealthMetricDetail(user, id) ?? null;
  },

  async listKeyResultsForUser(userId: string, quarterId: string) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.listKeyResultsForUser(userId, quarterId) ?? null;
  },

  async getPreviousWeeklyCommitment(userId: string, quarterId: string, weekNumber: number) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.getPreviousWeeklyCommitment(userId, quarterId, weekNumber) ?? null;
  },

  async getV2Report(userId: string, quarterId?: string, filter: ReportScopeFilter = {}) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.getV2Report(userId, quarterId, filter) ?? null;
  },

  async listConfidenceAlerts(user: User, quarterId: string, filter: ReportScopeFilter = {}) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.listConfidenceAlerts(user, quarterId, filter) ?? null;
  },

  async listWeeklyObstacles(user: User, quarterId: string, weekNumber: number) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.listWeeklyObstacles(user, quarterId, weekNumber) ?? null;
  },

  async getQuarterReviewSummary(user: User, quarterId: string) {
    const snapshot = await this.getRepositorySnapshot();
    return snapshot?.getQuarterReviewSummary(quarterId, user) ?? null;
  },

  async listQuarterReviews(user: User, quarterId: string): Promise<QuarterReview[] | null> {
    if (!enabled()) return null;
    const where =
      user.role === "super_admin"
        ? { quarterId }
        : user.role === "dept_manager"
          ? { quarterId, OR: [{ departmentId: user.departmentId }, { ownerId: user.id }] }
          : { quarterId, ownerId: user.id };

    const reviews = await prisma.quarterReview.findMany({
      where,
      orderBy: { updatedAt: "desc" }
    });

    return reviews.map((review) => ({
      id: review.id,
      quarterId: review.quarterId,
      level: review.level,
      ownerId: review.ownerId,
      departmentId: review.departmentId ?? undefined,
      whatWorked: review.whatWorked ?? undefined,
      whatDidnt: review.whatDidnt ?? undefined,
      healthSummary: review.healthSummary ?? undefined,
      nextQuarterInsights: review.nextQuarterInsights ?? undefined,
      submittedAt: review.submittedAt?.toISOString(),
      updatedAt: review.updatedAt.toISOString()
    }));
  }
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

async function loadSeedStateFromPrisma(): Promise<SeedState> {
  const [
    departments,
    users,
    quarters,
    objectives,
    keyResults,
    alignments,
    confidenceScores,
    weeklyCommitments,
    weeklyCelebrations,
    healthMetrics,
    healthMetricRecords,
    quarterReviews,
    krReviews,
    exportLogs
  ] = await Promise.all([
    prisma.department.findMany(),
    prisma.user.findMany(),
    prisma.quarter.findMany(),
    prisma.objective.findMany(),
    prisma.keyResult.findMany(),
    prisma.oKRAlignment.findMany(),
    prisma.confidenceScore.findMany(),
    prisma.weeklyCommitment.findMany(),
    prisma.weeklyCelebration.findMany(),
    prisma.healthMetric.findMany(),
    prisma.healthMetricRecord.findMany(),
    prisma.quarterReview.findMany(),
    prisma.kRReview.findMany(),
    prisma.exportLog.findMany()
  ]);
  const quarterReviewById = new Map(quarterReviews.map((review) => [review.id, review]));

  return {
    departments: departments.map((department) => ({
      id: department.id,
      feishuDeptId: department.feishuDeptId ?? undefined,
      name: department.name,
      isArchived: department.isArchived,
      parentId: department.parentId ?? undefined,
      managerId: department.managerId ?? undefined
    })),
    users: users.map((user) => ({
      id: user.id,
      feishuUserId: user.feishuUserId,
      name: user.name,
      email: user.email ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      role: user.role,
      departmentId: user.departmentId ?? undefined,
      isActive: user.isActive
    })),
    quarters: quarters.map((quarter) => ({
      id: quarter.id,
      name: quarter.name,
      startDate: formatDate(quarter.startDate),
      endDate: formatDate(quarter.endDate),
      status: quarter.status,
      createdBy: quarter.createdBy
    })),
    objectives: objectives.map((objective) => ({
      id: objective.id,
      quarterId: objective.quarterId,
      level: objective.level,
      departmentId: objective.departmentId ?? undefined,
      ownerId: objective.ownerId,
      title: objective.title
    })),
    keyResults: keyResults.map((keyResult) => ({
      id: keyResult.id,
      objectiveId: keyResult.objectiveId,
      description: keyResult.description,
      startValue: keyResult.startValue,
      targetValue: keyResult.targetValue,
      currentValue: keyResult.currentValue,
      unit: keyResult.unit ?? undefined,
      ownerId: keyResult.ownerId,
      dueDate: formatDate(keyResult.dueDate),
      sortOrder: keyResult.sortOrder
    })),
    alignments: alignments.map((alignment) => ({
      id: alignment.id,
      childObjectiveId: alignment.childObjectiveId,
      parentKeyResultId: alignment.parentKeyResultId
    })),
    confidenceScores: confidenceScores.map((score) => ({
      id: score.id,
      keyResultId: score.keyResultId,
      userId: score.userId,
      weekNumber: score.weekNumber,
      quarterId: score.quarterId,
      score: score.score,
      note: score.note ?? undefined,
      isLocked: score.isLocked,
      submittedAt: score.submittedAt.toISOString(),
      updatedAt: score.updatedAt.toISOString()
    })),
    weeklyCommitments: weeklyCommitments.map((commitment) => ({
      id: commitment.id,
      userId: commitment.userId,
      quarterId: commitment.quarterId,
      weekNumber: commitment.weekNumber,
      priority1: commitment.priority1,
      priority2: commitment.priority2,
      priority3: commitment.priority3,
      priorSelfReview: commitment.priorSelfReview as Record<string, string> | undefined,
      submittedAt: commitment.submittedAt.toISOString(),
      updatedAt: commitment.updatedAt.toISOString()
    })),
    weeklyCelebrations: weeklyCelebrations.map((celebration) => ({
      id: celebration.id,
      userId: celebration.userId,
      quarterId: celebration.quarterId,
      weekNumber: celebration.weekNumber,
      achievements: celebration.achievements as { text: string }[],
      obstacles: celebration.obstacles ?? undefined,
      mood: celebration.mood,
      submittedAt: celebration.submittedAt.toISOString(),
      updatedAt: celebration.updatedAt.toISOString()
    })),
    healthMetrics: healthMetrics.map((metric) => ({
      id: metric.id,
      name: metric.name,
      description: metric.description ?? undefined,
      level: metric.level,
      departmentId: metric.departmentId ?? undefined,
      ownerId: metric.ownerId,
      thresholdType: metric.thresholdType,
      thresholdMin: metric.thresholdMin ?? undefined,
      thresholdMax: metric.thresholdMax ?? undefined,
      thresholdValue: metric.thresholdValue ?? undefined,
      inputMin: 0,
      inputMax: 10,
      updateFrequency: metric.updateFrequency,
      isActive: metric.isActive
    })),
    healthMetricRecords: healthMetricRecords.map((record) => ({
      id: record.id,
      healthMetricId: record.healthMetricId,
      currentValue: record.currentValue,
      status: record.status,
      note: record.note ?? undefined,
      recordedBy: record.recordedBy,
      recordedAt: record.recordedAt.toISOString()
    })),
    quarterReviews: quarterReviews.map((review) => ({
      id: review.id,
      quarterId: review.quarterId,
      level: review.level,
      ownerId: review.ownerId,
      departmentId: review.departmentId ?? undefined,
      whatWorked: review.whatWorked ?? undefined,
      whatDidnt: review.whatDidnt ?? undefined,
      healthSummary: review.healthSummary ?? undefined,
      nextQuarterInsights: review.nextQuarterInsights ?? undefined,
      submittedAt: review.submittedAt?.toISOString(),
      updatedAt: review.updatedAt.toISOString()
    })),
    keyResultReviews: krReviews.map((review) => {
      const quarterReview = quarterReviewById.get(review.quarterReviewId);
      const [whatWorked = review.note, whatDidnt = review.note] = review.note.split("\n");
      return {
        id: review.id,
        keyResultId: review.keyResultId,
        quarterId: quarterReview?.quarterId ?? "",
        reviewerId: quarterReview?.ownerId ?? "",
        finalValue: review.finalValue,
        completionRate: review.completionRate,
        confidenceScore: 5,
        whatWorked: quarterReview?.whatWorked ?? whatWorked,
        whatDidnt: quarterReview?.whatDidnt ?? whatDidnt,
        nextStep: quarterReview?.nextQuarterInsights ?? undefined,
        submittedAt: (quarterReview?.submittedAt ?? review.createdAt).toISOString(),
        updatedAt: review.createdAt.toISOString()
      };
    }),
    exportLogs: exportLogs.map((log) => ({
      id: log.id,
      exportedBy: log.exportedBy,
      exportType: log.exportType,
      scope: log.scope,
      departmentId: log.departmentId ?? undefined,
      quarterId: log.quarterId ?? undefined,
      status: log.status,
      feishuDocUrl: log.feishuDocUrl ?? undefined,
      message: log.message ?? undefined,
      exportedAt: log.exportedAt.toISOString()
    }))
  };
}
