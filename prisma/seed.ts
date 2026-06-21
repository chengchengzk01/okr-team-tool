import { PrismaClient } from "@prisma/client";
import {
  alignments,
  confidenceScores,
  departments,
  exportLogs,
  healthMetricRecords,
  healthMetrics,
  keyResultReviews,
  keyResults,
  objectives,
  quarters,
  users,
  weeklyCelebrations,
  weeklyCommitments
} from "../lib/mock/seed";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.kRReview.deleteMany(),
    prisma.quarterReview.deleteMany(),
    prisma.exportLog.deleteMany(),
    prisma.healthMetricRecord.deleteMany(),
    prisma.healthMetric.deleteMany(),
    prisma.weeklyCelebration.deleteMany(),
    prisma.weeklyCommitment.deleteMany(),
    prisma.confidenceScore.deleteMany(),
    prisma.oKRAlignment.deleteMany(),
    prisma.keyResult.deleteMany(),
    prisma.objective.deleteMany(),
    prisma.quarter.deleteMany(),
    prisma.user.deleteMany(),
    prisma.department.deleteMany()
  ]);

  for (const department of departments) {
    await prisma.department.create({
      data: {
        id: department.id,
        feishuDeptId: department.feishuDeptId,
        name: department.name,
        parentId: department.parentId
      }
    });
  }

  for (const user of users) {
    await prisma.user.create({
      data: {
        id: user.id,
        feishuUserId: user.feishuUserId,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        departmentId: user.departmentId,
        isActive: user.isActive
      }
    });
  }

  for (const department of departments) {
    if (department.managerId) {
      await prisma.department.update({
        where: { id: department.id },
        data: { managerId: department.managerId }
      });
    }
  }

  for (const quarter of quarters) {
    await prisma.quarter.create({
      data: {
        id: quarter.id,
        name: quarter.name,
        startDate: toDbDate(quarter.startDate),
        endDate: toDbDate(quarter.endDate),
        status: quarter.status,
        createdBy: quarter.createdBy
      }
    });
  }

  for (const objective of objectives) {
    await prisma.objective.create({ data: objective });
  }

  for (const keyResult of keyResults) {
    await prisma.keyResult.create({
      data: {
        ...keyResult,
        dueDate: toDbDate(keyResult.dueDate)
      }
    });
  }

  for (const alignment of alignments) {
    await prisma.oKRAlignment.create({ data: alignment });
  }

  for (const score of confidenceScores) {
    await prisma.confidenceScore.create({
      data: {
        ...score,
        submittedAt: new Date(score.submittedAt),
        updatedAt: new Date(score.updatedAt)
      }
    });
  }

  for (const commitment of weeklyCommitments) {
    await prisma.weeklyCommitment.create({
      data: {
        ...commitment,
        submittedAt: new Date(commitment.submittedAt),
        updatedAt: new Date(commitment.updatedAt)
      }
    });
  }

  for (const celebration of weeklyCelebrations) {
    await prisma.weeklyCelebration.create({
      data: {
        ...celebration,
        submittedAt: new Date(celebration.submittedAt),
        updatedAt: new Date(celebration.updatedAt)
      }
    });
  }

  for (const metric of healthMetrics) {
    await prisma.healthMetric.create({
      data: {
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
    });
  }

  for (const record of healthMetricRecords) {
    await prisma.healthMetricRecord.create({
      data: {
        ...record,
        recordedAt: new Date(record.recordedAt)
      }
    });
  }

  const reviewIds = new Map<string, string>();
  for (const review of keyResultReviews) {
    const key = `${review.quarterId}-${review.reviewerId}`;
    if (!reviewIds.has(key)) {
      const quarterReview = await prisma.quarterReview.create({
        data: {
          id: `qr-${key}`,
          quarterId: review.quarterId,
          level: "individual",
          ownerId: review.reviewerId,
          whatWorked: review.whatWorked,
          whatDidnt: review.whatDidnt,
          nextQuarterInsights: review.nextStep,
          submittedAt: new Date(review.submittedAt)
        }
      });
      reviewIds.set(key, quarterReview.id);
    }

    await prisma.kRReview.create({
      data: {
        id: review.id,
        keyResultId: review.keyResultId,
        quarterReviewId: reviewIds.get(key)!,
        finalValue: review.finalValue,
        completionRate: review.completionRate,
        note: `${review.whatWorked}\n${review.whatDidnt}`
      }
    });
  }

  for (const log of exportLogs) {
    await prisma.exportLog.create({
      data: {
        ...log,
        exportedAt: new Date(log.exportedAt)
      }
    });
  }
}

function toDbDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("OKR seed data imported");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
