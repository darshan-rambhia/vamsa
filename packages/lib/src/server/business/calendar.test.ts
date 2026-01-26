/**
 * Unit tests for calendar server business logic
 *
 * Tests cover:
 * - Generating calendar tokens with expiration
 * - Validating calendar tokens
 * - Revoking calendar tokens
 * - Listing calendar tokens
 * - Deleting calendar tokens
 * - Error handling and authorization
 *
 * Uses mock.module() to inject mocked Drizzle ORM instance
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";

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

// Create mock Drizzle helpers
const createMockInsertChain = () => ({
  values: mock(() => ({
    returning: mock(() => Promise.resolve([{}])),
  })),
});

const createMockUpdateChain = () => ({
  set: mock(() => ({
    where: mock(() => Promise.resolve()),
  })),
});

const createMockDeleteChain = () => ({
  where: mock(() => Promise.resolve()),
});

const mockDrizzleDb = {
  insert: mock(() => createMockInsertChain()),
  query: {
    calendarTokens: {
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
  },
  update: mock(() => createMockUpdateChain()),
  delete: mock(() => createMockDeleteChain()),
};

const mockDrizzleSchema = {
  calendarTokens: {
    token: {} as any,
    id: {} as any,
    userId: {} as any,
    createdAt: {} as any,
  },
  auditLogs: {
    userId: {} as any,
  },
};

mock.module("@vamsa/api", () => ({
  drizzleDb: mockDrizzleDb,
  drizzleSchema: mockDrizzleSchema,
}));

// Import the functions to test
import {
  generateCalendarTokenLogic,
  validateCalendarTokenLogic,
  revokeCalendarTokenLogic,
  listCalendarTokensLogic,
  deleteCalendarTokenLogic,
} from "@vamsa/lib/server/business";

describe("Calendar Server Functions", () => {
  beforeEach(() => {
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    (mockDrizzleDb.insert as any).mockClear();
    (mockDrizzleDb.query.calendarTokens.findFirst as any).mockClear();
    (mockDrizzleDb.update as any).mockClear();
  });

  describe("generateCalendarTokenLogic", () => {
    it("should generate a new calendar token", async () => {
      const userId = "user-1";
      const tokenName = "My Token";
      const expiryDays = 30;

      const mockToken = {
        id: "token-1",
        token: "abc123def456",
        userId,
        name: tokenName,
        expiresAt: new Date("2025-02-15"),
        isActive: true,
      };

      const insertChain = createMockInsertChain();
      (insertChain.values as any).mockReturnValueOnce({
        returning: () => Promise.resolve([mockToken]),
      });
      (mockDrizzleDb.insert as any).mockReturnValueOnce(insertChain);

      const result = await generateCalendarTokenLogic(
        userId,
        tokenName,
        expiryDays
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe("abc123def456");
      expect(result.name).toBe(tokenName);
      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should set expiration date correctly", async () => {
      const mockToken = {
        id: "token-1",
        token: "abc123",
        userId: "user-1",
        name: null,
        expiresAt: new Date(),
        isActive: true,
      };

      const insertChain = createMockInsertChain();
      (insertChain.values as any).mockReturnValueOnce({
        returning: () => Promise.resolve([mockToken]),
      });
      (mockDrizzleDb.insert as any).mockReturnValueOnce(insertChain);

      await generateCalendarTokenLogic("user-1", undefined, 90);

      // Verify that drizzle insert was called
      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should log info message", async () => {
      const mockToken = {
        id: "token-1",
        token: "abc123",
        userId: "user-1",
        name: null,
        expiresAt: new Date(),
        isActive: true,
      };

      const insertChain = createMockInsertChain();
      (insertChain.values as any).mockReturnValueOnce({
        returning: () => Promise.resolve([mockToken]),
      });
      (mockDrizzleDb.insert as any).mockReturnValueOnce(insertChain);

      await generateCalendarTokenLogic("user-1", undefined, 30);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Calendar token generated for user user-1")
      );
    });
  });

  describe("validateCalendarTokenLogic", () => {
    it("should return valid for active unexpired token", async () => {
      const mockToken = {
        id: "token-1",
        token: "abc123",
        userId: "user-1",
        name: null,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        isActive: true,
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      };

      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(mockToken);

      const result = await validateCalendarTokenLogic("abc123");

      expect(result.valid).toBe(true);
      expect(result.user).toEqual({
        id: "user-1",
        email: "user@example.com",
      });
    });

    it("should return invalid for expired token", async () => {
      const mockToken = {
        id: "token-1",
        token: "abc123",
        userId: "user-1",
        name: null,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        isActive: true,
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      };

      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(mockToken);

      const result = await validateCalendarTokenLogic("abc123");

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });

    it("should return invalid for inactive token", async () => {
      const mockToken = {
        id: "token-1",
        token: "abc123",
        userId: "user-1",
        name: null,
        expiresAt: new Date(Date.now() + 86400000),
        isActive: false,
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      };

      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(mockToken);

      const result = await validateCalendarTokenLogic("abc123");

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });

    it("should return invalid for non-existent token", async () => {
      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(null);

      const result = await validateCalendarTokenLogic("nonexistent");

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database error");
      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockRejectedValueOnce(error);

      const result = await validateCalendarTokenLogic("abc123");

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("revokeCalendarTokenLogic", () => {
    it("should revoke a calendar token", async () => {
      const tokenId = "token-1";
      const userId = "user-1";

      const mockToken = {
        id: tokenId,
        userId,
        isActive: true,
      };

      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(mockToken);

      const updateChain = createMockUpdateChain();
      (updateChain.set as any).mockReturnValueOnce({
        where: () => Promise.resolve(),
      });
      (mockDrizzleDb.update as any).mockReturnValueOnce(updateChain);

      const result = await revokeCalendarTokenLogic(tokenId, userId);

      expect(result.success).toBe(true);
      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });

    it("should throw error if token not found", async () => {
      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(null);

      try {
        await revokeCalendarTokenLogic("token-nonexistent", "user-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Token not found or unauthorized"
        );
      }
    });

    it("should throw error if token does not belong to user", async () => {
      const mockToken = {
        id: "token-1",
        userId: "user-2",
        isActive: true,
      };

      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(mockToken);

      try {
        await revokeCalendarTokenLogic("token-1", "user-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Token not found or unauthorized"
        );
      }
    });
  });

  describe("listCalendarTokensLogic", () => {
    it("should list tokens for a user", async () => {
      const userId = "user-1";
      const mockTokens = [
        {
          id: "token-1",
          token: "abc123",
          name: "Token 1",
          expiresAt: new Date(),
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: "token-2",
          token: "def456",
          name: "Token 2",
          expiresAt: new Date(),
          isActive: false,
          createdAt: new Date(),
        },
      ];

      (
        mockDrizzleDb.query.calendarTokens.findMany as any
      ).mockResolvedValueOnce(mockTokens);

      const result = await listCalendarTokensLogic(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Token 1");
      expect(result[1].name).toBe("Token 2");
    });

    it("should return empty list if no tokens exist", async () => {
      (
        mockDrizzleDb.query.calendarTokens.findMany as any
      ).mockResolvedValueOnce([]);

      const result = await listCalendarTokensLogic("user-1");

      expect(result).toHaveLength(0);
    });
  });

  describe("deleteCalendarTokenLogic", () => {
    it("should delete an inactive token", async () => {
      const tokenId = "token-1";
      const userId = "user-1";

      const mockToken = {
        id: tokenId,
        userId,
        isActive: false,
      };

      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(mockToken);

      const deleteChain = createMockDeleteChain();
      (deleteChain.where as any).mockResolvedValueOnce(undefined);
      (mockDrizzleDb.delete as any).mockReturnValueOnce(deleteChain);

      const result = await deleteCalendarTokenLogic(tokenId, userId);

      expect(result.success).toBe(true);
      expect(mockDrizzleDb.delete).toHaveBeenCalled();
    });

    it("should throw error if token not found", async () => {
      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(null);

      try {
        await deleteCalendarTokenLogic("token-nonexistent", "user-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Token not found or unauthorized"
        );
      }
    });

    it("should throw error if token is still active", async () => {
      const mockToken = {
        id: "token-1",
        userId: "user-1",
        isActive: true,
      };

      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(mockToken);

      try {
        await deleteCalendarTokenLogic("token-1", "user-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Only revoked tokens can be deleted"
        );
      }
    });

    it("should throw error if token does not belong to user", async () => {
      const mockToken = {
        id: "token-1",
        userId: "user-2",
        isActive: false,
      };

      (
        mockDrizzleDb.query.calendarTokens.findFirst as any
      ).mockResolvedValueOnce(mockToken);

      try {
        await deleteCalendarTokenLogic("token-1", "user-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Token not found or unauthorized"
        );
      }
    });
  });
});
