import { describe, expect, test } from "vitest";
import {
  assertActiveQuarterTransition,
  assertAlignmentLimit,
  assertKeyResultLimit,
  assertObjectiveAlignmentImmutable,
  assertOkrCreationOpenForRole,
  assertQuarterWritable,
  assertReviewRequiredFields,
  assertUniqueSuperAdminUpdate,
  canEditConfidenceScore,
  canExportFeishuDocument,
  canEditWeeklyCommitment,
  calculateCompletionRate,
  calculateHealthStatus,
  getConfidenceColor,
  isQuarterSprintWindow,
  getQuarterWeekNumber,
  normalizeExportScope
} from "@/lib/domain/rules";

describe("OKR domain rules", () => {
  test("rejects a sixth key result under one objective", () => {
    expect(() => assertKeyResultLimit(5)).toThrow("每个 Objective 最多 5 个关键结果");
  });

  test("rejects more than three parent KR alignments", () => {
    expect(() => assertAlignmentLimit(4)).toThrow("每个 Objective 最多对齐 3 个上级 KR");
  });

  test("rejects changing an objective alignment after it has been established", () => {
    expect(() => assertObjectiveAlignmentImmutable(1)).toThrow("季度内不可修改对齐关系");
    expect(() => assertObjectiveAlignmentImmutable(0)).not.toThrow();
  });

  test("allows confidence score edits from Monday through Wednesday only", () => {
    expect(canEditConfidenceScore(new Date("2026-06-08T10:00:00+08:00"))).toBe(true);
    expect(canEditConfidenceScore(new Date("2026-06-10T23:59:00+08:00"))).toBe(true);
    expect(canEditConfidenceScore(new Date("2026-06-11T00:01:00+08:00"))).toBe(false);
  });

  test("allows weekly commitment edits only before local midnight on submit day", () => {
    const submittedAt = new Date("2026-06-08T10:00:00+08:00");

    expect(canEditWeeklyCommitment(submittedAt, new Date("2026-06-08T23:30:00+08:00"))).toBe(true);
    expect(canEditWeeklyCommitment(submittedAt, new Date("2026-06-09T00:01:00+08:00"))).toBe(false);
  });

  test("calculates health metric status for gte, lte, and between thresholds", () => {
    expect(calculateHealthStatus({ thresholdType: "gte", thresholdValue: 7 }, 7)).toBe("healthy");
    expect(calculateHealthStatus({ thresholdType: "gte", thresholdValue: 7 }, 4)).toBe("warning");
    expect(calculateHealthStatus({ thresholdType: "gte", thresholdValue: 7 }, 3.9)).toBe("exceeded");

    expect(calculateHealthStatus({ thresholdType: "gte", thresholdValue: 100 }, 100)).toBe("healthy");
    expect(calculateHealthStatus({ thresholdType: "gte", thresholdValue: 100 }, 90)).toBe("warning");
    expect(calculateHealthStatus({ thresholdType: "gte", thresholdValue: 100 }, 70)).toBe("exceeded");

    expect(calculateHealthStatus({ thresholdType: "lte", thresholdValue: 100 }, 100)).toBe("healthy");
    expect(calculateHealthStatus({ thresholdType: "lte", thresholdValue: 100 }, 110)).toBe("warning");
    expect(calculateHealthStatus({ thresholdType: "lte", thresholdValue: 100 }, 130)).toBe("exceeded");

    expect(calculateHealthStatus({ thresholdType: "between", thresholdMin: 80, thresholdMax: 120 }, 100)).toBe("healthy");
    expect(calculateHealthStatus({ thresholdType: "between", thresholdMin: 80, thresholdMax: 120 }, 73)).toBe("warning");
    expect(calculateHealthStatus({ thresholdType: "between", thresholdMin: 80, thresholdMax: 120 }, 130)).toBe("warning");
    expect(calculateHealthStatus({ thresholdType: "between", thresholdMin: 80, thresholdMax: 120 }, 60)).toBe("exceeded");
  });

  test("prevents activating a second quarter", () => {
    expect(() => assertActiveQuarterTransition("active", true)).toThrow("同一时间只能有一个 active 季度");
  });

  test("keeps OKR creation limited to super admins after the planning stage", () => {
    expect(() => assertOkrCreationOpenForRole("active", "member")).toThrow("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
    expect(() => assertOkrCreationOpenForRole("active", "dept_manager")).toThrow("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
    expect(() => assertOkrCreationOpenForRole("reviewing", "member")).toThrow("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
    expect(() => assertOkrCreationOpenForRole("reviewing", "dept_manager")).toThrow("当前季度已进入执行阶段，仅超级管理员可继续调整 OKR");
    expect(() => assertOkrCreationOpenForRole("active", "super_admin")).not.toThrow();
    expect(() => assertOkrCreationOpenForRole("planning", "member")).not.toThrow();
  });

  test("makes archived quarters read only for weekly and confidence writes", () => {
    expect(() => assertQuarterWritable("archived")).toThrow("季度已归档，只读");
    expect(() => assertQuarterWritable("active")).not.toThrow();
    expect(() => assertQuarterWritable("reviewing")).not.toThrow();
  });

  test("requires both narrative fields for quarter review submission", () => {
    expect(() => assertReviewRequiredFields("", "遇到组织协作阻塞")).toThrow("what_worked 和 what_didnt 为必填项");
  });

  test("calculates completion rate and confidence colors", () => {
    expect(calculateCompletionRate(90, 120)).toBe(0.75);
    expect(getConfidenceColor(8)).toBe("green");
    expect(getConfidenceColor(5)).toBe("yellow");
    expect(getConfidenceColor(2)).toBe("red");
    expect(getConfidenceColor(null)).toBe("gray");
  });

  test("calculates quarter week number from start date", () => {
    expect(getQuarterWeekNumber(new Date("2026-07-01"), new Date("2026-07-01"))).toBe(1);
    expect(getQuarterWeekNumber(new Date("2026-07-01"), new Date("2026-07-08"))).toBe(2);
  });

  test("detects the final two sprint weeks of a quarter", () => {
    expect(isQuarterSprintWindow(new Date("2026-04-01"), new Date("2026-06-30"), new Date("2026-06-12"))).toBe(false);
    expect(isQuarterSprintWindow(new Date("2026-04-01"), new Date("2026-06-30"), new Date("2026-06-18"))).toBe(true);
    expect(isQuarterSprintWindow(new Date("2026-04-01"), new Date("2026-06-30"), new Date("2026-07-02"))).toBe(false);
  });

  test("limits Feishu document export scope by role", () => {
    expect(canExportFeishuDocument("super_admin", "company")).toBe(true);
    expect(canExportFeishuDocument("super_admin", "department")).toBe(true);
    expect(canExportFeishuDocument("super_admin", "individual")).toBe(true);
    expect(canExportFeishuDocument("dept_manager", "company")).toBe(false);
    expect(canExportFeishuDocument("dept_manager", "department")).toBe(true);
    expect(canExportFeishuDocument("dept_manager", "individual")).toBe(false);
    expect(canExportFeishuDocument("member", "company")).toBe(false);
    expect(canExportFeishuDocument("member", "department")).toBe(false);
    expect(canExportFeishuDocument("member", "individual")).toBe(true);
    expect(normalizeExportScope("bad-scope", "company")).toBe("company");
  });

  test("keeps exactly one active super admin", () => {
    expect(() =>
      assertUniqueSuperAdminUpdate({
        targetUserId: "u-manager",
        currentRole: "dept_manager",
        currentIsActive: true,
        nextRole: "super_admin",
        activeSuperAdminIds: ["u-admin"]
      })
    ).toThrow("系统只能有一个超级管理员");

    expect(() =>
      assertUniqueSuperAdminUpdate({
        targetUserId: "u-admin",
        currentRole: "super_admin",
        currentIsActive: true,
        nextRole: "dept_manager",
        activeSuperAdminIds: ["u-admin"]
      })
    ).toThrow("至少保留一个超级管理员");

    expect(() =>
      assertUniqueSuperAdminUpdate({
        targetUserId: "u-admin",
        currentRole: "super_admin",
        currentIsActive: true,
        nextIsActive: false,
        activeSuperAdminIds: ["u-admin"]
      })
    ).toThrow("至少保留一个超级管理员");
  });
});
