# Task: Mobile Feishu Embedded Acceptance

## Status

DONE

## Requires

- Task 04 must be complete

## Description

这一任务处理当前仍未专项验收的移动端和飞书内嵌 H5 场景。目标是确保关键页面在小屏与飞书容器下可用、可操作、关键流程不被布局和交互问题阻断。

## Proposed Solution

基于当前页面结构，对 `/dashboard`、`/okr`、`/weekly`、`/review`、`/settings` 做移动端与飞书内嵌场景检查。必要时修复响应式布局、滚动区域、按钮可达性、表单行为和登录跳转问题，并补上专项验收记录。

## Subtasks

- [x] 列出需要覆盖的移动端与飞书内嵌关键路径
- [x] 检查关键页面的布局、滚动、操作入口与反馈
- [x] 修复影响关键流程的响应式或容器兼容问题
- [x] 输出多端专项验收结果与遗留问题清单

## Files to Modify

- `app/(app)/*` - 视需要修复关键页面布局与交互
- `components/*` - 视需要调整响应式组件
- `tailwind.config.ts` - 如需补齐响应式样式基线
- `tests/*` - 补充移动端或容器兼容测试
- 新增多端验收文档 - 记录通过项与遗留项

## Verification

- [x] Tests pass: `npm test` (timeout: 5min)
- [x] Builds without errors: `npm run build` (timeout: 5min)
- [x] Works as expected: 关键流程可在移动端与飞书内嵌场景完成

## Notes

- 只修会阻断流程的问题，避免在这一阶段做无关的视觉重构
- 如需真机或飞书客户端实测，执行期再安排人工配合
- 本地已完成的修复：
  - `AppShell` 增加移动底部导航与安全区留白
  - `app/layout.tsx` 增加 `viewportFit=cover`
  - `AppNav` 增加移动端 compact 布局
  - `/settings` 的“最近集成任务”“导出日志”改为窄屏横向滚动
  - 新增 `tests/mobile-feishu-ui-contract.test.ts`
- 本地验证证据：
  - `npm test` 已通过（150/150）
  - `npm run build` 已通过
  - `node scripts/smoke-local.mjs` 已通过
- 当前验收文档：`docs/mobile-feishu-embedded-acceptance.md`
- 外部验收结果已回收：真机与飞书客户端关键路径均已完成，可正式收口
