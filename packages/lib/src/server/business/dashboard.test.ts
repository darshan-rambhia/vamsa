/**
 * Unit tests for dashboard server business logic
 *
 * Tests cover:
 * - Getting dashboard statistics (total people, living/deceased, relationships)
 * - Retrieving recent activity logs with filtering
 * - Getting filter options for activity logs
 * - Error handling and validation
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { DashboardDb } from "@vamsa/lib/server/business";

// Use shared mock from test setup

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
  getDashboardStatsData,
  getRecentActivityData,
  getActivityFilterOptionsData,
} from "@vamsa/lib/server/business";

// Create mock database client - no mock.module() needed!
function createMockDb(): DashboardDb {
  return {
    person: {
      count: mock(() => Promise.resolve(0)),
      findMany: mock(() => Promise.resolve([])),
    },
    relationship: {
      count: mock(() => Promise.resolve(0)),
    },
    auditLog: {
      findMany: mock(() => Promise.resolve([])),
      groupBy: mock(() => Promise.resolve([])),
    },
    user: {
      findMany: mock(() => Promise.resolve([])),
    },
  } as unknown as DashboardDb;
}

describe("Dashboard Server Functions", () => {
  let mockDb: DashboardDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
  });

  describe("getDashboardStatsData", () => {
    it("should return empty stats when no data exists", async () => {
      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValue(0);
      (mockDb.relationship.count as ReturnType<typeof mock>).mockResolvedValue(
        0
      );
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      const result = await getDashboardStatsData(mockDb);

      expect(result.totalPeople).toBe(0);
      expect(result.livingPeople).toBe(0);
      expect(result.deceasedPeople).toBe(0);
      expect(result.totalRelationships).toBe(0);
      expect(result.recentAdditions).toHaveLength(0);
    });

    it("should calculate family statistics correctly", async () => {
      (mockDb.person.count as ReturnType<typeof mock>)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(75)
        .mockResolvedValueOnce(25);
      (mockDb.relationship.count as ReturnType<typeof mock>).mockResolvedValue(
        150
      );
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      const result = await getDashboardStatsData(mockDb);

      expect(result.totalPeople).toBe(100);
      expect(result.livingPeople).toBe(75);
      expect(result.deceasedPeople).toBe(25);
      expect(result.totalRelationships).toBe(150);
    });

    it("should include recent additions with timestamps", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValue(2);
      (mockDb.relationship.count as ReturnType<typeof mock>).mockResolvedValue(
        0
      );
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          createdAt: now,
        },
        {
          id: "person-2",
          firstName: "Jane",
          lastName: "Smith",
          createdAt: yesterday,
        },
      ]);

      const result = await getDashboardStatsData(mockDb);

      expect(result.recentAdditions).toHaveLength(2);
      expect(result.recentAdditions[0].firstName).toBe("John");
      expect(result.recentAdditions[0].createdAt).toBe(now.getTime());
      expect(result.recentAdditions[1].firstName).toBe("Jane");
    });

    it("should call count with correct filters for living people", async () => {
      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValue(0);
      (mockDb.relationship.count as ReturnType<typeof mock>).mockResolvedValue(
        0
      );
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      await getDashboardStatsData(mockDb);

      const calls = (mockDb.person.count as ReturnType<typeof mock>).mock.calls;
      expect(calls).toHaveLength(3);
      expect(calls[1]?.[0]).toEqual({ where: { isLiving: true } });
      expect(calls[2]?.[0]).toEqual({ where: { isLiving: false } });
    });

    it("should order recent additions by creation date desc", async () => {
      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValue(0);
      (mockDb.relationship.count as ReturnType<typeof mock>).mockResolvedValue(
        0
      );
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      await getDashboardStatsData(mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]).toEqual(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      );
    });
  });

  describe("getRecentActivityData", () => {
    it("should return empty array when no logs exist", async () => {
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue(
        []
      );

      const result = await getRecentActivityData({}, mockDb);

      expect(result).toHaveLength(0);
    });

    it("should format activity logs correctly", async () => {
      const timestamp = new Date();
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          createdAt: timestamp,
          newData: { firstName: "John", lastName: "Doe" },
          user: { id: "user-1", name: "Admin" },
        },
      ]);

      const result = await getRecentActivityData({}, mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("log-1");
      expect(result[0].actionType).toBe("CREATE");
      expect(result[0].entityType).toBe("PERSON");
      expect(result[0].timestamp).toBe(timestamp.getTime());
      expect(result[0].user?.name).toBe("Admin");
    });

    it("should filter by date range", async () => {
      const dateFrom = Date.now() - 86400000;
      const dateTo = Date.now();

      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue(
        []
      );

      await getRecentActivityData({ dateFrom, dateTo }, mockDb);

      const call = (mockDb.auditLog.findMany as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.where?.createdAt).toBeDefined();
      expect(call?.[0]?.where?.createdAt?.gte).toBeInstanceOf(Date);
      expect(call?.[0]?.where?.createdAt?.lte).toBeInstanceOf(Date);
    });

    it("should filter by action types", async () => {
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue(
        []
      );

      await getRecentActivityData(
        { actionTypes: ["CREATE", "UPDATE"] },
        mockDb
      );

      const call = (mockDb.auditLog.findMany as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.where?.action).toEqual({ in: ["CREATE", "UPDATE"] });
    });

    it("should filter by entity types", async () => {
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue(
        []
      );

      await getRecentActivityData(
        { entityTypes: ["PERSON", "RELATIONSHIP"] },
        mockDb
      );

      const call = (mockDb.auditLog.findMany as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.where?.entityType).toEqual({
        in: ["PERSON", "RELATIONSHIP"],
      });
    });

    it("should filter by user", async () => {
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue(
        []
      );

      await getRecentActivityData({ userId: "user-1" }, mockDb);

      const call = (mockDb.auditLog.findMany as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.where?.userId).toBe("user-1");
    });

    it("should apply default limit of 50", async () => {
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue(
        []
      );

      await getRecentActivityData({}, mockDb);

      const call = (mockDb.auditLog.findMany as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.take).toBe(50);
    });

    it("should apply custom limit", async () => {
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue(
        []
      );

      await getRecentActivityData({ limit: 100 }, mockDb);

      const call = (mockDb.auditLog.findMany as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.take).toBe(100);
    });

    it("should apply search query filter in application layer", async () => {
      const timestamp = new Date();
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          createdAt: timestamp,
          newData: { firstName: "John", lastName: "Doe" },
          user: { id: "user-1", name: "Admin" },
        },
        {
          id: "log-2",
          action: "DELETE",
          entityType: "PERSON",
          entityId: "person-2",
          createdAt: timestamp,
          newData: { firstName: "Jane", lastName: "Smith" },
          user: { id: "user-2", name: "Editor" },
        },
      ]);

      const result = await getRecentActivityData(
        { searchQuery: "John" },
        mockDb
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("log-1");
    });

    it("should handle null user", async () => {
      const timestamp = new Date();
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          createdAt: timestamp,
          newData: { firstName: "John", lastName: "Doe" },
          user: null,
        },
      ]);

      const result = await getRecentActivityData({}, mockDb);

      expect(result[0].user).toBeNull();
    });

    it("should generate descriptions for person creation", async () => {
      const timestamp = new Date();
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          createdAt: timestamp,
          newData: { firstName: "John", lastName: "Doe" },
          user: null,
        },
      ]);

      const result = await getRecentActivityData({}, mockDb);

      expect(result[0].description).toContain("John Doe");
      expect(result[0].description).toContain("family tree");
    });
  });

  describe("getActivityFilterOptionsData", () => {
    it("should return empty options when no data exists", async () => {
      (mockDb.auditLog.groupBy as ReturnType<typeof mock>).mockResolvedValue(
        []
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      const result = await getActivityFilterOptionsData(mockDb);

      expect(result.actionTypes).toHaveLength(0);
      expect(result.entityTypes).toHaveLength(0);
      expect(result.users).toHaveLength(0);
    });

    it("should aggregate action types with counts", async () => {
      (mockDb.auditLog.groupBy as ReturnType<typeof mock>)
        .mockResolvedValueOnce([
          { action: "CREATE", _count: 5 },
          { action: "UPDATE", _count: 3 },
          { action: "DELETE", _count: 1 },
        ])
        .mockResolvedValueOnce([]);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      const result = await getActivityFilterOptionsData(mockDb);

      expect(result.actionTypes).toHaveLength(3);
      expect(result.actionTypes[0]).toEqual(
        expect.objectContaining({
          value: "CREATE",
          count: 5,
        })
      );
    });

    it("should format action type labels", async () => {
      (mockDb.auditLog.groupBy as ReturnType<typeof mock>)
        .mockResolvedValueOnce([{ action: "CREATE", _count: 5 }])
        .mockResolvedValueOnce([]);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      const result = await getActivityFilterOptionsData(mockDb);

      expect(result.actionTypes[0].label).toBe("Created");
    });

    it("should aggregate entity types with counts", async () => {
      (mockDb.auditLog.groupBy as ReturnType<typeof mock>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { entityType: "PERSON", _count: 10 },
          { entityType: "RELATIONSHIP", _count: 5 },
        ]);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      const result = await getActivityFilterOptionsData(mockDb);

      expect(result.entityTypes).toHaveLength(2);
      expect(result.entityTypes[0].value).toBe("PERSON");
      expect(result.entityTypes[0].count).toBe(10);
    });

    it("should list users who performed actions", async () => {
      (mockDb.auditLog.groupBy as ReturnType<typeof mock>).mockResolvedValue(
        []
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        { id: "user-1", name: "Admin" },
        { id: "user-2", name: "Editor" },
      ]);

      const result = await getActivityFilterOptionsData(mockDb);

      expect(result.users).toHaveLength(2);
      expect(result.users[0]).toEqual(
        expect.objectContaining({
          value: "user-1",
          label: "Admin",
        })
      );
    });

    it("should order users by name", async () => {
      (mockDb.auditLog.groupBy as ReturnType<typeof mock>).mockResolvedValue(
        []
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      await getActivityFilterOptionsData(mockDb);

      const call = (mockDb.user.findMany as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.orderBy).toEqual({ name: "asc" });
    });
  });

  describe("Error handling", () => {
    it("should handle database errors in getDashboardStatsData", async () => {
      const error = new Error("Database error");
      (mockDb.person.count as ReturnType<typeof mock>).mockRejectedValueOnce(
        error
      );

      try {
        await getDashboardStatsData(mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it("should handle database errors in getRecentActivityData", async () => {
      const error = new Error("Database error");
      (
        mockDb.auditLog.findMany as ReturnType<typeof mock>
      ).mockRejectedValueOnce(error);

      try {
        await getRecentActivityData({}, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it("should handle database errors in getActivityFilterOptionsData", async () => {
      const error = new Error("Database error");
      (
        mockDb.auditLog.groupBy as ReturnType<typeof mock>
      ).mockRejectedValueOnce(error);

      try {
        await getActivityFilterOptionsData(mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });
});
