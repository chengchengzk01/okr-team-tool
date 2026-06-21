import { describe, expect, test } from "vitest";
import { createRepository } from "@/lib/data/repository";
import { createSeedState } from "@/lib/mock/seed";

describe("health metric records", () => {
  test("creates a new record with an automatically calculated status", () => {
    const repository = createRepository(createSeedState(), () => new Date("2026-06-09T11:00:00+08:00"));

    const record = repository.submitHealthMetricRecord({
      healthMetricId: "hm-bug",
      currentValue: 8,
      note: "稳定性健康度提升",
      recordedBy: "u-manager"
    });

    expect(record.status).toBe("healthy");
    const manager = repository.getUser("u-manager")!;
    const metric = repository.listHealthMetrics(manager).find((item) => item.id === "hm-bug");
    expect(metric?.latestRecord?.id).toBe(record.id);
  });

  test("rejects updates from users who are neither owner nor super admin", () => {
    const repository = createRepository(createSeedState());

    expect(() =>
      repository.submitHealthMetricRecord({
        healthMetricId: "hm-bug",
        currentValue: 2,
        note: "尝试越权更新",
        recordedBy: "u-member"
      })
    ).toThrow("只有指标负责人、部门管理者或超级管理员可以更新该健康指标");
  });

  test("allows department managers to update department health metrics", () => {
    const repository = createRepository(createSeedState());
    const manager = repository.getUser("u-manager")!;
    const metric = repository.createHealthMetric(manager, {
      name: "客服响应健康度",
      level: "department",
      ownerId: "u-member",
      thresholdType: "gte",
      thresholdValue: 7,
      updateFrequency: "weekly"
    });

    const record = repository.submitHealthMetricRecord({
      healthMetricId: metric.id,
      currentValue: 7,
      note: "部门管理者例行更新",
      recordedBy: "u-manager"
    });

    expect(record.currentValue).toBe(7);
  });

  test("allows department managers to edit and archive department health metric definitions", () => {
    const repository = createRepository(createSeedState());
    const manager = repository.getUser("u-manager")!;
    const metric = repository.createHealthMetric(manager, {
      name: "产研交付健康度",
      level: "department",
      ownerId: "u-member",
      thresholdType: "gte",
      thresholdValue: 7,
      updateFrequency: "weekly"
    });

    const updated = repository.updateHealthMetric(manager, metric.id, {
      description: "部门管理者维护指标定义"
    });

    expect(updated.description).toBe("部门管理者维护指标定义");
    expect(repository.archiveHealthMetric(manager, metric.id).isActive).toBe(false);
  });

  test("rejects members editing health metric definitions even when they are assigned owners", () => {
    const repository = createRepository(createSeedState());
    const manager = repository.getUser("u-manager")!;
    const member = repository.getUser("u-member")!;
    const metric = repository.createHealthMetric(manager, {
      name: "成员负责更新的部门指标",
      level: "department",
      ownerId: member.id,
      thresholdType: "gte",
      thresholdValue: 7,
      updateFrequency: "weekly"
    });

    expect(() =>
      repository.updateHealthMetric(member, metric.id, {
        description: "成员不应能改定义"
      })
    ).toThrow("只有部门管理者或超级管理员可以更新该健康指标");

    expect(() => repository.archiveHealthMetric(member, metric.id)).toThrow("只有部门管理者或超级管理员可以归档该健康指标");
  });

  test("rejects values outside the configured input range without changing status rules", () => {
    const repository = createRepository(createSeedState());

    expect(() =>
      repository.submitHealthMetricRecord({
        healthMetricId: "hm-cash",
        currentValue: 10.1,
        note: "明显超出录入范围",
        recordedBy: "u-admin"
      })
    ).toThrow("数值不能高于 10");
  });

  test("rounds health scores to one decimal place", () => {
    const repository = createRepository(createSeedState());

    const record = repository.submitHealthMetricRecord({
      healthMetricId: "hm-cash",
      currentValue: 7.26,
      note: "保留一位小数",
      recordedBy: "u-admin"
    });

    expect(record.currentValue).toBe(7.3);
    expect(record.status).toBe("healthy");
  });

  test("supports health metric creation, detail history, and archive", () => {
    const repository = createRepository(createSeedState());
    const admin = repository.getUser("u-admin")!;

    const metric = repository.createHealthMetric(admin, {
      name: "客户满意度健康度",
      level: "company",
      ownerId: "u-admin",
      thresholdType: "between",
      thresholdMin: 4,
      thresholdMax: 10,
      updateFrequency: "monthly"
    });

    repository.submitHealthMetricRecord({
      healthMetricId: metric.id,
      currentValue: 8,
      note: "稳定",
      recordedBy: "u-admin"
    });

    expect(repository.getHealthMetricDetail(admin, metric.id).records).toHaveLength(1);
    expect(repository.archiveHealthMetric(admin, metric.id).isActive).toBe(false);
  });

  test("rejects new records after a health metric is archived", () => {
    const repository = createRepository(createSeedState());
    const admin = repository.getUser("u-admin")!;

    repository.archiveHealthMetric(admin, "hm-cash");

    expect(() =>
      repository.submitHealthMetricRecord({
        healthMetricId: "hm-cash",
        currentValue: 8,
        note: "归档后不应继续写入",
        recordedBy: "u-admin"
      })
    ).toThrow("健康指标已归档，只读");
  });
});
