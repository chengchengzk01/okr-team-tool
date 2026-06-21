import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("key result detail UI contract", () => {
  test("renders key result management controls on the detail page", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/key-results/[id]/page.tsx"), "utf8");
    const panelSource = readFileSync(join(process.cwd(), "components/key-result-management-panel.tsx"), "utf8");

    expect(pageSource).toContain("KeyResultManagementPanel");
    expect(pageSource).toContain("quarter.status === \"planning\" || fullUser.role === \"super_admin\"");
    expect(panelSource).toContain("/api/v1/key-results/");
    expect(panelSource).toContain("删除 KR");
    expect(panelSource).toContain("更新 KR");
    expect(panelSource).toContain("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
  });

  test("links aligned objectives and child key results to detail pages", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/key-results/[id]/page.tsx"), "utf8");

    expect(pageSource).toContain("/objectives/${objective.id}");
    expect(pageSource).toContain("/key-results/${childKr.id}");
  });

  test("allows department managers to manage department key results", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/key-results/[id]/page.tsx"), "utf8");
    const routeSource = readFileSync(join(process.cwd(), "app/api/v1/key-results/[id]/route.ts"), "utf8");

    expect(pageSource).toContain("fullUser.role === \"dept_manager\" && objective.departmentId === fullUser.departmentId");
    expect(routeSource).toContain("user.role === \"dept_manager\" && departmentId === user.departmentId");
  });
});
