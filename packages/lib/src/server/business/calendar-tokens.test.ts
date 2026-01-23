/**
 * Unit tests for calendar tokens server business logic
 *
 * Tests cover:
 * - Getting user's calendar tokens
 * - Creating new calendar tokens
 * - Verifying token ownership
 * - Rotating calendar tokens
 * - Revoking calendar tokens
 * - Updating token names
 * - Deleting calendar tokens
 * - Error handling and authorization
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { CalendarTokensDb } from "@vamsa/lib/server/business";

// Use shared mock from test setup (logger is already mocked globally in preload)

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

// Import the functions to test
import {
  getCalendarTokensData,
  createCalendarTokenData,
  verifyTokenOwnership,
  rotateCalendarTokenData,
  revokeCalendarTokenData,
  updateTokenNameData,
  deleteCalendarTokenData,
  getAllCalendarTokensData,
} from "@vamsa/lib/server/business";

// Create mock database client
function createMockDb(): CalendarTokensDb {
  return {
    calendarToken: {
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve(null)),
      findUniqueOrThrow: mock(() => Promise.resolve({})),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
  } as unknown as CalendarTokensDb;
}

describe("Calendar Tokens Server Functions", () => {
  let mockDb: CalendarTokensDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.info.mockClear();
  });

  describe("getCalendarTokensData", () => {
    it("should get tokens for a user", async () => {
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
      ];

      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockTokens);

      const result = await getCalendarTokensData(userId, mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Token 1");
      expect(mockDb.calendarToken.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array if no tokens exist", async () => {
      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await getCalendarTokensData("user-1", mockDb);

      expect(result).toHaveLength(0);
    });
  });

  describe("createCalendarTokenData", () => {
    it("should create a new calendar token", async () => {
      const userId = "user-1";
      const input = { name: "My Token", rotationPolicy: "annual" };

      const mockToken = {
        id: "token-1",
        token: "abc123def456",
        userId,
        name: "My Token",
        rotationPolicy: "annual",
        expiresAt: new Date(),
        isActive: true,
      };

      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);

      const result = await createCalendarTokenData(userId, input, mockDb);

      expect(result.id).toBe("token-1");
      expect(result.name).toBe("My Token");
      expect(mockDb.calendarToken.create).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should set default rotation policy", async () => {
      const mockToken = {
        id: "token-1",
        token: "abc123",
        userId: "user-1",
        name: null,
        rotationPolicy: "annual",
        expiresAt: new Date(),
        isActive: true,
      };

      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);

      await createCalendarTokenData("user-1", { name: "Test" }, mockDb);

      const createCall = (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mock.calls[0];
      expect(createCall?.[0]?.data?.rotationPolicy).toBe("annual");
    });
  });

  describe("verifyTokenOwnership", () => {
    it("should verify token ownership", async () => {
      const tokenId = "token-1";
      const userId = "user-1";
      const mockToken = {
        id: tokenId,
        userId,
        isActive: true,
      };

      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);

      const result = await verifyTokenOwnership(tokenId, userId, mockDb);

      expect(result.id).toBe(tokenId);
      expect(mockDb.calendarToken.findFirst).toHaveBeenCalledWith({
        where: { id: tokenId, userId },
      });
    });

    it("should throw error if token not found", async () => {
      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await verifyTokenOwnership("token-nonexistent", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found");
      }
    });

    it("should throw error if token does not belong to user", async () => {
      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await verifyTokenOwnership("token-1", "user-2", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found");
      }
    });
  });

  describe("rotateCalendarTokenData", () => {
    it("should verify token ownership before rotation", async () => {
      const tokenId = "token-1";
      const userId = "user-1";

      const mockToken = {
        id: tokenId,
        userId,
        name: "Test Token",
        scopes: ["all"],
        rotationPolicy: "annual",
        isActive: true,
        createdAt: new Date(),
      };

      const mockNewToken = {
        id: "token-2",
        token: "new-token-value",
        userId,
        name: "Test Token",
      };

      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);

      // Mock for rotateToken - findUniqueOrThrow
      (
        mockDb.calendarToken.findUniqueOrThrow as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);

      // Mock for rotateToken - create (new token)
      (
        mockDb.calendarToken.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockNewToken);

      // Mock for rotateToken - update (old token grace period)
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({ ...mockToken, name: "Test Token (rotated)" });

      const result = await rotateCalendarTokenData(tokenId, userId, mockDb);

      expect(result.id).toBe("token-2");
      expect(mockDb.calendarToken.findFirst).toHaveBeenCalledWith({
        where: { id: tokenId, userId },
      });
    });

    it("should throw error if token not found", async () => {
      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await rotateCalendarTokenData("token-nonexistent", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found");
      }
    });
  });

  describe("revokeCalendarTokenData", () => {
    it("should verify token ownership before revocation", async () => {
      const tokenId = "token-1";
      const userId = "user-1";

      const mockToken = {
        id: tokenId,
        userId,
        isActive: true,
      };

      const mockRevokedToken = {
        id: tokenId,
        userId,
        isActive: false,
        expiresAt: new Date(),
      };

      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);

      // Mock for revokeToken - update
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockRevokedToken);

      const result = await revokeCalendarTokenData(tokenId, userId, mockDb);

      expect(result.isActive).toBe(false);
      expect(mockDb.calendarToken.findFirst).toHaveBeenCalledWith({
        where: { id: tokenId, userId },
      });
    });

    it("should throw error if token not found", async () => {
      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await revokeCalendarTokenData("token-nonexistent", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found");
      }
    });

    it("should throw error if token does not belong to user", async () => {
      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await revokeCalendarTokenData("token-1", "user-2", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found");
      }
    });
  });

  describe("updateTokenNameData", () => {
    it("should update token name", async () => {
      const tokenId = "token-1";
      const userId = "user-1";
      const newName = "Updated Name";

      const mockToken = {
        id: tokenId,
        userId,
        isActive: true,
      };

      const mockUpdated = {
        id: tokenId,
        name: newName,
      };

      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);
      (
        mockDb.calendarToken.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUpdated);

      const result = await updateTokenNameData(
        tokenId,
        newName,
        userId,
        mockDb
      );

      expect(result.id).toBe(tokenId);
      expect(result.name).toBe(newName);
      expect(mockDb.calendarToken.update).toHaveBeenCalledWith({
        where: { id: tokenId },
        data: { name: newName },
      });
    });

    it("should throw error if token not found", async () => {
      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await updateTokenNameData(
          "token-nonexistent",
          "New Name",
          "user-1",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found");
      }
    });

    it("should throw error if token does not belong to user", async () => {
      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await updateTokenNameData("token-1", "New Name", "user-2", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found");
      }
    });
  });

  describe("deleteCalendarTokenData", () => {
    it("should delete an inactive token", async () => {
      const tokenId = "token-1";
      const userId = "user-1";

      const mockToken = {
        id: tokenId,
        userId,
        isActive: false,
      };

      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);
      (
        mockDb.calendarToken.delete as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      const result = await deleteCalendarTokenData(tokenId, userId, mockDb);

      expect(result.success).toBe(true);
      expect(result.deletedId).toBe(tokenId);
      expect(mockDb.calendarToken.delete).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
    });

    it("should throw error if trying to delete active token", async () => {
      const mockToken = {
        id: "token-1",
        userId: "user-1",
        isActive: true,
      };

      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);

      try {
        await deleteCalendarTokenData("token-1", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Cannot delete an active token. Please revoke it first."
        );
      }
    });

    it("should throw error if token not found", async () => {
      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deleteCalendarTokenData("token-nonexistent", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found");
      }
    });

    it("should throw error if token does not belong to user", async () => {
      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deleteCalendarTokenData("token-1", "user-2", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Token not found");
      }
    });

    it("should log info message on delete", async () => {
      const mockToken = {
        id: "token-1",
        userId: "user-1",
        isActive: false,
      };

      (
        mockDb.calendarToken.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockToken);
      (
        mockDb.calendarToken.delete as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      await deleteCalendarTokenData("token-1", "user-1", mockDb);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          tokenId: "token-1",
        }),
        "Calendar token permanently deleted"
      );
    });
  });

  describe("getAllCalendarTokensData", () => {
    it("should get all calendar tokens", async () => {
      const mockTokens = [
        {
          id: "token-1",
          token: "abc123",
          name: "Token 1",
          expiresAt: new Date(),
          isActive: true,
          createdAt: new Date(),
          user: {
            id: "user-1",
            email: "user1@example.com",
            name: "User 1",
          },
        },
        {
          id: "token-2",
          token: "def456",
          name: "Token 2",
          expiresAt: new Date(),
          isActive: false,
          createdAt: new Date(),
          user: {
            id: "user-2",
            email: "user2@example.com",
            name: "User 2",
          },
        },
      ];

      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockTokens);

      const result = await getAllCalendarTokensData(mockDb);

      expect(result).toHaveLength(2);
      expect(result[0].user.email).toBe("user1@example.com");
      expect(result[1].user.email).toBe("user2@example.com");
    });

    it("should include user information", async () => {
      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      await getAllCalendarTokensData(mockDb);

      const findManyCall = (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mock.calls[0];
      expect(findManyCall?.[0]).toEqual({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should order tokens by creation date descending", async () => {
      (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      await getAllCalendarTokensData(mockDb);

      const findManyCall = (
        mockDb.calendarToken.findMany as ReturnType<typeof mock>
      ).mock.calls[0];
      expect(findManyCall?.[0]?.orderBy).toEqual({ createdAt: "desc" });
    });
  });
});
