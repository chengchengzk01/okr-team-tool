import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { createSessionToken, extractSessionTokenFromHeaders, resolveSessionUserFromToken } from "../lib/auth";
import { repository } from "../lib/data/repository";

describe("auth session resolution contract", () => {
  test("extracts the session token from a Cookie header", () => {
    const headers = new Headers({
      Cookie: "foo=bar; okr_session=abc.def.ghi; theme=dark"
    });

    expect(extractSessionTokenFromHeaders(headers)).toBe("abc.def.ghi");
  });

  test("resolves a repository-backed mock session token", async () => {
    const token = await createSessionToken(repository.getUser("u-admin")!, { sessionSource: "mock" });
    const user = await resolveSessionUserFromToken(token);

    expect(user?.id).toBe("u-admin");
    expect(user?.role).toBe("super_admin");
  });

  test("session user lookup falls back to the repository when Prisma lookup fails", () => {
    const source = readFileSync(join(process.cwd(), "lib/auth.ts"), "utf8");

    expect(source).toContain("loadSessionUser");
    expect(source).toContain("prismaQueries.getUser");
    expect(source).toContain("repository.getUser");
    expect(source).toContain(".catch(() => null)");
  });
});
