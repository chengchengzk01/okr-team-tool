import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("okr tree UI contract", () => {
  test("links objective titles to their detail pages", () => {
    const source = readFileSync(join(process.cwd(), "components/okr-tree.tsx"), "utf8");
    const pageSource = readFileSync(join(process.cwd(), "app/(app)/okr/page.tsx"), "utf8");

    expect(source).toContain("/objectives/");
    expect(pageSource).toContain("当前季度还没有可展示的 OKR");
    expect(pageSource).toContain("去补演示数据");
    expect(pageSource).toContain("清空筛选");
  });
});
