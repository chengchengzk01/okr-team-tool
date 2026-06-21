const RESTORE_TABLE_ORDER = [
  "departments",
  "users",
  "quarters",
  "objectives",
  "keyResults",
  "alignments",
  "confidenceScores",
  "weeklyCommitments",
  "weeklyCelebrations",
  "healthMetrics",
  "healthMetricRecords",
  "quarterReviews",
  "krReviews",
  "exportLogs",
  "feishuConfigs"
];

export function redactFeishuConfigs(configs) {
  return configs.map((config) => ({
    ...config,
    appSecret: config.appSecret ? "__redacted__" : null
  }));
}

export function selectBackupsToPrune(files, keepCount = 30) {
  if (!Number.isFinite(keepCount) || keepCount < 1) return [];
  return files
    .filter((file) => /^okr-backup-.+\.json$/.test(file))
    .sort()
    .reverse()
    .slice(keepCount);
}

export function getRestoreTableOrder() {
  return [...RESTORE_TABLE_ORDER];
}

export function summarizeBackupSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("备份快照不是有效对象");
  }
  if (snapshot.schemaVersion !== 1) {
    throw new Error(`不支持的备份版本: ${snapshot.schemaVersion ?? "unknown"}`);
  }
  if (!snapshot.exportedAt || typeof snapshot.exportedAt !== "string") {
    throw new Error("备份快照缺少 exportedAt");
  }
  if (!snapshot.tables || typeof snapshot.tables !== "object") {
    throw new Error("备份快照缺少 tables");
  }

  const tableNames = Object.keys(snapshot.tables).sort();
  const recordCounts = Object.fromEntries(
    tableNames.map((tableName) => {
      const rows = snapshot.tables[tableName];
      if (!Array.isArray(rows)) {
        throw new Error(`备份快照表 ${tableName} 不是数组`);
      }
      return [tableName, rows.length];
    })
  );

  return {
    schemaVersion: snapshot.schemaVersion,
    exportedAt: snapshot.exportedAt,
    tableNames,
    recordCounts
  };
}
