import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("settings UI contract", () => {
  test("renders a super-admin user management panel on the settings page", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/settings/page.tsx"), "utf8");
    const panelSource = readFileSync(join(process.cwd(), "components/user-management-panel.tsx"), "utf8");
    const departmentPanelSource = readFileSync(join(process.cwd(), "components/department-management-panel.tsx"), "utf8");
    const demoPanelSource = readFileSync(join(process.cwd(), "components/demo-data-bootstrap-panel.tsx"), "utf8");

    expect(pageSource).toContain("最近集成任务");
    expect(pageSource).toContain("页面回归建议顺序");
    expect(pageSource).toContain("UserManagementPanel");
    expect(pageSource).toContain("DepartmentManagementPanel");
    expect(pageSource).toContain("DemoDataBootstrapPanel");
    expect(pageSource).toContain("formatExportScope");
    expect(pageSource).toContain("指定部门 ·");
    expect(pageSource).toContain("请先执行上方组织同步、日历、多维表格或导出动作");
    expect(panelSource).toContain("用户管理");
    expect(panelSource).toContain("/api/v1/users/");
    expect(departmentPanelSource).toContain("部门管理");
    expect(departmentPanelSource).toContain("/api/v1/departments");
    expect(departmentPanelSource).toContain("飞书同步部门不支持删除");
    expect(demoPanelSource).toContain("演示数据");
    expect(demoPanelSource).toContain("/api/v1/demo/bootstrap");
  });
});
