/**
 * Integration: `vamsa login` device authorization (RFC 8628), unmocked.
 *
 * Real Better Auth (deviceAuthorization + bearer plugins), real database,
 * real /api/v1. Walks the CLI's path: request a code, approve it as a signed-in
 * user, poll for the session token, mint a PAT with it, end the session.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq } from "drizzle-orm";
import { auth, getDeviceRequestDetails } from "@vamsa/lib/server/business";
import { api, loginAs, prepareApiDb } from "./api-helpers";

const BASE = "http://localhost:3000/api/auth";
const GRANT = "urn:ietf:params:oauth:grant-type:device_code";
const UA = "vamsa-cli/0.2.0 (darwin; test-host)";

beforeAll(async () => {
  await prepareApiDb();
});

async function authFetch(
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {}
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Origin: "http://localhost:3000",
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await auth.handler(
    new Request(`${BASE}${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  );
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : {} };
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

async function requestCode(scope = "write"): Promise<DeviceCodeResponse> {
  const res = await authFetch("/device/code", {
    body: { client_id: "vamsa-cli", scope },
  });
  expect(res.status).toBe(200);
  return res.json as unknown as DeviceCodeResponse;
}

function poll(deviceCode: string) {
  return authFetch("/device/token", {
    body: {
      grant_type: GRANT,
      device_code: deviceCode,
      client_id: "vamsa-cli",
    },
  });
}

/** Let the next poll through the 5s slow_down window. */
async function rewindPoll(deviceCode: string) {
  await drizzleDb
    .update(drizzleSchema.deviceCodes)
    .set({ lastPolledAt: new Date(Date.now() - 60_000) })
    .where(eq(drizzleSchema.deviceCodes.deviceCode, deviceCode));
}

/** What the /device page does: claim the code, then approve or deny. */
async function decide(
  token: string,
  userCode: string,
  action: "approve" | "deny"
) {
  const verify = await authFetch(
    `/device?user_code=${encodeURIComponent(userCode)}`,
    { token }
  );
  expect(verify.status).toBe(200);
  expect(verify.json).toMatchObject({
    status: "pending",
    client_id: "vamsa-cli",
  });
  return authFetch(`/device/${action}`, { body: { userCode }, token });
}

describe("device authorization (unmocked)", () => {
  it("rejects unknown clients", async () => {
    const res = await authFetch("/device/code", {
      body: { client_id: "someone-else" },
    });
    expect(res.status).toBe(400);
    expect(res.json.error).toBe("invalid_client");
  });

  it("issues a readable code pointing at /device", async () => {
    const code = await requestCode();
    expect(code.user_code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    expect(code.verification_uri).toMatch(/\/device$/);
    expect(code.verification_uri_complete).toContain(
      `user_code=${code.user_code}`
    );
    expect(code.interval).toBe(5);
    expect(code.expires_in).toBe(600);

    const details = await getDeviceRequestDetails(code.user_code);
    expect(details).toMatchObject({
      clientName: "Vamsa CLI",
      scope: "write",
      userAgent: UA,
    });
    expect(details?.createdAt).toBeInstanceOf(Date);
  });

  it("approve -> poll -> mint PAT -> bearer works -> session ended", async () => {
    const { token: browserSession } = await loginAs("MEMBER");
    const code = await requestCode();

    const pending = await poll(code.device_code);
    expect(pending.status).toBe(400);
    expect(pending.json.error).toBe("authorization_pending");

    // Polling again inside the interval is slow_down
    const tooFast = await poll(code.device_code);
    expect(tooFast.json.error).toBe("slow_down");

    // The dashed display form works too
    const dashed = `${code.user_code.slice(0, 4)}-${code.user_code.slice(4)}`;
    const approved = await decide(browserSession, dashed, "approve");
    expect(approved.status).toBe(200);

    await rewindPoll(code.device_code);
    const granted = await poll(code.device_code);
    expect(granted.status).toBe(200);
    const sessionToken = granted.json.access_token as string;
    expect(granted.json.token_type).toBe("Bearer");

    // The CLI swaps the session for a PAT
    const minted = await api(sessionToken, "POST", "/tokens", {
      name: "test-host",
      scope: "write",
      expiresInDays: 90,
    });
    expect(minted.status).toBe(201);
    const pat = (minted.json as { token: string }).token;
    expect(pat.startsWith("vms_")).toBe(true);

    const logout = await api(sessionToken, "POST", "/auth/logout");
    expect(logout.status).toBe(200);
    const afterLogout = await api(sessionToken, "GET", "/auth/me");
    expect(afterLogout.status).toBe(401);

    const me = await api(pat, "GET", "/auth/me");
    expect(me.status).toBe(200);
    expect(me.json).toMatchObject({ role: "MEMBER", tokenScope: "write" });

    // One-time: the code cannot be redeemed twice
    await rewindPoll(code.device_code);
    const again = await poll(code.device_code);
    expect(again.json.error).toBe("invalid_grant");
  });

  it("denied codes return access_denied", async () => {
    const { token } = await loginAs("VIEWER");
    const code = await requestCode("read");
    const denied = await decide(token, code.user_code, "deny");
    expect(denied.status).toBe(200);
    const res = await poll(code.device_code);
    expect(res.status).toBe(400);
    expect(res.json.error).toBe("access_denied");
  });

  it("expired codes return expired_token and cannot be approved", async () => {
    const { token } = await loginAs("MEMBER");
    const code = await requestCode();
    await drizzleDb
      .update(drizzleSchema.deviceCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(drizzleSchema.deviceCodes.userCode, code.user_code));

    const verify = await authFetch(`/device?user_code=${code.user_code}`, {
      token,
    });
    expect(verify.json.error).toBe("expired_token");

    const res = await poll(code.device_code);
    expect(res.json.error).toBe("expired_token");
  });

  it("another user cannot approve a code someone else claimed", async () => {
    const owner = await loginAs("MEMBER");
    const other = await loginAs("ADMIN");
    const code = await requestCode();
    const claim = await authFetch(`/device?user_code=${code.user_code}`, {
      token: owner.token,
    });
    expect(claim.status).toBe(200);
    const res = await authFetch("/device/approve", {
      body: { userCode: code.user_code },
      token: other.token,
    });
    expect(res.status).toBe(403);
  });
});
