/**
 * Helpers for unmocked REST API integration tests: migrate the app's own
 * database (SQLite :memory: per fork) and log in real users for Bearer tokens.
 */

import path from "node:path";
import { randomUUID } from "node:crypto";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { hashPassword } from "../../../../packages/api/src/drizzle/password";
import { initializeRateLimitStore } from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";
import apiV1 from "../../server/api/index";

let ready = false;

export async function prepareApiDb(): Promise<void> {
  if (ready) return;
  initializeRateLimitStore(new MemoryRateLimitStore());
  if (process.env.DB_DRIVER !== "postgres") {
    const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");
    migrate(drizzleDb as never, {
      migrationsFolder: path.resolve(
        import.meta.dirname,
        "../../../../packages/api/drizzle-sqlite"
      ),
    });
  }
  ready = true;
}

/** Create a user with a password and return a CLI session token for them. */
export async function loginAs(
  role: "VIEWER" | "MEMBER" | "ADMIN"
): Promise<{ userId: string; token: string }> {
  const email = `int-${role.toLowerCase()}-${randomUUID().slice(0, 8)}@test.local`;
  const password = "IntegrationPass123!";
  const hash = await hashPassword(password);
  const userId = randomUUID();
  const now = new Date();
  await drizzleDb.insert(drizzleSchema.users).values({
    id: userId,
    email,
    name: role,
    passwordHash: hash,
    role,
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
  const res = await apiV1.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Vamsa-Client": "cli" },
    body: JSON.stringify({ email, password }),
  });
  const { token } = (await res.json()) as { token: string };
  return { userId, token };
}

/** JSON request against /api/v1 with a Bearer token. */
export async function api(
  token: string,
  method: string,
  pathname: string,
  body?: unknown
): Promise<{ status: number; json: unknown }> {
  const res = await apiV1.request(pathname, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : undefined };
}
