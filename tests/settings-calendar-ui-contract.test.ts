import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("settings calendar UI contract", () => {
  test("offers explicit actions to refresh and stop configured calendar events", () => {
    const source = readFileSync(join(process.cwd(), "components/feishu-integration-actions.tsx"), "utf8");

    expect(source).toContain("/api/v1/integrations/feishu/calendar/events");
    expect(source).toContain("更新日历事件");
    expect(source).toContain("终止日历事件");
    expect(source).toContain("method: \"DELETE\"");
  });
});
