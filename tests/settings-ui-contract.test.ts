import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("settings UI contract", () => {
  test("renders a super-admin user management panel on the settings page", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/settings/page.tsx"), "utf8");
    const panelSource = readFileSync(join(process.cwd(), "components/user-management-panel.tsx"), "utf8");
    const departmentPanelSource = readFileSync(join(process.cwd(), "components/department-management-panel.tsx"), "utf8");
    const demoPanelSource = readFileSync(join(process.cwd(), "components/demo-data-bootstrap-panel.tsx"), "utf8");
    const acceptancePanelSource = readFileSync(join(process.cwd(), "components/mobile-feishu-acceptance-panel.tsx"), "utf8");

    expect(pageSource).toContain("最近集成任务");
    expect(pageSource).toContain("页面回归建议顺序");
    expect(pageSource).toContain("首次使用建议顺序");
    expect(pageSource).toContain("UserManagementPanel");
    expect(pageSource).toContain("DepartmentManagementPanel");
    expect(pageSource).toContain("DemoDataBootstrapPanel");
    expect(pageSource).toContain("MobileFeishuAcceptancePanel");
    expect(pageSource).toContain("formatExportScope");
    expect(pageSource).toContain("指定部门 ·");
    expect(pageSource).toContain("请先执行上方组织同步、日历、多维表格或导出动作");
    expect(panelSource).toContain("用户管理");
    expect(panelSource).toContain("/api/v1/users/");
    expect(departmentPanelSource).toContain("部门管理");
    expect(departmentPanelSource).toContain("/api/v1/departments");
    expect(departmentPanelSource).toContain("软删除");
    expect(departmentPanelSource).toContain("open_department_id");
    expect(demoPanelSource).toContain("演示数据");
    expect(demoPanelSource).toContain("/api/v1/demo/bootstrap");
    expect(demoPanelSource).toContain("周承诺");
    expect(demoPanelSource).toContain("周五庆祝");
    expect(demoPanelSource).toContain("信心值");
    expect(demoPanelSource).toContain('href="/dashboard"');
    expect(demoPanelSource).toContain('href="/weekly"');
    expect(demoPanelSource).toContain('href="/reports"');
    expect(acceptancePanelSource).toContain("移动端 / 飞书 H5 验收准备");
    expect(acceptancePanelSource).toContain("真机检查项");
    expect(acceptancePanelSource).toContain("验收通过标准");
    expect(acceptancePanelSource).toContain("从飞书客户端内打开系统登录页");
    expect(acceptancePanelSource).toContain("完成一次飞书内嵌 H5 登录回跳");
    expect(acceptancePanelSource).toContain("关键页面都有导航入口");
  });
});
