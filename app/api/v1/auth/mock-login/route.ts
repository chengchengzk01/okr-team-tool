import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { isMockLoginEnabled } from "@/lib/auth-mode";
import { repository } from "@/lib/data/repository";

export async function POST(request: Request) {
  if (!isMockLoginEnabled()) {
    return NextResponse.json({ error: "开发模拟登录未开启，请使用飞书 OAuth 正式登录" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const role = body.role ?? "super_admin";
  const users = repository.listUsers();
  const user = users.find((item) => item.role === role && item.isActive) ?? users.find((item) => item.isActive) ?? users[0];
  const token = await setSessionCookie(user, { sessionSource: "mock" });

  return NextResponse.json({ token, user });
}
