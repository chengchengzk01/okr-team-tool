import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("weekly UI contract", () => {
  test("shows the manager obstacle summary section on the weekly page", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/weekly/page.tsx"), "utf8");

    expect(pageSource).toContain("listWeeklyObstacles");
    expect(pageSource).toContain("本周障碍汇总");
    expect(pageSource).toContain("本周暂无障碍上报");
  });
});
