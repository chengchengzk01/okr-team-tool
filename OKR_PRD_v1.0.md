# OKR 团队工具 产品需求文档

**版本**：v1.0
**状态**：待开发
**日期**：2026-06-09
**方法论来源**：《OKR工作法》Christina Wodtke 著
**目标读者**：OpenAI Codex / 开发工程师

---

## 目录

1. [产品概述](#1-产品概述)
2. [名词定义](#2-名词定义)
3. [用户角色与权限](#3-用户角色与权限)
4. [信息架构](#4-信息架构)
5. [核心数据实体](#5-核心数据实体)
6. [功能模块规格](#6-功能模块规格)
7. [API 接口概览](#7-api-接口概览)
8. [飞书集成规格](#8-飞书集成规格)
9. [非功能性需求](#9-非功能性需求)
10. [核心用户旅程](#10-核心用户旅程)
11. [里程碑](#11-里程碑)

---

## 1. 产品概述

### 1.1 背景

本工具以克里斯蒂娜·沃特克所著《OKR工作法》为方法论基础，为公司内部 10-20 人、多部门团队构建完整的 OKR 执行系统。产品核心不是记录目标，而是执行书中规定的每周节奏：周一承诺、信心值追踪、周五庆祝，并辅以健康指标防止目标扭曲。

### 1.2 核心目标

- 让团队每周推进，而不是季度末才检查
- 通过信心值而非完成度，提前识别执行风险
- 通过健康指标，防止为了完成 KR 而牺牲业务根基

### 1.3 方法论映射

| 书中机制 | 产品模块 |
|---|---|
| OKR 三层级设定 | OKR 设定与对齐模块 |
| 每周信心值 1-10 分 | 信心值追踪模块 |
| 周一承诺仪式 | 周一承诺模块 |
| 周五庆祝仪式 | 周五庆祝模块 |
| 健康指标 | 健康指标模块 |
| 四象限周报看板 | 周报看板模块 |

### 1.4 系统边界

- **语言**：中文界面
- **用户规模**：10-20 人，多部门
- **身份认证**：飞书 OAuth SSO（唯一登录方式）
- **外部集成**：飞书日历、飞书多维表格、飞书文档

---

## 2. 名词定义

| 名词 | 定义 |
|---|---|
| Objective | 目标，定性描述，须具备感召性，每个层级每季度只有一个 |
| Key Result（KR）| 关键结果，定量可衡量，每个 Objective 对应最多 5 个 KR |
| 信心值 | 对某 KR 能在本季度完成的主观预测，1-10 分，非完成度 |
| 承诺优先级 | 本周 Top 3 最重要的事项，与 OKR 相关但不等于 KR 的分解 |
| 健康指标 | 团队声明不愿为追求 OKR 而放弃的底线指标 |
| 四象限看板 | 汇总展示 OKR、承诺、健康指标和团队心情的单页视图 |
| 周仪式 | 周一承诺与周五庆祝的合称 |
| 季度 Review | 季度末对 OKR 达成情况的结构化复盘 |
| 窗口期 | 每周一至周三，信心值可提交和修改的时间段 |

---

## 3. 用户角色与权限

### 3.1 角色定义

| 角色 | 来源 | 描述 |
|---|---|---|
| 超级管理员（Super Admin）| 系统初始化时手动指定，唯一 | 管理全公司季度、公司级 OKR、用户与部门，查看全员数据，配置飞书集成 |
| 部门管理者（Dept Manager）| 飞书组织架构映射或手动指定 | 创建并管理本部门 OKR，查看本部门成员数据，设定部门健康指标 |
| 成员（Member）| 飞书授权登录后自动创建 | 创建个人 OKR，更新信心值，填写周仪式，查看同部门看板 |

### 3.2 权限矩阵

| 功能 | Super Admin | Dept Manager | Member |
|---|:---:|:---:|:---:|
| 创建季度 | ✓ | — | — |
| 创建公司级 OKR | ✓ | — | — |
| 创建部门级 OKR | ✓ | ✓ | — |
| 创建个人 OKR | ✓ | ✓ | ✓ |
| 查看全公司 OKR | ✓ | — | — |
| 查看本部门 OKR | ✓ | ✓ | ✓（只读）|
| 更新自己的信心值 | ✓ | ✓ | ✓ |
| 查看他人信心值 | ✓（全员）| ✓（本部门）| — |
| 填写周仪式 | ✓ | ✓ | ✓ |
| 查看他人周仪式 | ✓（全员）| ✓（本部门）| ✓（本部门）|
| 设定健康指标 | ✓ | ✓（本部门）| — |
| 更新健康指标数值 | ✓ | ✓ | ✓（被指派的）|
| 飞书集成配置 | ✓ | — | — |
| 全局数据导出 | ✓ | — | — |
| 本部门数据导出 | ✓ | ✓ | — |
| 用户管理 | ✓ | — | — |

---

## 4. 信息架构

### 4.1 OKR 层级结构

```
季度（Quarter）
└── 公司级 OKR
    ├── Objective（1 个）
    └── Key Results（最多 5 个）
        └── 部门级 OKR（对齐公司级 KR）
            ├── Objective（1 个）
            └── Key Results（最多 5 个）
                └── 个人 OKR（对齐部门级 KR）
                    ├── Objective（1 个）
                    └── Key Results（最多 5 个）
```

### 4.2 对齐规则

- 部门级 OKR 创建时，须选择支撑哪个公司级 KR，可选 1-3 个
- 个人 OKR 创建时，须选择支撑哪个部门级 KR，可选 1-3 个
- 对齐关系在季度内不可修改，如需调整须通知部门管理者
- 上级 KR 详情页展示哪些下级 OKR 与其对齐

### 4.3 导航结构

| 路由 | 页面 | 可访问角色 |
|---|---|---|
| `/dashboard` | 四象限周报看板 | 全员 |
| `/okr` | OKR 树状视图 | 全员 |
| `/weekly` | 周仪式入口 | 全员 |
| `/health` | 健康指标管理 | 全员 |
| `/quarters` | 季度管理 | Super Admin |
| `/settings` | 系统设置与飞书集成 | Super Admin |

---

## 5. 核心数据实体

> 以下字段定义供 Codex 生成数据库 Schema 和类型声明使用。类型标注为通用格式，具体实现由 Codex 根据所选技术栈映射。

### 5.1 User（用户）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | 系统内部用户 ID |
| feishu_user_id | String | UNIQUE, NOT NULL | 飞书 open_id |
| name | String | NOT NULL | 显示名称 |
| avatar_url | String | NULLABLE | 飞书头像链接 |
| email | String | UNIQUE, NULLABLE | 企业邮箱 |
| role | Enum | NOT NULL | super_admin / dept_manager / member |
| department_id | UUID | FK → Department, NULLABLE | 所属部门 |
| is_active | Boolean | NOT NULL, DEFAULT true | 是否启用 |
| created_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

### 5.2 Department（部门）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| feishu_dept_id | String | UNIQUE, NULLABLE | 飞书部门 open_department_id |
| name | String | NOT NULL | 部门名称 |
| parent_id | UUID | FK → Department, NULLABLE | 父部门，支持层级结构 |
| manager_id | UUID | FK → User, NULLABLE | 部门管理者 |
| created_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

### 5.3 Quarter（季度）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| name | String | NOT NULL | 如"2026 Q3" |
| start_date | Date | NOT NULL | |
| end_date | Date | NOT NULL | |
| status | Enum | NOT NULL | planning / active / reviewing / archived |
| created_by | UUID | FK → User, NOT NULL | |
| created_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

**约束**：同一时间只能有一个 status 为 active 的季度。

### 5.4 Objective（目标）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| quarter_id | UUID | FK → Quarter, NOT NULL | |
| level | Enum | NOT NULL | company / department / individual |
| department_id | UUID | FK → Department, NULLABLE | level 为 department 时必填 |
| owner_id | UUID | FK → User, NOT NULL | level 为 individual 时为个人 |
| title | String | NOT NULL, MAX 50 | Objective 文本 |
| created_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

**约束**：同一 owner_id + quarter_id + level 组合下只能有一条记录。

### 5.5 KeyResult（关键结果）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| objective_id | UUID | FK → Objective, NOT NULL | |
| description | String | NOT NULL, MAX 100 | KR 描述 |
| start_value | Float | NOT NULL | 起始值 |
| target_value | Float | NOT NULL | 目标值 |
| current_value | Float | NOT NULL, DEFAULT = start_value | 当前值 |
| unit | String | NULLABLE | 如：元、个、%、分 |
| owner_id | UUID | FK → User, NOT NULL | 负责人 |
| due_date | Date | NOT NULL | 截止日期，默认为季度 end_date |
| sort_order | Integer | NOT NULL, DEFAULT 0 | 展示排序 |
| created_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

**约束**：同一 objective_id 下最多 5 条记录。

### 5.6 OKRAlignment（OKR 对齐关系）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| child_objective_id | UUID | FK → Objective, NOT NULL | 下级 Objective |
| parent_key_result_id | UUID | FK → KeyResult, NOT NULL | 对齐的上级 KR |
| created_at | Timestamp | NOT NULL | |

**约束**：同一 child_objective_id 下最多 3 条记录；对齐关系创建后不可修改。

### 5.7 ConfidenceScore（信心值）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| key_result_id | UUID | FK → KeyResult, NOT NULL | |
| user_id | UUID | FK → User, NOT NULL | 打分人 |
| week_number | Integer | NOT NULL | 季度内第几周，1-13 |
| quarter_id | UUID | FK → Quarter, NOT NULL | |
| score | Integer | NOT NULL, MIN 1, MAX 10 | 信心值 |
| note | String | NULLABLE | 变化原因备注 |
| submitted_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

**约束**：同一 key_result_id + user_id + week_number + quarter_id 组合下只能有一条记录；窗口期（周一至周三）内可更新，窗口期关闭后 is_locked = true，不可修改。

### 5.8 WeeklyCommitment（周一承诺）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| user_id | UUID | FK → User, NOT NULL | |
| quarter_id | UUID | FK → Quarter, NOT NULL | |
| week_number | Integer | NOT NULL | 季度内第几周 |
| priority_1 | String | NOT NULL, MAX 100 | 本周第一优先级 |
| priority_2 | String | NOT NULL, MAX 100 | 本周第二优先级 |
| priority_3 | String | NOT NULL, MAX 100 | 本周第三优先级 |
| prior_self_review | JSON | NULLABLE | 上周自评结果，结构见下 |
| submitted_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

**prior_self_review JSON 结构**：
```json
{
  "priority_1_result": "completed | partial | not_completed",
  "priority_2_result": "completed | partial | not_completed",
  "priority_3_result": "completed | partial | not_completed"
}
```

**约束**：同一 user_id + quarter_id + week_number 组合下只能有一条记录；提交当天 24:00 前可修改。

### 5.9 WeeklyCelebration（周五庆祝）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| user_id | UUID | FK → User, NOT NULL | |
| quarter_id | UUID | FK → Quarter, NOT NULL | |
| week_number | Integer | NOT NULL | |
| achievements | JSON | NOT NULL | 完成事项列表，结构见下 |
| obstacles | String | NULLABLE, MAX 500 | 本周遇到的障碍 |
| mood | Enum | NOT NULL | energized / steady / calm / tired / need_support |
| submitted_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

**achievements JSON 结构**：
```json
[
  { "text": "完成事项描述，最多100字" }
]
```

**约束**：同一 user_id + quarter_id + week_number 组合下只能有一条记录。

### 5.10 HealthMetric（健康指标）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| name | String | NOT NULL | 指标名称 |
| description | String | NULLABLE | 意义说明 |
| level | Enum | NOT NULL | company / department |
| department_id | UUID | FK → Department, NULLABLE | level 为 department 时必填 |
| owner_id | UUID | FK → User, NOT NULL | 负责更新数值的人 |
| threshold_type | Enum | NOT NULL | gte（不低于）/ lte（不超过）/ between（保持区间）|
| threshold_min | Float | NULLABLE | between 类型的下限 |
| threshold_max | Float | NULLABLE | between 类型的上限 |
| threshold_value | Float | NULLABLE | gte 或 lte 类型的阈值 |
| update_frequency | Enum | NOT NULL | weekly / monthly / quarterly |
| is_active | Boolean | NOT NULL, DEFAULT true | |
| created_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

### 5.11 HealthMetricRecord（健康指标记录）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| health_metric_id | UUID | FK → HealthMetric, NOT NULL | |
| current_value | Float | NOT NULL | |
| status | Enum | NOT NULL | healthy / warning / exceeded | 系统自动计算 |
| note | String | NULLABLE | |
| recorded_by | UUID | FK → User, NOT NULL | |
| recorded_at | Timestamp | NOT NULL | |

**status 计算规则**：
- `gte` 类型：current_value >= threshold_value → healthy；current_value >= threshold_value * 0.85 → warning；否则 → exceeded
- `lte` 类型：current_value <= threshold_value → healthy；current_value <= threshold_value * 1.15 → warning；否则 → exceeded
- `between` 类型：在区间内 → healthy；距离边界 15% 以内 → warning；超出区间 → exceeded

### 5.12 QuarterReview（季度复盘）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| quarter_id | UUID | FK → Quarter, NOT NULL | |
| level | Enum | NOT NULL | company / department / individual |
| owner_id | UUID | FK → User, NOT NULL | |
| department_id | UUID | FK → Department, NULLABLE | |
| what_worked | String | NULLABLE | 哪个 Objective 完成了，为什么 |
| what_didnt | String | NULLABLE | 哪个未达成，核心障碍是什么 |
| health_summary | String | NULLABLE | 健康指标季度表现回顾 |
| next_quarter_insights | String | NULLABLE | 对下季度的启示 |
| submitted_at | Timestamp | NULLABLE | |
| created_at | Timestamp | NOT NULL | |
| updated_at | Timestamp | NOT NULL | |

### 5.13 KRReview（KR 最终复盘）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| key_result_id | UUID | FK → KeyResult, NOT NULL | |
| quarter_review_id | UUID | FK → QuarterReview, NOT NULL | |
| final_value | Float | NOT NULL | 最终完成值 |
| completion_rate | Float | NOT NULL | 系统计算：final_value / target_value |
| note | String | NOT NULL | 完成说明 |
| created_at | Timestamp | NOT NULL | |

### 5.14 ExportLog（导出日志）

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | UUID | PK, NOT NULL | |
| exported_by | UUID | FK → User, NOT NULL | |
| export_type | Enum | NOT NULL | bitable_sync / feishu_doc |
| scope | Enum | NOT NULL | company / department / individual |
| department_id | UUID | FK → Department, NULLABLE | |
| quarter_id | UUID | FK → Quarter, NULLABLE | |
| status | Enum | NOT NULL | pending / success / failed |
| feishu_doc_url | String | NULLABLE | 生成的飞书文档链接 |
| exported_at | Timestamp | NOT NULL | |

---

## 6. 功能模块规格

### 6.1 认证模块

#### 功能说明

系统唯一登录方式为飞书 OAuth SSO。首次登录时自动同步飞书组织架构，创建用户和部门数据。详细 OAuth 技术流程见 [8.1 飞书 SSO 登录](#81-飞书-sso-登录)。

#### 验收标准（AC）

- [ ] 未登录用户访问任意路由，重定向至登录页
- [ ] 登录页点击「用飞书账号登录」，跳转飞书 OAuth 授权页
- [ ] 用户在飞书完成授权后，回调系统并完成登录，跳转至 `/dashboard`
- [ ] 首次登录时，系统自动从飞书通讯录同步部门和用户数据
- [ ] 飞书 Token 不持久化存储，系统仅持有自身签发的 JWT
- [ ] JWT 过期后，访问受保护路由返回 401，前端跳转至登录页
- [ ] 登出时清除本地 JWT，跳转至登录页

---

### 6.2 OKR 设定与对齐模块

#### 功能说明

三层级 OKR 创建与对齐，包含公司级、部门级、个人级。每层级每季度只允许一个 Objective，每个 Objective 最多 5 个 KR。

#### 季度管理

字段说明见 [5.3 Quarter](#53-quarter季度)。

状态流转：`planning → active → reviewing → archived`

规则：同一时间只能有一个 status 为 active 的季度；季度状态切换为 archived 时，季度内所有重复日历事件终止。

#### 创建 Objective

字段说明见 [5.4 Objective](#54-objective目标)。

规则：同一 owner + 季度 + 层级组合下只能有一个 Objective；Objective 文本不超过 50 字，须为定性描述。

#### 创建 Key Result

字段说明见 [5.5 KeyResult](#55-keyresult关键结果)。

规则：同一 Objective 下最多 5 个 KR；每个 KR 须有明确的起始值、目标值和单位。

#### OKR 树状视图

- 顶层展示公司级 Objective 和 KR
- 每个公司级 KR 下，折叠展示支撑它的部门级 OKR
- 每个部门级 KR 下，折叠展示支撑它的个人 OKR
- 每个 KR 展示当前信心值，颜色规范见 [6.6 四象限周报看板](#66-四象限周报看板)
- 支持按部门筛选，支持关键词搜索

#### 验收标准（AC）

- [ ] Super Admin 可创建公司级 Objective；Dept Manager 可创建部门级 Objective；Member 可创建个人 Objective
- [ ] 同一 owner + 季度 + 层级已存在 Objective 时，新建请求返回错误提示「本季度该层级 Objective 已存在」
- [ ] Objective 文本超过 50 字时，前端阻止提交并提示字数限制
- [ ] 同一 Objective 下第 6 个 KR 创建请求被拒绝，提示「每个 Objective 最多 5 个关键结果」
- [ ] 部门级 Objective 创建时，对齐上级 KR 为必选项，未选时无法提交
- [ ] 个人 Objective 创建时，对齐上级 KR 为必选项，未选时无法提交
- [ ] OKR 树状视图中，部门级 OKR 正确归属在对应的公司级 KR 下
- [ ] OKR 树状视图中，每个 KR 的信心值以对应颜色展示
- [ ] 对齐关系建立后，点击修改对齐提示「季度内不可修改对齐关系」
- [ ] 按部门筛选时，只展示该部门及其成员的 OKR 节点

---

### 6.3 信心值追踪模块

#### 功能说明

信心值是主观预测，表示「在当前情况下，这个 KR 在季度结束时能完成的概率」，不是完成度。每周一至周三为提交窗口期。

#### 信心值含义参考

| 分值 | 含义 |
|---|---|
| 1-2 | 几乎不可能完成 |
| 3-4 | 可能无法完成 |
| 5 | 五五开 |
| 6-7 | 大概率完成 |
| 8-9 | 较大把握完成 |
| 10 | 确定完成 |

#### 规则

- 每周一至周三为信心值更新窗口期
- 窗口期内，已提交的信心值可修改
- 窗口期关闭（周三 24:00）后，本周记录锁定，不可修改
- 历史记录按周保存，贯穿整个季度
- 信心值填写与周一承诺在同一流程入口内完成

#### 信心值趋势图

- 横轴：季度内各周次（第 1 周至第 N 周）
- 纵轴：1-10 分
- 每条折线代表一个 KR
- 支持在同一图表中叠加多个 KR
- 支持按层级筛选（公司级 / 部门级 / 个人级）

#### 验收标准（AC）

- [ ] 在窗口期内（周一至周三），用户可提交和修改信心值
- [ ] 超出窗口期（周四及之后），信心值提交接口返回错误，前端提示「本周窗口期已关闭」
- [ ] 同一 KR 同一周已有记录时，再次提交为更新操作而非新增
- [ ] 信心值输入范围校验：1-10 整数，超出范围时前端阻止提交
- [ ] 看板展示 KR 信心值时，若本周未在窗口期内提交，标注「本周未更新」
- [ ] 信心值趋势图正确展示历史各周的打分记录
- [ ] Dept Manager 可查看本部门所有成员的信心值历史
- [ ] Member 只能查看自己的信心值；他人信心值不可见

---

### 6.4 周一承诺模块

#### 功能说明

每周一，每位成员提交本周承诺，包含两部分：本周 Top 3 优先级，以及对所有 KR 的信心值更新。

字段说明见 [5.8 WeeklyCommitment](#58-weeklycommitment周一承诺)。

#### 规则

- 每周只能提交一次；提交当天 24:00 前可修改
- 提交后同部门成员可见
- 填写入口顶部展示上周承诺的三条优先级内容
- 成员可对上周三条优先级进行自评（完成 / 部分完成 / 未完成），非强制填写
- 信心值更新在同一页面内完成，数据写入 ConfidenceScore 表

#### 验收标准（AC）

- [ ] 进入周一承诺页面时，顶部展示上周三条承诺内容
- [ ] 上周自评为可选项，不填写可直接提交本周承诺
- [ ] 三条优先级均为必填，任一为空时无法提交
- [ ] 单条优先级超过 100 字时，前端阻止提交并提示字数限制
- [ ] 本周承诺提交后，同部门成员在团队看板可见该成员的优先级
- [ ] 提交当天 24:00 之前，用户可修改已提交的承诺
- [ ] 超过截止时间后，修改接口返回错误，前端提示「今日提交窗口已关闭」

---

### 6.5 周五庆祝模块

#### 功能说明

每周五，每位成员提交本周复盘，记录成果与障碍，并表达当前心情。

字段说明见 [5.9 WeeklyCelebration](#59-weeklycelebration周五庆祝)。

#### 心情选项

| 枚举值 | 展示文字 |
|---|---|
| energized | 充满能量 |
| steady | 稳步前进 |
| calm | 平静 |
| tired | 有些疲惫 |
| need_support | 需要支持 |

#### 规则

- 提交后同部门成员可见
- Dept Manager 有障碍汇总视图，聚合展示本部门本周所有成员上报的障碍

#### 验收标准（AC）

- [ ] 进入周五庆祝页面，用户可新增多条完成事项（数量不限）
- [ ] 单条完成事项超过 100 字时，前端阻止提交
- [ ] 心情选项为必选，未选时无法提交
- [ ] 障碍字段为可选，不填写可正常提交
- [ ] 提交后同部门成员在团队看板可见该成员的心情和完成事项
- [ ] Dept Manager 的障碍汇总视图聚合展示本部门本周所有非空障碍字段
- [ ] 同一用户同一周只能提交一次；重复提交返回错误提示

---

### 6.6 健康指标模块

#### 功能说明

健康指标是团队声明「不愿意为了完成 OKR 而放弃的底线指标」，与 KR 明确区隔，独立管理。

字段说明见 [5.10 HealthMetric](#510-healthmetric健康指标) 和 [5.11 HealthMetricRecord](#511-healthmetricrecord健康指标记录)。

#### 状态颜色规范

| 状态 | 颜色 | 触发条件 |
|---|---|---|
| 健康（healthy）| 绿色 | 当前值处于阈值安全范围内 |
| 预警（warning）| 黄色 | 距离阈值 15% 以内 |
| 超标（exceeded）| 红色 | 当前值超出阈值 |

#### 验收标准（AC）

- [ ] Super Admin 可创建公司级健康指标；Dept Manager 可创建本部门健康指标
- [ ] 健康指标创建时，阈值类型为 between 时，threshold_min 和 threshold_max 均必填
- [ ] 负责人提交新数值后，状态字段由系统自动计算，不允许手动设定状态
- [ ] 状态为 exceeded 时，四象限看板的右下象限以红色高亮该指标
- [ ] 健康指标在 OKR 树状视图和 KR 详情中均不出现，两者明确隔离
- [ ] 同一指标历史记录可在详情页查看
- [ ] Member 只能在被指派为负责人的健康指标下提交数值更新

---

### 6.7 四象限周报看板

#### 功能说明

完整还原《OKR工作法》中的 Four-Square Widget，是团队每周例会的核心共识页面。

#### 四象限布局

| 位置 | 内容 | 数据来源 |
|---|---|---|
| 左上 | 本周承诺，Top 3 优先级 | WeeklyCommitment |
| 右上 | 本季度 OKR 列表与每个 KR 的当前信心值 | Objective + KeyResult + ConfidenceScore |
| 右下 | 健康指标状态列表 | HealthMetric + HealthMetricRecord |
| 左下 | 当周团队心情 | WeeklyCelebration.mood |

#### 信心值颜色规范

| 颜色 | 分值范围 |
|---|---|
| 绿色 | 7-10 |
| 黄色 | 4-6 |
| 红色 | 1-3 |
| 灰色 | 本周未提交 |

#### 视图切换

| 视图 | 说明 | 可访问角色 |
|---|---|---|
| 个人看板 | 查看自己的四象限 | 全员 |
| 团队看板 | 卡片形式展示本部门所有成员的四象限 | 全员（本部门范围）|
| 全公司看板 | 各部门汇总状态 | Super Admin |

#### 验收标准（AC）

- [ ] 默认打开个人看板，展示当前用户本周的四象限数据
- [ ] 未提交周一承诺时，左上象限展示「本周承诺尚未提交」提示和快速入口
- [ ] 未提交周五庆祝时，左下象限的心情区域展示「本周心情尚未提交」提示
- [ ] 每个 KR 的信心值以对应颜色圆点标注在 KR 名称旁
- [ ] 健康指标状态为 exceeded 时，右下象限对应指标行以红色高亮
- [ ] 团队看板以成员卡片网格形式展示，每张卡片为该成员的缩略版四象限
- [ ] 切换至他人个人看板时，权限校验：Member 只能查看同部门成员，Super Admin 可查看全员

---

### 6.8 季度节奏管理

#### 阶段划分

| 阶段 | 系统行为 |
|---|---|
| OKR 设定期（前两周）| OKR 创建功能开放 |
| 执行期（季度主体）| 每周仪式正常运行，OKR 创建关闭（Super Admin 可例外开放）|
| 冲刺期（最后两周）| 系统在信心值低于 5 的 KR 旁展示视觉提示 |
| 季度 Review（最后一周）| Review 填写入口开放，季度状态切换为 reviewing |

#### 季度末 Review 模块

KR 维度字段说明见 [5.13 KRReview](#513-krreview-kr-最终复盘)；整体 Review 字段说明见 [5.12 QuarterReview](#512-quarterreview季度复盘)。

#### 验收标准（AC）

- [ ] 季度状态为 planning 时，OKR 创建功能对所有角色开放
- [ ] 季度状态切换为 active 后，执行期 OKR 创建入口对普通 Member 隐藏
- [ ] 冲刺期内，信心值低于 5 的 KR 在看板和 OKR 树状视图中展示黄色或红色警示标签
- [ ] 季度 Review 阶段，每个 KR 下出现「填写最终复盘」入口
- [ ] KRReview 提交时，completion_rate 由系统自动计算（final_value / target_value），不允许手动输入
- [ ] 整体 Review 的 what_worked 和 what_didnt 字段为必填项
- [ ] 季度归档后，该季度所有数据变为只读，不可修改

---

## 7. API 接口概览

> 所有接口均需携带 `Authorization: Bearer <jwt>` Header。接口路径前缀为 `/api/v1`。请求体和响应体均为 JSON 格式。

### 7.1 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/auth/feishu` | 跳转飞书 OAuth 授权页 |
| GET | `/auth/feishu/callback` | 飞书 OAuth 回调，换取系统 JWT |
| POST | `/auth/logout` | 登出，清除 Token |
| GET | `/auth/me` | 获取当前登录用户信息 |

**GET /auth/feishu/callback**

Query 参数：`code`（飞书授权码）, `state`（防 CSRF 随机串）

Response：`{ token: string, user: User }`

---

### 7.2 用户与部门

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/users` | 获取用户列表 | Super Admin |
| GET | `/users/:id` | 获取单个用户信息 | Super Admin / 本人 |
| PATCH | `/users/:id` | 更新用户角色 | Super Admin |
| GET | `/departments` | 获取部门列表（含层级）| 全员 |
| POST | `/departments/sync` | 从飞书重新同步组织架构 | Super Admin |

---

### 7.3 季度

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/quarters` | 获取季度列表 | 全员 |
| POST | `/quarters` | 创建季度 | Super Admin |
| GET | `/quarters/:id` | 获取季度详情 | 全员 |
| PATCH | `/quarters/:id` | 更新季度状态或信息 | Super Admin |

**PATCH /quarters/:id**

Body 示例：`{ "status": "active" }`

---

### 7.4 OKR

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/quarters/:quarterId/objectives` | 获取指定季度的 OKR 树 | 按角色过滤 |
| POST | `/quarters/:quarterId/objectives` | 创建 Objective | 按层级角色限制 |
| GET | `/objectives/:id` | 获取 Objective 详情（含 KR 列表）| 按角色校验 |
| PATCH | `/objectives/:id` | 更新 Objective 文本 | 所有者 |
| DELETE | `/objectives/:id` | 删除 Objective（仅设定期可用）| 所有者 |
| POST | `/objectives/:id/key-results` | 新增 KR | 所有者 |
| GET | `/key-results/:id` | 获取 KR 详情 | 按角色校验 |
| PATCH | `/key-results/:id` | 更新 KR 信息或当前值 | 所有者 / KR 负责人 |
| DELETE | `/key-results/:id` | 删除 KR（仅设定期可用）| 所有者 |

---

### 7.5 OKR 对齐

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/objectives/:id/alignments` | 建立对齐关系 | Dept Manager / Member |
| GET | `/key-results/:id/aligned-objectives` | 查看支撑该 KR 的所有下级 OKR | 按角色校验 |

**POST /objectives/:id/alignments**

Body：`{ "parent_key_result_ids": ["uuid1", "uuid2"] }`（最多 3 个）

---

### 7.6 信心值

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/key-results/:id/confidence` | 提交或更新本周信心值 | KR 所有者 |
| GET | `/key-results/:id/confidence/history` | 获取信心值历史（按周）| 按角色校验 |
| GET | `/users/:id/confidence/summary` | 获取某用户本季度所有 KR 信心值概览 | Super Admin / Dept Manager / 本人 |

**POST /key-results/:id/confidence**

Body：`{ "score": 7, "note": "进展顺利", "quarter_id": "uuid", "week_number": 3 }`

服务端校验：当前日期是否在窗口期内（周一至周三）。

---

### 7.7 周一承诺

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/weekly-commitments` | 提交或更新本周承诺 | 全员 |
| GET | `/weekly-commitments` | 获取承诺列表 | 按角色过滤 |
| GET | `/weekly-commitments/current` | 获取当前用户本周承诺 | 本人 |

**POST /weekly-commitments**

Body：`{ "quarter_id": "uuid", "week_number": 3, "priority_1": "...", "priority_2": "...", "priority_3": "...", "prior_self_review": {...} }`

---

### 7.8 周五庆祝

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/weekly-celebrations` | 提交本周庆祝 | 全员 |
| GET | `/weekly-celebrations` | 获取庆祝列表 | 按角色过滤 |
| GET | `/weekly-celebrations/obstacles` | 获取本部门本周障碍汇总 | Dept Manager |

---

### 7.9 健康指标

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/health-metrics` | 获取健康指标列表 | 全员 |
| POST | `/health-metrics` | 创建健康指标 | Super Admin / Dept Manager |
| GET | `/health-metrics/:id` | 获取健康指标详情（含历史记录）| 全员 |
| PATCH | `/health-metrics/:id` | 更新健康指标配置 | 创建者 |
| DELETE | `/health-metrics/:id` | 归档健康指标 | 创建者 |
| POST | `/health-metrics/:id/records` | 提交新数值 | 负责人 / Super Admin |

**POST /health-metrics/:id/records**

Body：`{ "current_value": 42.5, "note": "本月实测数据" }`

Response 包含系统自动计算的 `status` 字段。

---

### 7.10 季度 Review

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/quarters/:id/reviews` | 提交季度 Review | 全员 |
| GET | `/quarters/:id/reviews` | 获取季度 Review 列表 | 按角色过滤 |
| POST | `/key-results/:id/review` | 提交 KR 最终复盘 | KR 所有者 |

---

### 7.11 飞书集成

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/integrations/feishu/calendar/create-events` | 为当前季度创建重复日历事件 | Super Admin |
| DELETE | `/integrations/feishu/calendar/events/:quarterId` | 终止指定季度的日历事件 | Super Admin |
| POST | `/integrations/feishu/bitable/sync` | 触发多维表格同步 | Super Admin |
| POST | `/integrations/feishu/doc/export` | 导出季度报告为飞书文档 | Super Admin / Dept Manager |
| GET | `/integrations/feishu/config` | 获取飞书集成配置信息 | Super Admin |
| PATCH | `/integrations/feishu/config` | 更新飞书集成配置 | Super Admin |

---

## 8. 飞书集成规格

### 8.1 飞书 SSO 登录

#### OAuth 授权流程（技术细节）

```
1. 前端访问 GET /api/v1/auth/feishu
   └── 后端生成随机 state 字符串（存入 Redis，TTL 5 分钟）
   └── 302 重定向至：
       https://passport.feishu.cn/suite/passport/oauth/authorize
         ?app_id={FEISHU_APP_ID}
         &redirect_uri={CALLBACK_URL}
         &response_type=code
         &state={state}

2. 用户在飞书完成授权后，飞书回调：
   GET /api/v1/auth/feishu/callback?code={code}&state={state}

3. 后端处理（回调接口内顺序执行）：
   a. 校验 state 是否与 Redis 中记录匹配，防止 CSRF 攻击
   b. 用 code 换取 user_access_token：
      POST https://open.feishu.cn/open-apis/authen/v1/oidc/access_token
      Body: { grant_type: "authorization_code", code: code }
      Header: Authorization: Basic base64(app_id:app_secret)
   c. 用 user_access_token 获取飞书用户信息：
      GET https://open.feishu.cn/open-apis/authen/v1/user_info
      Header: Authorization: Bearer {user_access_token}
   d. 根据返回的 open_id 在本地 DB 查找 User 记录：
      - 存在：更新 name、avatar_url
      - 不存在：创建新 User，role 默认为 member
   e. 丢弃飞书 user_access_token，不持久化存储
   f. 签发本系统 JWT（payload: { user_id, role, exp }）
   g. 返回 JWT 给前端，前端存入内存或 httpOnly Cookie

4. 后续请求：前端携带 JWT，后端 middleware 验证并注入 user 上下文
```

#### 飞书组织架构同步

触发时机：首次登录 / 管理员手动触发 `POST /departments/sync`

调用的飞书 API：
- 获取部门列表：`GET https://open.feishu.cn/open-apis/contact/v3/departments`
- 获取成员列表：`GET https://open.feishu.cn/open-apis/contact/v3/users`

同步逻辑：以飞书 open_department_id 和 open_id 为唯一键，进行 upsert 操作；系统中已存在但飞书已删除的记录，将 is_active 设为 false，不物理删除。

需要的飞书应用权限范围（Scope）：
- `contact:contact:readonly`（读取组织架构）
- `calendar:calendar`（日历读写）
- `bitable:app`（多维表格读写）
- `drive:drive`（云空间写入，用于导出文档）

---

### 8.2 飞书日历集成

#### 功能说明

由 Super Admin 在设置页面配置，一键为全员或指定部门在飞书日历中创建周一承诺和周五庆祝的重复事件。

#### 创建事件接口调用

调用飞书 API：`POST https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events`

**周一承诺事件参数**

| 属性 | 默认值 | 可配置 |
|---|---|---|
| 事件名称 | OKR 周一承诺 | 是 |
| 重复规则 | RRULE:FREQ=WEEKLY;BYDAY=MO | 否 |
| 时间 | 10:00-10:30 | 是 |
| 描述 | 系统链接 + 说明文字 | 是 |
| 受邀人 | 全公司或指定部门 | 是 |
| 重复结束日期 | 季度 end_date | 跟随季度 |

**周五庆祝事件参数**

| 属性 | 默认值 | 可配置 |
|---|---|---|
| 事件名称 | OKR 周五庆祝 | 是 |
| 重复规则 | RRULE:FREQ=WEEKLY;BYDAY=FR | 否 |
| 时间 | 16:00-16:30 | 是 |
| 描述 | 系统链接 + 说明文字 | 是 |
| 受邀人 | 全公司或指定部门 | 是 |
| 重复结束日期 | 季度 end_date | 跟随季度 |

#### 规则

- 创建事件前须先获取用户飞书日历的 calendar_id
- 季度归档时，调用飞书 API 更新事件 RRULE 中的 UNTIL 参数，使重复停止
- 系统在本地记录每个季度对应的飞书事件 ID，用于后续管理和终止

#### 验收标准（AC）

- [ ] Super Admin 点击「创建季度日历事件」，系统在受邀成员的飞书日历中生成对应重复事件
- [ ] 季度归档后，重复事件自动终止，不再产生新的事件实例
- [ ] 管理员可修改事件时间、受邀成员范围，修改后更新飞书侧对应事件
- [ ] 飞书 API 调用失败时，系统记录错误日志，前端提示「日历创建失败，请稍后重试」，不影响季度其他功能

---

### 8.3 飞书多维表格同步

#### 功能说明

将系统数据同步至管理员指定的飞书多维表格，包含 4 个工作表。

#### 目标多维表格结构

**Sheet 1：OKR 总览**

| 字段 | 数据来源 |
|---|---|
| 层级 | Objective.level |
| 归属人或部门 | User.name / Department.name |
| Objective | Objective.title |
| KR 描述 | KeyResult.description |
| 目标值 | KeyResult.target_value |
| 当前值 | KeyResult.current_value |
| 完成度 | current_value / target_value，百分比格式 |
| 当前信心值 | 最新一周 ConfidenceScore.score |
| 对齐上级 KR | 父级 KeyResult.description |

**Sheet 2：信心值历史**

| 字段 | 数据来源 |
|---|---|
| KR 描述 | KeyResult.description |
| 归属人 | User.name |
| 第 N 周信心值 | ConfidenceScore.score，按 week_number 展开为列 |
| 趋势 | 系统计算：最近 3 周均值变化，上升 / 下降 / 稳定 |

**Sheet 3：健康指标**

| 字段 | 数据来源 |
|---|---|
| 指标名称 | HealthMetric.name |
| 层级 | HealthMetric.level |
| 阈值类型 | HealthMetric.threshold_type |
| 阈值 | threshold_value 或 threshold_min～threshold_max |
| 当前值 | 最新 HealthMetricRecord.current_value |
| 状态 | 最新 HealthMetricRecord.status |
| 最近更新时间 | HealthMetricRecord.recorded_at |

**Sheet 4：周仪式记录**

| 字段 | 数据来源 |
|---|---|
| 成员 | User.name |
| 周次 | week_number |
| 周一 Top 1-3 | WeeklyCommitment.priority_1/2/3 |
| 周五完成事项 | WeeklyCelebration.achievements（合并为文本）|
| 障碍 | WeeklyCelebration.obstacles |
| 当周心情 | WeeklyCelebration.mood |

#### 同步规则

| 触发方式 | 说明 |
|---|---|
| 手动触发 | Super Admin 点击「同步到多维表格」|
| 自动触发 | 每周日 23:59 自动执行（Cron Job）|

- 每次同步覆盖对应 Sheet 的全部数据（先清空再写入）
- 同步前校验目标表格的写入权限，无权限时返回错误提示，不执行同步
- 同步过程异步执行，前端通过轮询或 WebSocket 获取进度和结果
- 调用飞书 API：`POST https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_create`

#### 验收标准（AC）

- [ ] 管理员首次配置时，输入飞书多维表格链接，系统解析出 app_token，校验写入权限后完成绑定
- [ ] 手动触发同步后，前端展示进度状态：同步中 / 同步成功 / 同步失败
- [ ] 自动同步完成后，在 ExportLog 表写入记录，包含状态和时间
- [ ] 同步失败时，系统不清空原有数据，保持原表格内容不变
- [ ] 飞书多维表格权限不足时，系统在设置页面展示明确的错误提示，并提供飞书授权引导链接

---

### 8.4 飞书文档导出

#### 功能说明

将指定季度的 OKR 数据导出为飞书文档，生成后自动分享给操作人，存入管理员指定的飞书云空间目录。

#### 文档内容结构

1. 封面：公司名称、季度名称、导出日期
2. 季度 OKR 全貌：OKR 树状结构（公司 → 部门 → 个人）
3. KR 完成度汇总：每个 KR 的目标值、最终值、completion_rate
4. 信心值变化趋势：按周次展示的信心值表格
5. 健康指标季度汇总：各指标的阈值与季度内最高、最低、最新值
6. 季度 Review 内容（如已填写）
7. 附录：所有周仪式记录（周一承诺 + 周五庆祝）

#### 导出范围选项

| 选项 | 权限 |
|---|---|
| 全公司季度报告 | Super Admin |
| 指定部门季度报告 | Super Admin / 对应 Dept Manager |
| 个人 OKR 报告 | Super Admin / 本人 |

#### 规则

- 调用飞书 API：`POST https://open.feishu.cn/open-apis/docx/v1/documents` 创建文档
- 文档内容通过 `POST /open-apis/docx/v1/documents/{document_id}/blocks/children` 写入
- 文档创建完成后，自动调用分享接口授权给操作人
- 系统在 ExportLog 表记录每次导出，含操作人、时间、范围、生成的文档链接

#### 验收标准（AC）

- [ ] 导出触发后，系统异步执行，前端展示「导出中」状态
- [ ] 导出完成后，前端展示飞书文档链接，点击可直接打开
- [ ] 导出失败时，前端提示具体错误原因，并在 ExportLog 记录 failed 状态
- [ ] 导出日志可在设置页面查看，字段包含导出人、时间、范围、状态、文档链接

---

## 9. 非功能性需求

### 9.1 性能

| 指标 | 目标值 |
|---|---|
| 页面首次加载时间（正常数据量）| 不超过 2 秒 |
| API 响应时间（P95）| 不超过 500ms |
| 飞书多维表格同步完成时间 | 不超过 30 秒 |
| 支持最大同时在线用户数 | 20 人 |

### 9.2 兼容性

- PC 端：支持 Chrome 和 Edge 最新两个主版本
- 移动端：飞书内嵌 H5，页面自适应布局
- 最小屏幕分辨率：1280×720

### 9.3 数据安全

- 所有接口通过 HTTPS 加密传输
- 飞书 OAuth Token 不持久化存储，会话结束后清除
- JWT 使用 RS256 或 HS256 签名，有效期建议 7 天，支持刷新
- 所有接口在服务端做权限二次校验，不依赖前端路由拦截
- 用户只能访问权限矩阵定义范围内的数据

### 9.4 可用性与备份

- 系统可用性目标：99%（计划内维护除外）
- 数据每日自动备份，保留最近 30 个快照
- 季度归档后，历史数据只读，不可修改，不可删除

### 9.5 飞书 API 限流处理

- 飞书 Open API 存在调用频率限制，所有飞书 API 调用须加入请求队列，避免并发超限
- 批量写入多维表格时，每批次不超过 500 条记录，分批执行
- 遇到飞书侧 429 错误时，系统自动重试，退避策略为指数退避，最多重试 3 次

---

## 10. 核心用户旅程

### 旅程一：季度启动（Super Admin）

1. 创建季度，设置起止日期，状态设为 planning
2. 创建公司级 Objective 和 KR
3. 设定公司级健康指标
4. 通知各部门管理者完成部门 OKR
5. 配置飞书集成：绑定多维表格、指定云空间文件夹
6. 触发飞书日历事件创建，为本季度生成重复的周一承诺和周五庆祝事件
7. 将季度状态切换为 active，执行期正式开始

### 旅程二：部门 OKR 设定（Dept Manager）

1. 查看公司级 OKR 树状视图
2. 创建部门 Objective，选择对齐的公司级 KR
3. 创建部门 KR
4. 设定部门级健康指标，指定负责人
5. 通知成员完成个人 OKR 对齐

### 旅程三：成员每周执行循环

**每周一（周一承诺）**
1. 进入四象限看板查看当前 OKR 和上周信心值
2. 回顾上周三条承诺，选填自评结果
3. 填写本周 Top 3 优先级
4. 对每个 KR 更新信心值（1-10 分）并可填写备注
5. 提交，同部门成员可见

**每周五（周五庆祝）**
1. 回顾本周推进情况
2. 添加本周完成事项（可多条）
3. 填写遇到的障碍（可选）
4. 选择本周心情
5. 提交，同部门成员可见

### 旅程四：季度末收尾（Super Admin）

1. 将季度状态切换为 reviewing，Review 填写入口开放
2. 所有成员填写各 KR 的最终值和完成说明
3. 各管理者填写部门 Review 内容
4. Super Admin 导出全公司季度报告至飞书文档
5. 触发最后一次多维表格同步
6. 将季度状态切换为 archived，历史数据只读，重复日历事件终止

---

## 11. 里程碑

| 阶段 | 交付内容 |
|---|---|
| MVP | OKR 三层级设定与对齐、信心值追踪、周一承诺、周五庆祝、飞书 SSO 登录 |
| V1.0 | 四象限周报看板、健康指标模块、飞书多维表格同步 |
| V1.1 | 季度 Review、飞书文档导出、飞书日历集成 |
| V2.0 | 跨季度数据对比、信心值趋势预警、数据统计报表 |

---

*文档结束*
