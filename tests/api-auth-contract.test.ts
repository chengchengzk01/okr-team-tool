import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const businessRoutesThatMustReadSession = [
  "app/api/v1/departments/route.ts",
  "app/api/v1/quarters/route.ts",
  "app/api/v1/quarters/[quarterId]/objectives/route.ts"
];

describe("API authentication contract", () => {
  test.each(businessRoutesThatMustReadSession)("%s checks the current user before returning business data", (routePath) => {
    const source = readFileSync(join(process.cwd(), routePath), "utf8");

    expect(source).toContain("getCurrentUser");
    expect(source).toContain("未登录");
  });

  test("demo bootstrap route is restricted to super admins", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/demo/bootstrap/route.ts"), "utf8");

    expect(source).toContain("getCurrentUser");
    expect(source).toContain("super_admin");
    expect(source).toContain("只有超级管理员可以补齐演示数据");
    expect(source).toContain("getCurrentQuarter");
    expect(source).toContain("createdConfidenceScores");
    expect(source).toContain("createdWeeklyCommitments");
    expect(source).toContain("createdWeeklyCelebrations");
  });

  test("department delete route soft deletes instead of blocking synced departments", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/departments/[id]/route.ts"), "utf8");

    expect(source).toContain("isArchived: true");
    expect(source).not.toContain("飞书同步部门不支持删除");
  });

  test("weekly obstacle summary is restricted to department managers", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/weekly-celebrations/obstacles/route.ts"), "utf8");

    expect(source).toContain("dept_manager");
    expect(source).toContain("无权限查看障碍汇总");
  });

  test("auth refresh reissues a session from the current authenticated user", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/auth/refresh/route.ts"), "utf8");

    expect(source).toContain("getCurrentSession");
    expect(source).toContain("setSessionCookie");
    expect(source).toContain("未登录");
  });

  test("logout always clears the session and redirects back to login", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/auth/logout/route.ts"), "utf8");
    const appUrlSource = readFileSync(join(process.cwd(), "lib/app-url.ts"), "utf8");
    const shellSource = readFileSync(join(process.cwd(), "components/app-shell.tsx"), "utf8");
    const buttonSource = readFileSync(join(process.cwd(), "components/logout-button.tsx"), "utf8");

    expect(source).toContain("clearSessionCookie");
    expect(source).toContain("NextResponse.redirect");
    expect(source).toContain("resolveRequestAppOrigin");
    expect(source).toContain('new URL("/login", resolveRequestAppOrigin(request))');
    expect(appUrlSource).toContain("x-forwarded-host");
    expect(appUrlSource).toContain("x-forwarded-proto");
    expect(shellSource).toContain("LogoutButton");
    expect(buttonSource).toContain('fetch("/api/v1/auth/logout"');
    expect(buttonSource).toContain('router.replace("/login")');
  });

  test("Feishu OAuth callback can return the PRD JSON token contract", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/auth/feishu/callback/route.ts"), "utf8");

    expect(source).toContain("wantsJsonResponse");
    expect(source).toContain("NextResponse.json({ token, user })");
    expect(source).toContain("NextResponse.redirect");
    expect(source).toContain("authCallbackError");
    expect(source).toContain("statusForAuthCallbackFailure");
  });

  test("formal Feishu auth route never falls back to mock login behavior", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/auth/feishu/route.ts"), "utf8");
    const providerSource = readFileSync(join(process.cwd(), "lib/integrations/feishu.ts"), "utf8");

    expect(source).toContain("feishuProvider.getAuthUrl");
    expect(source).not.toContain("mock_state");
    expect(source).toContain("statusForAuthInitFailure");
    expect(providerSource).toContain("当前环境未启用正式飞书 OAuth 登录，请使用开发入口完成本地验收或切换到真实飞书模式");
  });

  test("mock login route is only available in development-compatible mode", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/auth/mock-login/route.ts"), "utf8");

    expect(source).toContain("isMockLoginEnabled");
    expect(source).toContain("开发模拟登录未开启");
  });

  test("quarter document export keeps company, department, and individual defaults aligned with role", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/integrations/feishu/doc/export/route.ts"), "utf8");

    expect(source).toContain("user.role === \"dept_manager\" ? \"department\" : user.role === \"member\" ? \"individual\" : \"company\"");
    expect(source).toContain("无权限导出该范围的飞书文档");
    expect(source).toContain("导出指定部门报告时，必须选择目标部门");
    expect(source).toContain("部门管理者只能导出本部门季度报告");
    expect(source).toContain("导出个人 OKR 报告时，必须选择目标成员");
    expect(source).toContain("成员只能导出自己的个人 OKR 报告");
    expect(source).toContain("指定部门 ·");
    expect(source).toContain("个人 OKR ·");
  });

  test("settings page is restricted to super admins on the server", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/settings/page.tsx"), "utf8");

    expect(source).toContain("user?.role !== \"super_admin\"");
    expect(source).toContain("redirect(\"/dashboard\")");
  });

  test("quarters page is restricted to super admins on the server", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/quarters/page.tsx"), "utf8");

    expect(source).toContain("user?.role !== \"super_admin\"");
    expect(source).toContain("redirect(\"/dashboard\")");
  });

  test("detail APIs keep local mock fallback paths for no-database validation", () => {
    const userRoute = readFileSync(join(process.cwd(), "app/api/v1/users/[id]/route.ts"), "utf8");
    const quarterRoute = readFileSync(join(process.cwd(), "app/api/v1/quarters/[quarterId]/route.ts"), "utf8");
    const objectiveRoute = readFileSync(join(process.cwd(), "app/api/v1/objectives/[id]/route.ts"), "utf8");
    const keyResultRoute = readFileSync(join(process.cwd(), "app/api/v1/key-results/[id]/route.ts"), "utf8");
    const alignmentRoute = readFileSync(join(process.cwd(), "app/api/v1/objectives/[id]/alignments/route.ts"), "utf8");
    const alignedObjectivesRoute = readFileSync(join(process.cwd(), "app/api/v1/key-results/[id]/aligned-objectives/route.ts"), "utf8");

    expect(userRoute).toContain("repository.getUser");
    expect(userRoute).toContain("catch(() => null)");
    expect(quarterRoute).toContain("repository.listQuarters");
    expect(quarterRoute).toContain("repository.listKeyResultsByObjective");
    expect(objectiveRoute).toContain("repository.updateObjective");
    expect(keyResultRoute).toContain("repository.updateKeyResult");
    expect(alignmentRoute).toContain("repository.createObjectiveAlignments");
    expect(alignedObjectivesRoute).toContain("snapshot.listAlignedObjectives");
  });

  test("objective creation uses the production database snapshot and permits repeated levels", () => {
    const objectiveCreateRoute = readFileSync(join(process.cwd(), "app/api/v1/quarters/[quarterId]/objectives/route.ts"), "utf8");
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

    expect(objectiveCreateRoute).toContain("const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;");
    expect(objectiveCreateRoute).toContain("snapshot.createObjective(");
    expect(schema).not.toContain("@@unique([ownerId, quarterId, level])");
  });

  test("objective and key result updates lock non-admin edits after planning", () => {
    const objectiveRoute = readFileSync(join(process.cwd(), "app/api/v1/objectives/[id]/route.ts"), "utf8");
    const keyResultRoute = readFileSync(join(process.cwd(), "app/api/v1/key-results/[id]/route.ts"), "utf8");
    const alignmentRoute = readFileSync(join(process.cwd(), "app/api/v1/objectives/[id]/alignments/route.ts"), "utf8");

    expect(objectiveRoute).toContain("existing.quarter.status !== \"planning\" && user.role !== \"super_admin\"");
    expect(objectiveRoute).toContain("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
    expect(keyResultRoute).toContain("existing.objective.quarter.status !== \"planning\" && user.role !== \"super_admin\"");
    expect(keyResultRoute).toContain("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
    expect(alignmentRoute).toContain("objective.quarter.status !== \"planning\" && user.role !== \"super_admin\"");
    expect(alignmentRoute).toContain("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
  });
});
