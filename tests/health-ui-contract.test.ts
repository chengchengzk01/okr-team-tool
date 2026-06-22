import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("health UI contract", () => {
  test("health overview guides first-time users when metrics are empty", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/health/page.tsx"), "utf8");

    expect(source).toContain("当前还没有健康指标");
    expect(source).toContain("去补演示数据");
    expect(source).toContain("title={`${title}暂时为空`}");
  });
});
