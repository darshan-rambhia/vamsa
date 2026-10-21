/**
 * /admin routes: ADMIN-only, arguments (incl. the acting user id), and
 * settings merge semantics. Session and business functions are mocked.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { initializeRateLimitStore } from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";
import apiV1 from "./index";

const SETTINGS = {
  id: "fs1",
  familyName: "Kapoor",
  description: "",
  allowSelfRegistration: false,
  requireApprovalForEdits: true,
  allowProfileClaiming: false,
  metricsDashboardUrl: null,
  metricsApiUrl: null,
};

const m = vi.hoisted(() => {
  const ok = <T>(v: T) => vi.fn(async (..._a: Array<unknown>) => v);
  return {
    session: vi.fn<() => Promise<unknown>>(async () => null),
    getUsersData: ok({ items: [], pagination: { total: 0 } }),
    getUserData: ok({ id: "u2" }),
    updateUserData: ok({ id: "u2" }),
    deleteUserData: ok({ success: true }),
    unlockUserAccountData: ok({ success: true }),
    searchAvailablePersonsData: ok([{ id: "p1" }]),
    getInvitesData: ok({ items: [], pagination: { total: 0 } }),
    createInviteData: ok({ id: "i1", token: "t" }),
    revokeInviteData: ok({ success: true }),
    resendInviteData: ok({ success: true }),
    deleteInviteData: ok({ success: true }),
    getFamilySettingsData: vi.fn(async () => ({})),
    updateFamilySettingsData: vi.fn(async (d: unknown) => d),
  };
});

vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthGetSessionWithUser: m.session,
}));

vi.mock("@vamsa/lib/server/business", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { session: _s, ...fns } = m;
  return { ...actual, ...fns };
});

function signIn(role: "VIEWER" | "MEMBER" | "ADMIN") {
  m.session.mockResolvedValue({
    id: "admin-1",
    email: "a@example.com",
    name: "A",
    role,
    personId: null,
    mustChangePassword: false,
    profileClaimStatus: "CLAIMED",
    oidcProvider: null,
  });
}

const send = (method: string, path: string, body?: unknown) =>
  apiV1.request(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

beforeEach(() => {
  vi.clearAllMocks();
  initializeRateLimitStore(new MemoryRateLimitStore());
  m.session.mockResolvedValue(null);
  m.getFamilySettingsData.mockResolvedValue({ ...SETTINGS });
});

describe("admin access", () => {
  test("signed out is 401", async () => {
    expect((await send("GET", "/admin/users")).status).toBe(401);
  });

  test("MEMBER is 403 and nothing runs", async () => {
    signIn("MEMBER");
    expect((await send("GET", "/admin/users")).status).toBe(403);
    expect(
      (await send("PUT", "/admin/settings", { familyName: "X" })).status
    ).toBe(403);
    expect(m.getUsersData).not.toHaveBeenCalled();
    expect(m.updateFamilySettingsData).not.toHaveBeenCalled();
  });
});

describe("admin users", () => {
  beforeEach(() => signIn("ADMIN"));

  test("list parses filters", async () => {
    await send(
      "GET",
      "/admin/users?search=ra&role=MEMBER&active=false&limit=5"
    );
    expect(m.getUsersData).toHaveBeenCalledWith({
      page: 1,
      limit: 5,
      sortOrder: "desc",
      search: "ra",
      role: "MEMBER",
      isActive: false,
    });
  });

  test("update passes the acting admin id", async () => {
    await send("PATCH", "/admin/users/u2", { role: "VIEWER", isActive: false });
    expect(m.updateUserData).toHaveBeenCalledWith(
      "u2",
      { role: "VIEWER", isActive: false },
      "admin-1"
    );
  });

  test("self-demotion error from the business layer is a 400", async () => {
    m.updateUserData.mockRejectedValueOnce(new Error("Cannot demote yourself"));
    const res = await send("PATCH", "/admin/users/admin-1", { role: "VIEWER" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Cannot demote yourself" });
  });

  test("link person and unlink with null", async () => {
    await send("PUT", "/admin/users/u2/person", { personId: "p1" });
    await send("PUT", "/admin/users/u2/person", { personId: null });
    expect(m.updateUserData.mock.calls.map((c) => c[1])).toEqual([
      { personId: "p1" },
      { personId: null },
    ]);
  });

  test("unlock, delete and available persons", async () => {
    expect((await send("POST", "/admin/users/u2/unlock")).status).toBe(200);
    expect(m.unlockUserAccountData).toHaveBeenCalledWith("u2", "admin-1");
    expect((await send("DELETE", "/admin/users/u2")).status).toBe(200);
    expect(m.deleteUserData).toHaveBeenCalledWith("u2", "admin-1");
    const res = await send("GET", "/admin/persons/available?q=ka");
    expect(await res.json()).toEqual({ items: [{ id: "p1" }], total: 1 });
  });

  test("missing user is a 404", async () => {
    m.getUserData.mockRejectedValueOnce(new Error("User not found"));
    expect((await send("GET", "/admin/users/nope")).status).toBe(404);
  });
});

describe("admin invites", () => {
  beforeEach(() => signIn("ADMIN"));

  test("create defaults role to MEMBER", async () => {
    const res = await send("POST", "/admin/invites", {
      email: "n@example.com",
    });
    expect(res.status).toBe(201);
    expect(m.createInviteData).toHaveBeenCalledWith(
      "n@example.com",
      "MEMBER",
      undefined,
      "admin-1"
    );
  });

  test("duplicate invite is 409, wrong-state revoke is 400", async () => {
    m.createInviteData.mockRejectedValueOnce(
      new Error("An active invite already exists for this email")
    );
    expect(
      (await send("POST", "/admin/invites", { email: "n@example.com" })).status
    ).toBe(409);
    m.revokeInviteData.mockRejectedValueOnce(
      new Error("Can only revoke pending invites")
    );
    expect((await send("POST", "/admin/invites/i1/revoke")).status).toBe(400);
  });

  test("list, resend and delete", async () => {
    await send("GET", "/admin/invites?status=PENDING&page=2");
    expect(m.getInvitesData).toHaveBeenCalledWith(2, 20, "desc", "PENDING");
    await send("POST", "/admin/invites/i1/resend");
    expect(m.resendInviteData).toHaveBeenCalledWith("i1");
    await send("DELETE", "/admin/invites/i1");
    expect(m.deleteInviteData).toHaveBeenCalledWith("i1", "admin-1");
  });
});

describe("admin settings", () => {
  beforeEach(() => signIn("ADMIN"));

  test("PUT merges the given keys over current settings", async () => {
    const res = await send("PUT", "/admin/settings", {
      familyName: "Kapoor-Iyer",
      allowProfileClaiming: true,
    });
    expect(res.status).toBe(200);
    const { id: _id, ...base } = SETTINGS;
    expect(m.updateFamilySettingsData).toHaveBeenCalledWith(
      { ...base, familyName: "Kapoor-Iyer", allowProfileClaiming: true },
      "ADMIN",
      "admin-1"
    );
  });

  test("unknown keys and wrong types are rejected", async () => {
    expect(
      (await send("PUT", "/admin/settings", { colour: "red" })).status
    ).toBe(400);
    expect(
      (await send("PUT", "/admin/settings", { allowSelfRegistration: "yes" }))
        .status
    ).toBe(400);
    expect(m.updateFamilySettingsData).not.toHaveBeenCalled();
  });
});
