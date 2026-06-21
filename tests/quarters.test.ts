import { describe, expect, test } from "vitest";
import { createRepository } from "@/lib/data/repository";
import { assertQuarterStatusTransition, shouldStopCalendarEventsOnQuarterStatusChange } from "@/lib/domain/rules";
import { createSeedState } from "@/lib/mock/seed";

describe("quarter cadence", () => {
  test("allows only one active quarter at a time", () => {
    const repository = createRepository(createSeedState());

    expect(() => repository.updateQuarterStatus("q-2026-q3", "active")).toThrow("同一时间只能有一个 active 季度");
  });

  test("updates a quarter status when the transition is valid", () => {
    const repository = createRepository(createSeedState());

    const quarter = repository.updateQuarterStatus("q-2026-q2", "reviewing");

    expect(quarter.status).toBe("reviewing");
  });

  test("enforces the planning to active to reviewing to archived status flow", () => {
    expect(() => assertQuarterStatusTransition("active", "reviewing")).not.toThrow();
    expect(() => assertQuarterStatusTransition("reviewing", "archived")).not.toThrow();
    expect(() => assertQuarterStatusTransition("archived", "reviewing")).toThrow("季度已归档，只读");
    expect(() => assertQuarterStatusTransition("planning", "reviewing")).toThrow("季度状态只能按 planning → active → reviewing → archived 流转");
  });

  test("stops calendar events only when a quarter enters archived status", () => {
    expect(shouldStopCalendarEventsOnQuarterStatusChange("reviewing", "archived")).toBe(true);
    expect(shouldStopCalendarEventsOnQuarterStatusChange("active", "reviewing")).toBe(false);
    expect(shouldStopCalendarEventsOnQuarterStatusChange("archived", "archived")).toBe(false);
  });
});
