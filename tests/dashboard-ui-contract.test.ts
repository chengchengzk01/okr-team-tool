import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("dashboard UI contract", () => {
  test("team dashboard cards render weekly achievement content, not only counts", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/dashboard/page.tsx"), "utf8");

    expect(source).toContain("celebration.achievements.slice");
    expect(source).toContain("item.text");
  });

  test("dashboard alert and health areas provide detail navigation", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/dashboard/page.tsx"), "utf8");

    expect(source).toContain("/key-results/${alert.keyResultId}");
    expect(source).toContain("/health/${metric.id}");
  });

  test("dashboard provides an initialization state when no quarter exists", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/dashboard/page.tsx"), "utf8");

    expect(source).toContain("DashboardInitializationState");
    expect(source).toContain("当前还没有可用季度");
    expect(source).toContain('href="/quarters"');
  });
});
