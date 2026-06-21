import { describe, expect, test } from "vitest";
import {
  appendDocumentShareWarning,
  buildBitableBatchBodies,
  buildBitableDeleteBatchBodies,
  buildBitablePermissionCheckPaths,
  buildCalendarEventPayloads,
  buildDocumentCreateBody,
  filterDocumentExportData,
  buildDocumentReportLines,
  buildV2ReportDocumentLines,
  buildDocumentShareRequest,
  dedupeFeishuUsersByOpenId,
  enqueueFeishuRequest,
  getFeishuRetryDelayMs,
  MockFeishuProvider
} from "@/lib/integrations/feishu";
import { mergeCalendarEventIds, parseBitableAppToken } from "@/lib/integrations/feishu-config";

describe("MockFeishuProvider", () => {
  test("returns stable export log shapes for mocked integrations", async () => {
    const provider = new MockFeishuProvider();

    const bitableLog = await provider.syncBitable("q-2026-q2");
    const docLog = await provider.exportDocument("q-2026-q2", "company");
    const calendarLog = await provider.createCalendarEvents("q-2026-q2");
    const reportLog = await provider.exportV2ReportDocument("q-2026-q2", "company");

    expect(bitableLog.exportType).toBe("bitable_sync");
    expect(docLog.exportType).toBe("feishu_doc");
    expect(docLog.feishuDocUrl).toContain("https://feishu.example.com");
    expect(calendarLog.exportType).toBe("calendar_events");
    expect(reportLog.exportType).toBe("v2_report_doc");
    await expect(provider.getConfig()).resolves.toMatchObject({ mode: "mock", ready: true });
    expect([bitableLog, docLog, calendarLog, reportLog].every((log) => log.status === "success")).toBe(true);
  });

  test("syncs organization during mocked OAuth login unless disabled", async () => {
    class LoginSyncProbeProvider extends MockFeishuProvider {
      syncCount = 0;

      async syncOrganization() {
        this.syncCount += 1;
        return super.syncOrganization();
      }
    }

    const provider = new LoginSyncProbeProvider();
    await provider.exchangeCodeForUser("mock-code");

    expect(provider.syncCount).toBe(1);
  });

  test("returns a stable update log when refreshing existing calendar events", async () => {
    const provider = new MockFeishuProvider();

    const log = await provider.updateCalendarEvents("q-2026-q2");

    expect(log.exportType).toBe("calendar_events");
    expect(log.status).toBe("success");
    expect(log.message).toContain("已更新");
  });

  test("deduplicates organization users by open id", () => {
    expect(
      dedupeFeishuUsersByOpenId([
        { open_id: "ou-1", name: "Alpha" },
        { open_id: "ou-1", name: "Alpha Duplicate" },
        { open_id: "ou-2", name: "Beta" }
      ])
    ).toEqual([
      { open_id: "ou-1", name: "Alpha" },
      { open_id: "ou-2", name: "Beta" }
    ]);
  });
});

describe("Feishu document export requests", () => {
  test("builds all PRD-required document sections", () => {
    const lines = buildDocumentReportLines({
      quarterName: "2026 Q2",
      scope: "company",
      exportedAt: new Date("2026-06-30T10:00:00.000Z"),
      objectives: [],
      keyResults: [],
      confidenceScores: [],
      healthMetrics: [],
      healthRecords: [],
      reviews: [],
      weeklyCommitments: [],
      weeklyCelebrations: []
    });

    expect(lines).toEqual(
      expect.arrayContaining([
        "封面",
        "季度 OKR 全貌",
        "KR 完成度汇总",
        "信心值变化趋势",
        "健康指标季度汇总",
        "季度 Review 内容",
        "附录：周仪式记录"
      ])
    );
  });

  test("builds dedicated V2 report sections instead of reusing the generic OKR document body", () => {
    const lines = buildV2ReportDocumentLines({
      quarterName: "2026 Q2",
      scope: "company",
      exportedAt: new Date("2026-06-30T10:00:00.000Z"),
      quarterSummaries: [
        {
          quarterName: "2026 Q2",
          quarterStatus: "active",
          objectiveCount: 3,
          keyResultCount: 9,
          averageKrCompletionRate: 0.7,
          averageConfidenceScore: 7.2,
          weeklyCommitmentRate: 0.9,
          weeklyCelebrationRate: 0.8,
          healthStatusCounts: { healthy: 2, warning: 1, exceeded: 0, unrecorded: 0 }
        }
      ],
      departmentSummaries: [
        {
          departmentName: "产品部",
          objectiveCount: 1,
          keyResultCount: 3,
          averageKrCompletionRate: 0.8,
          averageConfidenceScore: 7.5,
          alertCount: 1
        }
      ],
      confidenceAlerts: [
        {
          keyResultDescription: "产品 KR",
          quarterName: "2026 Q2",
          departmentName: "产品部",
          ownerName: "周宁",
          severity: "warning",
          reason: "declining_trend",
          latestScore: 6,
          recentScores: [8, 7, 6],
          completionRate: 0.5
        }
      ],
      confidenceTrends: [
        {
          keyResultDescription: "产品 KR",
          objectiveTitle: "产品目标",
          departmentName: "产品部",
          ownerName: "周宁",
          scores: [
            { weekNumber: 8, score: 8 },
            { weekNumber: 9, score: 7 },
            { weekNumber: 10, score: 6 }
          ]
        }
      ],
      healthTrends: [
        {
          metricName: "产品健康度",
          level: "department",
          records: [{ value: 7.5, status: "healthy", recordedAt: "2026-06-09T00:00:00.000Z" }]
        }
      ]
    });

    expect(lines).toEqual(
      expect.arrayContaining(["季度对比", "信心值趋势预警", "KR 信心值趋势", "部门对比", "健康指标季度走势"])
    );
    expect(lines).not.toContain("季度 OKR 全貌");
  });

  test("filters document export data by department and individual scope", () => {
    const baseDataset = {
      objectives: [
        { id: "obj-dept", level: "department", title: "产品部目标", departmentId: "dept-product", ownerId: "u-manager", keyResults: [{ id: "kr-dept", description: "产品 KR", currentValue: 3, targetValue: 4, ownerId: "u-manager", objectiveId: "obj-dept" }] },
        { id: "obj-sales", level: "department", title: "销售部目标", departmentId: "dept-sales", ownerId: "u-sales-manager", keyResults: [{ id: "kr-sales", description: "销售 KR", currentValue: 1, targetValue: 2, ownerId: "u-sales-manager", objectiveId: "obj-sales" }] },
        { id: "obj-member", level: "individual", title: "成员目标", departmentId: "dept-product", ownerId: "u-member", keyResults: [{ id: "kr-member", description: "成员 KR", currentValue: 6, targetValue: 8, ownerId: "u-member", objectiveId: "obj-member" }] }
      ],
      keyResults: [
        { id: "kr-dept", description: "产品 KR", currentValue: 3, targetValue: 4, ownerId: "u-manager", objectiveId: "obj-dept" },
        { id: "kr-sales", description: "销售 KR", currentValue: 1, targetValue: 2, ownerId: "u-sales-manager", objectiveId: "obj-sales" },
        { id: "kr-member", description: "成员 KR", currentValue: 6, targetValue: 8, ownerId: "u-member", objectiveId: "obj-member" }
      ],
      confidenceScores: [
        { keyResultId: "kr-dept", weekNumber: 10, score: 7 },
        { keyResultId: "kr-sales", weekNumber: 10, score: 5 },
        { keyResultId: "kr-member", weekNumber: 10, score: 6 }
      ],
      healthMetrics: [
        { id: "hm-product", name: "产品健康度", level: "department", departmentId: "dept-product", ownerId: "u-manager", thresholdType: "gte", thresholdValue: 7 },
        { id: "hm-sales", name: "销售健康度", level: "department", departmentId: "dept-sales", ownerId: "u-sales-manager", thresholdType: "gte", thresholdValue: 7 }
      ],
      healthRecords: [
        { healthMetricId: "hm-product", currentValue: 7.5, status: "healthy" },
        { healthMetricId: "hm-sales", currentValue: 5, status: "warning" }
      ],
      reviews: [
        { ownerId: "u-manager", departmentId: "dept-product", whatWorked: "产品复盘", krReviews: [{ finalValue: 3, completionRate: 0.75, keyResult: { description: "产品 KR" } }] },
        { ownerId: "u-sales-manager", departmentId: "dept-sales", whatWorked: "销售复盘", krReviews: [{ finalValue: 1, completionRate: 0.5, keyResult: { description: "销售 KR" } }] }
      ],
      weeklyCommitments: [
        { userId: "u-member", weekNumber: 10, priority1: "产品周承诺", priority2: "B", priority3: "C", user: { name: "周宁", departmentId: "dept-product" } },
        { userId: "u-sales-member", weekNumber: 10, priority1: "销售周承诺", priority2: "B", priority3: "C", user: { name: "销售成员", departmentId: "dept-sales" } }
      ],
      weeklyCelebrations: [
        { userId: "u-member", weekNumber: 10, achievements: [{ text: "产品庆祝" }], mood: "steady", user: { name: "周宁", departmentId: "dept-product" } },
        { userId: "u-sales-member", weekNumber: 10, achievements: [{ text: "销售庆祝" }], mood: "steady", user: { name: "销售成员", departmentId: "dept-sales" } }
      ]
    };

    const departmentData = filterDocumentExportData(baseDataset, "department", { id: "u-manager", departmentId: "dept-product" } as any);
    expect(departmentData.keyResults.map((item) => item.id).sort()).toEqual(["kr-dept", "kr-member"]);
    expect(departmentData.healthMetrics.map((item) => item.id)).toEqual(["hm-product"]);
    expect(departmentData.weeklyCommitments.every((item) => item.user?.departmentId === "dept-product")).toBe(true);

    const individualData = filterDocumentExportData(baseDataset, "individual", { id: "u-member", departmentId: "dept-product" } as any);
    expect(individualData.keyResults.map((item) => item.id)).toEqual(["kr-member"]);
    expect(individualData.weeklyCommitments.map((item) => item.userId)).toEqual(["u-member"]);
    expect(individualData.weeklyCelebrations.map((item) => item.userId)).toEqual(["u-member"]);

    const superAdminDepartmentData = filterDocumentExportData(
      baseDataset,
      "department",
      { id: "u-admin", departmentId: "dept-admin", exportDepartmentId: "dept-sales" } as any
    );
    expect(superAdminDepartmentData.keyResults.map((item) => item.id)).toEqual(["kr-sales"]);
    expect(superAdminDepartmentData.weeklyCommitments.map((item) => item.userId)).toEqual(["u-sales-member"]);

    const superAdminIndividualData = filterDocumentExportData(
      baseDataset,
      "individual",
      { id: "u-admin", departmentId: "dept-admin", exportUserId: "u-member" } as any
    );
    expect(superAdminIndividualData.keyResults.map((item) => item.id)).toEqual(["kr-member"]);
    expect(superAdminIndividualData.weeklyCommitments.map((item) => item.userId)).toEqual(["u-member"]);
  });

  test("places created documents in the configured drive folder when present", () => {
    expect(buildDocumentCreateBody("2026 Q2 OKR 季度报告", "fld_okrs")).toEqual({
      title: "2026 Q2 OKR 季度报告",
      folder_token: "fld_okrs"
    });
  });

  test("builds a share request for the operator open id", () => {
    expect(buildDocumentShareRequest("docx_okr", "ou_admin")).toEqual({
      path: "/open-apis/drive/v1/permissions/docx_okr/members?type=docx",
      body: {
        member_type: "openid",
        member_id: "ou_admin",
        perm: "view"
      }
    });
  });

  test("keeps export success while surfacing document-share warnings", () => {
    expect(appendDocumentShareWarning("飞书文档导出完成")).toBe("飞书文档导出完成");
    expect(appendDocumentShareWarning("飞书文档导出完成", "Invalid parameter")).toBe(
      "飞书文档导出完成（已生成文档，但未自动添加查看权限：Invalid parameter）"
    );
  });
});

describe("Feishu calendar event config", () => {
  test("stores created event ids by quarter without dropping other quarters", () => {
    expect(
      mergeCalendarEventIds(
        {
          "q-2026-q1": ["evt-q1-monday", "evt-q1-friday"],
          "q-2026-q2": ["old-event"]
        },
        "q-2026-q2",
        ["evt-q2-monday", "evt-q2-friday"]
      )
    ).toEqual({
      "q-2026-q1": ["evt-q1-monday", "evt-q1-friday"],
      "q-2026-q2": ["evt-q2-monday", "evt-q2-friday"]
    });
  });

  test("builds calendar event payloads from configurable times and invite scope", () => {
    const [monday, friday] = buildCalendarEventPayloads(
      { startDate: new Date("2026-04-01T00:00:00.000Z"), endDate: new Date("2026-06-30T00:00:00.000Z") },
      {
        inviteScope: "department",
        inviteDepartmentId: "od_product",
        monday: { summary: "产品周一承诺", startTime: "09:30", endTime: "10:00", description: "填写本周 Top 3" },
        friday: { summary: "产品周五庆祝", startTime: "17:00", endTime: "17:30", description: "提交庆祝与障碍" }
      }
    );

    expect(monday.summary).toBe("产品周一承诺");
    expect(monday.description).toContain("填写本周 Top 3");
    expect(monday.recurrence).toContain("BYDAY=MO");
    expect(monday.attendee_ability).toBe("can_see_others");
    expect(monday.attendees).toEqual([{ type: "department", department_id: "od_product" }]);
    expect(friday.summary).toBe("产品周五庆祝");
    expect(friday.recurrence).toContain("BYDAY=FR");
  });
});

describe("Feishu bitable sync batching", () => {
  test("parses app token from common Feishu bitable links before binding", () => {
    expect(parseBitableAppToken("https://example.feishu.cn/base/appABC123?table=tbl_1")).toBe("appABC123");
    expect(parseBitableAppToken("https://example.feishu.cn/wiki?appToken=appXYZ789")).toBe("appXYZ789");
  });

  test("splits records into batches of at most 500", () => {
    const records = Array.from({ length: 1001 }, (_, index) => ({ 序号: index + 1 }));
    const batches = buildBitableBatchBodies(records);

    expect(batches).toHaveLength(3);
    expect(batches.map((batch) => batch.records.length)).toEqual([500, 500, 1]);
    expect(batches[0].records[0]).toEqual({ fields: { 序号: 1 } });
    expect(batches[2].records[0]).toEqual({ fields: { 序号: 1001 } });
  });

  test("builds permission check paths before writing configured tables", () => {
    expect(
      buildBitablePermissionCheckPaths("app_token", {
        okr_overview: "tbl_okr",
        confidence_history: "tbl_confidence"
      })
    ).toEqual([
      "/open-apis/bitable/v1/apps/app_token/tables/tbl_okr/records?page_size=1",
      "/open-apis/bitable/v1/apps/app_token/tables/tbl_confidence/records?page_size=1"
    ]);
  });

  test("splits record ids into delete batches before overwriting a sheet", () => {
    const recordIds = Array.from({ length: 1001 }, (_, index) => `rec_${index + 1}`);
    const batches = buildBitableDeleteBatchBodies(recordIds);

    expect(batches).toHaveLength(3);
    expect(batches.map((batch) => batch.records.length)).toEqual([500, 500, 1]);
    expect(batches[0].records[0]).toBe("rec_1");
    expect(batches[2].records[0]).toBe("rec_1001");
  });
});

describe("Feishu API rate limiting", () => {
  test("serializes Feishu requests through a queue", async () => {
    const events: string[] = [];

    await Promise.all([
      enqueueFeishuRequest(async () => {
        events.push("first:start");
        await new Promise((resolve) => setTimeout(resolve, 10));
        events.push("first:end");
        return "first";
      }),
      enqueueFeishuRequest(async () => {
        events.push("second:start");
        events.push("second:end");
        return "second";
      })
    ]);

    expect(events).toEqual(["first:start", "first:end", "second:start", "second:end"]);
  });

  test("uses exponential backoff delays for Feishu 429 retries", () => {
    expect(getFeishuRetryDelayMs(0)).toBe(500);
    expect(getFeishuRetryDelayMs(1)).toBe(1000);
    expect(getFeishuRetryDelayMs(2)).toBe(2000);
  });
});
