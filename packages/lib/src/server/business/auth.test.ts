/**
 * Unit tests for authentication server business logic
 *
 * Tests cover:
 * - Session token creation and verification
 * - User login with password validation
 * - Account lockout after failed attempts
 * - User registration with email validation
 * - Profile claiming by living persons
 * - Password changes with verification
 * - Error handling and validation
 * - Edge cases (expired sessions, disabled accounts, duplicate emails)
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { AuthDb } from "@vamsa/lib/server/business";

// Mock logger for this test file
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../testing/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

import {
  hashPassword,
  hashToken,
  createSessionToken,
  verifySessionToken,
  checkAccountLockout,
  loginUser,
  registerUser,
  claimProfileAsUser,
  changeUserPassword,
  TOKEN_COOKIE_NAME,
  TOKEN_MAX_AGE,
} from "@vamsa/lib/server/business";

// Create mock database client - no mock.module() needed!
function createMockDb(): AuthDb {
  return {
    session: {
      create: mock(() => Promise.resolve({})),
      findFirst: mock(() => Promise.resolve(null)),
      delete: mock(() => Promise.resolve({})),
    },
    user: {
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
    },
    person: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    familySettings: {
      findFirst: mock(() => Promise.resolve(null)),
    },
  } as unknown as AuthDb;
}

describe("Authentication Server Functions", () => {
  let mockDb: AuthDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();
  });

  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const password = "testPassword123!";
      const hash = await hashPassword(password);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);
    });

    it("should produce different hashes for same password", async () => {
      const password = "testPassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty password", async () => {
      const password = "";
      const hash = await hashPassword(password);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle long password", async () => {
      const password =
        "VeryLongPasswordWith123Numbers!@#$%^&*()_+-=[]{}|;:,.<>?abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const hash = await hashPassword(password);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle password with special characters", async () => {
      const password = "P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?";
      const hash = await hashPassword(password);

      expect(typeof hash).toBe("string");
      expect(hash).not.toBe(password);
    });
  });

  describe("hashToken", () => {
    it("should hash a token", () => {
      const token = "abc123def456";
      const hash = hashToken(token);

      expect(typeof hash).toBe("string");
      expect(hash).not.toBe(token);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce consistent hash for same token", () => {
      const token = "test-token-value";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different tokens", () => {
      const hash1 = hashToken("token1");
      const hash2 = hashToken("token2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty token", () => {
      const hash = hashToken("");

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce 64-character SHA256 hex hash", () => {
      const token = "test-token";
      const hash = hashToken(token);

      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });
  });

  describe("createSessionToken", () => {
    it("should create a session token", async () => {
      const userId = "user-123";
      const mockSession = { id: "session-1" };

      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSession
      );

      const result = await createSessionToken(userId, mockDb);

      expect(result.token).toBeDefined();
      expect(result.sessionId).toBe("session-1");
      expect(typeof result.token).toBe("string");
      expect(result.token.length).toBeGreaterThan(0);
    });

    it("should store hashed token in database", async () => {
      const userId = "user-123";
      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "session-1",
      });

      await createSessionToken(userId, mockDb);

      const call = (mockDb.session.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.userId).toBe(userId);
      expect(call?.[0]?.data?.token).toBeDefined();
      expect(call?.[0]?.data?.expiresAt).toBeInstanceOf(Date);
    });

    it("should set expiration to 30 days from now", async () => {
      const userId = "user-123";
      const beforeTime = Date.now();
      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "session-1",
      });

      await createSessionToken(userId, mockDb);

      const call = (mockDb.session.create as ReturnType<typeof mock>).mock
        .calls[0];
      const expiresAt = call?.[0]?.data?.expiresAt;
      const expectedExpiration = beforeTime + TOKEN_MAX_AGE * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(
        expectedExpiration + 5000
      );
    });

    it("should return different tokens for multiple calls", async () => {
      const userId = "user-123";
      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValue({
        id: "session-1",
      });

      const result1 = await createSessionToken(userId, mockDb);
      const result2 = await createSessionToken(userId, mockDb);

      expect(result1.token).not.toBe(result2.token);
    });

    it("should throw and log error on database failure", async () => {
      const userId = "user-123";
      const error = new Error("Database error");
      (mockDb.session.create as ReturnType<typeof mock>).mockRejectedValueOnce(
        error
      );

      try {
        await createSessionToken(userId, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockLogger.debug).toHaveBeenCalled();
      }
    });
  });

  describe("verifySessionToken", () => {
    it("should verify valid session token", async () => {
      const token = "abc123def456";
      const mockSession = {
        id: "session-1",
        token: hashToken(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: {
          id: "user-1",
          email: "user@test.com",
          name: "Test User",
          role: "MEMBER",
          personId: "person-1",
          mustChangePassword: false,
          oidcProvider: null,
          profileClaimStatus: "CLAIMED",
        },
      };

      (
        mockDb.session.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSession);

      const result = await verifySessionToken(token, mockDb);

      expect(result).toBeDefined();
      expect(result?.id).toBe("user-1");
      expect(result?.email).toBe("user@test.com");
      expect(result?.role).toBe("MEMBER");
    });

    it("should return null for null token", async () => {
      const result = await verifySessionToken(null, mockDb);

      expect(result).toBeNull();
    });

    it("should return null for undefined token", async () => {
      const result = await verifySessionToken(undefined, mockDb);

      expect(result).toBeNull();
    });

    it("should return null for empty string token", async () => {
      const result = await verifySessionToken("", mockDb);

      expect(result).toBeNull();
    });

    it("should return null when session not found", async () => {
      (
        mockDb.session.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      const result = await verifySessionToken("invalid-token", mockDb);

      expect(result).toBeNull();
    });

    it("should return null for expired session and delete it", async () => {
      const token = "expired-token";
      const mockSession = {
        id: "session-1",
        token: hashToken(token),
        expiresAt: new Date(Date.now() - 1000),
        user: {
          id: "user-1",
          email: "user@test.com",
          name: "Test User",
          role: "MEMBER",
          personId: null,
          mustChangePassword: false,
          oidcProvider: null,
          profileClaimStatus: "UNCLAIMED",
        },
      };

      (
        mockDb.session.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSession);
      (mockDb.session.delete as ReturnType<typeof mock>).mockResolvedValueOnce(
        {}
      );

      const result = await verifySessionToken(token, mockDb);

      expect(result).toBeNull();
      expect(mockDb.session.delete).toHaveBeenCalledWith({
        where: { id: "session-1" },
      });
    });

    it("should include all user properties", async () => {
      const token = "valid-token";
      const mockSession = {
        id: "session-1",
        token: hashToken(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: {
          id: "user-1",
          email: "user@test.com",
          name: "John Doe",
          role: "ADMIN",
          personId: "person-1",
          mustChangePassword: true,
          oidcProvider: "google",
          profileClaimStatus: "PENDING",
        },
      };

      (
        mockDb.session.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSession);

      const result = await verifySessionToken(token, mockDb);

      expect(result?.id).toBe("user-1");
      expect(result?.email).toBe("user@test.com");
      expect(result?.name).toBe("John Doe");
      expect(result?.role).toBe("ADMIN");
      expect(result?.personId).toBe("person-1");
      expect(result?.mustChangePassword).toBe(true);
      expect(result?.oidcProvider).toBe("google");
      expect(result?.profileClaimStatus).toBe("PENDING");
    });

    it("should throw and log error on database failure", async () => {
      const error = new Error("Database error");
      (
        mockDb.session.findFirst as ReturnType<typeof mock>
      ).mockRejectedValueOnce(error);

      try {
        await verifySessionToken("token", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockLogger.debug).toHaveBeenCalled();
      }
    });
  });

  describe("checkAccountLockout", () => {
    it("should not throw when account is not locked", async () => {
      const user = {
        id: "user-1",
        lockedUntil: null,
        failedLoginAttempts: 2,
      };

      await checkAccountLockout(user);
      // No error should be thrown
    });

    it("should not throw when lockout expired", async () => {
      const user = {
        id: "user-1",
        lockedUntil: new Date(Date.now() - 1000),
        failedLoginAttempts: 5,
      };

      await checkAccountLockout(user);
      // No error should be thrown
    });

    it("should throw error when account is locked", async () => {
      const user = {
        id: "user-1",
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
        failedLoginAttempts: 5,
      };

      try {
        await checkAccountLockout(user);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should log warning when account is locked", async () => {
      const user = {
        id: "user-1",
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
        failedLoginAttempts: 5,
      };

      try {
        await checkAccountLockout(user);
      } catch {
        // Expected
      }

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should calculate remaining lock time", async () => {
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
      const user = {
        id: "user-1",
        lockedUntil,
        failedLoginAttempts: 5,
      };

      try {
        await checkAccountLockout(user);
      } catch {
        // Expected
      }

      const call = (mockLogger.warn as ReturnType<typeof mock>).mock.calls[0];
      expect(call).toBeDefined();
    });
  });

  describe("loginUser", () => {
    it("should login user with valid email and password", async () => {
      const email = "user@test.com";
      const password = "validPassword123!";
      const passwordHash = await hashPassword(password);

      const mockUser = {
        id: "user-1",
        email: email.toLowerCase(),
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "session-1",
      });
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await loginUser(email, password, mockDb);

      expect(result.user.id).toBe("user-1");
      expect(result.user.email).toBe(email.toLowerCase());
      expect(result.token).toBeDefined();
    });

    it("should normalize email to lowercase", async () => {
      const email = "USER@TEST.COM";
      const passwordHash = await hashPassword("password123");

      const mockUser = {
        id: "user-1",
        email: email.toLowerCase(),
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "session-1",
      });
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await loginUser(email, "password123", mockDb);

      const call = (mockDb.user.findUnique as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.where?.email).toBe("user@test.com");
    });

    it("should throw error when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await loginUser("nonexistent@test.com", "password123", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when password hash is missing", async () => {
      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash: null,
        isActive: true,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await loginUser("user@test.com", "password123", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when user is inactive", async () => {
      const passwordHash = await hashPassword("password123");
      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash,
        isActive: false,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await loginUser("user@test.com", "password123", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should check account lockout before password validation", async () => {
      const passwordHash = await hashPassword("password123");
      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 5,
        lastFailedLoginAt: new Date(),
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await loginUser("user@test.com", "password123", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error for invalid password", async () => {
      const passwordHash = await hashPassword("correctPassword123!");
      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      try {
        await loginUser("user@test.com", "wrongPassword123!", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should increment failed attempts on invalid password", async () => {
      const passwordHash = await hashPassword("correctPassword123!");
      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 1,
        lastFailedLoginAt: new Date(),
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      try {
        await loginUser("user@test.com", "wrongPassword123!", mockDb);
      } catch {
        // Expected
      }

      const call = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.failedLoginAttempts).toBe(2);
    });

    it("should lock account after threshold", async () => {
      const passwordHash = await hashPassword("correctPassword123!");
      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 4,
        lastFailedLoginAt: new Date(),
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      try {
        await loginUser("user@test.com", "wrongPassword123!", mockDb);
      } catch {
        // Expected
      }

      const call = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.lockedUntil).toBeInstanceOf(Date);
    });

    it("should reset failed attempts on successful login", async () => {
      const password = "validPassword123!";
      const passwordHash = await hashPassword(password);

      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 3,
        lastFailedLoginAt: new Date(),
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "session-1",
      });
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await loginUser("user@test.com", password, mockDb);

      const updateCalls = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls;
      const finalUpdate = updateCalls[updateCalls.length - 1];
      expect(finalUpdate?.[0]?.data?.failedLoginAttempts).toBe(0);
      expect(finalUpdate?.[0]?.data?.lockedUntil).toBeNull();
    });

    it("should update last login on successful login", async () => {
      const password = "validPassword123!";
      const passwordHash = await hashPassword(password);

      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "session-1",
      });
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await loginUser("user@test.com", password, mockDb);

      const updateCalls = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls;
      const finalUpdate = updateCalls[updateCalls.length - 1];
      expect(finalUpdate?.[0]?.data?.lastLoginAt).toBeInstanceOf(Date);
    });

    it("should return token in result", async () => {
      const password = "validPassword123!";
      const passwordHash = await hashPassword(password);

      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "session-1",
      });
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await loginUser("user@test.com", password, mockDb);

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
      expect(result.token.length).toBeGreaterThan(0);
    });

    it("should log successful login", async () => {
      const password = "validPassword123!";
      const passwordHash = await hashPassword(password);

      const mockUser = {
        id: "user-1",
        email: "user@test.com",
        name: "Test User",
        passwordHash,
        isActive: true,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        role: "MEMBER",
        mustChangePassword: false,
        oidcProvider: null,
        profileClaimStatus: "CLAIMED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.session.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "session-1",
      });
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await loginUser("user@test.com", password, mockDb);

      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe("registerUser", () => {
    it("should register new user with email, name, and password", async () => {
      const email = "newuser@test.com";
      const name = "New User";
      const password = "validPassword123!";

      const mockSettings = { allowSelfRegistration: true };
      const mockCreatedUser = {
        id: "user-new",
        email: email.toLowerCase(),
        name,
        passwordHash: "hash",
        role: "VIEWER",
        isActive: true,
      };

      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSettings);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockCreatedUser
      );

      const result = await registerUser(email, name, password, mockDb);

      expect(result).toBe("user-new");
    });

    it("should normalize email to lowercase", async () => {
      const email = "NEW@TEST.COM";
      const name = "New User";
      const password = "validPassword123!";

      const mockSettings = { allowSelfRegistration: true };
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSettings);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-1",
      });

      await registerUser(email, name, password, mockDb);

      const call = (mockDb.user.findUnique as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.where?.email).toBe("new@test.com");
    });

    it("should throw error when self-registration is disabled", async () => {
      const mockSettings = { allowSelfRegistration: false };
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSettings);

      try {
        await registerUser("user@test.com", "Name", "password123", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when no family settings exist", async () => {
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await registerUser("user@test.com", "Name", "password123", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when email already exists", async () => {
      const email = "existing@test.com";
      const mockSettings = { allowSelfRegistration: true };
      const mockExisting = { id: "user-existing" };

      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSettings);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockExisting
      );

      try {
        await registerUser(email, "Name", "password123", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should create user with VIEWER role", async () => {
      const mockSettings = { allowSelfRegistration: true };
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSettings);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-1",
      });

      await registerUser("user@test.com", "Name", "password123", mockDb);

      const call = (mockDb.user.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.role).toBe("VIEWER");
    });

    it("should hash the password", async () => {
      const mockSettings = { allowSelfRegistration: true };
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSettings);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-1",
      });

      await registerUser("user@test.com", "Name", "password123", mockDb);

      const call = (mockDb.user.create as ReturnType<typeof mock>).mock
        .calls[0];
      const passwordHash = call?.[0]?.data?.passwordHash;
      expect(passwordHash).toBeDefined();
      expect(passwordHash).not.toBe("password123");
    });

    it("should set isActive to true", async () => {
      const mockSettings = { allowSelfRegistration: true };
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSettings);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-1",
      });

      await registerUser("user@test.com", "Name", "password123", mockDb);

      const call = (mockDb.user.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.isActive).toBe(true);
    });

    it("should return created user id", async () => {
      const mockSettings = { allowSelfRegistration: true };
      const userId = "user-abc123";
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSettings);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: userId,
      });

      const result = await registerUser(
        "user@test.com",
        "Name",
        "password123",
        mockDb
      );

      expect(result).toBe(userId);
    });
  });

  describe("claimProfileAsUser", () => {
    it("should claim a living profile", async () => {
      const email = "jane@test.com";
      const personId = "person-1";
      const password = "validPassword123!";

      const mockPerson = {
        id: personId,
        firstName: "Jane",
        lastName: "Doe",
        isLiving: true,
      };

      const mockCreatedUser = {
        id: "user-new",
        email: email.toLowerCase(),
        name: "Jane Doe",
        role: "MEMBER",
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockCreatedUser
      );

      const result = await claimProfileAsUser(
        email,
        personId,
        password,
        mockDb
      );

      expect(result).toBe("user-new");
    });

    it("should throw error when person not found", async () => {
      const email = "jane@test.com";
      const personId = "person-nonexistent";

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await claimProfileAsUser(email, personId, "password123", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when person is not living", async () => {
      const personId = "person-1";
      const mockPerson = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
        isLiving: false,
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      try {
        await claimProfileAsUser(
          "jane@test.com",
          personId,
          "password123",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when profile is already claimed", async () => {
      const personId = "person-1";
      const mockPerson = {
        id: personId,
        firstName: "Jane",
        lastName: "Doe",
        isLiving: true,
      };

      const mockExistingUser = { id: "user-existing" };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockExistingUser
      );

      try {
        await claimProfileAsUser(
          "jane@test.com",
          personId,
          "password123",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when email already exists", async () => {
      const email = "existing@test.com";
      const personId = "person-1";
      const mockPerson = {
        id: personId,
        firstName: "Jane",
        lastName: "Doe",
        isLiving: true,
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "user-existing" });

      try {
        await claimProfileAsUser(email, personId, "password123", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should create user with MEMBER role", async () => {
      const personId = "person-1";
      const mockPerson = {
        id: personId,
        firstName: "Jane",
        lastName: "Doe",
        isLiving: true,
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-1",
      });

      await claimProfileAsUser(
        "jane@test.com",
        personId,
        "password123",
        mockDb
      );

      const call = (mockDb.user.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.role).toBe("MEMBER");
    });

    it("should link user to person", async () => {
      const personId = "person-1";
      const mockPerson = {
        id: personId,
        firstName: "Jane",
        lastName: "Doe",
        isLiving: true,
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-1",
      });

      await claimProfileAsUser(
        "jane@test.com",
        personId,
        "password123",
        mockDb
      );

      const call = (mockDb.user.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.personId).toBe(personId);
    });

    it("should set profile claim status", async () => {
      const personId = "person-1";
      const mockPerson = {
        id: personId,
        firstName: "Jane",
        lastName: "Doe",
        isLiving: true,
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-1",
      });

      await claimProfileAsUser(
        "jane@test.com",
        personId,
        "password123",
        mockDb
      );

      const call = (mockDb.user.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.profileClaimStatus).toBe("CLAIMED");
    });

    it("should set profile claimed timestamp", async () => {
      const personId = "person-1";
      const mockPerson = {
        id: personId,
        firstName: "Jane",
        lastName: "Doe",
        isLiving: true,
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-1",
      });

      await claimProfileAsUser(
        "jane@test.com",
        personId,
        "password123",
        mockDb
      );

      const call = (mockDb.user.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.profileClaimedAt).toBeInstanceOf(Date);
    });

    it("should use person name for user name", async () => {
      const personId = "person-1";
      const firstName = "Jane";
      const lastName = "Doe";
      const mockPerson = {
        id: personId,
        firstName,
        lastName,
        isLiving: true,
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (mockDb.user.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-1",
      });

      await claimProfileAsUser(
        "jane@test.com",
        personId,
        "password123",
        mockDb
      );

      const call = (mockDb.user.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.name).toBe(`${firstName} ${lastName}`);
    });
  });

  describe("changeUserPassword", () => {
    it("should change password with valid current password", async () => {
      const currentPassword = "oldPassword123!";
      const newPassword = "newPassword456!";
      const currentPasswordHash = await hashPassword(currentPassword);
      const token = "valid-token";

      const mockUser = {
        id: "user-1",
        passwordHash: currentPasswordHash,
        role: "MEMBER",
      };

      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await changeUserPassword(token, currentPassword, newPassword, mockDb);

      const call = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.passwordHash).toBeDefined();
      expect(call?.[0]?.data?.passwordHash).not.toBe(currentPasswordHash);
    });

    it("should throw error when no token provided", async () => {
      try {
        await changeUserPassword(null, "oldPassword", "newPassword", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when token is undefined", async () => {
      try {
        await changeUserPassword(
          undefined,
          "oldPassword",
          "newPassword",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when session not found", async () => {
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await changeUserPassword(
          "invalid-token",
          "oldPassword",
          "newPassword",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when user is OAuth-only", async () => {
      const mockUser = {
        id: "user-1",
        passwordHash: null,
        role: "MEMBER",
      };

      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await changeUserPassword(
          "valid-token",
          "oldPassword",
          "newPassword",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when current password is incorrect", async () => {
      const currentPassword = "correctPassword123!";
      const wrongPassword = "wrongPassword456!";
      const currentPasswordHash = await hashPassword(currentPassword);

      const mockUser = {
        id: "user-1",
        passwordHash: currentPasswordHash,
        role: "MEMBER",
      };

      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await changeUserPassword(
          "valid-token",
          wrongPassword,
          "newPassword123!",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should clear mustChangePassword flag", async () => {
      const currentPassword = "oldPassword123!";
      const newPassword = "newPassword456!";
      const currentPasswordHash = await hashPassword(currentPassword);

      const mockUser = {
        id: "user-1",
        passwordHash: currentPasswordHash,
        role: "MEMBER",
      };

      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await changeUserPassword(
        "valid-token",
        currentPassword,
        newPassword,
        mockDb
      );

      const call = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.mustChangePassword).toBe(false);
    });

    it("should log password change", async () => {
      const currentPassword = "oldPassword123!";
      const newPassword = "newPassword456!";
      const currentPasswordHash = await hashPassword(currentPassword);

      const mockUser = {
        id: "user-1",
        passwordHash: currentPasswordHash,
        role: "MEMBER",
      };

      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await changeUserPassword(
        "valid-token",
        currentPassword,
        newPassword,
        mockDb
      );

      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe("Constants", () => {
    it("should have correct token cookie name", () => {
      expect(TOKEN_COOKIE_NAME).toBe("vamsa-session");
    });

    it("should have correct token max age in seconds", () => {
      const EXPECTED_MAX_AGE = 30 * 24 * 60 * 60;
      expect(TOKEN_MAX_AGE).toBe(EXPECTED_MAX_AGE);
    });
  });

  describe("Error handling across all functions", () => {
    it("should log errors with context", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockRejectedValueOnce(
        new Error("DB error")
      );

      try {
        await loginUser("user@test.com", "password", mockDb);
      } catch {
        // Expected
      }

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should preserve original error when throwing", async () => {
      const originalError = new Error("Original error");
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockRejectedValueOnce(
        originalError
      );

      try {
        await loginUser("user@test.com", "password", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(originalError);
      }
    });
  });
});
