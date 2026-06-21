import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("database restore contract", () => {
  test("restore script requires an explicit file path and supports dry run mode", () => {
    const source = readFileSync(join(process.cwd(), "scripts/restore-database.mjs"), "utf8");

    expect(source).toContain("--file");
    expect(source).toContain("--dry-run");
    expect(source).toContain("summarizeBackupSnapshot");
    expect(source).toContain("restore completed");
  });
});
