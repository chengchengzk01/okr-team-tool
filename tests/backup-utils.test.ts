import { describe, expect, test } from "vitest";
import {
  getRestoreTableOrder,
  redactFeishuConfigs,
  selectBackupsToPrune,
  summarizeBackupSnapshot
} from "@/scripts/backup-utils.mjs";

describe("database backup utilities", () => {
  test("keeps the newest backup snapshots and prunes older files", () => {
    const files = [
      "okr-backup-2026-06-11T00-00-00-000Z.json",
      "okr-backup-2026-06-13T00-00-00-000Z.json",
      "notes.txt",
      "okr-backup-2026-06-12T00-00-00-000Z.json"
    ];

    expect(selectBackupsToPrune(files, 2)).toEqual(["okr-backup-2026-06-11T00-00-00-000Z.json"]);
  });

  test("redacts Feishu app secrets in exported snapshots", () => {
    expect(redactFeishuConfigs([{ id: "default", appSecret: "secret" }, { id: "mock", appSecret: null }])).toEqual([
      { id: "default", appSecret: "__redacted__" },
      { id: "mock", appSecret: null }
    ]);
  });

  test("validates a backup snapshot and summarizes record counts", () => {
    expect(
      summarizeBackupSnapshot({
        schemaVersion: 1,
        exportedAt: "2026-06-20T00:00:00.000Z",
        tables: {
          users: [{ id: "u-1" }],
          quarters: [{ id: "q-1" }]
        }
      })
    ).toEqual({
      schemaVersion: 1,
      exportedAt: "2026-06-20T00:00:00.000Z",
      tableNames: ["quarters", "users"],
      recordCounts: {
        quarters: 1,
        users: 1
      }
    });
  });

  test("exposes a stable restore order for dependent tables", () => {
    expect(getRestoreTableOrder().slice(0, 6)).toEqual([
      "departments",
      "users",
      "quarters",
      "objectives",
      "keyResults",
      "alignments"
    ]);
    expect(getRestoreTableOrder()).toContain("feishuConfigs");
  });
});
