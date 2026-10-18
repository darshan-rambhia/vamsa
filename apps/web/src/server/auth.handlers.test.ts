/**
 * Unit tests for auth server function handlers
 *
 * Tests the handler implementations in auth.server.ts using
 * withStubbedServerContext for isolated testing.
 *
 * Note: This file is separate from auth.test.ts to keep schema/i18n tests
 * isolated from handler tests that require mocking.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Now we can import test utilities (but we'll implement our own context helper)
import { testUsers } from "@test/server-fn-fixtures";
import { resetRateLimit } from "./middleware/rate-limiter";
import {
  changePasswordHandler,
  checkAuthHandler,
  claimProfileHandler,
  getAvailableProvidersHandler,
  getRegistrationStatusHandler,
  getSessionHandler,
  getUnclaimedProfilesHandler,
  logoutHandler,
} from "./auth.server";
import type { MockAuthUser } from "@test/server-fn-fixtures";

// =============================================================================
// Mocks for Handler Tests
// =============================================================================

// Create mock functions using vi.hoisted to ensure they're available in vi.mock factories
const {
  mockGetUnclaimedProfilesData,
  mockClaimProfileData,
  mockBetterAuthChangePassword,
  mockBetterAuthSignOut,
  mockGetBetterAuthProviders,
  mockBetterAuthGetSessionWithUser,
  mockGetRequestHeaders,
} = vi.hoisted(() => ({
  mockGetUnclaimedProfilesData: vi.fn(async () => [
    { id: "person-1", firstName: "John", lastName: "Doe" },
    { id: "person-2", firstName: "Jane", lastName: "Smith" },
  ]),
  mockClaimProfileData: vi.fn(async () => ({
    userId: "new-user-id",
    success: true,
  })),
  mockBetterAuthChangePassword: vi.fn(async () => undefined),
  mockBetterAuthSignOut: vi.fn(async () => undefined),
  mockGetBetterAuthProviders: vi.fn(() => ({
    google: true,
    github: false,
    microsoft: false,
    oidc: true,
  })),
  mockBetterAuthGetSessionWithUser: vi.fn(
    async (_headers: Headers): Promise<any> => null
  ),
  // Mirrors the real request-header API; cookies are read from the test context
  mockGetRequestHeaders: vi.fn((): Headers => new Headers()),
}));

// Mock TanStack Start server functions
vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: mockGetRequestHeaders,
  getRequestHeader: (name: string) =>
    mockGetRequestHeaders().get(name) ?? undefined,
}));

// Mock the business logic modules
// IMPORTANT: Must come BEFORE importing @test/server-fn-context, otherwise
// server-fn-context.ts's vi.mock() calls will take precedence
vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthChangePassword: mockBetterAuthChangePassword,
  betterAuthSignOut: mockBetterAuthSignOut,
  getBetterAuthProviders: mockGetBetterAuthProviders,
  betterAuthGetSessionWithUser: mockBetterAuthGetSessionWithUser,
  // Stubs for functions not used in these tests
  betterAuthLogin: async () => {
    throw new Error("betterAuthLogin: Not implemented in test");
  },
  betterAuthRegister: async () => {
    throw new Error("betterAuthRegister: Not implemented in test");
  },
  betterAuthGetSession: async () => {
    throw new Error("betterAuthGetSession: Not implemented in test");
  },
}));

// requireAuth runs for real: it reads the session through the stubbed
// auth-better-api above, then loads the user row. The row comes from the
// user set by withContext below.
const { mockCurrentUser } = vi.hoisted(() => ({
  mockCurrentUser: { value: null as MockAuthUser | null },
}));

vi.mock("@vamsa/lib/server/db", () => ({
  drizzleDb: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () =>
            mockCurrentUser.value ? [mockCurrentUser.value] : [],
        }),
      }),
    }),
  },
  drizzleSchema: { users: { id: "id" } },
}));

vi.mock("@vamsa/lib/server/business/auth", () => ({
  getUnclaimedProfilesData: mockGetUnclaimedProfilesData,
  claimProfileData: mockClaimProfileData,
}));

// =============================================================================
// Test Context Helper
// =============================================================================

/**
 * Minimal context helper that uses our local mocks
 */
interface TestContext {
  user?: (typeof testUsers)[keyof typeof testUsers] | null;
  cookies?: Record<string, string>;
  /** Session cookie name to send (defaults to the plain HTTP name) */
  sessionCookieName?: string;
}

async function withContext<T>(
  context: TestContext,
  fn: () => T | Promise<T>
): Promise<T> {
  // Request headers carry the session cookie under the name Better Auth uses.
  // Over HTTPS that is the `__Secure-` prefixed variant.
  mockGetRequestHeaders.mockImplementation(() => {
    const headers = new Headers();
    const pairs = Object.entries(context.cookies ?? {}).map(
      ([k, v]) => `${k}=${v}`
    );
    if (context.user) {
      pairs.push(
        `${context.sessionCookieName ?? "better-auth.session_token"}=stub-session-${context.user.id}`
      );
    }
    if (pairs.length > 0) headers.set("cookie", pairs.join("; "));
    return headers;
  });

  mockCurrentUser.value = context.user ?? null;

  // Simulate Better Auth: only resolve when a recognised session cookie is sent
  mockBetterAuthGetSessionWithUser.mockImplementation(
    async (headers: Headers) => {
      const cookie = headers.get("cookie") ?? "";
      const hasSession =
        /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/.test(cookie);
      return hasSession ? (context.user ?? null) : null;
    }
  );

  return await fn();
}

// =============================================================================
// Handler Tests
// =============================================================================

describe("Auth Handlers", () => {
  beforeEach(async () => {
    // Clear all mock call history
    vi.clearAllMocks();

    // Reset mock implementations to defaults
    mockGetUnclaimedProfilesData.mockResolvedValue([
      { id: "person-1", firstName: "John", lastName: "Doe" },
      { id: "person-2", firstName: "Jane", lastName: "Smith" },
    ]);

    mockClaimProfileData.mockResolvedValue({
      userId: "new-user-id",
      success: true,
    });

    mockBetterAuthChangePassword.mockResolvedValue(undefined);
    mockBetterAuthSignOut.mockResolvedValue(undefined);
    mockGetBetterAuthProviders.mockReturnValue({
      google: true,
      github: false,
      microsoft: false,
      oidc: true,
    });

    // Reset rate limits to ensure clean state for each test
    await resetRateLimit("claimProfile", "127.0.0.1");
  });

  afterEach(() => {
    // Restore all mocks to their default state
    vi.restoreAllMocks();
  });

  describe("getUnclaimedProfilesHandler", () => {
    it("returns unclaimed profiles", async () => {
      const result = await withContext({}, () => getUnclaimedProfilesHandler());

      expect(result).toHaveLength(2);
      expect(result[0].firstName).toBe("John");
      expect(mockGetUnclaimedProfilesData).toHaveBeenCalledTimes(1);
    });
  });

  describe("claimProfileHandler", () => {
    const validClaimData = {
      email: "john@example.com",
      personId: "person-1",
      password: "SecurePass1!",
    };

    it("claims profile with valid data", async () => {
      const result = await withContext({}, () =>
        claimProfileHandler(validClaimData)
      );

      expect(result.userId).toBe("new-user-id");
      expect(result.success).toBe(true);
      expect(mockClaimProfileData).toHaveBeenCalledWith(
        "john@example.com",
        "person-1",
        "SecurePass1!"
      );
    });

    it("validates input with schema", async () => {
      // Invalid email should be rejected by schema
      await expect(
        withContext({}, () =>
          claimProfileHandler({
            email: "not-an-email",
            personId: "person-1",
            password: "SecurePass1!",
          })
        )
      ).rejects.toThrow();
    });
  });

  describe("changePasswordHandler", () => {
    const validPasswordData = {
      currentPassword: "oldpassword123",
      newPassword: "NewPassword1!",
      confirmPassword: "NewPassword1!",
    };

    it("rejects unauthenticated callers before touching the password", async () => {
      mockBetterAuthChangePassword.mockClear();
      await expect(
        withContext({}, () => changePasswordHandler(validPasswordData))
      ).rejects.toThrow("Please log in to continue");
      expect(mockBetterAuthChangePassword).not.toHaveBeenCalled();
    });

    it("changes password for authenticated user", async () => {
      const result = await withContext({ user: testUsers.member }, () =>
        changePasswordHandler(validPasswordData)
      );

      expect(result.success).toBe(true);
      expect(mockBetterAuthChangePassword).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSessionHandler", () => {
    it("returns user when authenticated", async () => {
      const result = await withContext({ user: testUsers.viewer }, () =>
        getSessionHandler()
      );

      expect(result).not.toBeNull();
      expect(result?.email).toBe(testUsers.viewer.email);
    });

    it("returns null when not authenticated", async () => {
      const result = await withContext({}, () => getSessionHandler());

      expect(result).toBeNull();
    });

    it("resolves the session from the __Secure- prefixed cookie (HTTPS)", async () => {
      const result = await withContext(
        {
          user: testUsers.viewer,
          sessionCookieName: "__Secure-better-auth.session_token",
        },
        () => getSessionHandler()
      );

      expect(result?.email).toBe(testUsers.viewer.email);
      const passed = mockBetterAuthGetSessionWithUser.mock.calls[0]?.[0];
      expect(passed?.get("cookie")).toContain(
        "__Secure-better-auth.session_token="
      );
    });
  });

  describe("checkAuthHandler", () => {
    it("returns valid true with user when authenticated", async () => {
      const result = await withContext({ user: testUsers.admin }, () =>
        checkAuthHandler()
      );

      expect(result.valid).toBe(true);
      expect(result.user).not.toBeNull();
      expect(result.user?.role).toBe("ADMIN");
    });

    it("returns valid false when not authenticated", async () => {
      const result = await withContext({}, () => checkAuthHandler());

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });
  });

  describe("logoutHandler", () => {
    it("logs out authenticated user", async () => {
      const result = await withContext({ user: testUsers.member }, () =>
        logoutHandler()
      );

      expect(result.success).toBe(true);
      expect(mockBetterAuthSignOut).toHaveBeenCalledTimes(1);
    });

    it("succeeds even without active session", async () => {
      const result = await withContext({}, () => logoutHandler());

      expect(result.success).toBe(true);
    });
  });

  describe("getRegistrationStatusHandler", () => {
    const original = process.env.ALLOW_SELF_SIGNUP;
    afterEach(() => {
      if (original === undefined) delete process.env.ALLOW_SELF_SIGNUP;
      else process.env.ALLOW_SELF_SIGNUP = original;
    });

    it("reports invite-only when ALLOW_SELF_SIGNUP=false", async () => {
      process.env.ALLOW_SELF_SIGNUP = "false";
      expect(await getRegistrationStatusHandler()).toEqual({
        selfSignupEnabled: false,
      });
    });

    it("reports open when ALLOW_SELF_SIGNUP=true", async () => {
      process.env.ALLOW_SELF_SIGNUP = "true";
      expect(await getRegistrationStatusHandler()).toEqual({
        selfSignupEnabled: true,
      });
    });
  });

  describe("getAvailableProvidersHandler", () => {
    it("returns available auth providers", async () => {
      const result = await withContext({}, () =>
        getAvailableProvidersHandler()
      );

      expect(result.google).toBe(true);
      expect(result.github).toBe(false);
      expect(result.oidc).toBe(true);
      expect(mockGetBetterAuthProviders).toHaveBeenCalledTimes(1);
    });
  });
});
