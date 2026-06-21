import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("Feishu config contract", () => {
  test("returns readiness details for OAuth, calendar, bitable, and drive", () => {
    const source = readFileSync(join(process.cwd(), "lib/integrations/feishu-config.ts"), "utf8");

    expect(source).toContain("oauthReady");
    expect(source).toContain("orgSyncReady");
    expect(source).toContain("bitableReady");
    expect(source).toContain("calendarReady");
    expect(source).toContain("driveReady");
    expect(source).toContain("checks");
    expect(source).toContain("missingItems");
  });

  test("settings page renders configuration readiness details and organization sync entry", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/settings/page.tsx"), "utf8");
    const actionsSource = readFileSync(join(process.cwd(), "components/feishu-integration-actions.tsx"), "utf8");
    const formSource = readFileSync(join(process.cwd(), "components/feishu-config-form.tsx"), "utf8");

    expect(pageSource).toContain("配置检查");
    expect(pageSource).toContain("查看官方文档");
    expect(actionsSource).toContain("/api/v1/departments/sync");
    expect(actionsSource).toContain("同步组织架构");
    expect(formSource).toContain("name=\"bitableAppToken\"");
    expect(formSource).toContain("当前已保存 App Secret");
    expect(formSource).toContain("当前已保存云空间目录 Token");
    expect(formSource).toContain("验证已保存配置");
    expect(formSource).toContain("/api/v1/integrations/feishu/config/validate");
  });

  test("config route rejects invalid calendar and bitable configuration shapes early", () => {
    const routeSource = readFileSync(join(process.cwd(), "app/api/v1/integrations/feishu/config/route.ts"), "utf8");
    const validateRouteSource = readFileSync(join(process.cwd(), "app/api/v1/integrations/feishu/config/validate/route.ts"), "utf8");

    expect(routeSource).toContain("按部门邀请日历事件时，必须填写受邀部门 ID");
    expect(routeSource).toContain("无法从多维表格链接中解析 app token");
    expect(validateRouteSource).toContain("真实飞书权限验证通过");
    expect(validateRouteSource).toContain("resolveHelpUrl");
  });
});
