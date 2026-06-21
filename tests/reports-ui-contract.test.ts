import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("reports UI contract", () => {
  test("renders explicit empty states and department scope tabs", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/reports/page.tsx"), "utf8");
    const actionSource = readFileSync(join(process.cwd(), "components/report-export-action.tsx"), "utf8");

    expect(source).toContain("当前范围暂无部门对比数据");
    expect(source).toContain("当前范围暂无健康指标季度走势");
    expect(source).toContain("ReportScopeTabs");
    expect(source).toContain("requestedDepartmentId ? \"department\" : \"company\"");
    expect(actionSource).toContain("department_id");
    expect(actionSource).toContain("导出当前部门 V2.0 报表");
  });

  test("links report risk, trend, and health rows to detail pages", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/reports/page.tsx"), "utf8");

    expect(source).toContain("/key-results/${alert.keyResultId}");
    expect(source).toContain("/key-results/${trend.keyResultId}");
    expect(source).toContain("/health/${trend.metricId}");
  });
});
