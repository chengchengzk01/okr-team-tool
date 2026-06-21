import { describe, expect, test } from "vitest";
import { getRuntimeBaselineReport } from "../lib/runtime/runtime-baseline";

describe("runtime baseline", () => {
  test("flags missing production env requirements and unsafe defaults", () => {
    const report = getRuntimeBaselineReport({
      NODE_ENV: "production",
      DATABASE_URL: "",
      JWT_SECRET: "local-development-secret-for-okr-demo",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    });

    expect(report.ready).toBe(false);
    expect(report.mode).toBe("production");
    expect(report.missingItems).toContain("DATABASE_URL");
    expect(report.warnings).toContain("DIRECT_URL is not set; Prisma migrations may fail or use the wrong connection path");
    expect(report.warnings).toContain("JWT_SECRET is using the local development fallback secret");
    expect(report.warnings).toContain("NEXT_PUBLIC_APP_URL should use an https URL in production");
    expect(report.warnings).toContain("ENABLE_MOCK_LOGIN should be explicitly set to false in production");
  });

  test("accepts a minimal safe production baseline", () => {
    const report = getRuntimeBaselineReport({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://okr:secret@db.example.com:5432/okr",
      DIRECT_URL: "postgresql://okr:secret@db.example.com:5432/okr",
      JWT_SECRET: "super-long-random-production-secret",
      NEXT_PUBLIC_APP_URL: "https://okr.example.com",
      ENABLE_MOCK_LOGIN: "false"
    });

    expect(report.ready).toBe(true);
    expect(report.missingItems).toHaveLength(0);
    expect(report.warnings).toHaveLength(0);
  });
});
