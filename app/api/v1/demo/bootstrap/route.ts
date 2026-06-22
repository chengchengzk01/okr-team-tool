import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { getQuarterWeekNumber } from "@/lib/domain/rules";
import { prisma } from "@/lib/prisma";

const DEMO = {
  companyObjective: "提升季度执行节奏（演示）",
  companyKeyResult: "全员周仪式提交率达到 95%（演示）",
  departmentObjective: "销售线索周转提速（演示）",
  departmentKeyResult: "线索 48 小时内跟进率达到 90%（演示）",
  individualObjective: "提升重点客户推进效率（演示）",
  individualKeyResult: "本季度完成 12 次关键客户推进会议（演示）",
  healthMetric: "客户响应健康度（演示）"
} as const;

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "只有超级管理员可以补齐演示数据" }, { status: 403 });
  }

  try {
    const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
    const quarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
    if (!quarter) return NextResponse.json({ error: "当前没有可用季度，请先创建季度" }, { status: 400 });

    const users = (await prismaQueries.listUsers()) ?? repository.listUsers();
    const departments = ((await prismaQueries.listDepartments()) ?? repository.listDepartments()).filter((department) => department.name !== "公司");
    if (!departments.length) {
      return NextResponse.json({ error: "当前没有可用部门，请先完成组织同步或创建部门" }, { status: 400 });
    }
    if (!users.length) {
      return NextResponse.json({ error: "当前没有可用成员，请先完成组织同步" }, { status: 400 });
    }

    const demoDepartment = departments.find((department) => department.id === user.departmentId) ?? departments[0];
    const demoManager =
      users.find((item) => item.role === "dept_manager" && item.departmentId === demoDepartment.id && item.isActive) ??
      users.find((item) => item.departmentId === demoDepartment.id && item.isActive) ??
      users.find((item) => item.isActive) ??
      users[0];
    const demoMember =
      users.find((item) => item.role === "member" && item.departmentId === demoDepartment.id && item.isActive) ??
      users.find((item) => item.id !== demoManager.id && item.departmentId === demoDepartment.id && item.isActive) ??
      users.find((item) => item.id !== demoManager.id && item.isActive) ??
      demoManager;

    const objectives = snapshot.listObjectives(quarter.id);
    let createdObjectives = 0;
    let createdKeyResults = 0;
    let createdAlignments = 0;
    let createdMetrics = 0;
    let createdMetricRecords = 0;

    let companyObjective = objectives.find((item) => item.quarterId === quarter.id && item.title === DEMO.companyObjective);
    if (!companyObjective) {
      companyObjective = snapshot.createObjective({
        quarterId: quarter.id,
        level: "company",
        ownerId: user.id,
        title: DEMO.companyObjective
      });
      createdObjectives += 1;
    }

    let companyKeyResultId =
      snapshot
        .listKeyResultsByObjective(companyObjective.id)
        .find((item) => item.description === DEMO.companyKeyResult)?.id ?? "";
    if (!companyKeyResultId) {
      companyKeyResultId = snapshot.createKeyResult({
        objectiveId: companyObjective.id,
        description: DEMO.companyKeyResult,
        startValue: 60,
        targetValue: 95,
        currentValue: 82,
        unit: "%",
        ownerId: user.id,
        dueDate: quarter.endDate
      }).id;
      createdKeyResults += 1;
    }

    let departmentObjective = objectives.find((item) => item.quarterId === quarter.id && item.title === DEMO.departmentObjective);
    if (!departmentObjective) {
      departmentObjective = snapshot.createObjective(
        {
          quarterId: quarter.id,
          level: "department",
          departmentId: demoDepartment.id,
          ownerId: demoManager.id,
          title: DEMO.departmentObjective
        },
        [companyKeyResultId]
      );
      createdObjectives += 1;
      createdAlignments += 1;
    }

    let departmentKeyResultId =
      snapshot
        .listKeyResultsByObjective(departmentObjective.id)
        .find((item) => item.description === DEMO.departmentKeyResult)?.id ?? "";
    if (!departmentKeyResultId) {
      departmentKeyResultId = snapshot.createKeyResult({
        objectiveId: departmentObjective.id,
        description: DEMO.departmentKeyResult,
        startValue: 45,
        targetValue: 90,
        currentValue: 68,
        unit: "%",
        ownerId: demoManager.id,
        dueDate: quarter.endDate
      }).id;
      createdKeyResults += 1;
    }

    let individualObjective = objectives.find((item) => item.quarterId === quarter.id && item.title === DEMO.individualObjective);
    if (!individualObjective) {
      individualObjective = snapshot.createObjective(
        {
          quarterId: quarter.id,
          level: "individual",
          departmentId: demoDepartment.id,
          ownerId: demoMember.id,
          title: DEMO.individualObjective
        },
        [departmentKeyResultId]
      );
      createdObjectives += 1;
      createdAlignments += 1;
    }

    let individualKeyResultId =
      snapshot
        .listKeyResultsByObjective(individualObjective.id)
        .find((item) => item.description === DEMO.individualKeyResult)?.id ?? "";
    if (!individualKeyResultId) {
      individualKeyResultId = snapshot.createKeyResult({
        objectiveId: individualObjective.id,
        description: DEMO.individualKeyResult,
        startValue: 0,
        targetValue: 12,
        currentValue: 7,
        unit: "次",
        ownerId: demoMember.id,
        dueDate: quarter.endDate
      }).id;
      createdKeyResults += 1;
    }

    const currentWeek = Math.min(13, getQuarterWeekNumber(new Date(quarter.startDate), new Date()));
    for (const item of [
      { keyResultId: companyKeyResultId, userId: user.id, score: 8, note: "周仪式提交率稳定提升" },
      { keyResultId: departmentKeyResultId, userId: demoManager.id, score: 7, note: "本周线索响应速度明显改善" },
      { keyResultId: individualKeyResultId, userId: demoMember.id, score: 6, note: "重点客户推进仍需加速" }
    ]) {
      snapshot.submitConfidenceScore({
        keyResultId: item.keyResultId,
        userId: item.userId,
        weekNumber: currentWeek,
        quarterId: quarter.id,
        score: item.score,
        note: item.note
      });
    }

    snapshot.submitWeeklyCommitment({
      userId: demoManager.id,
      quarterId: quarter.id,
      weekNumber: currentWeek,
      priority1: "推进高意向客户首轮方案沟通",
      priority2: "跟进部门级 KR 周报数据",
      priority3: "同步销售线索清洗节奏",
      priorSelfReview: {
        priority_1_result: "completed",
        priority_2_result: "partial",
        priority_3_result: "completed"
      }
    });
    if (demoMember.id !== demoManager.id) {
      snapshot.submitWeeklyCommitment({
        userId: demoMember.id,
        quarterId: quarter.id,
        weekNumber: currentWeek,
        priority1: "完成 3 个重点客户推进会前准备",
        priority2: "输出客户异议清单并同步销售",
        priority3: "更新个人 KR 当前值",
        priorSelfReview: {
          priority_1_result: "partial",
          priority_2_result: "completed",
          priority_3_result: "completed"
        }
      });
    }

    await upsertWeeklyCelebration(demoManager.id, quarter.id, currentWeek, {
      achievements: [{ text: "完成本周重点线索分层并推动两单进入下一阶段" }],
      obstacles: "部分客户反馈决策链较长，需要更早触达关键人",
      mood: "energized"
    });
    if (demoMember.id !== demoManager.id) {
      await upsertWeeklyCelebration(demoMember.id, quarter.id, currentWeek, {
        achievements: [{ text: "完成 2 场关键客户推进会，并拿到 1 个明确试用意向" }],
        obstacles: "客户内部排期紧张，推进节奏偏慢",
        mood: "steady"
      });
    }

    const existingMetric = await prisma.healthMetric.findFirst({
      where: {
        name: DEMO.healthMetric,
        level: "department",
        departmentId: demoDepartment.id,
        ownerId: demoManager.id,
        isActive: true
      }
    });
    const metric =
      existingMetric ??
      snapshot.createHealthMetric(
        demoManager,
        {
          name: DEMO.healthMetric,
          description: "用于展示团队在追求 OKR 时是否仍保持客户响应质量。",
          level: "department",
          departmentId: demoDepartment.id,
          ownerId: demoManager.id,
          thresholdType: "gte",
          thresholdValue: 7,
          updateFrequency: "weekly"
        }
      );
    if (!existingMetric) createdMetrics += 1;

    const latestMetricRecord = await prisma.healthMetricRecord.findFirst({
      where: { healthMetricId: metric.id },
      orderBy: { recordedAt: "desc" }
    });
    if (!latestMetricRecord) {
      snapshot.submitHealthMetricRecord({
        healthMetricId: metric.id,
        currentValue: 8.2,
        note: "本周客户响应时效保持在健康区间。",
        recordedBy: demoManager.id
      });
      createdMetricRecords += 1;
    }

    return NextResponse.json({
      message: "最小演示数据已补齐",
      summary: {
        quarter: quarter.name,
        department: demoDepartment.name,
        manager: demoManager.name,
        member: demoMember.name,
        createdObjectives,
        createdKeyResults,
        createdAlignments,
        createdMetrics,
        createdMetricRecords,
        currentWeek
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "补齐演示数据失败" }, { status: 400 });
  }
}

async function upsertWeeklyCelebration(
  userId: string,
  quarterId: string,
  weekNumber: number,
  input: {
    achievements: { text: string }[];
    obstacles?: string;
    mood: "energized" | "steady" | "calm" | "tired" | "need_support";
  }
) {
  const existing = await prisma.weeklyCelebration.findUnique({
    where: {
      userId_quarterId_weekNumber: {
        userId,
        quarterId,
        weekNumber
      }
    }
  });

  if (existing) {
    return prisma.weeklyCelebration.update({
      where: { id: existing.id },
      data: {
        achievements: input.achievements,
        obstacles: input.obstacles,
        mood: input.mood,
        updatedAt: new Date()
      }
    });
  }

  return prisma.weeklyCelebration.create({
    data: {
      userId,
      quarterId,
      weekNumber,
      achievements: input.achievements,
      obstacles: input.obstacles,
      mood: input.mood,
      submittedAt: new Date()
    }
  });
}
