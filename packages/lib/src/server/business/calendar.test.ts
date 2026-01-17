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
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { CalendarDb } from "@vamsa/lib/server/business";

// Use shared mock from test setup (logger is already mocked globally in preload)

// Mock logger for this test file
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../../tests/setup/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));


// Import the functions to test
import {
  generateCalendarTokenLogic,
  validateCalendarTokenLogic,
  revokeCalendarTokenLogic,
  listCalendarTokensLogic,
  deleteCalendarTokenLogic,
} from "@vamsa/lib/server/business";

// Create mock database client
function createMockDb(): CalendarDb {
  return {
    calendarToken: {
      create: mock(() => Promise.resolve({})),
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    auditLog: {
      create: mock(() => Promise.resolve({})),
    },
    user: {
      findFirst: mock(() => Promise.resolve(null)),
    },
  } as unknown as CalendarDb;
}

describe("Calendar Server Functions", () => {
  let mockDb: CalendarDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
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

      (mockDb.calendarToken.create as ReturnType<typeof mock>).mockResolvedValueOnce(mockToken);
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await generateCalendarTokenLogic(
        userId,
        tokenName,
        expiryDays,
        mockDb
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe("abc123def456");
      expect(result.name).toBe(tokenName);
      expect(mockDb.calendarToken.create).toHaveBeenCalled();
      expect(mockDb.auditLog.create).toHaveBeenCalled();
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

      (mockDb.calendarToken.create as ReturnType<typeof mock>).mockResolvedValueOnce(mockToken);
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await generateCalendarTokenLogic("user-1", undefined, 90, mockDb);

      const createCall = (mockDb.calendarToken.create as ReturnType<typeof mock>).mock.calls[0];
      const expiresAt = createCall?.[0]?.data?.expiresAt as Date;

      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should log audit trail", async () => {
      const mockToken = {
        id: "token-1",
        token: "abc123",
        userId: "user-1",
        name: "Test",
        expiresAt: new Date(),
        isActive: true,
      };

      (mockDb.calendarToken.create as ReturnType<typeof mock>).mockResolvedValueOnce(mockToken);
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await generateCalendarTokenLogic("user-1", "Test", 30, mockDb);

      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          action: "CREATE",
          entityType: "CalendarToken",
          entityId: "token-1",
          newData: expect.objectContaining({
            name: "Test",
          }),
        },
      });
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

      (mockDb.calendarToken.create as ReturnType<typeof mock>).mockResolvedValueOnce(mockToken);
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await generateCalendarTokenLogic("user-1", undefined, 30, mockDb);

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

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );

      const result = await validateCalendarTokenLogic("abc123", mockDb);

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

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );

      const result = await validateCalendarTokenLogic("abc123", mockDb);

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

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );

      const result = await validateCalendarTokenLogic("abc123", mockDb);

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });

    it("should return invalid for non-existent token", async () => {
      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      const result = await validateCalendarTokenLogic("nonexistent", mockDb);

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database error");
      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockRejectedValueOnce(error);

      const result = await validateCalendarTokenLogic("abc123", mockDb);

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

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );
      (mockDb.calendarToken.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        ...mockToken,
        isActive: false,
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await revokeCalendarTokenLogic(tokenId, userId, mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.calendarToken.update).toHaveBeenCalledWith({
        where: { id: tokenId },
        data: { isActive: false },
      });
    });

    it("should throw error if token not found", async () => {
      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      try {
        await revokeCalendarTokenLogic("token-nonexistent", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found or unauthorized");
      }
    });

    it("should throw error if token does not belong to user", async () => {
      const mockToken = {
        id: "token-1",
        userId: "user-2",
        isActive: true,
      };

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );

      try {
        await revokeCalendarTokenLogic("token-1", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found or unauthorized");
      }
    });

    it("should log audit trail on revoke", async () => {
      const tokenId = "token-1";
      const userId = "user-1";

      const mockToken = {
        id: tokenId,
        userId,
        isActive: true,
      };

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );
      (mockDb.calendarToken.update as ReturnType<typeof mock>).mockResolvedValueOnce({});
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await revokeCalendarTokenLogic(tokenId, userId, mockDb);

      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: "DELETE",
          entityType: "CalendarToken",
          entityId: tokenId,
        },
      });
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

      (mockDb.calendarToken.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockTokens
      );

      const result = await listCalendarTokensLogic(userId, mockDb);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Token 1");
      expect(result[1].name).toBe("Token 2");
    });

    it("should return empty list if no tokens exist", async () => {
      (mockDb.calendarToken.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      const result = await listCalendarTokensLogic("user-1", mockDb);

      expect(result).toHaveLength(0);
    });

    it("should order tokens by creation date descending", async () => {
      const userId = "user-1";

      (mockDb.calendarToken.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await listCalendarTokensLogic(userId, mockDb);

      const findManyCall = (mockDb.calendarToken.findMany as ReturnType<typeof mock>).mock
        .calls[0];
      expect(findManyCall?.[0]).toEqual({
        where: { userId },
        select: {
          id: true,
          token: true,
          name: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
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

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );
      (mockDb.calendarToken.delete as ReturnType<typeof mock>).mockResolvedValueOnce({});
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await deleteCalendarTokenLogic(tokenId, userId, mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.calendarToken.delete).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
    });

    it("should throw error if token not found", async () => {
      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      try {
        await deleteCalendarTokenLogic("token-nonexistent", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found or unauthorized");
      }
    });

    it("should throw error if token is still active", async () => {
      const mockToken = {
        id: "token-1",
        userId: "user-1",
        isActive: true,
      };

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );

      try {
        await deleteCalendarTokenLogic("token-1", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Only revoked tokens can be deleted");
      }
    });

    it("should throw error if token does not belong to user", async () => {
      const mockToken = {
        id: "token-1",
        userId: "user-2",
        isActive: false,
      };

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );

      try {
        await deleteCalendarTokenLogic("token-1", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found or unauthorized");
      }
    });

    it("should log audit trail on delete", async () => {
      const tokenId = "token-1";
      const userId = "user-1";

      const mockToken = {
        id: tokenId,
        userId,
        isActive: false,
      };

      (mockDb.calendarToken.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockToken
      );
      (mockDb.calendarToken.delete as ReturnType<typeof mock>).mockResolvedValueOnce({});
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await deleteCalendarTokenLogic(tokenId, userId, mockDb);

      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: "DELETE",
          entityType: "CalendarToken",
          entityId: tokenId,
        },
      });
    });
  });
});
