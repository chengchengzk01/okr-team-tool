import type {
  ConfidenceScore,
  Department,
  ExportLog,
  HealthMetric,
  HealthMetricRecord,
  KeyResultReview,
  KeyResult,
  OKRAlignment,
  Objective,
  Quarter,
  QuarterReview,
  User,
  WeeklyCelebration,
  WeeklyCommitment
} from "@/lib/domain/types";

export const nowIso = "2026-06-09T09:00:00.000+08:00";
export const demoNow = () => new Date(nowIso);

export const departments: Department[] = [
  { id: "dept-company", feishuDeptId: "od_company", name: "公司", managerId: "u-admin" },
  { id: "dept-product", feishuDeptId: "od_product", name: "产品部", parentId: "dept-company", managerId: "u-manager" },
  { id: "dept-sales", feishuDeptId: "od_sales", name: "销售部", parentId: "dept-company", managerId: "u-sales-manager" }
];

export const users: User[] = [
  {
    id: "u-admin",
    feishuUserId: "ou_admin",
    name: "林予安",
    email: "admin@example.com",
    role: "super_admin",
    departmentId: "dept-company",
    isActive: true
  },
  {
    id: "u-manager",
    feishuUserId: "ou_manager",
    name: "陈岚",
    email: "manager@example.com",
    role: "dept_manager",
    departmentId: "dept-product",
    isActive: true
  },
  {
    id: "u-member",
    feishuUserId: "ou_member",
    name: "周宁",
    email: "member@example.com",
    role: "member",
    departmentId: "dept-product",
    isActive: true
  },
  {
    id: "u-sales-manager",
    feishuUserId: "ou_sales_manager",
    name: "许然",
    email: "sales@example.com",
    role: "dept_manager",
    departmentId: "dept-sales",
    isActive: true
  }
];

export const quarters: Quarter[] = [
  {
    id: "q-2026-q3",
    name: "2026 Q3",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    status: "planning",
    createdBy: "u-admin"
  },
  {
    id: "q-2026-q2",
    name: "2026 Q2",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    status: "active",
    createdBy: "u-admin"
  },
  {
    id: "q-2026-q1",
    name: "2026 Q1",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    status: "archived",
    createdBy: "u-admin"
  },
  {
    id: "q-2025-q4",
    name: "2025 Q4",
    startDate: "2025-10-01",
    endDate: "2025-12-31",
    status: "archived",
    createdBy: "u-admin"
  }
];

export const objectives: Objective[] = [
  {
    id: "obj-company",
    quarterId: "q-2026-q2",
    level: "company",
    ownerId: "u-admin",
    title: "让公司进入可持续增长的执行节奏"
  },
  {
    id: "obj-product",
    quarterId: "q-2026-q2",
    level: "department",
    departmentId: "dept-product",
    ownerId: "u-manager",
    title: "建立高频反馈驱动的产品交付系统"
  },
  {
    id: "obj-member",
    quarterId: "q-2026-q2",
    level: "individual",
    departmentId: "dept-product",
    ownerId: "u-member",
    title: "提升核心 OKR 流程的自助使用率"
  },
  {
    id: "obj-sales",
    quarterId: "q-2026-q2",
    level: "department",
    departmentId: "dept-sales",
    ownerId: "u-sales-manager",
    title: "形成可预测的新客户转化节奏"
  },
  {
    id: "obj-company-q1",
    quarterId: "q-2026-q1",
    level: "company",
    ownerId: "u-admin",
    title: "建立跨部门 OKR 运行基线"
  },
  {
    id: "obj-product-q1",
    quarterId: "q-2026-q1",
    level: "department",
    departmentId: "dept-product",
    ownerId: "u-manager",
    title: "完成第一版周节奏试点"
  },
  {
    id: "obj-company-q4",
    quarterId: "q-2025-q4",
    level: "company",
    ownerId: "u-admin",
    title: "完成 OKR 方法导入和试运行"
  },
  {
    id: "obj-sales-q4",
    quarterId: "q-2025-q4",
    level: "department",
    departmentId: "dept-sales",
    ownerId: "u-sales-manager",
    title: "建立销售过程数据记录习惯"
  }
];

export const keyResults: KeyResult[] = [
  {
    id: "kr-company-1",
    objectiveId: "obj-company",
    description: "季度内 90% 成员按时完成每周 OKR 仪式",
    startValue: 0,
    targetValue: 90,
    currentValue: 64,
    unit: "%",
    ownerId: "u-admin",
    dueDate: "2026-06-30",
    sortOrder: 1
  },
  {
    id: "kr-company-2",
    objectiveId: "obj-company",
    description: "关键项目延期率控制在 10% 以下",
    startValue: 28,
    targetValue: 10,
    currentValue: 14,
    unit: "%",
    ownerId: "u-admin",
    dueDate: "2026-06-30",
    sortOrder: 2
  },
  {
    id: "kr-product-1",
    objectiveId: "obj-product",
    description: "完成 OKR 看板 4 个核心视图并进入团队试用",
    startValue: 0,
    targetValue: 4,
    currentValue: 3,
    unit: "个",
    ownerId: "u-manager",
    dueDate: "2026-06-30",
    sortOrder: 1
  },
  {
    id: "kr-member-1",
    objectiveId: "obj-member",
    description: "将周一承诺提交体验缩短至 3 分钟内",
    startValue: 8,
    targetValue: 3,
    currentValue: 4,
    unit: "分钟",
    ownerId: "u-member",
    dueDate: "2026-06-30",
    sortOrder: 1
  },
  {
    id: "kr-sales-1",
    objectiveId: "obj-sales",
    description: "新增 12 个有效商机并完成复盘记录",
    startValue: 0,
    targetValue: 12,
    currentValue: 8,
    unit: "个",
    ownerId: "u-sales-manager",
    dueDate: "2026-06-30",
    sortOrder: 1
  },
  {
    id: "kr-company-q1-1",
    objectiveId: "obj-company-q1",
    description: "80% 成员连续 8 周提交周仪式",
    startValue: 0,
    targetValue: 80,
    currentValue: 72,
    unit: "%",
    ownerId: "u-admin",
    dueDate: "2026-03-31",
    sortOrder: 1
  },
  {
    id: "kr-product-q1-1",
    objectiveId: "obj-product-q1",
    description: "完成 3 个试点团队反馈循环",
    startValue: 0,
    targetValue: 3,
    currentValue: 3,
    unit: "个",
    ownerId: "u-manager",
    dueDate: "2026-03-31",
    sortOrder: 1
  },
  {
    id: "kr-company-q4-1",
    objectiveId: "obj-company-q4",
    description: "完成 OKR 培训并形成 1 份试运行报告",
    startValue: 0,
    targetValue: 1,
    currentValue: 1,
    unit: "份",
    ownerId: "u-admin",
    dueDate: "2025-12-31",
    sortOrder: 1
  },
  {
    id: "kr-sales-q4-1",
    objectiveId: "obj-sales-q4",
    description: "记录 30 个商机推进节点",
    startValue: 0,
    targetValue: 30,
    currentValue: 24,
    unit: "个",
    ownerId: "u-sales-manager",
    dueDate: "2025-12-31",
    sortOrder: 1
  }
];

export const alignments: OKRAlignment[] = [
  { id: "al-product-company", childObjectiveId: "obj-product", parentKeyResultId: "kr-company-1" },
  { id: "al-member-product", childObjectiveId: "obj-member", parentKeyResultId: "kr-product-1" },
  { id: "al-sales-company", childObjectiveId: "obj-sales", parentKeyResultId: "kr-company-2" }
];

export const confidenceScores: ConfidenceScore[] = [
  {
    id: "cs-company-1-w8",
    keyResultId: "kr-company-1",
    userId: "u-admin",
    quarterId: "q-2026-q2",
    weekNumber: 8,
    score: 9,
    note: "提交节奏稳定",
    isLocked: true,
    submittedAt: "2026-05-26T09:00:00.000+08:00",
    updatedAt: "2026-05-26T09:00:00.000+08:00"
  },
  {
    id: "cs-company-1-w9",
    keyResultId: "kr-company-1",
    userId: "u-admin",
    quarterId: "q-2026-q2",
    weekNumber: 9,
    score: 8,
    note: "部分成员漏交",
    isLocked: true,
    submittedAt: "2026-06-02T09:00:00.000+08:00",
    updatedAt: "2026-06-02T09:00:00.000+08:00"
  },
  {
    id: "cs-company-1-w10",
    keyResultId: "kr-company-1",
    userId: "u-admin",
    quarterId: "q-2026-q2",
    weekNumber: 10,
    score: 7,
    note: "节奏稳定，但仍有两位成员漏交",
    isLocked: false,
    submittedAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: "cs-company-2-w8",
    keyResultId: "kr-company-2",
    userId: "u-admin",
    quarterId: "q-2026-q2",
    weekNumber: 8,
    score: 5,
    note: "延期率下降慢",
    isLocked: true,
    submittedAt: "2026-05-26T09:00:00.000+08:00",
    updatedAt: "2026-05-26T09:00:00.000+08:00"
  },
  {
    id: "cs-company-2-w9",
    keyResultId: "kr-company-2",
    userId: "u-admin",
    quarterId: "q-2026-q2",
    weekNumber: 9,
    score: 4,
    note: "关键项目仍有阻塞",
    isLocked: true,
    submittedAt: "2026-06-02T09:00:00.000+08:00",
    updatedAt: "2026-06-02T09:00:00.000+08:00"
  },
  {
    id: "cs-company-2-w10",
    keyResultId: "kr-company-2",
    userId: "u-admin",
    quarterId: "q-2026-q2",
    weekNumber: 10,
    score: 3,
    note: "延期风险升高",
    isLocked: false,
    submittedAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: "cs-product-1-w10",
    keyResultId: "kr-product-1",
    userId: "u-manager",
    quarterId: "q-2026-q2",
    weekNumber: 10,
    score: 8,
    note: "看板主路径已可用",
    isLocked: false,
    submittedAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: "cs-member-1-w8",
    keyResultId: "kr-member-1",
    userId: "u-member",
    quarterId: "q-2026-q2",
    weekNumber: 8,
    score: 8,
    note: "表单入口清晰",
    isLocked: true,
    submittedAt: "2026-05-26T09:00:00.000+08:00",
    updatedAt: "2026-05-26T09:00:00.000+08:00"
  },
  {
    id: "cs-member-1-w9",
    keyResultId: "kr-member-1",
    userId: "u-member",
    quarterId: "q-2026-q2",
    weekNumber: 9,
    score: 7,
    note: "仍需减少字段干扰",
    isLocked: true,
    submittedAt: "2026-06-02T09:00:00.000+08:00",
    updatedAt: "2026-06-02T09:00:00.000+08:00"
  },
  {
    id: "cs-member-1-w10",
    keyResultId: "kr-member-1",
    userId: "u-member",
    quarterId: "q-2026-q2",
    weekNumber: 10,
    score: 6,
    note: "还需要减少表单字段干扰",
    isLocked: false,
    submittedAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: "cs-company-q1-1-w12",
    keyResultId: "kr-company-q1-1",
    userId: "u-admin",
    quarterId: "q-2026-q1",
    weekNumber: 12,
    score: 6,
    note: "试点已稳定但覆盖不足",
    isLocked: true,
    submittedAt: "2026-03-17T09:00:00.000+08:00",
    updatedAt: "2026-03-17T09:00:00.000+08:00"
  },
  {
    id: "cs-product-q1-1-w12",
    keyResultId: "kr-product-q1-1",
    userId: "u-manager",
    quarterId: "q-2026-q1",
    weekNumber: 12,
    score: 8,
    note: "试点闭环完成",
    isLocked: true,
    submittedAt: "2026-03-17T09:00:00.000+08:00",
    updatedAt: "2026-03-17T09:00:00.000+08:00"
  },
  {
    id: "cs-company-q4-1-w12",
    keyResultId: "kr-company-q4-1",
    userId: "u-admin",
    quarterId: "q-2025-q4",
    weekNumber: 12,
    score: 7,
    note: "方法导入完成",
    isLocked: true,
    submittedAt: "2025-12-16T09:00:00.000+08:00",
    updatedAt: "2025-12-16T09:00:00.000+08:00"
  },
  {
    id: "cs-sales-q4-1-w12",
    keyResultId: "kr-sales-q4-1",
    userId: "u-sales-manager",
    quarterId: "q-2025-q4",
    weekNumber: 12,
    score: 5,
    note: "记录完整性不足",
    isLocked: true,
    submittedAt: "2025-12-16T09:00:00.000+08:00",
    updatedAt: "2025-12-16T09:00:00.000+08:00"
  }
];

export const weeklyCommitments: WeeklyCommitment[] = [
  {
    id: "wc-admin-w10",
    userId: "u-admin",
    quarterId: "q-2026-q2",
    weekNumber: 10,
    priority1: "确认各部门 Q2 收尾风险",
    priority2: "推动本周信心值完整提交",
    priority3: "准备季度 Review 模板",
    submittedAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: "wc-member-w10",
    userId: "u-member",
    quarterId: "q-2026-q2",
    weekNumber: 10,
    priority1: "完成周一承诺表单优化",
    priority2: "补齐信心值历史趋势图",
    priority3: "整理成员反馈清单",
    priorSelfReview: {
      priority_1_result: "completed",
      priority_2_result: "partial",
      priority_3_result: "completed"
    },
    submittedAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: "wc-admin-q1-w12",
    userId: "u-admin",
    quarterId: "q-2026-q1",
    weekNumber: 12,
    priority1: "完成 Q1 试点复盘",
    priority2: "确认 Q2 目标草案",
    priority3: "同步部门反馈",
    submittedAt: "2026-03-17T09:00:00.000+08:00",
    updatedAt: "2026-03-17T09:00:00.000+08:00"
  },
  {
    id: "wc-manager-q1-w12",
    userId: "u-manager",
    quarterId: "q-2026-q1",
    weekNumber: 12,
    priority1: "收集团队试点反馈",
    priority2: "整理提交阻塞点",
    priority3: "准备 Q2 目标",
    submittedAt: "2026-03-17T09:00:00.000+08:00",
    updatedAt: "2026-03-17T09:00:00.000+08:00"
  },
  {
    id: "wc-admin-q4-w12",
    userId: "u-admin",
    quarterId: "q-2025-q4",
    weekNumber: 12,
    priority1: "完成 OKR 培训总结",
    priority2: "确认试运行报告",
    priority3: "规划下季度试点",
    submittedAt: "2025-12-16T09:00:00.000+08:00",
    updatedAt: "2025-12-16T09:00:00.000+08:00"
  }
];

export const weeklyCelebrations: WeeklyCelebration[] = [
  {
    id: "wce-member-w10",
    userId: "u-member",
    quarterId: "q-2026-q2",
    weekNumber: 10,
    achievements: [{ text: "完成团队看板信息结构评审" }, { text: "修复 KR 信心值颜色误判" }],
    obstacles: "部分成员还不清楚信心值不是完成度",
    mood: "steady",
    submittedAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: "wce-admin-q1-w12",
    userId: "u-admin",
    quarterId: "q-2026-q1",
    weekNumber: 12,
    achievements: [{ text: "完成 Q1 试点复盘" }],
    obstacles: "部分成员尚未形成固定节奏",
    mood: "calm",
    submittedAt: "2026-03-20T17:00:00.000+08:00",
    updatedAt: "2026-03-20T17:00:00.000+08:00"
  },
  {
    id: "wce-manager-q1-w12",
    userId: "u-manager",
    quarterId: "q-2026-q1",
    weekNumber: 12,
    achievements: [{ text: "完成产品部试点闭环" }],
    mood: "energized",
    submittedAt: "2026-03-20T17:00:00.000+08:00",
    updatedAt: "2026-03-20T17:00:00.000+08:00"
  },
  {
    id: "wce-admin-q4-w12",
    userId: "u-admin",
    quarterId: "q-2025-q4",
    weekNumber: 12,
    achievements: [{ text: "完成 OKR 方法导入报告" }],
    obstacles: "销售过程数据记录不完整",
    mood: "steady",
    submittedAt: "2025-12-19T17:00:00.000+08:00",
    updatedAt: "2025-12-19T17:00:00.000+08:00"
  }
];

export const healthMetrics: HealthMetric[] = [
  {
    id: "hm-cash",
    name: "现金流安全月数",
    description: "不因增长目标牺牲现金安全",
    level: "company",
    ownerId: "u-admin",
    thresholdType: "gte",
    thresholdValue: 7,
    inputMin: 0,
    inputMax: 10,
    updateFrequency: "monthly",
    isActive: true
  },
  {
    id: "hm-bug",
    name: "P0/P1 缺陷数",
    description: "产品迭代不得牺牲核心稳定性",
    level: "department",
    departmentId: "dept-product",
    ownerId: "u-manager",
    thresholdType: "gte",
    thresholdValue: 7,
    inputMin: 0,
    inputMax: 10,
    updateFrequency: "weekly",
    isActive: true
  }
];

export const healthMetricRecords: HealthMetricRecord[] = [
  {
    id: "hmr-cash-latest",
    healthMetricId: "hm-cash",
    currentValue: 5.4,
    status: "warning",
    note: "本月回款延迟",
    recordedBy: "u-admin",
    recordedAt: nowIso
  },
  {
    id: "hmr-bug-latest",
    healthMetricId: "hm-bug",
    currentValue: 4,
    status: "warning",
    note: "一项移动端阻塞问题待修复",
    recordedBy: "u-manager",
    recordedAt: nowIso
  },
  {
    id: "hmr-cash-q1",
    healthMetricId: "hm-cash",
    currentValue: 7.2,
    status: "healthy",
    note: "现金安全稳定",
    recordedBy: "u-admin",
    recordedAt: "2026-03-31T10:00:00.000+08:00"
  },
  {
    id: "hmr-bug-q1",
    healthMetricId: "hm-bug",
    currentValue: 6.5,
    status: "warning",
    note: "试点期缺陷仍需压降",
    recordedBy: "u-manager",
    recordedAt: "2026-03-31T10:00:00.000+08:00"
  },
  {
    id: "hmr-cash-q4",
    healthMetricId: "hm-cash",
    currentValue: 8.1,
    status: "healthy",
    note: "导入期现金安全",
    recordedBy: "u-admin",
    recordedAt: "2025-12-31T10:00:00.000+08:00"
  },
  {
    id: "hmr-bug-q4",
    healthMetricId: "hm-bug",
    currentValue: 3.8,
    status: "exceeded",
    note: "试运行阶段稳定性不足",
    recordedBy: "u-manager",
    recordedAt: "2025-12-31T10:00:00.000+08:00"
  }
];

export const keyResultReviews: KeyResultReview[] = [
  {
    id: "krr-company-q1-1",
    keyResultId: "kr-company-q1-1",
    quarterId: "q-2026-q1",
    reviewerId: "u-admin",
    finalValue: 72,
    completionRate: 0.9,
    confidenceScore: 6,
    whatWorked: "周仪式节奏初步跑通",
    whatDidnt: "覆盖率低于预期",
    nextStep: "Q2 扩大到全部部门",
    submittedAt: "2026-03-31T18:00:00.000+08:00",
    updatedAt: "2026-03-31T18:00:00.000+08:00"
  },
  {
    id: "krr-product-q1-1",
    keyResultId: "kr-product-q1-1",
    quarterId: "q-2026-q1",
    reviewerId: "u-manager",
    finalValue: 3,
    completionRate: 1,
    confidenceScore: 8,
    whatWorked: "反馈循环足够高频",
    whatDidnt: "反馈沉淀格式不统一",
    nextStep: "Q2 固化模板",
    submittedAt: "2026-03-31T18:00:00.000+08:00",
    updatedAt: "2026-03-31T18:00:00.000+08:00"
  },
  {
    id: "krr-company-q4-1",
    keyResultId: "kr-company-q4-1",
    quarterId: "q-2025-q4",
    reviewerId: "u-admin",
    finalValue: 1,
    completionRate: 1,
    confidenceScore: 7,
    whatWorked: "培训完成度高",
    whatDidnt: "试运行数据不足",
    nextStep: "Q1 做团队试点",
    submittedAt: "2025-12-31T18:00:00.000+08:00",
    updatedAt: "2025-12-31T18:00:00.000+08:00"
  },
  {
    id: "krr-sales-q4-1",
    keyResultId: "kr-sales-q4-1",
    quarterId: "q-2025-q4",
    reviewerId: "u-sales-manager",
    finalValue: 24,
    completionRate: 0.8,
    confidenceScore: 5,
    whatWorked: "商机节点开始被记录",
    whatDidnt: "记录质量不稳定",
    nextStep: "Q1 增加周度检查",
    submittedAt: "2025-12-31T18:00:00.000+08:00",
    updatedAt: "2025-12-31T18:00:00.000+08:00"
  }
];

export const exportLogs: ExportLog[] = [
  {
    id: "exp-bitable-demo",
    exportedBy: "u-admin",
    exportType: "bitable_sync",
    scope: "company",
    quarterId: "q-2026-q2",
    status: "success",
    message: "模拟多维表格同步完成，共 4 个 Sheet",
    exportedAt: nowIso
  }
];

export const quarterReviews: QuarterReview[] = [
  {
    id: "qr-company-q1",
    quarterId: "q-2026-q1",
    level: "company",
    ownerId: "u-admin",
    whatWorked: "跨部门周节奏开始稳定运行",
    whatDidnt: "部分 KR 风险暴露仍偏晚",
    healthSummary: "现金流和缺陷数维持在预警范围内",
    nextQuarterInsights: "Q2 需要把信心值趋势预警前置到周会",
    submittedAt: "2026-03-31T18:00:00.000+08:00",
    updatedAt: "2026-03-31T18:00:00.000+08:00"
  }
];

export type SeedState = {
  departments: Department[];
  users: User[];
  quarters: Quarter[];
  objectives: Objective[];
  keyResults: KeyResult[];
  alignments: OKRAlignment[];
  confidenceScores: ConfidenceScore[];
  weeklyCommitments: WeeklyCommitment[];
  weeklyCelebrations: WeeklyCelebration[];
  healthMetrics: HealthMetric[];
  healthMetricRecords: HealthMetricRecord[];
  quarterReviews: QuarterReview[];
  keyResultReviews: KeyResultReview[];
  exportLogs: ExportLog[];
};

export function createSeedState(): SeedState {
  return {
    departments: clone(departments),
    users: clone(users),
    quarters: clone(quarters),
    objectives: clone(objectives),
    keyResults: clone(keyResults),
    alignments: clone(alignments),
    confidenceScores: clone(confidenceScores),
    weeklyCommitments: clone(weeklyCommitments),
    weeklyCelebrations: clone(weeklyCelebrations),
    healthMetrics: clone(healthMetrics),
    healthMetricRecords: clone(healthMetricRecords),
    quarterReviews: clone(quarterReviews),
    keyResultReviews: clone(keyResultReviews),
    exportLogs: clone(exportLogs)
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
