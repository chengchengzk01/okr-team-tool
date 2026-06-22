export function getConfiguredAppUrl() {
  return process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

export function getConfiguredAppOrigin() {
  return new URL(getConfiguredAppUrl()).origin;
}

export function resolveAppUrl(path: string) {
  return new URL(path, getConfiguredAppOrigin());
}
