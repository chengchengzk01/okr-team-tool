import { spawn } from "node:child_process";

const port = Number(process.env.SMOKE_LOCAL_PORT ?? 3110);
const baseUrl = `http://localhost:${port}`;
const timeoutMs = 30_000;

const server = spawn("npx", ["next", "start", "-p", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    NEXT_PUBLIC_APP_URL: baseUrl,
    APP_BASE_URL: baseUrl,
    ENABLE_MOCK_LOGIN: "true",
    FEISHU_PROVIDER: "mock"
  }
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForHttp(`${baseUrl}/login`);
  await expectStatus(`${baseUrl}/login`, 200, "登录页应可访问");

  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/mock-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "super_admin" })
  });
  if (!loginResponse.ok) {
    throw new Error(`模拟登录接口应返回 200，实际为 ${loginResponse.status}`);
  }

  const setCookie = loginResponse.headers.get("set-cookie");
  const sessionCookie = setCookie?.split(";")[0];
  if (!sessionCookie?.startsWith("okr_session=")) {
    throw new Error("模拟登录接口没有返回 okr_session cookie");
  }

  const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
    headers: { Cookie: sessionCookie },
    redirect: "manual"
  });
  if (dashboardResponse.status !== 200) {
    throw new Error(`带登录 cookie 访问 dashboard 应返回 200，实际为 ${dashboardResponse.status}`);
  }

  const dashboardHtml = await dashboardResponse.text();
  for (const text of ["四象限周报看板", "本季度 OKR 与信心值", "健康指标"]) {
    if (!dashboardHtml.includes(text)) {
      throw new Error(`dashboard 页面缺少关键文本：${text}`);
    }
  }

  const reportsResponse = await fetch(`${baseUrl}/reports`, {
    headers: { Cookie: sessionCookie },
    redirect: "manual"
  });
  if (reportsResponse.status !== 200) {
    throw new Error(`带登录 cookie 访问 reports 应返回 200，实际为 ${reportsResponse.status}`);
  }

  const reportsHtml = await reportsResponse.text();
  for (const text of ["统计报表", "季度对比", "信心值趋势预警", "健康指标季度走势"]) {
    if (!reportsHtml.includes(text)) {
      throw new Error(`reports 页面缺少关键文本：${text}`);
    }
  }

  const settingsResponse = await fetch(`${baseUrl}/settings`, {
    headers: { Cookie: sessionCookie },
    redirect: "manual"
  });
  if (settingsResponse.status !== 200) {
    throw new Error(`带登录 cookie 访问 settings 应返回 200，实际为 ${settingsResponse.status}`);
  }
  const settingsHtml = await settingsResponse.text();
  for (const text of ["系统设置与飞书集成", "配置检查", "页面回归建议顺序", "最近集成任务", "导出日志"]) {
    if (!settingsHtml.includes(text)) {
      throw new Error(`settings 页面缺少关键文本：${text}`);
    }
  }

  const reviewResponse = await fetch(`${baseUrl}/review`, {
    headers: { Cookie: sessionCookie },
    redirect: "manual"
  });
  if (reviewResponse.status !== 200) {
    throw new Error(`带登录 cookie 访问 review 应返回 200，实际为 ${reviewResponse.status}`);
  }
  const reviewHtml = await reviewResponse.text();
  for (const text of ["季度 Review", "导出季度报告", "导出范围", "最近集成任务", "导出日志"]) {
    if (!reviewHtml.includes(text)) {
      throw new Error(`review 页面缺少关键文本：${text}`);
    }
  }

  console.log("local smoke check passed");
} finally {
  server.kill("SIGTERM");
}

async function waitForHttp(url) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      await sleep(500);
    }
  }

  throw new Error(`服务未在 ${timeoutMs}ms 内启动。\n${serverOutput}`);
}

async function expectStatus(url, expected, message) {
  const response = await fetch(url);
  if (response.status !== expected) {
    throw new Error(`${message}，实际为 ${response.status}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
