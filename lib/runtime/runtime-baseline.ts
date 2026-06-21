export type RuntimeBaselineReport = {
  mode: "production" | "development" | "test";
  ready: boolean;
  appUrl: string;
  mockLoginEnabled: boolean;
  requiredItems: string[];
  missingItems: string[];
  warnings: string[];
  optionalItems: string[];
};

const DEV_JWT_SECRET = "local-development-secret-for-okr-demo";

export function getRuntimeBaselineReport(env: NodeJS.ProcessEnv = process.env): RuntimeBaselineReport {
  const mode = resolveMode(env.NODE_ENV);
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim() || env.APP_BASE_URL?.trim() || "";
  const requiredItems = ["DATABASE_URL", "JWT_SECRET", "NEXT_PUBLIC_APP_URL"];
  const missingItems = requiredItems.filter((key) => !env[key]?.trim());
  const warnings: string[] = [];
  const blockingIssues: string[] = [...missingItems];
  const hasDirectUrl = Boolean(env.DIRECT_URL?.trim());

  if (!hasDirectUrl) {
    warnings.push("DIRECT_URL is not set; Prisma migrations may fail or use the wrong connection path");
    if (mode === "production") blockingIssues.push("DIRECT_URL");
  }

  if ((env.JWT_SECRET ?? "").trim() === DEV_JWT_SECRET) {
    warnings.push("JWT_SECRET is using the local development fallback secret");
    if (mode === "production") blockingIssues.push("JWT_SECRET");
  }

  if (mode === "production" && appUrl && !appUrl.startsWith("https://")) {
    warnings.push("NEXT_PUBLIC_APP_URL should use an https URL in production");
    blockingIssues.push("NEXT_PUBLIC_APP_URL");
  }

  if (mode === "production" && env.ENABLE_MOCK_LOGIN !== "false") {
    warnings.push("ENABLE_MOCK_LOGIN should be explicitly set to false in production");
    blockingIssues.push("ENABLE_MOCK_LOGIN");
  }

  if (mode !== "production" && env.ENABLE_MOCK_LOGIN === undefined) {
    warnings.push("ENABLE_MOCK_LOGIN is not set, development mode will rely on URL and NODE_ENV fallback");
  }

  return {
    mode,
    ready: blockingIssues.length === 0,
    appUrl,
    mockLoginEnabled: resolveMockLoginEnabled(env, appUrl, mode),
    requiredItems,
    missingItems,
    warnings,
    optionalItems: [
      "APP_BASE_URL",
      "ENABLE_MOCK_LOGIN",
      "CRON_SECRET",
      "DIRECT_URL",
      "FEISHU_PROVIDER",
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET",
      "FEISHU_REDIRECT_URI",
      "FEISHU_ROOT_DEPARTMENT_ID",
      "FEISHU_BITABLE_APP_TOKEN",
      "FEISHU_BITABLE_TABLE_IDS_JSON",
      "FEISHU_CALENDAR_ID",
      "FEISHU_DRIVE_FOLDER_TOKEN"
    ]
  };
}

function resolveMode(nodeEnv: string | undefined): RuntimeBaselineReport["mode"] {
  if (nodeEnv === "production") return "production";
  if (nodeEnv === "test") return "test";
  return "development";
}

function resolveMockLoginEnabled(
  env: NodeJS.ProcessEnv,
  appUrl: string,
  mode: RuntimeBaselineReport["mode"]
) {
  if (env.ENABLE_MOCK_LOGIN === "true") return true;
  if (env.ENABLE_MOCK_LOGIN === "false") return false;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(appUrl)) return true;
  return mode !== "production";
}
