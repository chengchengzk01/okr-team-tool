# 单机部署说明

## 目标形态

当前首个可交付部署形态固定为：

- 一台 Linux 主机
- 一个 Next.js 应用进程
- 一个独立 PostgreSQL
- Nginx 负责域名、HTTPS 和反向代理
- systemd 负责应用常驻、自启和重启

这套形态与当前仓库已有能力最匹配：应用是单体 Next.js，数据库运维已经围绕 PostgreSQL 脚本化，真实飞书回调和健康检查也更适合固定域名与 HTTPS 入口。

## 推荐目录

- 应用目录：`/opt/okr-app/current`
- 日志目录：`/var/log/okr-app`
- 环境文件：`/opt/okr-app/shared/.env.production`
- 备份目录：`/opt/okr-app/shared/backups`

## 环境准备

### 系统依赖

- Node.js 20+
- npm 10+
- PostgreSQL 15+
- Nginx
- systemd

### 必填环境变量

至少准备以下变量：

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `ENABLE_MOCK_LOGIN=false`

真实飞书上线还需要：

- `FEISHU_PROVIDER=real`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_REDIRECT_URI`
- `FEISHU_ROOT_DEPARTMENT_ID`
- `FEISHU_CALENDAR_ID`
- `FEISHU_DRIVE_FOLDER_TOKEN`
- `FEISHU_BITABLE_APP_TOKEN`
- `FEISHU_BITABLE_TABLE_IDS_JSON`

推荐同时设置：

- `APP_BASE_URL`
- `CRON_SECRET`
- `PORT=3000`
- `HOSTNAME=0.0.0.0`
- `NODE_ENV=production`

## 部署顺序

### 1. 放置代码与依赖

在目标目录执行：

```bash
npm ci
```

### 2. 准备环境文件

以 `.env.example` 为模板，写入 `/opt/okr-app/shared/.env.production`。

注意：

- `NEXT_PUBLIC_APP_URL` 和 `APP_BASE_URL` 都应使用最终 `https://` 域名
- `FEISHU_REDIRECT_URI` 必须与飞书应用后台配置完全一致
- 生产环境必须显式关闭 mock 登录

### 3. 运行部署前检查

```bash
set -a
source /opt/okr-app/shared/.env.production
set +a
npm run deploy:check
```

通过标准：

- `npm run runtime:check` 通过
- `npm run build` 通过

### 4. 执行数据库迁移

```bash
set -a
source /opt/okr-app/shared/.env.production
set +a
npm run db:migrate:deploy
```

如需保留回滚点，先执行：

```bash
npm run db:backup
```

### 5. 启动应用

```bash
set -a
source /opt/okr-app/shared/.env.production
set +a
npm run start:prod
```

`start:prod` 会以 `HOSTNAME` 和 `PORT` 启动 `next start`，默认绑定 `0.0.0.0:3000`。

## systemd 示例

服务文件建议放在 `/etc/systemd/system/okr-app.service`：

```ini
[Unit]
Description=OKR App
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/okr-app/current
EnvironmentFile=/opt/okr-app/shared/.env.production
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start:prod
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

启用方式：

```bash
sudo systemctl daemon-reload
sudo systemctl enable okr-app
sudo systemctl restart okr-app
sudo systemctl status okr-app
```

## Nginx / HTTPS

反向代理的关键点：

- 对外只暴露 `443`
- 应用监听内网 `3000`
- 保留 `Host`、`X-Forwarded-Proto`、`X-Forwarded-For`
- 最终域名必须与 `NEXT_PUBLIC_APP_URL`、`APP_BASE_URL`、`FEISHU_REDIRECT_URI` 一致

示例：

```nginx
server {
    listen 80;
    server_name okr.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name okr.example.com;

    ssl_certificate /etc/letsencrypt/live/okr.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/okr.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 部署后验收

至少执行以下检查：

```bash
curl -fsS https://okr.example.com/api/health
```

以及：

- 登录页可访问
- `/api/health` 返回 `ok=true`
- 超级管理员可以进入 `/settings`
- 真实飞书配置页显示“真实飞书配置已就绪”

如需更完整验证，再按 [真实飞书验收清单.md](/Users/zhangjiafeng/同步空间/98-AI/codex/OKR/真实飞书验收清单.md:1) 执行页面回归。
