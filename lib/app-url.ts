export function getConfiguredAppUrl() {
  return process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

export function getConfiguredAppOrigin() {
  return new URL(getConfiguredAppUrl()).origin;
}

export function resolveAppUrl(path: string) {
  return new URL(path, getConfiguredAppOrigin());
}

export function resolveRequestAppOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();

  if (host) {
    return `${forwardedProto || "https"}://${host}`;
  }

  return getConfiguredAppOrigin();
}
