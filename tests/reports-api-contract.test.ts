import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("reports API contract", () => {
  test("quarter comparison and confidence alerts support department scope query params", () => {
    const quarterRouteSource = readFileSync(join(process.cwd(), "app/api/v1/reports/quarter-comparison/route.ts"), "utf8");
    const alertsRouteSource = readFileSync(join(process.cwd(), "app/api/v1/reports/confidence-alerts/route.ts"), "utf8");
    const exportRouteSource = readFileSync(join(process.cwd(), "app/api/v1/reports/export/route.ts"), "utf8");

    expect(quarterRouteSource).toContain("department_id");
    expect(quarterRouteSource).toContain("departmentId");
    expect(alertsRouteSource).toContain("department_id");
    expect(alertsRouteSource).toContain("departmentId");
    expect(exportRouteSource).toContain("department_id");
    expect(exportRouteSource).toContain("导出部门统计报表时必须指定目标部门");
    expect(exportRouteSource).toContain("exportDepartmentId");
  });
});
