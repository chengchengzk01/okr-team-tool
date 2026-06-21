import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("objective detail UI contract", () => {
  test("provides an objective detail page with management actions", () => {
    const pagePath = join(process.cwd(), "app/(app)/objectives/[id]/page.tsx");
    const panelPath = join(process.cwd(), "components/objective-management-panel.tsx");

    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(panelPath)).toBe(true);

    const pageSource = readFileSync(pagePath, "utf8");
    const panelSource = readFileSync(panelPath, "utf8");

    expect(pageSource).toContain("Objective 详情");
    expect(pageSource).toContain("ObjectiveManagementPanel");
    expect(pageSource).toContain("quarter.status === \"planning\" || fullUser.role === \"super_admin\"");
    expect(panelSource).toContain("/api/v1/objectives/");
    expect(panelSource).toContain("删除 Objective");
    expect(panelSource).toContain("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
  });
});
