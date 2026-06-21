import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("quarters UI contract", () => {
  test("quarters page exposes create and edit controls for quarter metadata", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/quarters/page.tsx"), "utf8");
    const formSource = readFileSync(join(process.cwd(), "components/quarter-editor-panel.tsx"), "utf8");

    expect(pageSource).toContain("QuarterEditorPanel");
    expect(formSource).toContain("创建季度");
    expect(formSource).toContain("更新季度");
    expect(formSource).toContain("/api/v1/quarters");
  });

  test("quarters page is restricted to super admins on the server", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/quarters/page.tsx"), "utf8");

    expect(pageSource).toContain("user?.role !== \"super_admin\"");
    expect(pageSource).toContain("redirect(\"/dashboard\")");
  });

  test("quarter status actions surface calendar stop feedback when archiving", () => {
    const actionsSource = readFileSync(join(process.cwd(), "components/quarter-status-actions.tsx"), "utf8");
    const routeSource = readFileSync(join(process.cwd(), "app/api/v1/quarters/[quarterId]/status/route.ts"), "utf8");

    expect(actionsSource).toContain("result.calendarStopLog?.message");
    expect(actionsSource).toContain("季度已归档");
    expect(actionsSource).toContain("季度状态已更新为");
    expect(routeSource).toContain("import { prisma } from \"@/lib/prisma\"");
    expect(routeSource).toContain("prisma.quarter.findUnique");
    expect(routeSource).toContain("assertActiveQuarterTransition");
    expect(routeSource).toContain("repository.updateQuarterStatus");
  });
});
