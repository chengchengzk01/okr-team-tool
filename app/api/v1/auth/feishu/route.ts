import { NextResponse } from "next/server";
import { resolveAppUrl } from "@/lib/app-url";
import { feishuProvider } from "@/lib/integrations/feishu";
import { createOAuthState } from "@/lib/oauth-state";

export async function GET(request: Request) {
  try {
    const state = await createOAuthState();
    const authUrl = await feishuProvider.getAuthUrl(state);
    return NextResponse.redirect(authUrl.startsWith("/") ? resolveAppUrl(authUrl) : authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "飞书授权初始化失败";
    if (wantsJsonResponse(request)) {
      return NextResponse.json({ error: message }, { status: statusForAuthInitFailure(message) });
    }
    return NextResponse.redirect(resolveAppUrl(`/login?error=${encodeURIComponent(message)}`));
  }
}

function wantsJsonResponse(request: Request) {
  return request.headers.get("accept")?.includes("application/json");
}

function statusForAuthInitFailure(message: string) {
  if (/未启用正式飞书 OAuth/.test(message)) return 409;
  if (/未配置/.test(message)) return 503;
  return 500;
}
