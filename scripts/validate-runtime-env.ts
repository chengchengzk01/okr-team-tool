import { loadEnvConfig } from "@next/env";
import { getRuntimeBaselineReport } from "../lib/runtime/runtime-baseline";

loadEnvConfig(process.cwd());

const report = getRuntimeBaselineReport();

console.log(`[runtime-env] mode=${report.mode}`);
console.log(`[runtime-env] appUrl=${report.appUrl || "(missing)"}`);

if (report.missingItems.length > 0) {
  console.error(`[runtime-env] missing: ${report.missingItems.join(", ")}`);
}

if (report.warnings.length > 0) {
  for (const warning of report.warnings) {
    console.warn(`[runtime-env] warning: ${warning}`);
  }
}

if (!report.ready) {
  process.exitCode = 1;
} else {
  console.log("[runtime-env] baseline check passed");
}
