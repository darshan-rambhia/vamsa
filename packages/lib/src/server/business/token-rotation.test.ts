/**
 * Unit tests for token rotation server business logic
 *
 * Tests cover:
 * - generateSecureToken: Pure function for token generation
 * - daysSinceCreation: Pure function for date calculations
 * - enforceRotationPolicy: Policy enforcement with mocked DB
 * - rotateToken: Token rotation with grace period
 * - revokeToken: Immediate token revocation
 *
 * Uses dependency injection pattern - mock database clients passed directly
 * to functions instead of mocking global modules.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { TokenRotationDb } from "./token-rotation";
import {
  generateSecureToken,
  daysSinceCreation,
  enforceRotationPolicy,
  rotateToken,
  revokeToken,
} from "./token-rotation";
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../testing/shared-mocks";

// Mock logger to avoid console output during tests
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

// Create mock database client
function createMockDb(): TokenRotationDb {
  return {
    calendarToken: {
      findMany: mock(() => Promise.resolve([])),
      findUniqueOrThrow: mock(() => Promise.resolve({})),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
    },
  } as unknown as TokenRotationDb;
}

describe("Token Rotation Functions", () => {
  let mockDb: TokenRotationDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
  });

  describe("generateSecureToken", () => {
    it("should generate a token", () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should generate different tokens on each call", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it("should generate base64url encoded tokens", () => {
      const token = generateSecureToken();
      // Base64url characters are alphanumeric, hyphens, and underscores
      expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    });

    it("should generate tokens of consistent length", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      const token3 = generateSecureToken();

      // 32 bytes in base64url should be ~43 characters
      expect(token1.length).toBe(token2.length);
      expect(token2.length).toBe(token3.length);
      expect(token1.length).toBeGreaterThan(40);
    });

    it("should be cryptographically random", () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it("should generate tokens with adequate length for security", () => {
      const token = generateSecureToken();
      // 32 bytes of random data provides 256 bits of entropy
      // In base64url, this should encode to ~43 characters
      expect(token.length).toBeGreaterThanOrEqual(40);
      expect(token.length).toBeLessThanOrEqual(50);
    });

    it("should only contain valid base64url characters", () => {
      for (let i = 0; i < 10; i++) {
        const token = generateSecureToken();
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
        // Verify no padding (base64url doesn't use =)
        expect(token).not.toContain("=");
      }
    });

    it("should be suitable for use as a bearer token", () => {
      const token = generateSecureToken();
      // No whitespace
      expect(token).not.toMatch(/\s/);
      // No special characters that would break HTTP headers
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe("daysSinceCreation", () => {
    it("should return 0 for today", () => {
      const today = new Date();
      expect(daysSinceCreation(today)).toBe(0);
    });

    it("should return 1 for yesterday", () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(daysSinceCreation(yesterday)).toBe(1);
    });

    it("should return 365 for one year ago", () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      expect(daysSinceCreation(oneYearAgo)).toBe(365);
    });

    it("should handle dates in the past correctly", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(daysSinceCreation(thirtyDaysAgo)).toBe(30);
    });
  });

  describe("enforceRotationPolicy", () => {
    it("should return empty result when no tokens exist", async () => {
      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await enforceRotationPolicy("user-1", "manual", mockDb);

      expect(result.rotated).toBe(0);
      expect(result.tokens).toEqual([]);
    });

    it("should rotate tokens on manual event", async () => {
      const existingToken = {
        id: "token-1",
        userId: "user-1",
        token: "old-token",
        name: "My Token",
        scopes: ["read"],
        rotationPolicy: "manual",
        isActive: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };

      const newToken = {
        id: "token-2",
        userId: "user-1",
        token: "new-secure-token",
        name: "My Token",
        isActive: true,
      };

      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([existingToken]);
      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(existingToken);
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(newToken);
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      const result = await enforceRotationPolicy("user-1", "manual", mockDb);

      expect(result.rotated).toBe(1);
      expect(result.tokens).toHaveLength(1);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should rotate tokens on password_change for matching policy", async () => {
      const existingToken = {
        id: "token-1",
        userId: "user-1",
        token: "old-token",
        name: "My Token",
        scopes: ["read"],
        rotationPolicy: "on_password_change",
        isActive: true,
        createdAt: new Date(),
      };

      const newToken = {
        id: "token-2",
        token: "new-secure-token",
      };

      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([existingToken]);
      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(existingToken);
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(newToken);
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      const result = await enforceRotationPolicy(
        "user-1",
        "password_change",
        mockDb
      );

      expect(result.rotated).toBe(1);
    });

    it("should not rotate tokens on password_change for non-matching policy", async () => {
      const existingToken = {
        id: "token-1",
        userId: "user-1",
        token: "old-token",
        rotationPolicy: "annual", // Not on_password_change
        isActive: true,
        createdAt: new Date(),
      };

      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([existingToken]);

      const result = await enforceRotationPolicy(
        "user-1",
        "password_change",
        mockDb
      );

      expect(result.rotated).toBe(0);
      expect(result.tokens).toEqual([]);
    });

    it("should rotate annual tokens older than 365 days on annual_check", async () => {
      const oldToken = {
        id: "token-1",
        userId: "user-1",
        token: "old-token",
        name: "Annual Token",
        scopes: ["read"],
        rotationPolicy: "annual",
        isActive: true,
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
      };

      const newToken = {
        id: "token-2",
        token: "new-secure-token",
      };

      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([oldToken]);
      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(oldToken);
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(newToken);
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      const result = await enforceRotationPolicy(
        "user-1",
        "annual_check",
        mockDb
      );

      expect(result.rotated).toBe(1);
    });

    it("should not rotate annual tokens younger than 365 days on annual_check", async () => {
      const youngToken = {
        id: "token-1",
        userId: "user-1",
        token: "young-token",
        rotationPolicy: "annual",
        isActive: true,
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      };

      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([youngToken]);

      const result = await enforceRotationPolicy(
        "user-1",
        "annual_check",
        mockDb
      );

      expect(result.rotated).toBe(0);
    });

    it("should handle multiple tokens with mixed policies", async () => {
      const tokens = [
        {
          id: "token-1",
          userId: "user-1",
          token: "token-1",
          name: "Token 1",
          scopes: [],
          rotationPolicy: "on_password_change",
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: "token-2",
          userId: "user-1",
          token: "token-2",
          name: "Token 2",
          scopes: [],
          rotationPolicy: "annual",
          isActive: true,
          createdAt: new Date(),
        },
      ];

      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(tokens);
      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(tokens[0]);
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce({ id: "new-1", token: "new-token-1" });
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      const result = await enforceRotationPolicy(
        "user-1",
        "password_change",
        mockDb
      );

      // Only first token should rotate (has on_password_change policy)
      expect(result.rotated).toBe(1);
    });
  });

  describe("rotateToken", () => {
    it("should create new token with same settings", async () => {
      const oldToken = {
        id: "old-id",
        userId: "user-1",
        token: "old-token-value",
        name: "My Calendar",
        scopes: ["read", "write"],
        rotationPolicy: "annual",
        isActive: true,
      };

      const newToken = {
        id: "new-id",
        userId: "user-1",
        token: "new-secure-token",
        name: "My Calendar",
        isActive: true,
      };

      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(oldToken);
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(newToken);
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      const result = await rotateToken("old-id", mockDb);

      expect(result.id).toBe("new-id");
      expect(mockDb.calendarToken.create).toHaveBeenCalled();
      expect(mockDb.calendarToken.update).toHaveBeenCalled();
    });

    it("should set rotatedFrom reference on new token", async () => {
      const oldToken = {
        id: "old-id",
        userId: "user-1",
        token: "old-token",
        name: null,
        scopes: [],
        rotationPolicy: "manual",
      };

      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(oldToken);
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockImplementationOnce(
        async (args: { data: Record<string, unknown> }) => {
          expect(args.data.rotatedFrom).toBe("old-id");
          return { id: "new-id", token: "new-token" };
        }
      );
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      await rotateToken("old-id", mockDb);
    });

    it("should set 30-day grace period on old token", async () => {
      const oldToken = {
        id: "old-id",
        userId: "user-1",
        token: "old-token",
        name: "Test Token",
        scopes: [],
        rotationPolicy: "manual",
      };

      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(oldToken);
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce({ id: "new-id", token: "new-token" });
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockImplementationOnce(
        async (args: { data: Record<string, unknown> }) => {
          // Verify grace period is ~30 days from now
          const expiresAt = args.data.expiresAt as Date;
          const daysUntilExpiry = Math.round(
            (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          );
          expect(daysUntilExpiry).toBeGreaterThanOrEqual(29);
          expect(daysUntilExpiry).toBeLessThanOrEqual(31);
          return {};
        }
      );

      await rotateToken("old-id", mockDb);
    });

    it("should append (rotated) to old token name", async () => {
      const oldToken = {
        id: "old-id",
        userId: "user-1",
        token: "old-token",
        name: "My Calendar",
        scopes: [],
        rotationPolicy: "manual",
      };

      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(oldToken);
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce({ id: "new-id", token: "new-token" });
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockImplementationOnce(
        async (args: { data: Record<string, unknown> }) => {
          expect(args.data.name).toBe("My Calendar (rotated)");
          return {};
        }
      );

      await rotateToken("old-id", mockDb);
    });

    it("should handle null name gracefully", async () => {
      const oldToken = {
        id: "old-id",
        userId: "user-1",
        token: "old-token",
        name: null,
        scopes: [],
        rotationPolicy: "manual",
      };

      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(oldToken);
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce({ id: "new-id", token: "new-token" });
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockImplementationOnce(
        async (args: { data: Record<string, unknown> }) => {
          expect(args.data.name).toBeNull();
          return {};
        }
      );

      await rotateToken("old-id", mockDb);
    });

    it("should throw error if token not found", async () => {
      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockRejectedValueOnce(new Error("No CalendarToken found"));

      await expect(rotateToken("nonexistent", mockDb)).rejects.toThrow(
        "No CalendarToken found"
      );
    });
  });

  describe("revokeToken", () => {
    it("should set isActive to false", async () => {
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockImplementationOnce(
        async (args: { data: Record<string, unknown> }) => {
          expect(args.data.isActive).toBe(false);
          return { id: "token-1", isActive: false };
        }
      );

      await revokeToken("token-1", mockDb);
    });

    it("should set expiresAt to now", async () => {
      const beforeCall = Date.now();

      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockImplementationOnce(
        async (args: { data: Record<string, unknown> }) => {
          const expiresAt = args.data.expiresAt as Date;
          expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeCall);
          expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
          return { id: "token-1", isActive: false, expiresAt };
        }
      );

      await revokeToken("token-1", mockDb);
    });

    it("should return updated token", async () => {
      const updatedToken = {
        id: "token-1",
        userId: "user-1",
        isActive: false,
        expiresAt: new Date(),
      };

      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(updatedToken);

      const result = await revokeToken("token-1", mockDb);

      expect(result.id).toBe("token-1");
      expect(result.isActive).toBe(false);
    });

    it("should throw error if token not found", async () => {
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockRejectedValueOnce(new Error("Record not found"));

      await expect(revokeToken("nonexistent", mockDb)).rejects.toThrow(
        "Record not found"
      );
    });
  });

  describe("Token generation entropy", () => {
    it("should produce uniform distribution of characters", () => {
      const samples = 1000;
      const tokens = Array.from({ length: samples }, () =>
        generateSecureToken()
      );

      const charFreq: Record<string, number> = {};
      tokens
        .join("")
        .split("")
        .forEach((char) => {
          charFreq[char] = (charFreq[char] || 0) + 1;
        });

      // Get all unique characters
      const uniqueChars = Object.keys(charFreq);
      // Should have good variety of characters from the base64url alphabet
      expect(uniqueChars.length).toBeGreaterThan(20);
    });

    it("should not repeat patterns", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      const token3 = generateSecureToken();

      // Tokens should not be substrings of each other
      expect(token1).not.toContain(token2);
      expect(token2).not.toContain(token3);
      expect(token1).not.toContain(token3);
    });
  });
});
