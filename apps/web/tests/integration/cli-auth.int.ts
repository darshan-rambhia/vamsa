/**
 * Integration: CLI login token against the real stack (no mocks).
 *
 * Better Auth, the bearer() plugin, requireApiAuth and the database are all
 * real. Logging in with `X-Vamsa-Client: cli` must return a session token
 * that works as `Authorization: Bearer` on a protected route.
 *
 * Uses the app's own drizzleDb (DATABASE_URL), migrated here for SQLite.
 */

import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../../../packages/api/src/drizzle/password";
import { initializeRateLimitStore } from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";
import apiV1 from "../../server/api/index";

const EMAIL = `cli-int-${randomUUID().slice(0, 8)}@test.local`;
const PASSWORD = "CliIntegration123!";
const isSqlite = process.env.DB_DRIVER !== "postgres";

let userId: string;

beforeAll(async () => {
  initializeRateLimitStore(new MemoryRateLimitStore());
  if (isSqlite) {
    const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");
    migrate(drizzleDb as never, {
      migrationsFolder: path.resolve(
        import.meta.dirname,
        "../../../../packages/api/drizzle-sqlite"
      ),
    });
  }
  const hash = await hashPassword(PASSWORD);
  userId = randomUUID();
  const now = new Date();
  await drizzleDb.insert(drizzleSchema.users).values({
    id: userId,
    email: EMAIL,
    name: "CLI Integration",
    passwordHash: hash,
    role: "MEMBER",
    isActive: true,
    emailVerified: true,
    updatedAt: now,
  });
  await drizzleDb.insert(drizzleSchema.accounts).values({
    id: randomUUID(),
    userId,
    accountId: userId,
    providerId: "credential",
    password: hash,
    updatedAt: now,
  } as never);
});

afterAll(async () => {
  await drizzleDb
    .delete(drizzleSchema.sessions)
    .where(eq(drizzleSchema.sessions.userId, userId));
  await drizzleDb
    .delete(drizzleSchema.accounts)
    .where(eq(drizzleSchema.accounts.userId, userId));
  await drizzleDb
    .delete(drizzleSchema.users)
    .where(eq(drizzleSchema.users.id, userId));
});

function login(headers: Record<string, string> = {}) {
  return apiV1.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
}

describe("CLI login token (unmocked)", () => {
  it("cli login returns a token that authenticates a protected route", async () => {
    const res = await login({ "X-Vamsa-Client": "cli" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { token, user } = await res.json();
    expect(user.email).toBe(EMAIL);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);

    const persons = await apiV1.request("/persons?limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(persons.status).toBe(200);
    expect(await persons.json()).toHaveProperty("items");
  });

  it("web login (no header) gets no token", async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect((await res.json()).token).toBe("");
  });

  it("a made-up bearer token is rejected", async () => {
    const res = await apiV1.request("/persons", {
      headers: { Authorization: "Bearer not-a-real-session" },
    });
    expect(res.status).toBe(401);
  });
});
