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
 * Uses mock.module() to inject mocked Drizzle ORM instance
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
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

// Mock for returning() in update chain - allows tests to control the return value

const mockUpdateReturning = mock(() => Promise.resolve([{}] as any[]));
// Mock for returning() in insert chain

const mockInsertReturning = mock(() => Promise.resolve([{}] as any[]));

const mockDrizzleDb = {
  insert: mock(() => ({
    values: mock(() => ({
      returning: mockInsertReturning,
    })),
  })),
  query: {
    calendarTokens: {
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
  },
  update: mock(() => ({
    set: mock(() => ({
      where: mock(() => {
        // Return a thenable with returning() for Drizzle's fluent API
        const result = Promise.resolve({});
        return Object.assign(result, { returning: mockUpdateReturning });
      }),
    })),
  })),
};

const mockDrizzleSchema = {
  calendarTokens: {} as any,
};

mock.module("@vamsa/api", () => ({
  drizzleDb: mockDrizzleDb,
  drizzleSchema: mockDrizzleSchema,
}));

describe("Token Rotation Functions", () => {
  beforeEach(() => {
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    (mockDrizzleDb.insert as any).mockClear();
    (mockDrizzleDb.query.calendarTokens.findFirst as any).mockClear();
    (mockDrizzleDb.query.calendarTokens.findMany as any).mockClear();
    (mockDrizzleDb.update as any).mockClear();
    mockUpdateReturning.mockClear();
    mockInsertReturning.mockClear();
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
      expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    });

    it("should be cryptographically random", () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
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
  });

  describe("enforceRotationPolicy", () => {
    it("should return empty result when no tokens exist", async () => {
      (
        mockDrizzleDb.query.calendarTokens.findMany as any
      ).mockResolvedValueOnce([]);

      const result = await enforceRotationPolicy("user-1", "manual");

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
        mockDrizzleDb.query.calendarTokens.findMany as any
      ).mockResolvedValueOnce([existingToken]);
      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(existingToken);

      // Mock insert returning() for new token creation
      mockInsertReturning.mockResolvedValueOnce([newToken]);

      const result = await enforceRotationPolicy("user-1", "manual");

      expect(result.rotated).toBe(1);
      expect(result.tokens).toHaveLength(1);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should not rotate tokens on password_change for non-matching policy", async () => {
      const existingToken = {
        id: "token-1",
        userId: "user-1",
        token: "old-token",
        rotationPolicy: "annual",
        isActive: true,
        createdAt: new Date(),
      };

      (
        mockDrizzleDb.query.calendarTokens.findMany as any
      ).mockResolvedValueOnce([existingToken]);

      const result = await enforceRotationPolicy("user-1", "password_change");

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
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      };

      const newToken = {
        id: "token-2",
        token: "new-secure-token",
      };

      (
        mockDrizzleDb.query.calendarTokens.findMany as any
      ).mockResolvedValueOnce([oldToken]);
      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(oldToken);

      // Mock insert returning() for new token creation
      mockInsertReturning.mockResolvedValueOnce([newToken]);

      const result = await enforceRotationPolicy("user-1", "annual_check");

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
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(oldToken);

      // Mock insert returning() for new token creation
      mockInsertReturning.mockResolvedValueOnce([newToken]);

      const result = await rotateToken("old-id");

      expect(result.id).toBe("new-id");
      expect(mockDrizzleDb.insert).toHaveBeenCalled();
      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });

    it("should throw error if token not found", async () => {
      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(null);

      try {
        await rotateToken("nonexistent");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Calendar token not found");
      }
    });
  });

  describe("revokeToken", () => {
    it("should set isActive to false", async () => {
      mockUpdateReturning.mockResolvedValueOnce([
        { id: "token-1", isActive: false },
      ]);

      const result = await revokeToken("token-1");

      expect(mockDrizzleDb.update).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.isActive).toBe(false);
    });

    it("should return updated token", async () => {
      const updatedToken = {
        id: "token-1",
        userId: "user-1",
        isActive: false,
        expiresAt: new Date(),
      };

      mockUpdateReturning.mockResolvedValueOnce([updatedToken]);

      const result = await revokeToken("token-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("token-1");
      expect(result.isActive).toBe(false);
    });
  });
});
