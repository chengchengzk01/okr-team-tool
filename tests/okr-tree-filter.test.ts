import { describe, expect, test } from "vitest";
import { createRepository, getVisibleOkrTreeFilter } from "@/lib/data/repository";
import { createSeedState } from "@/lib/mock/seed";

describe("OKR tree filtering", () => {
  test("keeps ancestor context when keyword matches a child KR", () => {
    const repository = createRepository(createSeedState());

    const tree = repository.buildOkrTree("q-2026-q2", { query: "3 分钟" });

    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe("让公司进入可持续增长的执行节奏");
    expect(tree[0].keyResults[0].children[0].title).toBe("建立高频反馈驱动的产品交付系统");
    expect(tree[0].keyResults[0].children[0].keyResults[0].children[0].title).toBe("提升核心 OKR 流程的自助使用率");
  });

  test("filters department branches while preserving the company root", () => {
    const repository = createRepository(createSeedState());

    const tree = repository.buildOkrTree("q-2026-q2", { departmentId: "dept-sales" });

    expect(tree).toHaveLength(1);
    expect(flattenTitles(tree)).toContain("让公司进入可持续增长的执行节奏");
    expect(flattenTitles(tree)).toContain("形成可预测的新客户转化节奏");
    expect(flattenTitles(tree)).not.toContain("建立高频反馈驱动的产品交付系统");
  });

  test("scopes requested OKR tree filters by viewer permissions", () => {
    const repository = createRepository(createSeedState());
    const admin = repository.getUser("u-admin")!;
    const member = repository.getUser("u-member")!;
    const salesManager = repository.getUser("u-sales-manager")!;

    expect(getVisibleOkrTreeFilter(admin, { departmentId: "all", query: "增长" })).toEqual({ departmentId: "all", query: "增长" });
    expect(getVisibleOkrTreeFilter(member, { departmentId: "all" })).toEqual({ departmentId: "dept-product", query: undefined });
    expect(getVisibleOkrTreeFilter(salesManager, { departmentId: "dept-product", query: "商机" })).toEqual({ departmentId: "dept-sales", query: "商机" });
  });

  test("marks low-confidence KRs during the final two sprint weeks", () => {
    const state = createSeedState();
    state.confidenceScores = state.confidenceScores.filter((score) => !(score.keyResultId === "kr-member-1" && score.quarterId === "q-2026-q2"));
    state.confidenceScores.push({
      id: "cs-member-sprint",
      keyResultId: "kr-member-1",
      userId: "u-member",
      weekNumber: 12,
      quarterId: "q-2026-q2",
      score: 4,
      note: "冲刺期风险上升",
      isLocked: false,
      submittedAt: "2026-06-22T10:00:00.000+08:00",
      updatedAt: "2026-06-22T10:00:00.000+08:00"
    });
    const repository = createRepository(state, () => new Date("2026-06-22T10:00:00+08:00"));

    const tree = repository.buildOkrTree("q-2026-q2");
    const kr = findKeyResult(tree, "kr-member-1");

    expect(kr?.sprintWarning).toEqual({
      tone: "yellow",
      label: "冲刺关注"
    });
  });
});

function flattenTitles(nodes: ReturnType<ReturnType<typeof createRepository>["buildOkrTree"]>) {
  const titles: string[] = [];

  for (const node of nodes) {
    titles.push(node.title);
    for (const keyResult of node.keyResults) {
      titles.push(keyResult.description);
      titles.push(...flattenTitles(keyResult.children));
    }
  }

  return titles;
}

function findKeyResult(nodes: ReturnType<ReturnType<typeof createRepository>["buildOkrTree"]>, keyResultId: string) {
  for (const node of nodes) {
    for (const keyResult of node.keyResults) {
      if (keyResult.id === keyResultId) return keyResult;
      const nested = findKeyResult(keyResult.children, keyResultId);
      if (nested) return nested;
    }
  }

  return null;
}
