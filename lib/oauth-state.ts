import { cookies } from "next/headers";

const cookieName = "okr_feishu_oauth_state";
const ttlSeconds = 5 * 60;

export async function createOAuthState() {
  const state = crypto.randomUUID();
  const store = await cookies();
  store.set(cookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: getAppUrl().startsWith("https://"),
    path: "/",
    maxAge: ttlSeconds
  });
  return state;
}

export async function consumeOAuthState(receivedState: string | null) {
  const store = await cookies();
  const expectedState = store.get(cookieName)?.value;
  store.delete(cookieName);
  return Boolean(receivedState && expectedState && receivedState === expectedState);
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
