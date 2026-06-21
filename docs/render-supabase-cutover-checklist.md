# Render + Supabase 上线执行清单

更新时间：2026-06-21

这份清单只保留真正会阻断上线的动作，按顺序执行即可。

## 1. 上线前准备

1. 将当前项目放入 Git 仓库并推送到 GitHub。
2. 确认 Render、Supabase、GitHub 三个账号均可正常登录。
3. 确认飞书应用已经发布，并具备 OAuth、通讯录、日历、多维表格、云空间权限。
4. 准备飞书正式环境参数：
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`
   - `FEISHU_ROOT_DEPARTMENT_ID`
   - `FEISHU_CALENDAR_ID`
   - `FEISHU_DRIVE_FOLDER_TOKEN`
   - `FEISHU_BITABLE_APP_TOKEN`
   - `FEISHU_BITABLE_TABLE_IDS_JSON`

## 2. Supabase 侧

1. 创建 PostgreSQL 项目。
2. 记录数据库密码。
3. 获取两条连接串：
   - `DATABASE_URL`: Session pooler 地址，给应用运行时使用
   - `DIRECT_URL`: 直连地址，给 Prisma migration 使用
4. 在 Project URL 页记录项目域名，后续排查连接和容量时要用。

## 3. GitHub 侧

1. 创建仓库，建议仓库名与 Render 服务名一致：`okr-team-tool`。
2. 将本地代码推送到 `main` 分支。
3. 部署完成后新增两个 Secret：
   - `RENDER_APP_HEALTHCHECK_URL`
   - `DATABASE_URL`
4. 可选新增：
   - `OKR_BACKUP_KEEP`

## 4. Render 侧

1. 通过仓库创建 Web Service。
2. 读取根目录 [render.yaml](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/render.yaml)。
3. 确认以下关键项：
   - `buildCommand = npm ci && npm run build`
   - `preDeployCommand = npm run db:migrate:deploy`
   - `startCommand = npm run start:prod`
   - `healthCheckPath = /api/health`
4. 补齐环境变量：

| 变量 | 值 |
|---|---|
| `DATABASE_URL` | Supabase Session pooler 地址 |
| `DIRECT_URL` | Supabase 直连地址 |
| `JWT_SECRET` | Render 自动生成或手动填长随机串 |
| `NEXT_PUBLIC_APP_URL` | Render 正式域名 |
| `APP_BASE_URL` | 与上面一致 |
| `ENABLE_MOCK_LOGIN` | `false` |
| `FEISHU_PROVIDER` | `real` |
| `FEISHU_APP_ID` | 飞书正式值 |
| `FEISHU_APP_SECRET` | 飞书正式值 |
| `FEISHU_REDIRECT_URI` | `https://正式域名/api/v1/auth/feishu/callback` |
| `FEISHU_ROOT_DEPARTMENT_ID` | 飞书正式值 |
| `FEISHU_CALENDAR_ID` | 飞书正式值 |
| `FEISHU_DRIVE_FOLDER_TOKEN` | 飞书正式值 |
| `FEISHU_BITABLE_APP_TOKEN` | 飞书正式值 |
| `FEISHU_BITABLE_TABLE_IDS_JSON` | 飞书正式值 |

## 5. 免费层缺点的默认补偿

### 5.1 Render 冷启动

- 已用 GitHub Actions 预热工作流降低周一和周五首次打开等待。
- 会议前仍建议手动触发一次 `render-health-prewarm`。
- 如果团队开始高频日用，第一优先级升级 Render Starter。

### 5.2 Supabase 闲置暂停

- 预热工作流会顺带保持数据库有周期访问。
- 长假前手动触发一次预热，避免恢复等待。
- 如果团队不能接受偶发恢复时间，升级 Supabase。

### 5.3 免费层无自动备份

- 已默认接入 `database-backup` 工作流。
- 每周自动备份一次。
- 每次结构变更前，额外手动执行一次备份。
- 每月至少做一次恢复演练，确认备份不是“看起来存在但用不了”。

### 5.4 Prisma 连接耗尽

- 当前仓库已统一切换为 Prisma 单例客户端。
- 运行时只允许 `DATABASE_URL` 走 pooler。
- 迁移只允许 `DIRECT_URL` 走直连。
- `npm run deploy:check` 已将 `DIRECT_URL` 缺失视为生产阻断项。

### 5.5 容量逼近上限

- Supabase 免费层容量上限是 500MB。
- 上线后建议每月固定看一次项目容量。
- 一旦接近上限，不要等写满再处理，直接安排升级或清理历史数据。

## 6. 飞书侧

1. 将 OAuth 回调地址改为：
   - `https://正式域名/api/v1/auth/feishu/callback`
2. 确认权限范围覆盖：
   - 通讯录读取
   - 日历读写
   - 多维表格读写
   - 云空间写入
3. 如文档导出成功但自动分享失败，先接受“生成链接成功、权限人工补分享”的过渡方案，不阻断整体上线。

## 7. 首次上线验收

1. 打开 `/api/health`，确认不是 `503`。
2. 打开 `/login`，确认正式登录入口可用。
3. 完成一次真实飞书登录。
4. 进入设置页，确认飞书配置读取正常。
5. 执行一次多维表格同步。
6. 执行一次飞书文档导出。
7. 手动触发一次：
   - `render-health-prewarm`
   - `database-backup`

## 8. 如果线上异常，先按这个顺序排查

1. `/api/health` 是否返回 `503`
2. Render 环境变量是否缺失
3. `DATABASE_URL` 是否误填成直连地址
4. `DIRECT_URL` 是否缺失
5. 飞书回调地址是否仍指向旧域名
6. Supabase 项目是否处于暂停恢复阶段
7. 最近一次 GitHub Actions 预热和备份是否成功
