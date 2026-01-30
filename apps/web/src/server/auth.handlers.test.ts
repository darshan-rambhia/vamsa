/**
 * Unit tests for auth server function handlers
 *
 * Tests the handler implementations in auth.server.ts using
 * withStubbedServerContext for isolated testing.
 *
 * Note: This file is separate from auth.test.ts to keep schema/i18n tests
 * isolated from handler tests that require mocking.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  getStubbedSession,
  testUsers,
  withStubbedServerContext,
} from "@test/server-fn-context";
import { resetRateLimit } from "./middleware/rate-limiter";

// Import handlers AFTER setting up mocks
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

const mockGetUnclaimedProfilesData = mock(async () => [
  { id: "person-1", firstName: "John", lastName: "Doe" },
  { id: "person-2", firstName: "Jane", lastName: "Smith" },
]);

const mockClaimProfileData = mock(async () => ({
  userId: "new-user-id",
  success: true,
}));

const mockBetterAuthChangePassword = mock(async () => undefined);

const mockBetterAuthSignOut = mock(async () => undefined);

const mockGetBetterAuthProviders = mock(() => ({
  google: true,
  github: false,
  microsoft: false,
  oidc: true,
}));

// Note: We intentionally do NOT mock rate-limiter to avoid mock.module
// conflicts with rate-limiter.test.ts. Instead, we reset rate limits in
// beforeEach and let the real rate limiter run.

mock.module("@vamsa/lib/server/business", () => ({
  getUnclaimedProfilesData: mockGetUnclaimedProfilesData,
  claimProfileData: mockClaimProfileData,
  betterAuthChangePassword: mockBetterAuthChangePassword,
  betterAuthSignOut: mockBetterAuthSignOut,
  getBetterAuthProviders: mockGetBetterAuthProviders,
  betterAuthGetSessionWithUserFromCookie: getStubbedSession,
}));

// =============================================================================
// Handler Tests
// =============================================================================

describe("Auth Handlers", () => {
  beforeEach(() => {
    mockGetUnclaimedProfilesData.mockClear();
    mockClaimProfileData.mockClear();
    mockBetterAuthChangePassword.mockClear();
    mockBetterAuthSignOut.mockClear();
    mockGetBetterAuthProviders.mockClear();
    // Reset rate limits to ensure clean state for each test
    resetRateLimit("claimProfile", "127.0.0.1");
  });

  describe("getUnclaimedProfilesHandler", () => {
    it("returns unclaimed profiles", async () => {
      const { result } = await withStubbedServerContext({}, () =>
        getUnclaimedProfilesHandler()
      );

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
      const { result } = await withStubbedServerContext({}, () =>
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
        withStubbedServerContext({}, () =>
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
      const { result } = await withStubbedServerContext(
        { user: testUsers.member },
        () => changePasswordHandler(validPasswordData)
      );

      expect(result.success).toBe(true);
      expect(mockBetterAuthChangePassword).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSessionHandler", () => {
    it("returns user when authenticated", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.viewer },
        () => getSessionHandler()
      );

      expect(result).not.toBeNull();
      expect(result?.email).toBe(testUsers.viewer.email);
    });

    it("returns null when not authenticated", async () => {
      const { result } = await withStubbedServerContext({}, () =>
        getSessionHandler()
      );

      expect(result).toBeNull();
    });
  });

  describe("checkAuthHandler", () => {
    it("returns valid true with user when authenticated", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.admin },
        () => checkAuthHandler()
      );

      expect(result.valid).toBe(true);
      expect(result.user).not.toBeNull();
      expect(result.user?.role).toBe("ADMIN");
    });

    it("returns valid false when not authenticated", async () => {
      const { result } = await withStubbedServerContext({}, () =>
        checkAuthHandler()
      );

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });
  });

  describe("logoutHandler", () => {
    it("logs out authenticated user", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.member },
        () => logoutHandler()
      );

      expect(result.success).toBe(true);
      expect(mockBetterAuthSignOut).toHaveBeenCalledTimes(1);
    });

    it("succeeds even without active session", async () => {
      const { result } = await withStubbedServerContext({}, () =>
        logoutHandler()
      );

      expect(result.success).toBe(true);
    });
  });

  describe("getAvailableProvidersHandler", () => {
    it("returns available auth providers", async () => {
      const { result } = await withStubbedServerContext({}, () =>
        getAvailableProvidersHandler()
      );

      expect(result.google).toBe(true);
      expect(result.github).toBe(false);
      expect(result.oidc).toBe(true);
      expect(mockGetBetterAuthProviders).toHaveBeenCalledTimes(1);
    });
  });
});
