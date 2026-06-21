import { describe, expect, test } from "vitest";
import { createRepository } from "@/lib/data/repository";
import { createSeedState } from "@/lib/mock/seed";

describe("quarter review", () => {
  test("stores a KR review and uses the final value in the review summary", () => {
    const repository = createRepository(createReviewingState(), () => new Date("2026-06-30T18:00:00+08:00"));

    const review = repository.submitKeyResultReview({
      keyResultId: "kr-product-1",
      quarterId: "q-2026-q2",
      reviewerId: "u-manager",
      finalValue: 4,
      confidenceScore: 8,
      whatWorked: "核心路径稳定上线",
      whatDidnt: "跨部门验收启动偏晚",
      nextStep: "下季度提前锁定验收人"
    });

    expect(review.id).toMatch(/^krr-/);
    expect(review.completionRate).toBe(1);
    const row = repository.getQuarterReviewSummary("q-2026-q2").find((item) => item.keyResult.id === "kr-product-1");
    expect(row?.review?.finalValue).toBe(4);
    expect(row?.review?.completionRate).toBe(1);
    expect(row?.completionRate).toBe(1);
  });

  test("allows department managers to submit KR reviews for department key results", () => {
    const repository = createRepository(createReviewingState());

    const review = repository.submitKeyResultReview({
      keyResultId: "kr-member-1",
      quarterId: "q-2026-q2",
      reviewerId: "u-manager",
      finalValue: 3,
      confidenceScore: 7,
      whatWorked: "部门管理者补充复盘",
      whatDidnt: "跨角色协作还不够顺畅"
    });

    expect(review.reviewerId).toBe("u-manager");
    expect(review.keyResultId).toBe("kr-member-1");
  });

  test("allows only KR owner, department manager, or super admin to submit a KR review", () => {
    const repository = createRepository(createReviewingState());

    expect(() =>
      repository.submitKeyResultReview({
        keyResultId: "kr-product-1",
        quarterId: "q-2026-q2",
        reviewerId: "u-member",
        finalValue: 4,
        confidenceScore: 8,
        whatWorked: "尝试越权提交",
        whatDidnt: "权限不应放行"
      })
    ).toThrow("只有 KR 负责人、部门管理者或超级管理员可以提交复盘");
  });

  test("rejects KR review submission before the quarter enters reviewing", () => {
    const repository = createRepository(createSeedState());

    expect(() =>
      repository.submitKeyResultReview({
        keyResultId: "kr-product-1",
        quarterId: "q-2026-q2",
        reviewerId: "u-manager",
        finalValue: 4,
        confidenceScore: 8,
        whatWorked: "执行期提前复盘",
        whatDidnt: "不应允许"
      })
    ).toThrow("季度尚未进入复盘阶段");
  });

  test("rejects review submission after a quarter is archived", () => {
    const state = createSeedState();
    state.quarters.find((quarter) => quarter.id === "q-2026-q2")!.status = "archived";
    const repository = createRepository(state);

    expect(() =>
      repository.submitKeyResultReview({
        keyResultId: "kr-product-1",
        quarterId: "q-2026-q2",
        reviewerId: "u-manager",
        finalValue: 4,
        confidenceScore: 8,
        whatWorked: "归档后提交",
        whatDidnt: "不应允许"
      })
    ).toThrow("季度已归档，复盘只读");
  });

  test("calculates KR review completion rate from final value and target value", () => {
    const repository = createRepository(createReviewingState(), () => new Date("2026-06-30T18:00:00+08:00"));

    repository.submitKeyResultReview({
      keyResultId: "kr-company-1",
      quarterId: "q-2026-q2",
      reviewerId: "u-admin",
      finalValue: 45,
      confidenceScore: 6,
      whatWorked: "按目标值计算",
      whatDidnt: "不能用最终值自除"
    });

    const row = repository.getQuarterReviewSummary("q-2026-q2").find((item) => item.keyResult.id === "kr-company-1");
    expect(row?.review?.completionRate).toBe(0.5);
    expect(row?.completionRate).toBe(0.5);
  });

  test("scopes KR review summary to the viewer visibility range", () => {
    const repository = createRepository(createReviewingState());
    const member = repository.getUser("u-member")!;
    const manager = repository.getUser("u-manager")!;

    const memberRows = repository.getQuarterReviewSummary("q-2026-q2", member);
    const managerRows = repository.getQuarterReviewSummary("q-2026-q2", manager);

    expect(memberRows.map((row) => row.keyResult.id)).toEqual(["kr-member-1"]);
    expect(managerRows.map((row) => row.keyResult.id).sort()).toEqual(["kr-member-1", "kr-product-1"]);
  });

  test("submits and scopes quarter reviews through the repository for mock validation", () => {
    const repository = createRepository(createReviewingState());
    const manager = repository.getUser("u-manager")!;
    const member = repository.getUser("u-member")!;

    const review = repository.submitQuarterReview(manager, {
      quarterId: "q-2026-q2",
      level: "department",
      ownerId: manager.id,
      departmentId: manager.departmentId,
      whatWorked: "部门节奏稳定",
      whatDidnt: "风险暴露偏晚"
    });

    expect(review.level).toBe("department");
    expect(repository.listQuarterReviews(manager, "q-2026-q2").map((item) => item.id)).toContain(review.id);
    expect(repository.listQuarterReviews(member, "q-2026-q2").map((item) => item.id)).not.toContain(review.id);
  });

  test("rejects quarter reviews outside the reviewer scope", () => {
    const repository = createRepository(createReviewingState());
    const member = repository.getUser("u-member")!;

    expect(() =>
      repository.submitQuarterReview(member, {
        quarterId: "q-2026-q2",
        level: "department",
        ownerId: member.id,
        departmentId: member.departmentId,
        whatWorked: "越权提交",
        whatDidnt: "不应允许"
      })
    ).toThrow("成员只能提交个人 Review");
  });
});

function createReviewingState() {
  const state = createSeedState();
  state.quarters.find((quarter) => quarter.id === "q-2026-q2")!.status = "reviewing";
  return state;
}
