import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("okr tree UI contract", () => {
  test("links objective titles to their detail pages", () => {
    const source = readFileSync(join(process.cwd(), "components/okr-tree.tsx"), "utf8");

    expect(source).toContain("/objectives/");
  });
});
