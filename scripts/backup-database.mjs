import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { redactFeishuConfigs, selectBackupsToPrune } from "./backup-utils.mjs";

const prisma = new PrismaClient();
const backupDir = process.env.OKR_BACKUP_DIR ?? path.join(process.cwd(), "backups");
const keepCount = Number(process.env.OKR_BACKUP_KEEP ?? 30);

try {
  await mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `okr-backup-${timestamp}.json`);
  const snapshot = await buildSnapshot();

  await writeFile(backupPath, JSON.stringify(snapshot, null, 2), "utf8");
  await pruneOldBackups();
  console.log(`backup created: ${backupPath}`);
} finally {
  await prisma.$disconnect();
}

async function buildSnapshot() {
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
    exportLogs,
    feishuConfigs
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
    prisma.exportLog.findMany(),
    prisma.feishuIntegrationConfig.findMany()
  ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tables: {
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
      exportLogs,
      feishuConfigs: redactFeishuConfigs(feishuConfigs)
    }
  };
}

async function pruneOldBackups() {
  const files = await readdir(backupDir);
  await Promise.all(selectBackupsToPrune(files, keepCount).map((file) => unlink(path.join(backupDir, file))));
}
