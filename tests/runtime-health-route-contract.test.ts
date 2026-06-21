import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("runtime health route contract", () => {
  test("publishes a public runtime health endpoint with env and database checks", () => {
    const source = readFileSync(join(process.cwd(), "app/api/health/route.ts"), "utf8");

    expect(source).toContain("getRuntimeBaselineReport");
    expect(source).toContain("database");
    expect(source).toContain("mockLoginEnabled");
    expect(source).toContain("NextResponse.json");
    expect(source).toContain("status: report.ready && database.ok ? 200 : 503");
  });
});
