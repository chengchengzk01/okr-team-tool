# Task: Production Runtime Baseline

## Status

DONE

## Requires

- None

## Description

这一任务把当前“本地开发可运行”的状态整理成明确的生产运行基线。目标是让环境变量、启动方式、运行前检查、健康检查与最小运维入口形成统一规范。

## Proposed Solution

梳理当前 `.env`、`.env.example`、`package.json`、健康页和脚本之间的关系，收口出生产所需最小变量集合与启动前检查。必要时补充环境校验脚本、运行模式说明和健康检查约定，避免部署阶段靠人工猜测。

## Subtasks

- [x] 盘点当前运行所需环境变量，区分本地开发与生产必填项
- [x] 收口启动、构建、健康检查、数据库可达性检查的统一命令
- [x] 评估是否需要新增环境变量校验或启动前预检脚本
- [x] 明确健康检查页与 API 的线上使用方式

## Files to Modify

- `package.json` - 补齐或调整启动、自检、回归相关脚本
- `.env.example` - 明确生产所需环境变量模板
- `scripts/check-db.mjs` - 视需要增强数据库连通性检查
- `app/health/*` - 视需要补齐健康检查输出
- `README.md` 或新增运行说明文档 - 记录运行基线

## Verification

- [x] Tests pass: `npm test` (timeout: 5min)
- [x] Builds without errors: `npm run build` (timeout: 5min)
- [x] Works as expected: 使用 `README.md`、`npm run runtime:check`、`/api/health` 可完成运行前检查与健康检查

## Notes

- 不新增业务功能，只收口运行基线
- 与后续 PostgreSQL 与部署任务保持衔接
- 已新增 `README.md`、`scripts/validate-runtime-env.ts`、`app/api/health/route.ts`
