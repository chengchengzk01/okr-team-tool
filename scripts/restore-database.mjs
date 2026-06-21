import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { getRestoreTableOrder, summarizeBackupSnapshot } from "./backup-utils.mjs";

const prisma = new PrismaClient();

try {
  const options = parseArgs(process.argv.slice(2));
  const snapshotPath = path.resolve(process.cwd(), options.file);
  const raw = await readFile(snapshotPath, "utf8");
  const snapshot = JSON.parse(raw);
  const summary = summarizeBackupSnapshot(snapshot);

  console.log(`[db-restore] snapshot=${snapshotPath}`);
  console.log(`[db-restore] exportedAt=${summary.exportedAt}`);
  console.log(`[db-restore] tables=${summary.tableNames.join(", ")}`);

  if (options.dryRun) {
    console.log("[db-restore] dry run only, no database changes applied");
    process.exit(0);
  }

  await restoreSnapshot(snapshot);
  console.log("restore completed");
} finally {
  await prisma.$disconnect();
}

function parseArgs(argv) {
  const options = { file: "", dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--file") {
      options.file = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
  }

  if (!options.file) {
    throw new Error("restore-database.mjs requires --file <backup.json>");
  }

  return options;
}

async function restoreSnapshot(snapshot) {
  const tables = snapshot.tables;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      TRUNCATE TABLE
        "kr_reviews",
        "quarter_reviews",
        "health_metric_records",
        "health_metrics",
        "weekly_celebrations",
        "weekly_commitments",
        "confidence_scores",
        "okr_alignments",
        "key_results",
        "objectives",
        "export_logs",
        "users",
        "quarters",
        "departments",
        "feishu_integration_configs"
      RESTART IDENTITY CASCADE
    `);

    await tx.department.createMany({
      data: (tables.departments ?? []).map(({ managerId, ...department }) => ({
        ...department,
        managerId: null
      }))
    });

    await tx.user.createMany({ data: tables.users ?? [] });
    await tx.quarter.createMany({ data: tables.quarters ?? [] });
    await tx.objective.createMany({ data: tables.objectives ?? [] });
    await tx.keyResult.createMany({ data: tables.keyResults ?? [] });
    await tx.oKRAlignment.createMany({ data: tables.alignments ?? [] });
    await tx.confidenceScore.createMany({ data: tables.confidenceScores ?? [] });
    await tx.weeklyCommitment.createMany({ data: tables.weeklyCommitments ?? [] });
    await tx.weeklyCelebration.createMany({ data: tables.weeklyCelebrations ?? [] });
    await tx.healthMetric.createMany({ data: tables.healthMetrics ?? [] });
    await tx.healthMetricRecord.createMany({ data: tables.healthMetricRecords ?? [] });
    await tx.quarterReview.createMany({ data: tables.quarterReviews ?? [] });
    await tx.kRReview.createMany({ data: tables.krReviews ?? [] });
    await tx.exportLog.createMany({ data: tables.exportLogs ?? [] });
    await tx.feishuIntegrationConfig.createMany({
      data: (tables.feishuConfigs ?? []).map((config) => ({
        ...config,
        appSecret: config.appSecret === "__redacted__" ? null : config.appSecret
      }))
    });

    for (const department of tables.departments ?? []) {
      if (!department.managerId) continue;
      await tx.department.update({
        where: { id: department.id },
        data: { managerId: department.managerId }
      });
    }
  });

  const restoredTables = getRestoreTableOrder().filter((tableName) => Array.isArray(tables[tableName]));
  console.log(`[db-restore] restored tables=${restoredTables.join(", ")}`);
}
