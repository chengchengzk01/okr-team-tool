import { describe, expect, test } from "vitest";
import { createFeishuTask, getFeishuTask, listFeishuTasks, updateFeishuTask } from "@/lib/integrations/feishu-task-store";

describe("Feishu task store", () => {
  test("tracks a task from pending to success", () => {
    const task = createFeishuTask("bitable_sync", "同步任务已创建");

    expect(task.status).toBe("pending");
    expect(getFeishuTask(task.id)?.message).toBe("同步任务已创建");

    const updated = updateFeishuTask(task.id, {
      status: "success",
      message: "同步成功"
    });

    expect(updated?.status).toBe("success");
    expect(getFeishuTask(task.id)?.message).toBe("同步成功");
    expect(listFeishuTasks().some((item) => item.id === task.id)).toBe(true);
  });
});
