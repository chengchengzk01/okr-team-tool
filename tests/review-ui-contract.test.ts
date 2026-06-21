import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("review UI contract", () => {
  test("only opens KR final review forms during the reviewing stage", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/review/page.tsx"), "utf8");
    const formSource = readFileSync(join(process.cwd(), "components/key-result-review-form.tsx"), "utf8");

    expect(pageSource).toContain("isReviewing={quarter.status === \"reviewing\"}");
    expect(formSource).toContain("季度尚未进入复盘阶段");
  });

  test("quarter review API only accepts submissions during the reviewing stage", () => {
    const routeSource = readFileSync(join(process.cwd(), "app/api/v1/quarters/[quarterId]/reviews/route.ts"), "utf8");

    expect(routeSource).toContain("quarter.status !== \"reviewing\"");
    expect(routeSource).toContain("季度尚未进入复盘阶段");
  });

  test("review page includes the overall quarter review entry alongside KR reviews", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/review/page.tsx"), "utf8");

    expect(pageSource).toContain("QuarterReviewForm");
    expect(pageSource).toContain("pickCurrentQuarterReview");
  });

  test("review page exposes quarter document export with role-aligned scopes", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/review/page.tsx"), "utf8");
    const exportSource = readFileSync(join(process.cwd(), "components/quarter-document-export-action.tsx"), "utf8");

    expect(pageSource).toContain("QuarterDocumentExportAction");
    expect(pageSource).toContain("fullUser.role === \"super_admin\" || fullUser.role === \"dept_manager\" || fullUser.role === \"member\"");
    expect(pageSource).toContain("{ value: \"company\", label: \"全公司季度报告\" }");
    expect(pageSource).toContain("{ value: \"department\", label: \"指定部门季度报告\" }");
    expect(pageSource).toContain("{ value: \"individual\", label: \"个人 OKR 报告\" }");
    expect(pageSource).toContain("availableDepartments=");
    expect(pageSource).toContain("availableUsers=");
    expect(pageSource).toContain("fullUser.role === \"member\" ? \"individual\" : \"company\"");
    expect(exportSource).toContain("导出范围");
    expect(exportSource).toContain("availableScopes.length > 1");
    expect(exportSource).toContain("目标部门");
    expect(exportSource).toContain("目标成员");
    expect(exportSource).toContain("department_id");
    expect(exportSource).toContain("user_id");
    expect(exportSource).toContain("最近集成任务");
    expect(exportSource).toContain("导出日志");
  });

  test("review page and form allow department managers to review department KRs", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/review/page.tsx"), "utf8");
    const formSource = readFileSync(join(process.cwd(), "components/key-result-review-form.tsx"), "utf8");

    expect(pageSource).toContain("fullUser.role === \"dept_manager\" && objective?.departmentId === fullUser.departmentId");
    expect(formSource).toContain("仅 KR 负责人、部门管理者或超级管理员可提交复盘");
  });

  test("review page builds KR rows from a user-scoped review summary", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/review/page.tsx"), "utf8");

    expect(pageSource).toContain("getQuarterReviewSummary(fullUser, quarter.id)");
  });
});
