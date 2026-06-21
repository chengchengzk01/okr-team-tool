import { NextResponse } from "next/server";
import { getCurrentSession, setSessionCookie } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";

export async function POST(request: Request) {
  const session = await getCurrentSession(request);
  const sessionUser = session?.user;
  if (!sessionUser) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const user = (await prismaQueries.getUser(sessionUser.id)) ?? repository.getUser(sessionUser.id);
  if (!user?.isActive) return NextResponse.json({ error: "用户不存在或已停用" }, { status: 401 });

  const token = await setSessionCookie(user, { sessionSource: session.sessionSource });
  return NextResponse.json({ token, user });
}
