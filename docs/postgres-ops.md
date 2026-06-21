# PostgreSQL 运维说明

## 适用范围

这份说明用于 `02-postgres-ops-hardening` 阶段，目标是让数据库具备可迁移、可备份、可恢复、可验收的最小运维闭环。

## 日常命令

- `npm run db:migrate:dev`: 本地开发使用 Prisma migration
- `npm run db:migrate:deploy`: 线上环境执行已提交 migration
- `npm run db:backup`: 导出当前数据库快照到 `backups/`
- `npm run db:restore -- --file <path>`: 从备份快照恢复数据库
- `npm run db:restore -- --file <path> --dry-run`: 只检查备份文件，不落库
- `npm run db:verify`: 执行数据库连通性、持久化和基础 API 验证

## 切换前检查

1. 确认 `DATABASE_URL` 指向目标 PostgreSQL。
2. 执行 `npm run runtime:check`，确认环境变量和数据库可达。
3. 执行 `npm run db:backup`，为当前状态保留回滚点。
4. 如果本次包含 schema 变更，执行 `npm run db:migrate:deploy`。

## 切换后验收

1. 执行 `npm run db:verify`。
2. 访问 `/api/health`，确认 `database.ok=true`。
3. 如需进一步确认页面写路径，再执行 `npm run smoke:local` 或页面级回归。

## 回滚步骤

1. 选择最近一份可用快照，例如 `backups/okr-backup-2026-06-20T03-00-00-000Z.json`。
2. 执行 `npm run db:restore -- --file backups/<snapshot>.json`。
3. 再次执行 `npm run db:verify` 与 `/api/health` 检查。

## 重要限制

- 当前备份会对飞书 `appSecret` 做脱敏，因此恢复后该字段会被置空，需要在真实环境重新回填。
- `db push` 仅保留给本地快速同步，不应作为线上变更方式。
- 恢复脚本会清空目标库后再导入，请只在明确目标环境后执行。
