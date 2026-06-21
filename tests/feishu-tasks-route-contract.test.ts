import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("feishu tasks route contract", () => {
  test("task list API returns recent tasks with role-based filtering", () => {
    const source = readFileSync(join(process.cwd(), "app/api/v1/integrations/feishu/tasks/route.ts"), "utf8");

    expect(source).toContain("listFeishuTasks");
    expect(source).toContain("user.role === \"super_admin\" || task.createdBy === user.id");
    expect(source).toContain("slice(0, 20)");
  });

  test("organization sync and calendar actions enqueue background tasks", () => {
    const syncSource = readFileSync(join(process.cwd(), "app/api/v1/departments/sync/route.ts"), "utf8");
    const calendarCreateSource = readFileSync(join(process.cwd(), "app/api/v1/integrations/feishu/calendar/create-events/route.ts"), "utf8");
    const calendarUpdateSource = readFileSync(join(process.cwd(), "app/api/v1/integrations/feishu/calendar/events/[quarterId]/route.ts"), "utf8");

    expect(syncSource).toContain("createFeishuTask(\"directory_sync\"");
    expect(syncSource).toContain("runOrganizationSyncTask");
    expect(syncSource).toContain("status: 202");
    expect(calendarCreateSource).toContain("createFeishuTask(\"calendar_events\"");
    expect(calendarCreateSource).toContain("runCalendarTask");
    expect(calendarCreateSource).toContain("status: 202");
    expect(calendarUpdateSource).toContain("createFeishuTask(\"calendar_events\"");
    expect(calendarUpdateSource).toContain("runCalendarTask");
    expect(calendarUpdateSource).toContain("status: 202");
    expect(calendarUpdateSource).toContain("终止中");
  });
});
