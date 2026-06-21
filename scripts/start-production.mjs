import { spawn } from "node:child_process";

const port = normalizePort(process.env.PORT, 3000);
const hostname = normalizeHostname(
  process.env.APP_HOSTNAME ??
    process.env.BIND_HOST ??
    process.env.HOST ??
    "0.0.0.0"
);

const child = spawn(
  "./node_modules/.bin/next",
  ["start", "-H", hostname, "-p", String(port)],
  {
    stdio: "inherit",
    env: process.env
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

function normalizePort(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeHostname(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "0.0.0.0";
}
