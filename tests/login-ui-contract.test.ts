import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("login UI contract", () => {
  test("keeps Feishu OAuth as the formal login entry and gates mock login behind development mode", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/login/page.tsx"), "utf8");
    const buttonSource = readFileSync(join(process.cwd(), "components/login-buttons.tsx"), "utf8");
    const routeSource = readFileSync(join(process.cwd(), "app/api/v1/auth/mock-login/route.ts"), "utf8");

    expect(buttonSource).toContain("用飞书账号登录");
    expect(pageSource).toContain("Mock 集成模式");
    expect(routeSource).toContain("isMockLoginEnabled");
    expect(routeSource).toContain("item.role === role && item.isActive");
    expect(pageSource).toContain("正式登录");
    expect(buttonSource).toContain("if (!response.ok)");
    expect(buttonSource).toContain("开发登录失败");
  });
});
