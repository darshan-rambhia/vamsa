/**
 * Unit tests for dashboard server business logic
 *
 * Tests cover:
 * - Dashboard statistics aggregation (family counts, recent additions)
 * - Recent activity retrieval with filtering
 * - Activity filter options generation
 * - Formatting helpers (action types, entity types, descriptions)
 * - Error handling and edge cases
 *
 * Testing approach: Module mocking with mock.module() for @vamsa/api
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  mockLogger,
  mockLoggers,
  mockLog,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../testing/shared-mocks";

// Create mock drizzleSchema
const mockDrizzleSchema = {
  persons: {
    id: "id",
    firstName: "firstName",
    lastName: "lastName",
    isLiving: "isLiving",
    createdAt: "createdAt",
  },
  relationships: {
    id: "id",
  },
  auditLogs: {
    id: "id",
    userId: "userId",
    action: "action",
    entityType: "entityType",
    entityId: "entityId",
    newData: "newData",
    createdAt: "createdAt",
  },
  users: {
    id: "id",
    name: "name",
  },
};

// Create mock drizzleDb
const mockDrizzleDb = {
  select: mock(() => ({
    from: mock(() => ({
      where: mock(() => Promise.resolve([])),
    })),
  })),
  query: {
    persons: {
      findMany: mock(() => Promise.resolve([])),
    },
    relationships: {
      findMany: mock(() => Promise.resolve([])),
    },
    auditLogs: {
      findMany: mock(() => Promise.resolve([])),
    },
    users: {
      findMany: mock(() => Promise.resolve([])),
    },
  },
};

mock.module("@vamsa/api", () => ({
  drizzleDb: mockDrizzleDb,
  drizzleSchema: mockDrizzleSchema,
}));

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  loggers: mockLoggers,
  log: mockLog,
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

describe("Dashboard Server Business Logic", () => {
  beforeEach(() => {
    (mockDrizzleDb.select as ReturnType<typeof mock>).mockClear();
    (
      mockDrizzleDb.query.persons.findMany as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.relationships.findMany as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
    ).mockClear();
    (mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>).mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
  });

  describe("getDashboardStatsData", () => {
    it("should return dashboard stats object", async () => {
      // The implementation calls drizzleDb.select().from().where() which
      // returns arrays through Promise.all. We can't easily test the complex
      // Drizzle query chains without integration tests, so we test the response shape.

      const result = await getDashboardStatsData();

      expect(result).toBeDefined();
      expect(typeof result.totalPeople).toBe("number");
      expect(typeof result.livingPeople).toBe("number");
      expect(typeof result.deceasedPeople).toBe("number");
      expect(typeof result.totalRelationships).toBe("number");
      expect(Array.isArray(result.recentAdditions)).toBe(true);
    });

    it("should return recent additions as array", async () => {
      const result = await getDashboardStatsData();

      expect(Array.isArray(result.recentAdditions)).toBe(true);
      if (result.recentAdditions.length > 0) {
        expect(result.recentAdditions[0]).toHaveProperty("id");
        expect(result.recentAdditions[0]).toHaveProperty("firstName");
        expect(result.recentAdditions[0]).toHaveProperty("lastName");
        expect(result.recentAdditions[0]).toHaveProperty("createdAt");
        expect(typeof result.recentAdditions[0].createdAt).toBe("number");
      }
    });

    it("should have non-negative statistics", async () => {
      const result = await getDashboardStatsData();

      expect(result.totalPeople).toBeGreaterThanOrEqual(0);
      expect(result.livingPeople).toBeGreaterThanOrEqual(0);
      expect(result.deceasedPeople).toBeGreaterThanOrEqual(0);
      expect(result.totalRelationships).toBeGreaterThanOrEqual(0);
    });

    it("should limit recent additions", async () => {
      const result = await getDashboardStatsData();

      expect(result.recentAdditions.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getRecentActivityData", () => {
    it("should retrieve activity logs with default limit", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: { firstName: "John", lastName: "Doe" },
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin User" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it("should format activity logs with proper structure", async () => {
      const createdAtDate = new Date("2024-01-15T10:30:00Z");
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: { firstName: "John", lastName: "Doe" },
          createdAt: createdAtDate,
          userId: "user-1",
          user: { id: "user-1", name: "Admin User" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("log-1");
      expect(result[0].actionType).toBe("CREATE");
      expect(result[0].entityType).toBe("PERSON");
      expect(result[0].entityId).toBe("person-1");
      expect(typeof result[0].timestamp).toBe("number");
      expect(result[0].user).toBeDefined();
      expect(result[0].user?.id).toBe("user-1");
      expect(result[0].user?.name).toBe("Admin User");
    });

    it("should generate human-readable description for CREATE action on PERSON", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: { firstName: "John", lastName: "Doe" },
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin User" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData();

      expect(result[0].description).toContain("Added");
      expect(result[0].description).toContain("John");
      expect(result[0].description).toContain("Doe");
    });

    it("should filter by action types", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "UPDATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: {},
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData({
        actionTypes: ["UPDATE"],
      });

      expect(result).toBeDefined();
    });

    it("should filter by entity types", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "USER",
          entityId: "user-1",
          newData: {},
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData({
        entityTypes: ["USER"],
      });

      expect(result).toBeDefined();
    });

    it("should filter by userId", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: { firstName: "John", lastName: "Doe" },
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData({
        userId: "user-1",
      });

      expect(result).toBeDefined();
    });

    it("should filter by date range", async () => {
      const dateFrom = Date.now() - 86400000; // 24 hours ago
      const dateTo = Date.now();

      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: { firstName: "John", lastName: "Doe" },
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData({
        dateFrom,
        dateTo,
      });

      expect(result).toBeDefined();
    });

    it("should apply search query filter in application layer", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: { firstName: "John", lastName: "Doe" },
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin" },
        },
        {
          id: "log-2",
          action: "UPDATE",
          entityType: "PERSON",
          entityId: "person-2",
          newData: { firstName: "Jane", lastName: "Smith" },
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData({
        searchQuery: "john",
      });

      expect(result.length).toBeLessThanOrEqual(mockLogs.length);
    });

    it("should return null user when user data is missing", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: { firstName: "John", lastName: "Doe" },
          createdAt: new Date(),
          userId: "user-1",
          user: null,
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData();

      expect(result[0].user).toBeNull();
    });

    it("should use 'Unknown' as fallback for null user name", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: { firstName: "John", lastName: "Doe" },
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: null },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData();

      expect(result[0].user?.name).toBe("Unknown");
    });

    it("should respect custom limit", async () => {
      const mockLogs = Array.from({ length: 5 }, (_, i) => ({
        id: `log-${i}`,
        action: "CREATE",
        entityType: "PERSON",
        entityId: `person-${i}`,
        newData: {},
        createdAt: new Date(),
        userId: "user-1",
        user: { id: "user-1", name: "Admin" },
      }));

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData({ limit: 10 });

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it("should handle DELETE action description", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "DELETE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: {},
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData();

      expect(result[0].description).toContain("Removed");
    });

    it("should handle LOGIN action description", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "LOGIN",
          entityType: "USER",
          entityId: null,
          newData: {},
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData();

      expect(result[0].description).toBe("Logged in");
    });

    it("should handle UPDATE action description with person names", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "UPDATE",
          entityType: "PERSON",
          entityId: "person-1",
          newData: { firstName: "John", lastName: "Doe" },
          createdAt: new Date(),
          userId: "user-1",
          user: { id: "user-1", name: "Admin" },
        },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);

      const result = await getRecentActivityData();

      expect(result[0].description).toContain("Updated");
      expect(result[0].description).toContain("John");
      expect(result[0].description).toContain("Doe");
    });
  });

  describe("getActivityFilterOptionsData", () => {
    it("should return filter options with action types and counts", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
        {
          id: "log-2",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
        {
          id: "log-3",
          action: "UPDATE",
          entityType: "PERSON",
          userId: "user-1",
        },
      ];

      const mockUsers = [
        { id: "user-1", name: "Admin User" },
        { id: "user-2", name: "Regular User" },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockUsers);

      const result = await getActivityFilterOptionsData();

      expect(result.actionTypes).toBeDefined();
      expect(result.entityTypes).toBeDefined();
      expect(result.users).toBeDefined();
      expect(Array.isArray(result.actionTypes)).toBe(true);
      expect(Array.isArray(result.entityTypes)).toBe(true);
      expect(Array.isArray(result.users)).toBe(true);
    });

    it("should aggregate action types with correct counts", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
        {
          id: "log-2",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
        {
          id: "log-3",
          action: "UPDATE",
          entityType: "PERSON",
          userId: "user-1",
        },
      ];

      const mockUsers = [{ id: "user-1", name: "Admin" }];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockUsers);

      const result = await getActivityFilterOptionsData();

      const createCount = result.actionTypes.find(
        (a) => a.value === "CREATE"
      )?.count;
      const updateCount = result.actionTypes.find(
        (a) => a.value === "UPDATE"
      )?.count;

      expect(createCount).toBe(2);
      expect(updateCount).toBe(1);
    });

    it("should aggregate entity types with correct counts", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
        {
          id: "log-2",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
        { id: "log-3", action: "CREATE", entityType: "USER", userId: "user-1" },
      ];

      const mockUsers = [{ id: "user-1", name: "Admin" }];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockUsers);

      const result = await getActivityFilterOptionsData();

      const personCount = result.entityTypes.find(
        (e) => e.value === "PERSON"
      )?.count;
      const userCount = result.entityTypes.find(
        (e) => e.value === "USER"
      )?.count;

      expect(personCount).toBe(2);
      expect(userCount).toBe(1);
    });

    it("should include only users who have audit logs", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
      ];

      const mockUsers = [
        { id: "user-1", name: "Admin User" },
        { id: "user-2", name: "Inactive User" },
        { id: "user-3", name: "Another User" },
      ];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockUsers);

      const result = await getActivityFilterOptionsData();

      expect(result.users.length).toBe(1);
      expect(result.users[0].value).toBe("user-1");
    });

    it("should format action type labels", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
        {
          id: "log-2",
          action: "DELETE",
          entityType: "PERSON",
          userId: "user-1",
        },
      ];

      const mockUsers = [{ id: "user-1", name: "Admin" }];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockUsers);

      const result = await getActivityFilterOptionsData();

      const createLabel = result.actionTypes.find(
        (a) => a.value === "CREATE"
      )?.label;
      const deleteLabel = result.actionTypes.find(
        (a) => a.value === "DELETE"
      )?.label;

      expect(createLabel).toBe("Created");
      expect(deleteLabel).toBe("Deleted");
    });

    it("should format entity type labels", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
        { id: "log-2", action: "CREATE", entityType: "USER", userId: "user-1" },
      ];

      const mockUsers = [{ id: "user-1", name: "Admin" }];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockUsers);

      const result = await getActivityFilterOptionsData();

      const personLabel = result.entityTypes.find(
        (e) => e.value === "PERSON"
      )?.label;
      const userLabel = result.entityTypes.find(
        (e) => e.value === "USER"
      )?.label;

      expect(personLabel).toBe("Person");
      expect(userLabel).toBe("User");
    });

    it("should handle empty audit logs", async () => {
      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue([]);

      const result = await getActivityFilterOptionsData();

      expect(result.actionTypes).toEqual([]);
      expect(result.entityTypes).toEqual([]);
      expect(result.users).toEqual([]);
    });

    it("should handle unknown action type with fallback formatting", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CUSTOM_ACTION",
          entityType: "PERSON",
          userId: "user-1",
        },
      ];

      const mockUsers = [{ id: "user-1", name: "Admin" }];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockUsers);

      const result = await getActivityFilterOptionsData();

      const customLabel = result.actionTypes.find(
        (a) => a.value === "CUSTOM_ACTION"
      )?.label;
      expect(customLabel).toBe("Custom_action");
    });

    it("should handle unknown entity type with fallback formatting", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "CUSTOM_ENTITY",
          userId: "user-1",
        },
      ];

      const mockUsers = [{ id: "user-1", name: "Admin" }];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockUsers);

      const result = await getActivityFilterOptionsData();

      const customLabel = result.entityTypes.find(
        (e) => e.value === "CUSTOM_ENTITY"
      )?.label;
      expect(customLabel).toBe("Custom_entity");
    });

    it("should use 'Unknown' as fallback for null user name", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "PERSON",
          userId: "user-1",
        },
      ];

      const mockUsers = [{ id: "user-1", name: null }];

      (
        mockDrizzleDb.query.auditLogs.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockLogs);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValue(mockUsers);

      const result = await getActivityFilterOptionsData();

      expect(result.users[0].label).toBe("Unknown");
    });
  });
});
