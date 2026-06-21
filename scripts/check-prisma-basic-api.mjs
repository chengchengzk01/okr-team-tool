import { spawn } from "node:child_process";

const port = 3102;
const baseUrl = `http://localhost:${port}`;
const timeoutMs = 30_000;

const server = spawn("npx", ["next", "start", "-p", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    NEXT_PUBLIC_APP_URL: baseUrl,
    APP_BASE_URL: baseUrl
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
  const loginPage = await fetch(`${baseUrl}/login`);
  if (loginPage.status !== 200) throw new Error(`login page failed: ${loginPage.status}`);

  const login = await fetch(`${baseUrl}/api/v1/auth/mock-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "super_admin" })
  });

  if (!login.ok) throw new Error(`mock login failed: ${login.status}`);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie?.startsWith("okr_session=")) throw new Error("mock login did not return session cookie");

  const loginBody = await login.json();
  if (loginBody.user.id !== "u-admin") throw new Error(`unexpected login user: ${loginBody.user.id}`);

  const health = await fetch(`${baseUrl}/api/health`);
  const healthText = await health.text();
  if (![200, 503].includes(health.status)) throw new Error(`health API failed: ${health.status}`);
  if (!healthText.includes("\"database\":{\"ok\":true")) throw new Error("health API missing database ok state");

  console.log("database-backed app path check passed");
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

  throw new Error(`service did not start within ${timeoutMs}ms\n${serverOutput}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
