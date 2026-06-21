# Task: Deployment Package And Runbook

## Status

DONE

## Requires

- Task 03 must be complete

## Description

这一任务把系统整理成可交付部署的状态。目标是明确从代码仓库到线上运行所需的构建、启动、域名、HTTPS、环境变量、数据库连接与日常运维操作。

## Proposed Solution

补齐部署文档和运行手册，明确单机或目标部署形态下的启动流程、环境变量、数据库接入、HTTPS 与域名要求。必要时新增部署相关脚本、检查项或最小 runbook。

## Subtasks

- [x] 选择并固定首个部署形态
- [x] 整理构建产物、启动命令与运行顺序
- [x] 编写域名、HTTPS、环境变量和数据库接入说明
- [x] 明确故障排查与回滚步骤

## Files to Modify

- `package.json` - 补齐部署与启动命令
- `next.config.ts` - 如需适配部署环境配置
- 新增部署说明文档 - 记录上线步骤与回滚步骤
- 新增运维 runbook - 记录日常检查与故障处理

## Verification

- [x] Tests pass: `npm test` (timeout: 5min)
- [x] Builds without errors: `npm run build` (timeout: 5min)
- [x] Works as expected: 按 runbook 可在新环境完成部署并启动服务

## Notes

- 该任务以“可交付部署”为目标，不要求在本任务内完成正式上线
- 需要与 PostgreSQL 运维流程保持一致
- 首个部署形态固定为“单机 Linux + systemd + Nginx/HTTPS + PostgreSQL”
- 已新增 `npm run deploy:check` 作为部署前统一检查入口
- 已新增 `npm run start:prod`，默认按 `HOSTNAME` / `PORT` 启动生产进程
- 已补齐交付文档：
  - `docs/deployment-single-node.md`
  - `docs/operations-runbook.md`
- 本地验证证据：
  - `env NODE_ENV=production ... npm run deploy:check` 通过
  - `env NODE_ENV=production ... PORT=3116 HOSTNAME=127.0.0.1 npm run start:prod` 可启动
  - `http://127.0.0.1:3116/api/health` 返回 `ok=true`
