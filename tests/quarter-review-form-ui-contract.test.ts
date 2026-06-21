import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("quarter review form UI contract", () => {
  test("review page renders an overall quarter review form", () => {
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/review/page.tsx"), "utf8");
    const formSource = readFileSync(join(process.cwd(), "components/quarter-review-form.tsx"), "utf8");

    expect(pageSource).toContain("QuarterReviewForm");
    expect(formSource).toContain("/api/v1/quarters/");
    expect(formSource).toContain("整体季度 Review 入口暂未开放");
    expect(formSource).toContain("公司级季度 Review");
  });
});
