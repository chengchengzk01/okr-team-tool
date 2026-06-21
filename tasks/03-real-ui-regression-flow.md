# Task: Real UI Regression Flow

## Status

DONE

## Requires

- Task 02 must be complete

## Description

这一任务把已经通过命令行直连验证的真实飞书能力，转换成页面级可重复执行的回归路径。目标是让管理员从真实 UI 页面出发，也能稳定完成组织同步、日历创建、文档导出与报表导出。

## Proposed Solution

审视当前登录、设置页、Review 页、任务流和错误反馈，补齐真实页面回归所缺的登录前提、状态可见性、脚本化 smoke 流程与失败定位信息。必要时新增页面级验收脚本或回归测试用例。

## Subtasks

- [x] 盘点 `/login`、`/settings`、`/review` 的真实飞书回归路径
- [x] 确认管理员身份下的页面回归前提和本地启动方式
- [x] 增强任务状态、导出日志、错误提示的可观察性
- [x] 新增或调整页面级 smoke / contract / regression 脚本

## Files to Modify

- `app/(app)/settings/page.tsx` - 视需要优化真实任务状态和错误反馈
- `app/(app)/review/*` - 视需要优化真实导出路径
- `app/api/v1/integrations/feishu/*` - 视需要补齐页面调用所需返回结构
- `scripts/smoke-local.mjs` - 扩展真实页面回归脚本
- `tests/*` - 补齐 UI 回归或接口契约测试
- `真实飞书验收清单.md` - 迁移为页面回归执行参考，不再依赖 PRD 进度文件

## Verification

- [x] Tests pass: `npm test` (timeout: 5min)
- [x] Builds without errors: `npm run build` (timeout: 5min)
- [x] Works as expected: 管理员可从页面完成真实组织同步、日历创建、季度报告导出、V2 报表导出

## Notes

- 这里的重点是页面真实路径，不是重复修 API
- 允许保留少量需要人工点击的回归步骤，但要保证步骤清晰、失败可定位
- 已修复 mock 登录会话在 PostgreSQL 场景下被停用用户覆盖的问题
- `node scripts/smoke-local.mjs` 已覆盖 `/login`、`/dashboard`、`/reports`、`/settings`、`/review`
- 已在页面完成：`验证已保存配置` 通过、`同步组织架构` 成功、`创建日历事件` 成功
- 2026-06-20 已补齐真实页面闭环：`/review` 全公司季度报告导出成功、`/reports` V2.0 报表导出成功，均返回真实飞书文档链接
- 根因确认：飞书文档已创建成功，但后续自动添加查看权限的分享接口对当前文档类型返回 `Invalid parameter`
- 当前处理方式：保留导出成功结果，并在页面消息、最近集成任务和导出日志中明确提示“已生成文档，但未自动添加查看权限”
- 真实页面验证证据：`/settings -> 最近集成任务` 已显示 `季度文档 / 成功 / 飞书文档导出完成（已生成文档，但未自动添加查看权限：Invalid parameter）（全公司）`
