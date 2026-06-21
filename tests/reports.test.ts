import { describe, expect, test } from "vitest";
import { createRepository } from "@/lib/data/repository";
import { createSeedState } from "@/lib/mock/seed";

describe("V2 reports", () => {
  test("builds cross-quarter summaries with archived quarter history", () => {
    const repository = createRepository(createSeedState());
    const admin = repository.getUser("u-admin");
    expect(admin).toBeTruthy();

    const summaries = repository.listQuarterReportSummaries(admin!);

    expect(summaries.map((summary) => summary.quarterId)).toEqual(["q-2026-q2", "q-2026-q1", "q-2025-q4"]);
    expect(summaries[0].keyResultCount).toBeGreaterThan(0);
    expect(summaries[0].averageKrCompletionRate).toBeGreaterThan(0);
    expect(summaries[1].quarterStatus).toBe("archived");
  });

  test("detects confidence alerts for low score, decline and missing current week", () => {
    const repository = createRepository(createSeedState());
    const admin = repository.getUser("u-admin");
    expect(admin).toBeTruthy();

    const alerts = repository.listConfidenceAlerts(admin!, "q-2026-q2");
    const reasons = new Set(alerts.map((alert) => alert.reason));

    expect(reasons.has("low_score")).toBe(true);
    expect(reasons.has("declining_trend")).toBe(true);
    expect(reasons.has("missing_this_week")).toBe(true);
  });

  test("separates medium confidence from progress lagging alerts", () => {
    const state = createSeedState();
    const memberKr = state.keyResults.find((keyResult) => keyResult.id === "kr-member-1");
    expect(memberKr).toBeTruthy();
    memberKr!.currentValue = 3;

    state.confidenceScores = state.confidenceScores.filter((score) => score.keyResultId !== "kr-member-1");
    state.confidenceScores.push({
      id: "cs-member-medium-w10",
      keyResultId: "kr-member-1",
      userId: "u-member",
      quarterId: "q-2026-q2",
      weekNumber: 10,
      score: 6,
      note: "信心值偏低但进度达标",
      isLocked: false,
      submittedAt: "2026-06-09T09:00:00.000+08:00",
      updatedAt: "2026-06-09T09:00:00.000+08:00"
    });

    const repository = createRepository(state);
    const member = repository.getUser("u-member");
    expect(member).toBeTruthy();

    const alerts = repository.listConfidenceAlerts(member!, "q-2026-q2");
    const memberAlert = alerts.find((alert) => alert.keyResultId === "kr-member-1");

    expect(memberAlert?.reason).toBe("medium_score");
  });

  test("flags medium confidence with lagging completion as progress lagging", () => {
    const state = createSeedState();
    const memberKr = state.keyResults.find((keyResult) => keyResult.id === "kr-member-1");
    expect(memberKr).toBeTruthy();
    memberKr!.currentValue = 6;

    state.confidenceScores = state.confidenceScores.filter((score) => score.keyResultId !== "kr-member-1");
    state.confidenceScores.push({
      id: "cs-member-lagging-w10",
      keyResultId: "kr-member-1",
      userId: "u-member",
      quarterId: "q-2026-q2",
      weekNumber: 10,
      score: 6,
      note: "信心值偏低且进度滞后",
      isLocked: false,
      submittedAt: "2026-06-09T09:00:00.000+08:00",
      updatedAt: "2026-06-09T09:00:00.000+08:00"
    });

    const repository = createRepository(state);
    const member = repository.getUser("u-member");
    expect(member).toBeTruthy();

    const alerts = repository.listConfidenceAlerts(member!, "q-2026-q2");
    const memberAlert = alerts.find((alert) => alert.keyResultId === "kr-member-1");

    expect(memberAlert?.reason).toBe("progress_lagging");
  });

  test("filters report data by department manager visible scope", () => {
    const repository = createRepository(createSeedState());
    const manager = repository.getUser("u-manager");
    expect(manager).toBeTruthy();

    const departments = repository.listDepartmentReportSummaries(manager!, "q-2026-q2");
    const alerts = repository.listConfidenceAlerts(manager!, "q-2026-q2");

    expect(departments).toHaveLength(1);
    expect(departments[0].departmentId).toBe("dept-product");
    expect(alerts.every((alert) => !alert.departmentName || alert.departmentName === "产品部")).toBe(true);
  });

  test("supports explicit department filtering for super-admin reports", () => {
    const repository = createRepository(createSeedState());
    const admin = repository.getUser("u-admin");
    expect(admin).toBeTruthy();

    const report = repository.getV2Report(admin!.id, "q-2026-q2", { departmentId: "dept-product" });

    expect(report.departmentSummaries).toHaveLength(1);
    expect(report.departmentSummaries[0].departmentId).toBe("dept-product");
    expect(report.confidenceAlerts.every((alert) => alert.departmentName === "产品部")).toBe(true);
    expect(report.healthTrends.every((trend) => trend.level === "department")).toBe(true);
  });

  test("returns confidence trend rows for visible key results", () => {
    const repository = createRepository(createSeedState());
    const member = repository.getUser("u-member");
    expect(member).toBeTruthy();

    const report = repository.getV2Report(member!.id, "q-2026-q2");
    const memberTrend = report.confidenceTrends.find((trend) => trend.keyResultId === "kr-member-1");

    expect(memberTrend?.scores.map((point) => [point.weekNumber, point.score])).toEqual([
      [8, 8],
      [9, 7],
      [10, 6]
    ]);
    expect(report.confidenceTrends.every((trend) => trend.departmentName === "产品部")).toBe(true);
  });

  test("limits member report alerts to the same department scope", () => {
    const repository = createRepository(createSeedState());
    const member = repository.getUser("u-member");
    expect(member).toBeTruthy();

    const alerts = repository.listConfidenceAlerts(member!, "q-2026-q2");

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((alert) => alert.departmentName === "产品部")).toBe(true);
  });
});
