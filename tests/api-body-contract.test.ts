import { describe, expect, test } from "vitest";
import { normalizeKeyResultCreateBody, normalizeObjectiveCreateBody } from "@/lib/api/request-normalizers";

describe("API request body contracts", () => {
  test("accepts PRD snake_case fields when creating objectives", () => {
    expect(
      normalizeObjectiveCreateBody({
        level: "department",
        department_id: "dept-product",
        owner_id: "u-manager",
        title: "建立部门 OKR",
        parent_key_result_ids: ["kr-company-1"]
      })
    ).toEqual({
      level: "department",
      departmentId: "dept-product",
      ownerId: "u-manager",
      title: "建立部门 OKR",
      parentKeyResultIds: ["kr-company-1"]
    });
  });

  test("keeps existing camelCase fields used by the app UI", () => {
    expect(
      normalizeObjectiveCreateBody({
        level: "individual",
        departmentId: "dept-product",
        ownerId: "u-member",
        title: "提升个人 OKR 使用率",
        parentKeyResultIds: ["kr-product-1"]
      })
    ).toEqual({
      level: "individual",
      departmentId: "dept-product",
      ownerId: "u-member",
      title: "提升个人 OKR 使用率",
      parentKeyResultIds: ["kr-product-1"]
    });
  });

  test("accepts PRD snake_case fields when creating key results", () => {
    expect(
      normalizeKeyResultCreateBody({
        description: "完成 5 个关键客户访谈",
        start_value: 0,
        target_value: 5,
        current_value: 1,
        unit: "个",
        owner_id: "u-member",
        due_date: "2026-06-30"
      })
    ).toEqual({
      description: "完成 5 个关键客户访谈",
      startValue: 0,
      targetValue: 5,
      currentValue: 1,
      unit: "个",
      ownerId: "u-member",
      dueDate: "2026-06-30"
    });
  });
});
