# Render + Supabase 上线方案

更新时间：2026-06-21

## 1. 适用结论

当前项目已经确定采用 `Render + Supabase` 作为正式上线方案。

原因很直接：

- 不依赖本机持续在线
- 不需要 Linux 主机
- 改造量小，兼容当前 `Next.js + Prisma + PostgreSQL + 飞书 OAuth`
- 可以先用免费层完成上线，再按使用量决定是否升级

## 2. 架构与职责

- `Render`: 托管 Next.js 应用，对外提供固定 HTTPS 域名
- `Supabase`: 托管 PostgreSQL 数据库
- `GitHub Actions`: 补齐免费层短板，负责预热和备份
- `GitHub`: 托管代码与部署触发源，也是 Render 的发布入口

## 3. 上线前必须满足的前置条件

这部分不是建议，是上线阻断项。缺任何一项，Render 都无法形成可持续发布闭环。

1. 当前代码必须进入 Git 仓库并推送到 GitHub。
2. Render、Supabase、GitHub 三个账号均可正常登录。
3. 飞书应用必须已发布，且具备正式环境权限。
4. 需要提前拿到以下飞书参数：
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`
   - `FEISHU_ROOT_DEPARTMENT_ID`
   - `FEISHU_CALENDAR_ID`
   - `FEISHU_DRIVE_FOLDER_TOKEN`
   - `FEISHU_BITABLE_APP_TOKEN`
   - `FEISHU_BITABLE_TABLE_IDS_JSON`

## 4. 已提前处理的免费层短板

### 4.1 Render 冷启动

问题：

- 免费 Web Service 闲置后会休眠
- 首次访问可能需要几十秒恢复

已植入的解决方案：

- 新增 `/.github/workflows/render-health-prewarm.yml`
- 在工作日关键时段前主动访问 `/api/health`
- 支持手动触发，长假或演示前可以补一次预热

仍然保留的现实限制：

- 这只能降低冷启动体感，不能把免费层变成常驻在线
- 如果团队日常频繁使用，最终仍建议升级 `Render Starter`

### 4.2 Supabase 闲置暂停

问题：

- 免费数据库长时间无访问会暂停

已植入的解决方案：

- 预热任务会同时触达应用和数据库
- 周期性访问可以避免数据库长时间无活动

仍然保留的现实限制：

- 免费层仍没有正式 SLA
- 如果团队不能接受偶发恢复等待，需要升级付费层

### 4.3 免费层没有自动备份

问题：

- 平台自身不能替你做可控备份闭环

已植入的解决方案：

- 新增 `/.github/workflows/database-backup.yml`
- 每周自动执行 `npm run db:backup`
- 备份文件作为 GitHub Actions artifact 保留

建议补充：

- 重大发布前手动再做一次备份
- 每月至少做一次恢复演练，避免“备份存在但不可恢复”
- 后续若要更稳，增加云盘或对象存储二次归档

### 4.4 Prisma 连接管理

问题：

- 多处运行时代码各自初始化客户端，线上更容易放大连接占用

已植入的解决方案：

- 新增统一的 `lib/prisma.ts`
- 运行时代码统一复用单例客户端
- Prisma `schema.prisma` 已补 `directUrl = env("DIRECT_URL")`

### 4.5 容量上限与付费触发信号

问题：

- Supabase 免费层容量上限是 `500MB`
- 如果团队持续沉淀周报、复盘、导出记录，空间会逐步逼近上限

已植入的解决方案：

- 备份工作流已经把“可导出、可迁移”闭环补上
- 文档中已明确把容量接近上限定义为升级触发信号，而不是等写满后被动处理

建议补充：

- 每月固定检查一次 Supabase 项目容量
- 一旦逼近上限，优先升级数据库层，不建议临时删生产数据硬扛

## 5. 环境变量策略

Render 上至少配置以下变量：

| 变量 | 用途 |
|---|---|
| `DATABASE_URL` | Supabase pooler 地址，给应用运行时使用 |
| `DIRECT_URL` | Supabase 直连地址，给 Prisma migration 使用 |
| `JWT_SECRET` | 登录态签名密钥 |
| `NEXT_PUBLIC_APP_URL` | Render 正式访问域名 |
| `APP_BASE_URL` | 服务端绝对地址，建议与上面一致 |
| `ENABLE_MOCK_LOGIN` | 固定为 `false` |
| `FEISHU_PROVIDER` | 固定为 `real` |
| `FEISHU_APP_ID` | 飞书应用配置 |
| `FEISHU_APP_SECRET` | 飞书应用配置 |
| `FEISHU_REDIRECT_URI` | 飞书回调地址 |
| `FEISHU_ROOT_DEPARTMENT_ID` | 飞书组织同步根部门 |
| `FEISHU_CALENDAR_ID` | 飞书日历 ID |
| `FEISHU_DRIVE_FOLDER_TOKEN` | 飞书文档导出目录 |
| `FEISHU_BITABLE_APP_TOKEN` | 飞书多维表格 app token |
| `FEISHU_BITABLE_TABLE_IDS_JSON` | 四张业务表 ID JSON |

推荐约定：

- `DATABASE_URL` 使用 Supabase Session pooler 地址，通常以 `:5432` 结尾
- `DIRECT_URL` 使用 Supabase 直连地址，供 Prisma migration 使用
- `FEISHU_REDIRECT_URI` 必须与正式访问域名完全一致，不允许继续保留 localhost

这里的 `DIRECT_URL` 是本项目为部署稳定性额外引入的迁移通道，目的是把运行时连接和迁移连接分开，降低部署时因为连接方式不一致带来的风险。这一条是结合当前项目结构作出的工程选择。

## 6. Render 部署配置

仓库根目录新增了 [render.yaml](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/render.yaml)，可直接作为 Blueprint 起点。

关键配置：

- `buildCommand`: `npm ci && npm run build`
- `preDeployCommand`: `npm run db:migrate:deploy`
- `startCommand`: `npm run start:prod`
- `healthCheckPath`: `/api/health`

上线前再确认两点：

- Render 服务名尽量与 GitHub 仓库名保持一致，方便后续回滚和排查
- 首次部署必须等 migration 成功后再做飞书正式回调切换

## 7. GitHub Actions 补偿层

### 7.1 预热工作流

文件：

- [render-health-prewarm.yml](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/.github/workflows/render-health-prewarm.yml)

用途：

- 工作日前自动预热
- 手动点一下也能立即预热
- 兼顾 Supabase 免费层保活
- 当前定时点是北京时间工作日 `08:50` 和 `16:50`

需要的 GitHub Secret：

- `RENDER_APP_HEALTHCHECK_URL`

建议填写：

- `https://你的域名/api/health`

### 7.2 备份工作流

文件：

- [database-backup.yml](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/.github/workflows/database-backup.yml)

用途：

- 每周自动导出数据库快照
- 结果保存在 GitHub Actions artifact

需要的 GitHub Secret：

- `DATABASE_URL`

可选 Secret：

- `OKR_BACKUP_KEEP`

## 8. 上线步骤

1. 初始化 Git 仓库，并把代码推到 GitHub。
2. 在 Supabase 创建 PostgreSQL 项目。
3. 获取 `DATABASE_URL` 与 `DIRECT_URL`。
4. 在 Render 通过仓库创建 Web Service，读取 `render.yaml`。
5. 在 Render 后台补齐所有环境变量。
6. 首次部署完成后，访问 `/api/health`。
7. 将飞书 OAuth 回调地址改成：
   - `https://你的域名/api/v1/auth/feishu/callback`
8. 在 GitHub 仓库里配置两个 Actions 所需 Secret。
9. 手动运行一次：
   - `render-health-prewarm`
   - `database-backup`
10. 完成登录、设置页、飞书导出和健康检查验收。

## 9. 部署后默认运维动作

如果决定继续停留在免费层，下面这些动作不要省：

1. 周一和周五关键使用前，确认预热工作流正常。
2. 每周检查最近一次数据库备份是否成功。
3. 每月检查一次 Supabase 容量。
4. 每次结构变更前，手动额外做一次数据库备份。
5. 每月至少做一次恢复演练。

## 10. 什么时候该升级

满足以下任一条件，就不要继续停留在免费层：

- 团队抱怨登录前等待太久
- 周一周五仪式明显受冷启动影响
- 数据量接近 Supabase 免费额度
- 你需要正式备份保障和更高稳定性

升级顺序建议：

1. 先升级 Render，去掉休眠
2. 再升级 Supabase，提升数据库稳定性和备份能力

## 11. 这套方案能保证什么

可以保证：

- 你本机关机后，别人仍可访问
- 当前项目可以按现有架构快速上线
- 免费层下具备基本可用性和基础补救措施

不能保证：

- 免费层秒开体验
- 免费层级别的正式 SLA
- 不做升级就长期无限制扩容

完整的逐项执行顺序见 [docs/render-supabase-cutover-checklist.md](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/docs/render-supabase-cutover-checklist.md)。
