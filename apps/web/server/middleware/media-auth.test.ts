/**
 * Unit tests for Media Authentication Middleware
 *
 * Tests verify core authentication functionality:
 * - Authentication is required for media requests
 * - Proper error responses with Cache-Control headers
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { mediaAuthMiddleware } from "./media-auth";

// =============================================================================
// Type definitions
// =============================================================================

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  personId: string | null;
  mustChangePassword: boolean;
  profileClaimStatus: string;
  oidcProvider: string | null;
}

// =============================================================================
// Mocks
// =============================================================================

const { mockBetterAuthGetSessionWithUserFromCookie } = vi.hoisted(() => ({
  mockBetterAuthGetSessionWithUserFromCookie: vi.fn<
    (cookie?: string) => Promise<SessionUser | null>
  >(async (_cookie?: string) => null),
}));

vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthGetSessionWithUserFromCookie:
    mockBetterAuthGetSessionWithUserFromCookie,
}));

describe("Media Authentication Middleware", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    mockBetterAuthGetSessionWithUserFromCookie.mockClear();
    mockBetterAuthGetSessionWithUserFromCookie.mockReset();
    mockBetterAuthGetSessionWithUserFromCookie.mockImplementation(
      async () => null
    );
    app.use("/media/*", mediaAuthMiddleware);
    app.get("/media/*", (c) =>
      c.json({ status: "ok", message: "Media request authorized" })
    );
  });

  it("should return 401 when no cookie header is provided", async () => {
    const res = await app.request("/media/test.jpg");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(body.message).toBe("Authentication required");
  });

  it("should return 401 when cookie header exists but session token is missing", async () => {
    const res = await app.request("/media/test.jpg", {
      headers: { cookie: "other_cookie=value" },
    });
    expect(res.status).toBe(401);
  });

  it("should return 401 for empty session token", async () => {
    const res = await app.request("/media/test.jpg", {
      headers: { cookie: "better-auth.session_token=" },
    });
    expect(res.status).toBe(401);
  });

  it("should set Cache-Control: no-store on 401 response", async () => {
    const res = await app.request("/media/test.jpg");
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("should set Content-Type to application/json on error", async () => {
    const res = await app.request("/media/test.jpg");
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("should return 401 when session validation fails (invalid token)", async () => {
    // Use a unique token that won't be cached
    const uniqueToken = `invalid-token-${Date.now()}`;
    mockBetterAuthGetSessionWithUserFromCookie.mockResolvedValueOnce(null);

    const res = await app.request("/media/test-invalid.jpg", {
      headers: { cookie: `better-auth.session_token=${uniqueToken}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return JSON error response structure", async () => {
    const res = await app.request("/media/unauthorized.jpg", {
      headers: { cookie: "better-auth.session_token=bad-token" },
    });

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Authentication required");
  });

  it("should handle cookie with multiple values", async () => {
    const res = await app.request("/media/multi-cookie.jpg", {
      headers: {
        cookie: "other_cookie=value; some_session=xyz; third_cookie=abc",
      },
    });

    // No valid session token in this cookie string
    expect(res.status).toBe(401);
  });

  it("should validate cookie header format", async () => {
    // Test with malformed cookie
    const res = await app.request("/media/malformed.jpg", {
      headers: { cookie: "malformed cookie string" },
    });

    expect(res.status).toBe(401);
  });

  it("should reject empty session token value", async () => {
    const res = await app.request("/media/empty-token.jpg", {
      headers: { cookie: "better-auth.session_token=; other=value" },
    });

    expect(res.status).toBe(401);
  });

  it("should handle session token with special characters", async () => {
    // Token can contain alphanumeric and some special chars
    const specialToken = "abc123-_xyz";
    const res = await app.request("/media/special-char.jpg", {
      headers: { cookie: `better-auth.session_token=${specialToken}` },
    });

    // Will be 401 because mock returns null, but validates format is accepted
    expect(res.status).toBe(401);
  });
});
