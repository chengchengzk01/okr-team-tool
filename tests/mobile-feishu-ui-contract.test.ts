import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("mobile and embedded UI contract", () => {
  test("app shell exposes a dedicated mobile navigation surface", () => {
    const source = readFileSync(join(process.cwd(), "components/app-shell.tsx"), "utf8");

    expect(source).toContain("移动导航");
    expect(source).toContain("lg:hidden");
  });

  test("settings tables stay horizontally scrollable on narrow screens", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/settings/page.tsx"), "utf8");

    expect(source).toContain("overflow-x-auto");
  });
});
