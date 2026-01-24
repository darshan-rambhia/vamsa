/**
 * Unit tests for Better Auth API wrapper functions
 *
 * Tests cover:
 * - betterAuthLogin: email/password login with headers handling
 * - betterAuthRegister: new user registration with headers handling
 * - betterAuthGetSession: session retrieval with null handling
 * - betterAuthChangePassword: password change with error handling
 * - betterAuthSignOut: session invalidation
 * - betterAuthGetSessionWithUserFromCookie: cookie parsing and user field extraction
 * - betterAuthGetSessionWithUser: headers-based session with user field extraction
 * - getBetterAuthProviders: environment variable checking
 * - headersToObject: Headers to plain object conversion
 */

import { describe, it, expect, beforeEach, mock, afterEach } from "bun:test";
import { mockLogger, clearAllMocks } from "../../testing/shared-mocks";

// Mock the logger before importing the module
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
}));

// Mock auth module
const mockBetterAuthApi = {
  signInEmail: mock(async () => ({
    user: { id: "user1" },
    session: {
      id: "session1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      expiresAt: new Date(),
      token: "token1",
    },
  })) as any,
  signUpEmail: mock(async () => ({
    user: { id: "user2" },
    session: {
      id: "session2",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user2",
      expiresAt: new Date(),
      token: "token2",
    },
  })) as any,
  getSession: mock(async () => ({
    user: { id: "user1" },
    session: {
      id: "session1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      expiresAt: new Date(),
      token: "token1",
    },
  })) as any,
  changePassword: mock(async () => ({ success: true })) as any,
  signOut: mock(async () => undefined) as any,
};

mock.module("./auth-better", () => ({
  auth: {
    api: mockBetterAuthApi,
  },
}));

// Import after mocks are set up
import {
  betterAuthLogin,
  betterAuthRegister,
  betterAuthGetSession,
  betterAuthChangePassword,
  betterAuthSignOut,
  betterAuthGetSessionWithUserFromCookie,
  betterAuthGetSessionWithUser,
  getBetterAuthProviders,
} from "./auth-better-api";

describe("auth-better-api", () => {
  beforeEach(() => {
    clearAllMocks();
    mockBetterAuthApi.signInEmail.mockClear();
    mockBetterAuthApi.signUpEmail.mockClear();
    mockBetterAuthApi.getSession.mockClear();
    mockBetterAuthApi.changePassword.mockClear();
    mockBetterAuthApi.signOut.mockClear();
  });

  describe("headersToObject", () => {
    it("should convert Headers to plain object", async () => {
      const headers = new Headers({
        "content-type": "application/json",
        "x-custom": "value",
      });

      mockBetterAuthApi.getSession.mockResolvedValueOnce({
        user: { id: "user1" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      });

      await betterAuthGetSession(headers);

      expect(mockBetterAuthApi.getSession).toHaveBeenCalled();
      const callArgs = (mockBetterAuthApi.getSession.mock.calls as any)[0]?.[0];
      expect(callArgs?.headers).toEqual({
        "content-type": "application/json",
        "x-custom": "value",
      });
    });

    it("should handle undefined headers", async () => {
      mockBetterAuthApi.signInEmail.mockResolvedValueOnce({
        user: { id: "user1" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      });

      await betterAuthLogin("user@test.com", "password");

      const callArgs = (
        mockBetterAuthApi.signInEmail.mock.calls as any
      )[0]?.[0];
      expect(callArgs?.headers).toEqual({});
    });

    it("should handle empty Headers", async () => {
      const headers = new Headers();

      mockBetterAuthApi.getSession.mockResolvedValueOnce({
        user: { id: "user1" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      });

      await betterAuthGetSession(headers);

      const callArgs = (mockBetterAuthApi.getSession.mock.calls as any)[0]?.[0];
      expect(callArgs?.headers).toEqual({});
    });
  });

  describe("betterAuthLogin", () => {
    it("should login user with valid credentials", async () => {
      const mockResult = {
        user: { id: "user1", email: "test@example.com" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      };
      mockBetterAuthApi.signInEmail.mockResolvedValueOnce(mockResult);

      const result = await betterAuthLogin("test@example.com", "password123");

      expect(result as any).toEqual(mockResult);
      expect(mockBetterAuthApi.signInEmail).toHaveBeenCalledWith({
        body: { email: "test@example.com", password: "password123" },
        headers: {},
      });
    });

    it("should pass headers to auth API", async () => {
      const headers = new Headers({ cookie: "session=abc" });
      const mockResult = {
        user: { id: "user1" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      };
      mockBetterAuthApi.signInEmail.mockResolvedValueOnce(mockResult);

      await betterAuthLogin("test@example.com", "password123", headers);

      const callArgs = (
        mockBetterAuthApi.signInEmail.mock.calls as any
      )[0]?.[0];
      expect(callArgs?.headers).toHaveProperty("cookie", "session=abc");
    });

    it("should throw error when login returns null", async () => {
      mockBetterAuthApi.signInEmail.mockResolvedValueOnce(null);

      let thrown = false;
      try {
        await betterAuthLogin("test@example.com", "password123");
      } catch (err) {
        thrown = true;
        expect(err).toEqual(new Error("Login failed"));
      }

      expect(thrown).toBe(true);
    });

    it("should log login attempt", async () => {
      mockBetterAuthApi.signInEmail.mockResolvedValueOnce({
        user: { id: "user1" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      });

      await betterAuthLogin("test@example.com", "password123");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { email: "test@example.com" },
        "Better Auth login attempt"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { email: "test@example.com" },
        "Better Auth login successful"
      );
    });

    it("should log warning on failed login", async () => {
      mockBetterAuthApi.signInEmail.mockResolvedValueOnce(null);

      try {
        await betterAuthLogin("test@example.com", "password123");
      } catch (_err) {
        // Expected
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { email: "test@example.com" },
        "Better Auth login failed - no result returned"
      );
    });
  });

  describe("betterAuthRegister", () => {
    it("should register new user with valid data", async () => {
      const mockResult = {
        user: { id: "user2", email: "new@example.com", name: "New User" },
        session: {
          id: "session2",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user2",
          expiresAt: new Date(),
          token: "token2",
        },
      };
      mockBetterAuthApi.signUpEmail.mockResolvedValueOnce(mockResult);

      const result = await betterAuthRegister(
        "new@example.com",
        "New User",
        "password123"
      );

      expect(result as any).toEqual(mockResult);
      expect(mockBetterAuthApi.signUpEmail).toHaveBeenCalledWith({
        body: {
          email: "new@example.com",
          name: "New User",
          password: "password123",
        },
        headers: {},
      });
    });

    it("should pass headers during registration", async () => {
      const headers = new Headers({ cookie: "session=abc" });
      mockBetterAuthApi.signUpEmail.mockResolvedValueOnce({
        user: { id: "user2" },
        session: {
          id: "session2",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user2",
          expiresAt: new Date(),
          token: "token2",
        },
      });

      await betterAuthRegister(
        "new@example.com",
        "New User",
        "password123",
        headers
      );

      const callArgs = (
        mockBetterAuthApi.signUpEmail.mock.calls as any
      )[0]?.[0];
      expect(callArgs?.headers).toHaveProperty("cookie", "session=abc");
    });

    it("should throw error when registration returns null", async () => {
      mockBetterAuthApi.signUpEmail.mockResolvedValueOnce(null);

      let thrown = false;
      try {
        await betterAuthRegister("new@example.com", "New User", "password123");
      } catch (err) {
        thrown = true;
        expect(err).toEqual(new Error("Registration failed"));
      }

      expect(thrown).toBe(true);
    });

    it("should log registration attempt", async () => {
      mockBetterAuthApi.signUpEmail.mockResolvedValueOnce({
        user: { id: "user2" },
        session: {
          id: "session2",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user2",
          expiresAt: new Date(),
          token: "token2",
        },
      });

      await betterAuthRegister("new@example.com", "New User", "password123");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { email: "new@example.com", name: "New User" },
        "Better Auth registration attempt"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { email: "new@example.com" },
        "Better Auth registration successful"
      );
    });
  });

  describe("betterAuthGetSession", () => {
    it("should return session data when valid session exists", async () => {
      const mockSession = {
        user: { id: "user1", email: "test@example.com" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      };
      mockBetterAuthApi.getSession.mockResolvedValueOnce(mockSession);

      const result = await betterAuthGetSession(new Headers());

      expect(result as any).toEqual(mockSession);
    });

    it("should return null when no session exists", async () => {
      mockBetterAuthApi.getSession.mockResolvedValueOnce(null);

      const result = await betterAuthGetSession(new Headers());

      expect(result).toBeNull();
    });

    it("should return null when session is undefined", async () => {
      mockBetterAuthApi.getSession.mockResolvedValueOnce(undefined);

      const result = await betterAuthGetSession(new Headers());

      expect(result).toBeNull();
    });

    it("should pass headers to auth API", async () => {
      const headers = new Headers({ cookie: "session=abc" });
      mockBetterAuthApi.getSession.mockResolvedValueOnce({
        user: { id: "user1" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      });

      await betterAuthGetSession(headers);

      const callArgs = (mockBetterAuthApi.getSession.mock.calls as any)[0]?.[0];
      expect(callArgs?.headers).toHaveProperty("cookie", "session=abc");
    });
  });

  describe("betterAuthChangePassword", () => {
    it("should change password successfully", async () => {
      mockBetterAuthApi.changePassword.mockResolvedValueOnce({ success: true });

      const result = await betterAuthChangePassword(
        "oldPassword",
        "newPassword",
        new Headers()
      );

      expect(result as any).toEqual({ success: true });
      expect(mockBetterAuthApi.changePassword).toHaveBeenCalledWith({
        body: { currentPassword: "oldPassword", newPassword: "newPassword" },
        headers: {},
      });
    });

    it("should throw error when password change returns null", async () => {
      mockBetterAuthApi.changePassword.mockResolvedValueOnce(null);

      let thrown = false;
      try {
        await betterAuthChangePassword(
          "oldPassword",
          "newPassword",
          new Headers()
        );
      } catch (err) {
        thrown = true;
        expect(err).toEqual(new Error("Password change failed"));
      }

      expect(thrown).toBe(true);
    });

    it("should log password change attempt", async () => {
      mockBetterAuthApi.changePassword.mockResolvedValueOnce({ success: true });

      await betterAuthChangePassword(
        "oldPassword",
        "newPassword",
        new Headers()
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Better Auth password change attempt"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Better Auth password changed successfully"
      );
    });
  });

  describe("betterAuthSignOut", () => {
    it("should sign out user", async () => {
      mockBetterAuthApi.signOut.mockResolvedValueOnce(undefined);

      await betterAuthSignOut(new Headers());

      expect(mockBetterAuthApi.signOut).toHaveBeenCalledWith({ headers: {} });
    });

    it("should pass headers during sign out", async () => {
      const headers = new Headers({ cookie: "session=abc" });
      mockBetterAuthApi.signOut.mockResolvedValueOnce(undefined);

      await betterAuthSignOut(headers);

      const callArgs = (mockBetterAuthApi.signOut.mock.calls as any)[0]?.[0];
      expect(callArgs?.headers).toHaveProperty("cookie", "session=abc");
    });

    it("should log sign out", async () => {
      mockBetterAuthApi.signOut.mockResolvedValueOnce(undefined);

      await betterAuthSignOut(new Headers());

      expect(mockLogger.debug).toHaveBeenCalledWith("Better Auth sign out");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Better Auth sign out successful"
      );
    });
  });

  describe("betterAuthGetSessionWithUserFromCookie", () => {
    it("should return null when no cookie provided", async () => {
      const result = await betterAuthGetSessionWithUserFromCookie();

      expect(result).toBeNull();
    });

    it("should return null when empty cookie provided", async () => {
      const result = await betterAuthGetSessionWithUserFromCookie("");

      expect(result).toBeNull();
    });

    it("should return session user with Vamsa fields", async () => {
      mockBetterAuthApi.getSession.mockResolvedValueOnce({
        user: {
          id: "user1",
          email: "test@example.com",
          name: "Test User",
          role: "ADMIN",
          personId: "person1",
          mustChangePassword: true,
          oidcProvider: "google",
          profileClaimStatus: "VERIFIED",
        },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      });

      const result =
        await betterAuthGetSessionWithUserFromCookie("session=abc");

      expect(result).toEqual({
        id: "user1",
        email: "test@example.com",
        name: "Test User",
        role: "ADMIN",
        personId: "person1",
        mustChangePassword: true,
        oidcProvider: "google",
        profileClaimStatus: "VERIFIED",
      });
    });

    it("should use default values for missing fields", async () => {
      mockBetterAuthApi.getSession.mockResolvedValueOnce({
        user: {
          id: "user2",
          email: "test2@example.com",
          name: "Test User 2",
        },
        session: {
          id: "session2",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user2",
          expiresAt: new Date(),
          token: "token2",
        },
      });

      const result =
        await betterAuthGetSessionWithUserFromCookie("session=xyz");

      expect(result).toEqual({
        id: "user2",
        email: "test2@example.com",
        name: "Test User 2",
        role: "VIEWER",
        personId: null,
        mustChangePassword: false,
        profileClaimStatus: "PENDING",
        oidcProvider: null,
      });
    });

    it("should return null when session has no user", async () => {
      mockBetterAuthApi.getSession.mockResolvedValueOnce({ session: {} });

      const result =
        await betterAuthGetSessionWithUserFromCookie("session=abc");

      expect(result).toBeNull();
    });

    it("should return null when session is null", async () => {
      mockBetterAuthApi.getSession.mockResolvedValueOnce(null);

      const result =
        await betterAuthGetSessionWithUserFromCookie("session=abc");

      expect(result).toBeNull();
    });

    it("should create Headers object with cookie", async () => {
      mockBetterAuthApi.getSession.mockResolvedValueOnce({
        user: { id: "user1", email: "test@example.com", name: "Test" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      });

      await betterAuthGetSessionWithUserFromCookie("session=xyz; path=/");

      const callArgs = (mockBetterAuthApi.getSession.mock.calls as any)[0]?.[0];
      expect(callArgs?.headers?.cookie).toBe("session=xyz; path=/");
    });
  });

  describe("betterAuthGetSessionWithUser", () => {
    it("should return session user with Vamsa fields", async () => {
      const headers = new Headers();
      mockBetterAuthApi.getSession.mockResolvedValueOnce({
        user: {
          id: "user1",
          email: "test@example.com",
          name: "Test User",
          role: "EDITOR",
          personId: "person1",
          mustChangePassword: false,
          profileClaimStatus: "VERIFIED",
          oidcProvider: "github",
        },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      });

      const result = await betterAuthGetSessionWithUser(headers);

      expect(result).toEqual({
        id: "user1",
        email: "test@example.com",
        name: "Test User",
        role: "EDITOR",
        personId: "person1",
        mustChangePassword: false,
        profileClaimStatus: "VERIFIED",
        oidcProvider: "github",
      });
    });

    it("should use default values for missing fields", async () => {
      const headers = new Headers();
      mockBetterAuthApi.getSession.mockResolvedValueOnce({
        user: {
          id: "user2",
          email: "test2@example.com",
          name: "Test User 2",
        },
        session: {
          id: "session2",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user2",
          expiresAt: new Date(),
          token: "token2",
        },
      });

      const result = await betterAuthGetSessionWithUser(headers);

      expect(result).toEqual({
        id: "user2",
        email: "test2@example.com",
        name: "Test User 2",
        role: "VIEWER",
        personId: null,
        mustChangePassword: false,
        profileClaimStatus: "PENDING",
        oidcProvider: null,
      });
    });

    it("should return null when no session exists", async () => {
      const headers = new Headers();
      mockBetterAuthApi.getSession.mockResolvedValueOnce(null);

      const result = await betterAuthGetSessionWithUser(headers);

      expect(result).toBeNull();
    });

    it("should return null when session has no user", async () => {
      const headers = new Headers();
      mockBetterAuthApi.getSession.mockResolvedValueOnce({ session: {} });

      const result = await betterAuthGetSessionWithUser(headers);

      expect(result).toBeNull();
    });

    it("should pass headers to auth API", async () => {
      const headers = new Headers({ cookie: "session=abc" });
      mockBetterAuthApi.getSession.mockResolvedValueOnce({
        user: { id: "user1", email: "test@example.com", name: "Test" },
        session: {
          id: "session1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user1",
          expiresAt: new Date(),
          token: "token1",
        },
      });

      await betterAuthGetSessionWithUser(headers);

      const callArgs = (mockBetterAuthApi.getSession.mock.calls as any)[0]?.[0];
      expect(callArgs?.headers).toHaveProperty("cookie", "session=abc");
    });
  });

  describe("getBetterAuthProviders", () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return all false when no providers configured", async () => {
      process.env = {};

      const providers = getBetterAuthProviders();

      expect(providers).toEqual({
        google: false,
        github: false,
        microsoft: false,
        oidc: false,
      });
    });

    it("should detect google provider", async () => {
      process.env = { GOOGLE_CLIENT_ID: "google-id" };

      const providers = getBetterAuthProviders();

      expect(providers.google).toBe(true);
      expect(providers.github).toBe(false);
    });

    it("should detect github provider", async () => {
      process.env = { GITHUB_CLIENT_ID: "github-id" };

      const providers = getBetterAuthProviders();

      expect(providers.github).toBe(true);
      expect(providers.google).toBe(false);
    });

    it("should detect microsoft provider", async () => {
      process.env = { MICROSOFT_CLIENT_ID: "microsoft-id" };

      const providers = getBetterAuthProviders();

      expect(providers.microsoft).toBe(true);
      expect(providers.google).toBe(false);
    });

    it("should detect oidc provider", async () => {
      process.env = { OIDC_DISCOVERY_URL: "https://auth.example.com" };

      const providers = getBetterAuthProviders();

      expect(providers.oidc).toBe(true);
      expect(providers.google).toBe(false);
    });

    it("should detect multiple providers", async () => {
      process.env = {
        GOOGLE_CLIENT_ID: "google-id",
        OIDC_DISCOVERY_URL: "https://auth.example.com",
      };

      const providers = getBetterAuthProviders();

      expect(providers).toEqual({
        google: true,
        github: false,
        microsoft: false,
        oidc: true,
      });
    });

    it("should return true for any non-empty provider value", async () => {
      process.env = {
        GOOGLE_CLIENT_ID: "1",
        GITHUB_CLIENT_ID: "",
      };

      const providers = getBetterAuthProviders();

      expect(providers.google).toBe(true);
      expect(providers.github).toBe(false);
    });
  });
});
