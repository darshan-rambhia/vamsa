/**
 * Personal access token routes and PAT authorization
 *
 * - /tokens router: list/create/revoke own tokens, scope capped at caller role
 * - requireApiAuth with `Bearer vms_...`: role = min(user role, scope ceiling)
 *
 * Business functions and token verification are mocked; the route handlers and
 * the middleware's role decision are what is under test.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { initializeRateLimitStore } from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";
import apiV1 from "./index";

type Role = "VIEWER" | "MEMBER" | "ADMIN";
type Scope = "read" | "write" | "admin";

const {
  mockSession,
  mockVerify,
  mockCreate,
  mockList,
  mockRevoke,
  mockListPersons,
  mockCreatePerson,
  mockDeletePerson,
} = vi.hoisted(() => ({
  mockSession: vi.fn<() => Promise<unknown>>(async () => null),
  mockVerify: vi.fn<(token: string) => Promise<unknown>>(async () => null),
  mockCreate: vi.fn(),
  mockList: vi.fn(),
  mockRevoke: vi.fn(),
  mockListPersons: vi.fn(async () => ({
    items: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
  })),
  mockCreatePerson: vi.fn(async () => ({ id: "person-new" })),
  mockDeletePerson: vi.fn(async () => ({ success: true })),
}));

vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthGetSessionWithUser: mockSession,
}));

vi.mock("@vamsa/lib/server/business/api-tokens", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, verifyApiTokenData: mockVerify };
});

vi.mock("@vamsa/lib/server/business", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createApiTokenData: mockCreate,
    listApiTokensData: mockList,
    revokeApiTokenData: mockRevoke,
    listPersonsData: mockListPersons,
    createPersonData: mockCreatePerson,
    deletePersonData: mockDeletePerson,
  };
});

function user(role: Role) {
  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@example.com`,
    name: role,
    role,
    personId: null,
    mustChangePassword: false,
    profileClaimStatus: "CLAIMED",
    oidcProvider: null,
  };
}

const PAT = "vms_testtoken";
const patHeaders = { Authorization: `Bearer ${PAT}` };

function withToken(role: Role, scope: Scope) {
  mockVerify.mockImplementation(async (token: string) =>
    token === PAT ? { tokenId: "tok-1", scope, user: user(role) } : null
  );
}

const now = new Date("2026-01-01T00:00:00Z");
const summary = {
  id: "tok-1",
  name: "laptop",
  prefix: "vms_abcdef",
  scope: "read",
  expiresAt: null,
  lastUsedAt: null,
  revokedAt: null,
  createdAt: now,
};

beforeEach(() => {
  vi.clearAllMocks();
  initializeRateLimitStore(new MemoryRateLimitStore());
  mockSession.mockResolvedValue(null);
  mockVerify.mockResolvedValue(null);
  mockList.mockResolvedValue([summary]);
  mockCreate.mockImplementation(
    async (_u: string, input: { scope: string }) => ({
      ...summary,
      scope: input.scope,
      token: "vms_plaintext",
    })
  );
  mockRevoke.mockImplementation(async (_u: string, id: string) => ({
    id,
    revoked: id === "tok-1",
  }));
});

const post = (path: string, body: unknown, headers = {}) =>
  apiV1.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

describe("/tokens router", () => {
  test("requires authentication", async () => {
    expect((await apiV1.request("/tokens")).status).toBe(401);
  });

  test("lists only the caller's tokens, without hashes", async () => {
    mockSession.mockResolvedValue(user("MEMBER"));
    const res = await apiV1.request("/tokens");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(mockList).toHaveBeenCalledWith("user-member");
    expect(body.total).toBe(1);
    expect(body.items[0]).toMatchObject({ id: "tok-1", prefix: "vms_abcdef" });
    expect(body.items[0]).not.toHaveProperty("tokenHash");
    expect(body.items[0].createdAt).toBe(now.toISOString());
  });

  test("creates a token and returns the plaintext once", async () => {
    mockSession.mockResolvedValue(user("MEMBER"));
    const res = await post("/tokens", {
      name: "laptop",
      scope: "write",
      expiresInDays: 30,
    });
    expect(res.status).toBe(201);
    expect((await res.json()).token).toBe("vms_plaintext");
    expect(mockCreate).toHaveBeenCalledWith("user-member", {
      name: "laptop",
      scope: "write",
      expiresInDays: 30,
    });
  });

  test("defaults scope to read", async () => {
    mockSession.mockResolvedValue(user("VIEWER"));
    const res = await post("/tokens", { name: "ro" });
    expect(res.status).toBe(201);
    expect(mockCreate.mock.calls[0][1]).toMatchObject({ scope: "read" });
  });

  test("rejects a scope above the caller's role", async () => {
    mockSession.mockResolvedValue(user("MEMBER"));
    const res = await post("/tokens", { name: "x", scope: "admin" });
    expect(res.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test.each(["read", "admin"] as const)(
    "a %s-scope token cannot create tokens (sessions only)",
    async (scope) => {
      withToken("ADMIN", scope);
      const res = await post(
        "/tokens",
        { name: "x", scope: "read" },
        patHeaders
      );
      expect(res.status).toBe(403);
      expect((await res.json()).details).toMatch(/password login/);
      expect(mockCreate).not.toHaveBeenCalled();
    }
  );

  test("a token cannot revoke tokens", async () => {
    withToken("ADMIN", "admin");
    const res = await apiV1.request("/tokens/tok-1", {
      method: "DELETE",
      headers: patHeaders,
    });
    expect(res.status).toBe(403);
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  test("a token can still list its user's tokens", async () => {
    withToken("VIEWER", "read");
    expect(
      (await apiV1.request("/tokens", { headers: patHeaders })).status
    ).toBe(200);
  });

  test("expiresInDays: null is accepted (no expiry)", async () => {
    mockSession.mockResolvedValue(user("MEMBER"));
    const res = await post("/tokens", { name: "ci", expiresInDays: null });
    expect(res.status).toBe(201);
    expect(mockCreate.mock.calls[0][1]).toMatchObject({ expiresInDays: null });
  });

  test("rejects invalid scope and empty name", async () => {
    mockSession.mockResolvedValue(user("ADMIN"));
    expect((await post("/tokens", { name: "x", scope: "root" })).status).toBe(
      400
    );
    expect((await post("/tokens", { name: "  " })).status).toBe(400);
  });

  test("revoke is scoped to the caller and idempotent", async () => {
    mockSession.mockResolvedValue(user("VIEWER"));
    const first = await apiV1.request("/tokens/tok-1", { method: "DELETE" });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ id: "tok-1", revoked: true });
    expect(mockRevoke).toHaveBeenCalledWith("user-viewer", "tok-1");

    const missing = await apiV1.request("/tokens/gone", { method: "DELETE" });
    expect(missing.status).toBe(200);
    expect(await missing.json()).toEqual({ id: "gone", revoked: false });
  });
});

describe("PAT authorization (role capped by scope)", () => {
  test("unknown or revoked PAT gets 401 and never falls back to session", async () => {
    mockSession.mockResolvedValue(user("ADMIN"));
    const res = await apiV1.request("/persons", {
      headers: { Authorization: "Bearer vms_wrong" },
    });
    expect(res.status).toBe(401);
    expect(mockSession).not.toHaveBeenCalled();
  });

  test("read scope can GET", async () => {
    withToken("ADMIN", "read");
    const res = await apiV1.request("/persons", { headers: patHeaders });
    expect(res.status).toBe(200);
  });

  test("ADMIN user with read scope cannot POST", async () => {
    withToken("ADMIN", "read");
    const res = await post(
      "/persons",
      { firstName: "A", lastName: "B", isLiving: true },
      patHeaders
    );
    expect(res.status).toBe(403);
    expect(mockCreatePerson).not.toHaveBeenCalled();
  });

  test("ADMIN user with write scope can POST but not DELETE", async () => {
    withToken("ADMIN", "write");
    const created = await post(
      "/persons",
      { firstName: "A", lastName: "B", isLiving: true },
      patHeaders
    );
    expect(created.status).not.toBe(403);
    expect(created.status).not.toBe(401);

    const del = await apiV1.request("/persons/p1", {
      method: "DELETE",
      headers: patHeaders,
    });
    expect(del.status).toBe(403);
    expect(mockDeletePerson).not.toHaveBeenCalled();
  });

  test("a demoted admin's admin-scope token is capped at the new role", async () => {
    withToken("MEMBER", "admin");
    const del = await apiV1.request("/persons/p1", {
      method: "DELETE",
      headers: patHeaders,
    });
    expect(del.status).toBe(403);
    expect(mockDeletePerson).not.toHaveBeenCalled();
  });

  test("admin scope cannot raise a VIEWER user above VIEWER", async () => {
    withToken("VIEWER", "admin");
    const del = await apiV1.request("/persons/p1", {
      method: "DELETE",
      headers: patHeaders,
    });
    expect(del.status).toBe(403);
  });

  test("ADMIN user with admin scope can DELETE", async () => {
    withToken("ADMIN", "admin");
    const del = await apiV1.request("/persons/p1", {
      method: "DELETE",
      headers: patHeaders,
    });
    expect(del.status).not.toBe(403);
    expect(mockDeletePerson).toHaveBeenCalled();
  });

  test("non-vms bearer tokens still go through the session path", async () => {
    mockSession.mockResolvedValue(user("VIEWER"));
    const res = await apiV1.request("/persons", {
      headers: { Authorization: "Bearer session-token" },
    });
    expect(res.status).toBe(200);
    expect(mockVerify).not.toHaveBeenCalled();
  });
});

describe("GET /auth/me", () => {
  test("returns 401 without credentials", async () => {
    expect((await apiV1.request("/auth/me")).status).toBe(401);
  });

  test("reports the scope-capped role for a PAT", async () => {
    withToken("ADMIN", "read");
    const res = await apiV1.request("/auth/me", { headers: patHeaders });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: "user-admin",
      role: "VIEWER",
      tokenScope: "read",
    });
  });

  test("reports session users with tokenScope null", async () => {
    mockSession.mockResolvedValue(user("MEMBER"));
    const res = await apiV1.request("/auth/me");
    expect(await res.json()).toMatchObject({
      role: "MEMBER",
      tokenScope: null,
    });
  });
});
