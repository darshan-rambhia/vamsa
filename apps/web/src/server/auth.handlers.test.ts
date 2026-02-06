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
  getSessionHandler,
  getUnclaimedProfilesHandler,
  logoutHandler,
} from "./auth.server";

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
  mockBetterAuthGetSessionWithUserFromCookie,
  mockGetCookie,
  mockSetCookie,
  mockDeleteCookie,
  mockGetHeaders,
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
  mockBetterAuthGetSessionWithUserFromCookie: vi.fn(
    async (_cookie: string | undefined) => {
      return null as any;
    }
  ),
  // TanStack Start server mocks
  mockGetCookie: vi.fn((_name: string): string | undefined => undefined),
  mockSetCookie: vi.fn(),
  mockDeleteCookie: vi.fn(),
  mockGetHeaders: vi.fn(() => ({})),
}));

// Mock TanStack Start server functions
vi.mock("@tanstack/react-start/server", () => ({
  getCookie: mockGetCookie,
  setCookie: mockSetCookie,
  deleteCookie: mockDeleteCookie,
  getHeaders: mockGetHeaders,
}));

// Mock the business logic modules
// IMPORTANT: Must come BEFORE importing @test/server-fn-context, otherwise
// server-fn-context.ts's vi.mock() calls will take precedence
vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthChangePassword: mockBetterAuthChangePassword,
  betterAuthSignOut: mockBetterAuthSignOut,
  getBetterAuthProviders: mockGetBetterAuthProviders,
  betterAuthGetSessionWithUserFromCookie:
    mockBetterAuthGetSessionWithUserFromCookie,
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
  betterAuthGetSessionWithUser: async () => {
    throw new Error("betterAuthGetSessionWithUser: Not implemented in test");
  },
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
}

async function withContext<T>(
  context: TestContext,
  fn: () => T | Promise<T>
): Promise<T> {
  // Setup mocks for this context
  mockGetCookie.mockImplementation((name: string): string | undefined => {
    if (context.cookies && name in context.cookies) {
      return context.cookies[name];
    }
    if (context.user && name === "better-auth.session_token") {
      return `stub-session-${context.user.id}`;
    }
    return undefined;
  });

  mockBetterAuthGetSessionWithUserFromCookie.mockImplementation(
    async () => (context.user ?? null) as any
  );

  try {
    return await fn();
  } finally {
    // Cleanup is handled by beforeEach/afterEach
  }
}

// =============================================================================
// Handler Tests
// =============================================================================

describe("Auth Handlers", () => {
  beforeEach(() => {
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
    resetRateLimit("claimProfile", "127.0.0.1");
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
      password: "password123",
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
        "password123"
      );
    });

    it("validates input with schema", async () => {
      // Invalid email should be rejected by schema
      await expect(
        withContext({}, () =>
          claimProfileHandler({
            email: "not-an-email",
            personId: "person-1",
            password: "password123",
          })
        )
      ).rejects.toThrow();
    });
  });

  describe("changePasswordHandler", () => {
    const validPasswordData = {
      currentPassword: "oldpassword123",
      newPassword: "newpassword456",
      confirmPassword: "newpassword456",
    };

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
