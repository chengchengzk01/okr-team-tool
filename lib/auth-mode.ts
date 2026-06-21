export function isMockLoginEnabled() {
  if (process.env.ENABLE_MOCK_LOGIN === "true") return true;
  if (process.env.ENABLE_MOCK_LOGIN === "false") return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? "";
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(appUrl)) return true;
  return process.env.NODE_ENV !== "production";
}
