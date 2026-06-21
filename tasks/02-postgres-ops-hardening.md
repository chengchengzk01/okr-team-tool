# Task: PostgreSQL Ops Hardening

## Status

DONE

## Requires

- Task 01 must be complete

## Description

这一任务把数据库相关能力从“当前能连”推进到“可迁移、可备份、可恢复、可核验”。目标是让 PostgreSQL 成为下一阶段部署的稳定基础，而不是一个隐含前提。

## Proposed Solution

围绕 Prisma schema、现有脚本和数据库操作命令，补齐迁移流程、备份恢复流程和最小故障检查路径。必要时新增恢复脚本或恢复说明，并明确线上切换前后的检查标准。

## Subtasks

- [x] 审视当前 Prisma 与 PostgreSQL 的落地流程，确认缺少的迁移步骤
- [x] 补齐备份命令、恢复命令或恢复文档
- [x] 增强数据库持久化与基础 API 可用性检查
- [x] 明确数据库切换后的回滚与验收步骤

## Files to Modify

- `prisma/schema.prisma` - 如需调整生产数据库约束或注释
- `scripts/backup-database.mjs` - 补齐备份能力
- `scripts/backup-utils.mjs` - 视需要增强通用逻辑
- `scripts/check-db.mjs` - 增强数据库状态检查
- `scripts/check-persistence.ts` - 视需要调整持久化验证
- `package.json` - 补充数据库运维脚本
- 新增数据库运维说明文档 - 记录迁移、备份、恢复步骤

## Verification

- [x] Tests pass: `npm test` (timeout: 5min)
- [x] Builds without errors: `npm run build` (timeout: 5min)
- [x] Works as expected: 已完成 `npm run db:verify`、`npm run db:backup`、`npm run db:restore -- --file <snapshot> --dry-run`

## Notes

- 这一任务优先保障运维闭环，不处理页面功能
- 如果恢复演练依赖真实外部数据库，执行期再安排实际环境验证
- 已新增 `scripts/restore-database.mjs`、`docs/postgres-ops.md`、`db:migrate:*`、`db:verify`
