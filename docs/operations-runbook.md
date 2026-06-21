# 运行手册

## 日常检查

### 服务状态

```bash
sudo systemctl status okr-app
```

### 应用健康检查

```bash
curl -fsS https://okr.example.com/api/health
```

重点看：

- `ok`
- `env.ready`
- `database.ok`
- `mockLoginEnabled`

### 部署前自检

```bash
set -a
source /opt/okr-app/shared/.env.production
set +a
npm run deploy:check
```

## 标准发布流程

1. 拉取目标版本代码。
2. 执行 `npm ci`。
3. 载入生产环境变量。
4. 执行 `npm run db:backup`。
5. 执行 `npm run deploy:check`。
6. 执行 `npm run db:migrate:deploy`。
7. 执行 `sudo systemctl restart okr-app`。
8. 执行 `/api/health` 和登录页检查。

## 故障排查

### 1. `/api/health` 返回 503

优先顺序：

- 检查 `env.missingItems`
- 检查 `env.warnings`
- 检查 `database.error`
- 检查 `ENABLE_MOCK_LOGIN` 是否仍为 `true`
- 检查 `NEXT_PUBLIC_APP_URL` 是否仍为非 HTTPS

### 2. 应用进程启动失败

排查：

- `sudo systemctl status okr-app`
- `journalctl -u okr-app -n 200 --no-pager`
- 确认 `.next/` 已通过 `npm run build` 生成
- 确认 `PORT` 未被占用

### 3. 数据库连接失败

排查：

- `npm run db:check`
- 确认 `DATABASE_URL` 指向正确实例
- 如使用 `Render + Supabase`，确认 `DATABASE_URL` 是 Supabase pooler 地址，`DIRECT_URL` 是直连地址
- 确认目标 PostgreSQL 允许当前主机访问
- 确认 migration 已执行

### 3.1 Render 冷启动慢

当前免费层是正常现象，不是故障。

处理：

- 先访问 `/api/health` 等待服务拉起
- 检查 GitHub Actions 的 `render-health-prewarm` 是否正常执行
- 如果团队固定在周一早会、周五复盘前使用，保留预热任务即可
- 如果已经明显影响日常使用，直接升级 Render Starter，去掉休眠

### 3.2 Supabase 闲置暂停

当前免费层超过一段时间无访问会暂停，但数据不会自动丢失。

处理：

- 保留 GitHub Actions 的定时健康检查，至少保证每周有访问
- 长假前手动触发一次 `render-health-prewarm`
- 如果团队使用频率不稳定且不能接受恢复等待，升级 Supabase 付费层

### 3.3 自动备份缺失

处理：

- 保留 GitHub Actions 的 `database-backup` 工作流
- 检查最近一次备份产物是否成功生成
- 每次重大结构变更前手动执行一次 `npm run db:backup`

### 4. 飞书 OAuth 无法回调

排查：

- `NEXT_PUBLIC_APP_URL`
- `APP_BASE_URL`
- `FEISHU_REDIRECT_URI`
- Nginx HTTPS 证书和 443 转发

这三项必须一致到完整域名与路径。

### 5. 飞书文档导出成功但未自动授权

当前已知现象：

- 文档可以创建
- 页面会返回飞书文档链接
- 自动添加查看权限可能返回 `Invalid parameter`

处理方式：

- 先以页面返回的文档链接作为交付结果
- 如需共享，暂时在飞书文档侧手动补分享
- 保留 `/settings -> 最近集成任务` 中的错误原文，后续单独排查分享接口

## 回滚

### 应用版本回滚

1. 切回上一版代码或构建产物。
2. 执行 `npm ci`。
3. 如上一版依赖不同，重新执行 `npm run build`。
4. 重启 `okr-app` 服务。
5. 再次检查 `/api/health`。

### 数据回滚

数据库回滚遵循 [docs/postgres-ops.md](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/docs/postgres-ops.md:1)：

```bash
npm run db:restore -- --file backups/<snapshot>.json
npm run db:verify
```

注意：

- 恢复前会清空目标库
- 备份中的飞书 `appSecret` 已脱敏，恢复后需要重新回填

## 变更记录建议

每次发布至少记录：

- 发布时间
- 发布人
- 代码版本或 commit
- 是否执行数据库迁移
- `/api/health` 结果
- 是否完成真实页面回归抽查
