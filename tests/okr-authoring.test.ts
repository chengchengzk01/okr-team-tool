import { describe, expect, test } from "vitest";
import { createRepository } from "@/lib/data/repository";
import { createSeedState } from "@/lib/mock/seed";

describe("OKR authoring", () => {
  test("adds a new objective into the current quarter tree", () => {
    const repository = createRepository(createSeedState());

    const objective = repository.createObjective(
      {
        quarterId: "q-2026-q2",
        level: "individual",
        departmentId: "dept-sales",
        ownerId: "u-sales-manager",
        title: "提升销售团队复盘质量"
      },
      ["kr-company-2"]
    );

    expect(repository.listObjectives("q-2026-q2").some((item) => item.id === objective.id)).toBe(true);
  });

  test("adds key results in sequence under an objective", () => {
    const state = createSeedState();
    state.keyResults = state.keyResults.filter((keyResult) => keyResult.objectiveId !== "obj-sales");
    const repository = createRepository(state);

    const first = repository.createKeyResult({
      objectiveId: "obj-sales",
      description: "完成 5 个重点客户复盘",
      startValue: 0,
      targetValue: 5,
      currentValue: 0,
      unit: "个",
      ownerId: "u-sales-manager",
      dueDate: "2026-06-30"
    });
    const second = repository.createKeyResult({
      objectiveId: "obj-sales",
      description: "沉淀 3 条可复用销售动作",
      startValue: 0,
      targetValue: 3,
      currentValue: 0,
      unit: "条",
      ownerId: "u-sales-manager",
      dueDate: "2026-06-30"
    });

    expect(first.sortOrder).toBe(1);
    expect(second.sortOrder).toBe(2);
  });

  test("allows multiple objectives for the same owner, quarter, and level", () => {
    const repository = createRepository(createSeedState());

    const objective = repository.createObjective({
        quarterId: "q-2026-q2",
        level: "individual",
        departmentId: "dept-product",
        ownerId: "u-member",
        title: "重复个人 Objective"
      },
      ["kr-product-1"]
    );

    expect(repository.listObjectives("q-2026-q2").some((item) => item.id === objective.id)).toBe(true);
  });

  test("requires parent KR alignment for department and individual objectives", () => {
    const repository = createRepository(createSeedState());

    expect(() =>
      repository.createObjective({
        quarterId: "q-2026-q2",
        level: "department",
        departmentId: "dept-sales",
        ownerId: "u-admin",
        title: "补齐销售部门对齐"
      })
    ).toThrow("部门级和个人级 Objective 必须对齐上级 KR");

    expect(() =>
      repository.createObjective({
        quarterId: "q-2026-q2",
        level: "individual",
        departmentId: "dept-sales",
        ownerId: "u-sales-manager",
        title: "补齐个人对齐"
      })
    ).toThrow("部门级和个人级 Objective 必须对齐上级 KR");
  });

  test("rejects creating objectives and key results in archived quarters", () => {
    const repository = createRepository(createSeedState());

    expect(() =>
      repository.createObjective({
        quarterId: "q-2026-q1",
        level: "individual",
        departmentId: "dept-product",
        ownerId: "u-member",
        title: "归档后新增 Objective"
      }, ["kr-product-q1-1"])
    ).toThrow("季度已归档，只读");

    expect(() =>
      repository.createKeyResult({
        objectiveId: "obj-product-q1",
        description: "归档后新增 KR",
        startValue: 0,
        targetValue: 1,
        currentValue: 0,
        unit: "个",
        ownerId: "u-manager",
        dueDate: "2026-03-31"
      })
    ).toThrow("季度已归档，只读");
  });

  test("lists child objectives aligned under a parent key result by visible scope", () => {
    const repository = createRepository(createSeedState());
    const member = repository.getUser("u-member")!;
    const salesManager = repository.getUser("u-sales-manager")!;

    expect(repository.listAlignedObjectives("kr-company-1", member).map((item) => item.id)).toEqual(["obj-product"]);
    expect(repository.listAlignedObjectives("kr-company-1", salesManager)).toHaveLength(0);
  });

  test("filters confidence history by key result visibility", () => {
    const repository = createRepository(createSeedState());
    const member = repository.getUser("u-member")!;
    const salesManager = repository.getUser("u-sales-manager")!;

    expect(repository.listVisibleConfidenceHistory("kr-member-1", member)).not.toHaveLength(0);
    expect(() => repository.listVisibleConfidenceHistory("kr-product-1", member)).toThrow("无权限查看 KR 信心值历史");
    expect(() => repository.listVisibleConfidenceHistory("kr-member-1", salesManager)).toThrow("无权限查看 KR 信心值历史");
  });
});
