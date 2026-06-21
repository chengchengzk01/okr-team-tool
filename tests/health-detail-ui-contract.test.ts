import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("health detail UI contract", () => {
  test("provides a health metric management panel on the detail page", () => {
    const pagePath = join(process.cwd(), "app/(app)/health/[id]/page.tsx");
    const panelPath = join(process.cwd(), "components/health-metric-management-panel.tsx");

    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(panelPath)).toBe(true);

    const pageSource = readFileSync(pagePath, "utf8");
    const panelSource = readFileSync(panelPath, "utf8");

    expect(pageSource).toContain("HealthMetricManagementPanel");
    expect(pageSource).toContain("fullUser.role === \"super_admin\"");
    expect(pageSource).toContain("fullUser.role === \"dept_manager\"");
    expect(pageSource).toContain("metric.departmentId === fullUser.departmentId");
    expect(panelSource).toContain("/api/v1/health-metrics/");
    expect(panelSource).toContain("归档健康指标");
    expect(panelSource).toContain("只有部门管理者或超级管理员");
  });
});
