import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { resolveAppUrl } from "@/lib/app-url";
import { getFeishuRuntimeConfig } from "@/lib/integrations/feishu-config";
import { feishuProvider } from "@/lib/integrations/feishu";
import { consumeOAuthState } from "@/lib/oauth-state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const config = await getFeishuRuntimeConfig();
    if (config.provider !== "real") {
      throw new Error("当前环境未启用正式飞书 OAuth 回调，请使用开发入口完成本地验收");
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) return authCallbackError(request, url, "缺少飞书授权码", 400);
    if (!state) return authCallbackError(request, url, "缺少飞书授权 state，请重新发起登录", 400);
    if (!(await consumeOAuthState(state))) return authCallbackError(request, url, "飞书授权 state 校验失败，请重新登录", 400);
    const user = await feishuProvider.exchangeCodeForUser(code);
    const token = await setSessionCookie(user);
    if (wantsJsonResponse(request, url)) return NextResponse.json({ token, user });
    return NextResponse.redirect(resolveAppUrl("/dashboard"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "飞书回调失败";
    if (wantsJsonResponse(request, url)) return NextResponse.json({ error: message }, { status: statusForAuthCallbackFailure(message) });
    return NextResponse.redirect(resolveAppUrl(`/login?error=${encodeURIComponent(message)}`));
  }
}

function wantsJsonResponse(request: Request, url: URL) {
  return url.searchParams.get("response") === "json" || request.headers.get("accept")?.includes("application/json");
}

function authCallbackError(request: Request, url: URL, message: string, status: number) {
  if (wantsJsonResponse(request, url)) {
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.redirect(resolveAppUrl(`/login?error=${encodeURIComponent(message)}`));
}

function statusForAuthCallbackFailure(message: string) {
  if (/缺少飞书授权码|缺少飞书授权 state|state 校验失败/.test(message)) return 400;
  if (/未启用正式飞书 OAuth 回调/.test(message)) return 409;
  if (/未配置|未返回/.test(message)) return 503;
  return 500;
}
