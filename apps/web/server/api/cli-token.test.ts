/**
 * CLI login token flow
 *
 * Login with `X-Vamsa-Client: cli` returns the Better Auth session token, and
 * that token sent as `Authorization: Bearer` passes requireApiAuth on a
 * protected route. Login and session lookup are stubbed: login issues a token
 * and the session lookup accepts only that token in the Authorization header,
 * proving the middleware forwards the bearer header. Better Auth's bearer()
 * plugin itself is exercised in the dev-server runtime check.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { initializeRateLimitStore } from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";
import apiV1 from "./index";

const ISSUED_TOKEN = "sess_tok_abc123";

const { mockLogin, mockSession, mockListPersons } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockSession: vi.fn(),
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
}));

vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthGetSessionWithUser: mockSession,
}));

vi.mock("@vamsa/lib/server/business", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    betterAuthLogin: mockLogin,
    listPersonsData: mockListPersons,
  };
});

const user = {
  id: "user-1",
  email: "cli@example.com",
  name: "CLI User",
  role: "MEMBER",
  isActive: true,
};

function login(headers: Record<string, string> = {}) {
  return apiV1.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ email: user.email, password: "Password123!" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  initializeRateLimitStore(new MemoryRateLimitStore());
  mockLogin.mockResolvedValue({ token: ISSUED_TOKEN, user });
  mockSession.mockImplementation(async (headers: Headers) =>
    headers.get("authorization") === `Bearer ${ISSUED_TOKEN}`
      ? { ...user, personId: null, mustChangePassword: false }
      : null
  );
});

describe("CLI login token", () => {
  test("cli client receives the session token", async () => {
    const res = await login({ "X-Vamsa-Client": "cli" });
    expect(res.status).toBe(200);
    expect((await res.json()).token).toBe(ISSUED_TOKEN);
  });

  test("web client (no header) still gets an empty token", async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect((await res.json()).token).toBe("");
  });

  test("returned token works as a Bearer token on a protected route", async () => {
    const { token } = await (await login({ "X-Vamsa-Client": "cli" })).json();

    const res = await apiV1.request("/persons", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(mockListPersons).toHaveBeenCalled();
  });

  test("wrong Bearer token is rejected with 401", async () => {
    const res = await apiV1.request("/persons", {
      headers: { Authorization: "Bearer not-the-token" },
    });
    expect(res.status).toBe(401);
    expect(mockListPersons).not.toHaveBeenCalled();
  });
});
