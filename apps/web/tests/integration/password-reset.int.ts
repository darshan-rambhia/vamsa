/**
 * Integration: forgot-password flow against the real Better Auth instance.
 *
 * Only the email transport is stubbed (to capture the reset link). Better
 * Auth, its hooks, API token revocation and the database are all real.
 */

import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzleDb, drizzleSchema, emailService } from "@vamsa/api";
import { eq } from "drizzle-orm";
import {
  auth,
  createApiTokenData,
  verifyApiTokenData,
} from "@vamsa/lib/server/business";
import { hashPassword } from "../../../../packages/api/src/drizzle/password";

const BASE = "http://localhost:3000/api/auth";
const EMAIL = `reset-int-${randomUUID().slice(0, 8)}@test.local`;
const OLD_PASSWORD = "OldPassword123!";
const NEW_PASSWORD = "NewPassword456!";
const isSqlite = process.env.DB_DRIVER !== "postgres";

let userId: string;

const sendEmail = vi
  .spyOn(emailService, "sendEmail")
  .mockResolvedValue({ success: true });

function post(pathname: string, body: unknown, headers = {}) {
  return auth.handler(
    new Request(`${BASE}${pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        ...headers,
      },
      body: JSON.stringify(body),
    })
  );
}

function signIn(password: string) {
  return post("/sign-in/email", { email: EMAIL, password });
}

beforeAll(async () => {
  if (isSqlite) {
    const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");
    migrate(drizzleDb as never, {
      migrationsFolder: path.resolve(
        import.meta.dirname,
        "../../../../packages/api/drizzle-sqlite"
      ),
    });
  }
  const hash = await hashPassword(OLD_PASSWORD);
  userId = randomUUID();
  const now = new Date();
  await drizzleDb.insert(drizzleSchema.users).values({
    id: userId,
    email: EMAIL,
    name: "Reset Integration",
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
  sendEmail.mockRestore();
  await drizzleDb
    .delete(drizzleSchema.apiTokens)
    .where(eq(drizzleSchema.apiTokens.userId, userId));
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

describe("forgot password (unmocked Better Auth)", () => {
  it("answers unknown emails the same way and sends nothing", async () => {
    sendEmail.mockClear();
    const res = await post("/request-password-reset", {
      email: `nobody-${randomUUID()}@test.local`,
      redirectTo: "/reset-password",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: true,
      message: expect.stringContaining("If this email exists"),
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("request -> email -> reset -> new password works, old fails, PATs and sessions revoked", async () => {
    // Existing session and PAT before the reset
    const before = await signIn(OLD_PASSWORD);
    expect(before.status).toBe(200);
    const cookie = before.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("session_token");
    const pat = await createApiTokenData(userId, {
      name: "cli",
      scope: "read",
    });
    expect(await verifyApiTokenData(pat.token)).not.toBeNull();

    sendEmail.mockClear();
    const req = await post("/request-password-reset", {
      email: EMAIL,
      redirectTo: "/reset-password",
    });
    expect(req.status).toBe(200);

    // Reset email went through the email service
    await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(1));
    const [to, template, emailType, sentFor] = sendEmail.mock.calls[0];
    expect(to).toBe(EMAIL);
    expect(emailType).toBe("password_reset");
    expect(sentFor).toBe(userId);
    const link = template.text.match(/https?:\/\/\S+/)?.[0];
    expect(link).toBeDefined();

    // Clicking the link redirects to the web reset page with the token
    const callback = await auth.handler(new Request(link!));
    expect(callback.status).toBe(302);
    const location = new URL(
      callback.headers.get("location")!,
      "http://localhost:3000"
    );
    expect(location.pathname).toBe("/reset-password");
    const token = location.searchParams.get("token");
    expect(token).toBeTruthy();

    const reset = await post("/reset-password", {
      token,
      newPassword: NEW_PASSWORD,
    });
    expect(reset.status).toBe(200);

    expect((await signIn(NEW_PASSWORD)).status).toBe(200);
    expect((await signIn(OLD_PASSWORD)).status).toBe(401);
    expect(await verifyApiTokenData(pat.token)).toBeNull();

    // Pre-reset session is gone
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookie.split(";")[0] }),
    });
    expect(session).toBeNull();

    // Token is single use
    const reuse = await post("/reset-password", {
      token,
      newPassword: "AnotherPassword789!",
    });
    expect(reuse.status).toBe(400);
  });
});
