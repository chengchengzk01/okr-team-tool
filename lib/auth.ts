import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { Role, User } from "@/lib/domain/types";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";

const cookieName = "okr_session";
export type SessionSource = "mock" | "feishu";

export type SessionUser = Pick<User, "id" | "name" | "role" | "departmentId" | "email">;

export async function createSessionToken(user: User, options?: { sessionSource?: SessionSource }) {
  const secret = getJwtSecret();

  return new SignJWT({
    userId: user.id,
    role: user.role,
    departmentId: user.departmentId,
    sessionSource: options?.sessionSource ?? "feishu"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret);

  return {
    userId: String(payload.userId),
    role: payload.role as Role,
    departmentId: payload.departmentId ? String(payload.departmentId) : undefined,
    sessionSource: (payload.sessionSource === "mock" ? "mock" : "feishu") as SessionSource
  };
}

export async function setSessionCookie(user: User, options?: { sessionSource?: SessionSource }) {
  const token = await createSessionToken(user, options);
  const store = await cookies();

  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getAppUrl().startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return token;
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getCurrentUser(request?: Request): Promise<SessionUser | null> {
  const session = await getCurrentSession(request);
  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    departmentId: session.user.departmentId
  };
}

export async function getCurrentSession(request?: Request) {
  const token = await resolveRequestToken(request);
  if (!token) return null;

  try {
    const session = await verifySessionToken(token);
    const user = await loadSessionUser(session.userId, session.sessionSource);
    if (!user?.isActive) return null;

    return { user, sessionSource: session.sessionSource };
  } catch {
    return null;
  }
}

export function assertRole(user: SessionUser | null, roles: Role[]) {
  if (!user) throw new Error("未登录");
  if (!roles.includes(user.role)) throw new Error("无权限执行该操作");
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ?? "local-development-secret-for-okr-demo";
  return new TextEncoder().encode(secret);
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function loadSessionUser(userId: string, sessionSource: SessionSource = "feishu") {
  if (sessionSource === "mock") {
    return repository.getUser(userId);
  }
  const persistedUser = await prismaQueries.getUser(userId).catch(() => null);
  return persistedUser ?? repository.getUser(userId);
}

export async function resolveSessionUserFromToken(token: string) {
  const session = await verifySessionToken(token);
  return loadSessionUser(session.userId, session.sessionSource);
}

async function resolveRequestToken(request?: Request) {
  const directToken = extractSessionTokenFromHeaders(request?.headers);
  if (directToken) return directToken;

  const headerStore = await headers();
  const headerToken = extractSessionTokenFromHeaders(headerStore);
  if (headerToken) return headerToken;

  const store = await cookies();
  return store.get(cookieName)?.value ?? null;
}

export function extractSessionTokenFromHeaders(headerStore?: Pick<Headers, "get"> | null) {
  if (!headerStore) return null;
  const bearer = headerStore.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return bearer;

  const cookieHeader = headerStore.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === cookieName) return rest.join("=");
  }

  return null;
}
