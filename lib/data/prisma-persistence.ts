import type {
  ConfidenceScore,
  ExportLog,
  HealthMetric,
  HealthMetricRecord,
  KeyResult,
  KeyResultReview,
  OKRAlignment,
  Objective,
  Quarter,
  QuarterReview,
  WeeklyCelebration,
  WeeklyCommitment
} from "@/lib/domain/types";
import { prisma } from "@/lib/prisma";

function persistenceEnabled() {
  return Boolean(process.env.DATABASE_URL) && process.env.NODE_ENV !== "test";
}

async function persist(action: () => Promise<unknown>) {
  if (!persistenceEnabled()) return;
  try {
    await action();
  } catch (error) {
    console.error("PostgreSQL persistence failed", error);
  }
}

export const prismaPersistence = {
  upsertQuarter(quarter: Quarter) {
    return persist(() =>
      prisma.quarter.upsert({
        where: { id: quarter.id },
        update: {
          name: quarter.name,
          startDate: toDate(quarter.startDate),
          endDate: toDate(quarter.endDate),
          status: quarter.status,
          createdBy: quarter.createdBy
        },
        create: {
          id: quarter.id,
          name: quarter.name,
          startDate: toDate(quarter.startDate),
          endDate: toDate(quarter.endDate),
          status: quarter.status,
          createdBy: quarter.createdBy
        }
      })
    );
  },

  upsertObjective(objective: Objective) {
    return persist(() =>
      prisma.objective.upsert({
        where: { id: objective.id },
        update: objective,
        create: objective
      })
    );
  },

  upsertAlignment(alignment: OKRAlignment) {
    return persist(() =>
      prisma.oKRAlignment.upsert({
        where: { id: alignment.id },
        update: alignment,
        create: alignment
      })
    );
  },

  upsertKeyResult(keyResult: KeyResult) {
    return persist(() =>
      prisma.keyResult.upsert({
        where: { id: keyResult.id },
        update: { ...keyResult, dueDate: toDate(keyResult.dueDate) },
        create: { ...keyResult, dueDate: toDate(keyResult.dueDate) }
      })
    );
  },

  upsertConfidenceScore(score: ConfidenceScore) {
    return persist(() =>
      prisma.confidenceScore.upsert({
        where: { id: score.id },
        update: {
          ...score,
          submittedAt: new Date(score.submittedAt),
          updatedAt: new Date(score.updatedAt)
        },
        create: {
          ...score,
          submittedAt: new Date(score.submittedAt),
          updatedAt: new Date(score.updatedAt)
        }
      })
    );
  },

  upsertWeeklyCommitment(commitment: WeeklyCommitment) {
    return persist(() =>
      prisma.weeklyCommitment.upsert({
        where: { id: commitment.id },
        update: {
          ...commitment,
          submittedAt: new Date(commitment.submittedAt),
          updatedAt: new Date(commitment.updatedAt)
        },
        create: {
          ...commitment,
          submittedAt: new Date(commitment.submittedAt),
          updatedAt: new Date(commitment.updatedAt)
        }
      })
    );
  },

  upsertWeeklyCelebration(celebration: WeeklyCelebration) {
    return persist(() =>
      prisma.weeklyCelebration.upsert({
        where: { id: celebration.id },
        update: {
          ...celebration,
          submittedAt: new Date(celebration.submittedAt),
          updatedAt: new Date(celebration.updatedAt)
        },
        create: {
          ...celebration,
          submittedAt: new Date(celebration.submittedAt),
          updatedAt: new Date(celebration.updatedAt)
        }
      })
    );
  },

  upsertHealthMetric(metric: HealthMetric) {
    return persist(() =>
      prisma.healthMetric.upsert({
        where: { id: metric.id },
        update: {
          name: metric.name,
          description: metric.description,
          level: metric.level,
          departmentId: metric.departmentId,
          ownerId: metric.ownerId,
          thresholdType: metric.thresholdType,
          thresholdMin: metric.thresholdMin,
          thresholdMax: metric.thresholdMax,
          thresholdValue: metric.thresholdValue,
          updateFrequency: metric.updateFrequency,
          isActive: metric.isActive
        },
        create: {
          id: metric.id,
          name: metric.name,
          description: metric.description,
          level: metric.level,
          departmentId: metric.departmentId,
          ownerId: metric.ownerId,
          thresholdType: metric.thresholdType,
          thresholdMin: metric.thresholdMin,
          thresholdMax: metric.thresholdMax,
          thresholdValue: metric.thresholdValue,
          updateFrequency: metric.updateFrequency,
          isActive: metric.isActive
        }
      })
    );
  },

  upsertHealthMetricRecord(record: HealthMetricRecord) {
    return persist(() =>
      prisma.healthMetricRecord.upsert({
        where: { id: record.id },
        update: { ...record, recordedAt: new Date(record.recordedAt) },
        create: { ...record, recordedAt: new Date(record.recordedAt) }
      })
    );
  },

  upsertKeyResultReview(review: KeyResultReview) {
    return persist(async () => {
      const quarterReviewId = `qr-${review.quarterId}-${review.reviewerId}`;
      await prisma.quarterReview.upsert({
        where: { id: quarterReviewId },
        update: {
          whatWorked: review.whatWorked,
          whatDidnt: review.whatDidnt,
          nextQuarterInsights: review.nextStep,
          submittedAt: new Date(review.submittedAt)
        },
        create: {
          id: quarterReviewId,
          quarterId: review.quarterId,
          level: "individual",
          ownerId: review.reviewerId,
          whatWorked: review.whatWorked,
          whatDidnt: review.whatDidnt,
          nextQuarterInsights: review.nextStep,
          submittedAt: new Date(review.submittedAt)
        }
      });
      await prisma.kRReview.upsert({
        where: { id: review.id },
        update: {
          finalValue: review.finalValue,
          completionRate: review.completionRate,
          note: `${review.whatWorked}\n${review.whatDidnt}`
        },
        create: {
          id: review.id,
          keyResultId: review.keyResultId,
          quarterReviewId,
          finalValue: review.finalValue,
          completionRate: review.completionRate,
          note: `${review.whatWorked}\n${review.whatDidnt}`
        }
      });
    });
  },

  upsertQuarterReview(review: QuarterReview) {
    return persist(() =>
      prisma.quarterReview.upsert({
        where: { id: review.id },
        update: {
          quarterId: review.quarterId,
          level: review.level,
          ownerId: review.ownerId,
          departmentId: review.departmentId,
          whatWorked: review.whatWorked,
          whatDidnt: review.whatDidnt,
          healthSummary: review.healthSummary,
          nextQuarterInsights: review.nextQuarterInsights,
          submittedAt: review.submittedAt ? new Date(review.submittedAt) : undefined,
          updatedAt: new Date(review.updatedAt)
        },
        create: {
          id: review.id,
          quarterId: review.quarterId,
          level: review.level,
          ownerId: review.ownerId,
          departmentId: review.departmentId,
          whatWorked: review.whatWorked,
          whatDidnt: review.whatDidnt,
          healthSummary: review.healthSummary,
          nextQuarterInsights: review.nextQuarterInsights,
          submittedAt: review.submittedAt ? new Date(review.submittedAt) : undefined,
          updatedAt: new Date(review.updatedAt)
        }
      })
    );
  },

  upsertExportLog(log: ExportLog) {
    return persist(() =>
      prisma.exportLog.upsert({
        where: { id: log.id },
        update: { ...log, exportedAt: new Date(log.exportedAt) },
        create: { ...log, exportedAt: new Date(log.exportedAt) }
      })
    );
  }
};

function toDate(value: string) {
  return new Date(value.includes("T") ? value : `${value}T00:00:00.000+08:00`);
}
