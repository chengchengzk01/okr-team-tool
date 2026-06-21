# OKR Runtime Baseline

这个项目当前已经收口出最小生产运行基线，目标是让部署前检查、启动方式、健康检查和数据库连通检查有统一入口。

## 必填环境变量

- `DATABASE_URL`: PostgreSQL 连接串
- `DIRECT_URL`: 迁移使用的数据库直连地址，Render + Supabase 方案建议单独配置
- `JWT_SECRET`: 生产环境必须替换为随机长密钥
- `NEXT_PUBLIC_APP_URL`: 对外访问地址，生产环境应使用 `https://`

`DIRECT_URL` 在开发环境会给出警告，在生产环境会被当作部署前检查项。

## 推荐环境变量

- `ENABLE_MOCK_LOGIN`: 生产环境显式设为 `false`
- `APP_BASE_URL`: 服务端回调或绝对链接需要时可补充
- `CRON_SECRET`: 启用定时同步时需要
- `FEISHU_*`: 真实飞书 OAuth、日历、多维表格、云文档集成需要

## 运行前检查

- `npm run env:check`: 检查生产运行基线环境变量
- `npm run db:check`: 检查数据库可达性，并返回核心表计数
- `npm run runtime:check`: 一次执行环境变量与数据库检查
- `npm run db:verify`: 执行数据库连通性、持久化和基础 API 验证

## 启动

- 本地开发: `npm run dev`
- 生产构建: `npm run build`
- 生产启动: `npm run start:prod`
- 部署前检查: `npm run deploy:check`

## 健康检查

- 公开接口: `/api/health`
- 返回内容包含:
  - 环境变量是否满足生产基线
  - 是否启用了 mock 登录
  - PostgreSQL 连通状态
  - 核心业务表计数

当环境变量不完整、仍在使用不安全默认值，或数据库不可达时，接口返回 `503`。

## 数据库运维

- 开发迁移: `npm run db:migrate:dev`
- 线上迁移: `npm run db:migrate:deploy`
- 数据备份: `npm run db:backup`
- 数据恢复: `npm run db:restore -- --file backups/<snapshot>.json`

更完整的切换、回滚和限制说明见 [docs/postgres-ops.md](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/docs/postgres-ops.md)。

## 部署与运行

- 单机部署说明: [docs/deployment-single-node.md](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/docs/deployment-single-node.md)
- Render + Supabase 上线说明: [docs/deployment-render-supabase.md](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/docs/deployment-render-supabase.md)
- 日常运维手册: [docs/operations-runbook.md](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/docs/operations-runbook.md)
