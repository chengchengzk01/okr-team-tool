import { describe, expect, test } from "vitest";
import { createRepository } from "@/lib/data/repository";
import { createSeedState } from "@/lib/mock/seed";

describe("weekly ritual submissions", () => {
  test("updates an existing weekly commitment for the same user, quarter, and week", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-06-09T10:00:00+08:00"));

    const commitment = repository.submitWeeklyCommitment({
      userId: "u-member",
      quarterId: "q-2026-q2",
      weekNumber: 10,
      priority1: "完成真实提交联调",
      priority2: "验证看板刷新",
      priority3: "整理错误提示"
    });

    expect(commitment.id).toBe("wc-member-w10");
    expect(commitment.priority1).toBe("完成真实提交联调");
    expect(repository.getDashboard("u-member").commitments).toHaveLength(1);
  });

  test("scopes dashboard weekly data to the viewer's visible team", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-06-09T10:00:00+08:00"));

    const memberDashboard = repository.getDashboard("u-member");
    const adminDashboard = repository.getDashboard("u-admin");

    expect(memberDashboard.visibleUsers.map((user) => user.id).sort()).toEqual(["u-manager", "u-member"]);
    expect(memberDashboard.commitments.every((commitment) => commitment.userId !== "u-admin")).toBe(true);
    expect(adminDashboard.visibleUsers.map((user) => user.id)).toContain("u-sales-manager");
  });

  test("creates a weekly celebration when none exists for the user and week", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-06-09T10:00:00+08:00"));

    const celebration = repository.submitWeeklyCelebration({
      userId: "u-admin",
      quarterId: "q-2026-q2",
      weekNumber: 10,
      achievements: [{ text: "完成周仪式闭环" }],
      obstacles: "",
      mood: "energized"
    });

    expect(celebration.userId).toBe("u-admin");
    expect(celebration.achievements[0].text).toBe("完成周仪式闭环");
  });

  test("rejects duplicate weekly celebration submissions", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-06-09T10:00:00+08:00"));

    expect(() =>
      repository.submitWeeklyCelebration({
        userId: "u-member",
        quarterId: "q-2026-q2",
        weekNumber: 10,
        achievements: [{ text: "再次提交" }],
        obstacles: "",
        mood: "steady"
      })
    ).toThrow("同一用户同一周只能提交一次");
  });

  test("rejects weekly celebration submissions for prior weeks", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-06-09T10:00:00+08:00"));

    expect(() =>
      repository.submitWeeklyCelebration({
        userId: "u-admin",
        quarterId: "q-2026-q2",
        weekNumber: 9,
        achievements: [{ text: "回填上周庆祝" }],
        obstacles: "",
        mood: "calm"
      })
    ).toThrow("历史周次周五庆祝已锁定");
  });

  test("rejects weekly ritual writes after quarter archive", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-03-17T10:00:00+08:00"));

    expect(() =>
      repository.submitWeeklyCommitment({
        userId: "u-member",
        quarterId: "q-2026-q1",
        weekNumber: 12,
        priority1: "归档后修改 1",
        priority2: "归档后修改 2",
        priority3: "归档后修改 3"
      })
    ).toThrow("季度已归档，只读");

    expect(() =>
      repository.submitWeeklyCelebration({
        userId: "u-member",
        quarterId: "q-2026-q1",
        weekNumber: 12,
        achievements: [{ text: "归档后庆祝" }],
        obstacles: "",
        mood: "steady"
      })
    ).toThrow("季度已归档，只读");
  });

  test("lists owned key results for weekly confidence updates", () => {
    const repository = createRepository(createSeedState());

    const keyResults = repository.listKeyResultsForUser("u-member", "q-2026-q2");

    expect(keyResults.map((keyResult) => keyResult.id)).toContain("kr-member-1");
    expect(keyResults.every((keyResult) => keyResult.ownerId === "u-member")).toBe(true);
  });

  test("rejects confidence score writes after quarter archive", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-03-17T10:00:00+08:00"));

    expect(() =>
      repository.submitConfidenceScore({
        keyResultId: "kr-company-q1-1",
        userId: "u-admin",
        quarterId: "q-2026-q1",
        weekNumber: 12,
        score: 7
      })
    ).toThrow("季度已归档，只读");
  });

  test("rejects confidence score updates for prior weeks even during the current edit window", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-06-09T10:00:00+08:00"));

    expect(() =>
      repository.submitConfidenceScore({
        keyResultId: "kr-member-1",
        userId: "u-member",
        quarterId: "q-2026-q2",
        weekNumber: 9,
        score: 9,
        note: "不应允许回改上周"
      })
    ).toThrow("历史周次信心值已锁定");
  });

  test("rejects weekly commitment submissions for prior weeks", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-06-09T10:00:00+08:00"));

    expect(() =>
      repository.submitWeeklyCommitment({
        userId: "u-member",
        quarterId: "q-2026-q2",
        weekNumber: 9,
        priority1: "回填上周事项 1",
        priority2: "回填上周事项 2",
        priority3: "回填上周事项 3"
      })
    ).toThrow("历史周次周一承诺已锁定");
  });

  test("returns previous commitment and department obstacle summary", () => {
    const state = createSeedState();
    state.weeklyCommitments.push({
      id: "wc-member-w9",
      userId: "u-member",
      quarterId: "q-2026-q2",
      weekNumber: 9,
      priority1: "上周事项 1",
      priority2: "上周事项 2",
      priority3: "上周事项 3",
      submittedAt: "2026-06-02T10:00:00.000+08:00",
      updatedAt: "2026-06-02T10:00:00.000+08:00"
    });
    const repository = createRepository(state, () => new Date("2026-06-09T10:00:00+08:00"));
    const member = repository.getUser("u-member")!;

    expect(repository.getPreviousWeeklyCommitment("u-member", "q-2026-q2", 10)?.priority1).toBe("上周事项 1");
    expect(repository.listWeeklyObstacles(member, "q-2026-q2", 10)[0].obstacles).toContain("信心值不是完成度");
  });
});
