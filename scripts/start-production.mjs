import { spawn } from "node:child_process";

const port = normalizePort(process.env.PORT, 3000);
const hostname = process.env.HOSTNAME?.trim() || "0.0.0.0";

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
