# Plan: 线上化与真实回归验收

## Problem

当前系统已经完成本地核心功能与真实飞书 API 直连验证，但仍停留在“开发环境可用”的状态。下一阶段需要把能力推进到可部署、可回归、可在真实页面路径中稳定验收的状态，而不是继续扩展功能面。

## Solution

本阶段分成两条主线并行推进。第一条是线上化准备，重点收口 PostgreSQL、环境变量、启动检查、备份恢复和部署说明，让系统具备真实运行基础。第二条是真实页面回归与多端验收，重点把已经通过命令行验证的飞书能力，收敛成 UI 可执行、可复测、可观察的验收路径。

计划不再更新 `PRD进度与后续计划.md`，后续阶段进展改由 `PLAN.md` 与 `tasks/` 维护。

## Tasks

<!-- Tasks are numbered in execution order. Each task depends on all previous tasks being complete. -->

- [x] [01-production-runtime-baseline](tasks/01-production-runtime-baseline.md) - 收口生产运行基线、环境变量与健康检查入口
- [x] [02-postgres-ops-hardening](tasks/02-postgres-ops-hardening.md) - 补齐 PostgreSQL 迁移、备份、恢复与运行自检能力
- [x] [03-real-ui-regression-flow](tasks/03-real-ui-regression-flow.md) - 把真实飞书联调结果落到页面级回归路径与验收脚本
- [x] [04-deployment-package-and-runbook](tasks/04-deployment-package-and-runbook.md) - 整理部署包、启动方式、域名与 HTTPS 落地说明
- [x] [05-mobile-feishu-embedded-acceptance](tasks/05-mobile-feishu-embedded-acceptance.md) - 完成移动端与飞书内嵌场景的兼容和专项验收

## Dependencies

- 可访问的 PostgreSQL 环境
- 已发布并可继续使用的真实飞书应用配置
- 本地与线上可用的域名 / HTTPS 方案
- 可用于页面回归的管理员与普通成员账号

## Notes

- 后续阶段一律不再修改 `PRD进度与后续计划.md`
- `PLAN.md` 负责总体顺序，`tasks/` 负责执行细节
- 当前真实飞书 API 直连已通过，后续重点是 UI 路径、部署与多端稳定性
