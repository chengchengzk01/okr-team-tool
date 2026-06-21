import { describe, expect, test } from "vitest";
import { createRepository } from "@/lib/data/repository";
import { createSeedState } from "@/lib/mock/seed";

describe("objective key results listing", () => {
  test("returns all key results under an objective regardless of KR owner", () => {
    const state = createSeedState();
    state.keyResults.push({
      id: "kr-cross-owner",
      objectiveId: "obj-company",
      description: "补充一个跨负责人 KR",
      startValue: 0,
      currentValue: 5,
      targetValue: 10,
      unit: "项",
      ownerId: "u-member",
      dueDate: "2026-06-30",
      sortOrder: 3
    });

    const repository = createRepository(state);
    const keyResults = repository.listKeyResultsByObjective("obj-company");

    expect(keyResults.map((item) => item.id)).toContain("kr-cross-owner");
  });
});
