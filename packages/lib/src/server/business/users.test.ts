/**
 * Unit tests for user server business logic
 *
 * Tests cover:
 * - Getting users with pagination, filtering, and sorting
 * - Getting single user details
 * - Updating user (role, status, person linkage) with business rules
 * - Deleting user with audit trail
 * - Searching available persons for user linking
 * - Unlocking locked user accounts
 * - Error handling and validation
 * - Edge cases (null values, date formatting, self-modifications)
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { UserRole } from "@vamsa/schemas";
import type { UsersDb } from "@vamsa/lib/server/business";

// Mock logger
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
  getUsersData,
  getUserData,
  updateUserData,
  deleteUserData,
  searchAvailablePersonsData,
  unlockUserAccountData,
} from "@vamsa/lib/server/business";

// Create mock database client
function createMockDb(): UsersDb {
  return {
    user: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      count: mock(() => Promise.resolve(0)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    person: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
    },
  } as unknown as UsersDb;
}

describe("User Server Functions", () => {
  let mockDb: UsersDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
  });

  describe("getUsersData", () => {
    it("should list users with pagination", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "john@example.com",
          name: "John Doe",
          role: "MEMBER" as UserRole,
          isActive: true,
          personId: "person-1",
          createdAt: new Date("2024-01-01"),
          lastLoginAt: new Date("2024-01-15"),
          person: {
            id: "person-1",
            firstName: "John",
            lastName: "Doe",
          },
        },
      ];

      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUsers
      );

      const result = await getUsersData(
        { page: 1, limit: 10, sortOrder: "desc" },
        mockDb
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].email).toBe("john@example.com");
      expect(result.items[0].name).toBe("John Doe");
      expect(result.items[0].role).toBe("MEMBER");
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it("should apply search filter", async () => {
      const mockUsers = [
        {
          id: "user-2",
          email: "jane@example.com",
          name: "Jane Smith",
          role: "ADMIN" as UserRole,
          isActive: true,
          personId: null,
          createdAt: new Date("2024-01-02"),
          lastLoginAt: null,
          person: null,
        },
      ];

      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUsers
      );

      await getUsersData(
        { page: 1, limit: 10, sortOrder: "asc", search: "jane" },
        mockDb
      );

      const findManyCall = (mockDb.user.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.where?.OR).toBeDefined();
    });

    it("should apply role filter", async () => {
      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(3);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getUsersData(
        { page: 1, limit: 10, sortOrder: "desc", role: "VIEWER" },
        mockDb
      );

      const findManyCall = (mockDb.user.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.where?.role).toBe("VIEWER");
    });

    it("should apply isActive filter", async () => {
      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(2);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getUsersData(
        { page: 1, limit: 10, sortOrder: "desc", isActive: true },
        mockDb
      );

      const findManyCall = (mockDb.user.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.where?.isActive).toBe(true);
    });

    it("should apply pagination skip/take", async () => {
      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(100);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getUsersData({ page: 3, limit: 25, sortOrder: "asc" }, mockDb);

      const findManyCall = (mockDb.user.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.skip).toBe(50); // (3 - 1) * 25
      expect(findManyCall?.[0]?.take).toBe(25);
    });

    it("should sort ascending", async () => {
      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getUsersData({ page: 1, limit: 10, sortOrder: "asc" }, mockDb);

      const findManyCall = (mockDb.user.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.orderBy?.createdAt).toBe("asc");
    });

    it("should sort descending", async () => {
      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getUsersData({ page: 1, limit: 10, sortOrder: "desc" }, mockDb);

      const findManyCall = (mockDb.user.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.orderBy?.createdAt).toBe("desc");
    });

    it("should format dates correctly", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "john@example.com",
          name: "John Doe",
          role: "MEMBER" as UserRole,
          isActive: true,
          personId: null,
          createdAt: new Date("2024-01-01T10:00:00Z"),
          lastLoginAt: new Date("2024-01-15T14:30:00Z"),
          person: null,
        },
      ];

      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUsers
      );

      const result = await getUsersData(
        { page: 1, limit: 10, sortOrder: "asc" },
        mockDb
      );

      expect(result.items[0].createdAt).toContain("2024-01-01");
      expect(result.items[0].lastLoginAt).toContain("2024-01-15");
    });

    it("should handle null lastLoginAt", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "john@example.com",
          name: "John Doe",
          role: "MEMBER" as UserRole,
          isActive: true,
          personId: null,
          createdAt: new Date("2024-01-01"),
          lastLoginAt: null,
          person: null,
        },
      ];

      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUsers
      );

      const result = await getUsersData(
        { page: 1, limit: 10, sortOrder: "asc" },
        mockDb
      );

      expect(result.items[0].lastLoginAt).toBeNull();
    });

    it("should include person relationship", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "john@example.com",
          name: "John Doe",
          role: "MEMBER" as UserRole,
          isActive: true,
          personId: "person-1",
          createdAt: new Date("2024-01-01"),
          lastLoginAt: null,
          person: {
            id: "person-1",
            firstName: "John",
            lastName: "Doe",
          },
        },
      ];

      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUsers
      );

      const result = await getUsersData(
        { page: 1, limit: 10, sortOrder: "asc" },
        mockDb
      );

      expect(result.items[0].person).toBeDefined();
      expect(result.items[0].person?.firstName).toBe("John");
    });
  });

  describe("getUserData", () => {
    it("should retrieve single user by id", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        isActive: true,
        personId: "person-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-05"),
        lastLoginAt: new Date("2024-01-15"),
        failedLoginAttempts: 0,
        lockedUntil: null,
        person: {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
        },
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      const result = await getUserData("user-1", mockDb);

      expect(result.id).toBe("user-1");
      expect(result.email).toBe("john@example.com");
      expect(result.role).toBe("MEMBER");
    });

    it("should throw error if user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await getUserData("nonexistent", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("User not found");
      }
    });

    it("should format dates correctly", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        isActive: true,
        personId: null,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-05T14:30:00Z"),
        lastLoginAt: new Date("2024-01-15T09:15:00Z"),
        failedLoginAttempts: 0,
        lockedUntil: null,
        person: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      const result = await getUserData("user-1", mockDb);

      expect(result.createdAt).toContain("2024-01-01");
      expect(result.updatedAt).toContain("2024-01-05");
      expect(result.lastLoginAt).toContain("2024-01-15");
    });

    it("should handle null lock fields", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        isActive: true,
        personId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-05"),
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        person: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      const result = await getUserData("user-1", mockDb);

      expect(result.lastLoginAt).toBeNull();
      expect(result.lockedUntil).toBeNull();
    });

    it("should include failedLoginAttempts", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        isActive: true,
        personId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-05"),
        lastLoginAt: null,
        failedLoginAttempts: 3,
        lockedUntil: new Date("2024-01-20"),
        person: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      const result = await getUserData("user-1", mockDb);

      expect(result.failedLoginAttempts).toBe(3);
      expect(result.lockedUntil).toContain("2024-01-20");
    });
  });

  describe("updateUserData", () => {
    it("should update user name", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        isActive: true,
        personId: null,
      };

      const updated = {
        id: "user-1",
        email: "john@example.com",
        name: "Jane Doe",
        role: "MEMBER" as UserRole,
        isActive: true,
        personId: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await updateUserData(
        "user-1",
        { name: "Jane Doe" },
        "user-2",
        mockDb
      );

      expect(result.name).toBe("Jane Doe");
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should update user role", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
      };

      const updated = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "ADMIN" as UserRole,
        isActive: true,
        personId: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await updateUserData(
        "user-1",
        { role: "ADMIN" },
        "user-2",
        mockDb
      );

      expect(result.role).toBe("ADMIN");
    });

    it("should prevent self-demotion", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        role: "ADMIN" as UserRole,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );

      try {
        await updateUserData("user-1", { role: "MEMBER" }, "user-1", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Cannot demote yourself");
      }
    });

    it("should allow admin to self-promote to admin", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        role: "ADMIN" as UserRole,
      };

      const updated = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "ADMIN" as UserRole,
        isActive: true,
        personId: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await updateUserData(
        "user-1",
        { role: "ADMIN" },
        "user-1",
        mockDb
      );

      expect(result.role).toBe("ADMIN");
    });

    it("should prevent self-deactivation", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        isActive: true,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );

      try {
        await updateUserData("user-1", { isActive: false }, "user-1", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Cannot deactivate yourself");
      }
    });

    it("should allow deactivating another user", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        isActive: true,
      };

      const updated = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        isActive: false,
        personId: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await updateUserData(
        "user-1",
        { isActive: false },
        "user-2",
        mockDb
      );

      expect(result.isActive).toBe(false);
    });

    it("should link user to person", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        personId: null,
      };

      const person = { id: "person-1", firstName: "John", lastName: "Doe" };

      const updated = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        isActive: true,
        personId: "person-1",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(person);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await updateUserData(
        "user-1",
        { personId: "person-1" },
        "user-2",
        mockDb
      );

      expect(result.personId).toBe("person-1");
    });

    it("should throw error if person not found", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        personId: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await updateUserData(
          "user-1",
          { personId: "nonexistent" },
          "user-2",
          mockDb
        );
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Person not found");
      }
    });

    it("should prevent linking person already linked to another user", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        personId: null,
      };

      const person = { id: "person-1", firstName: "John", lastName: "Doe" };
      const otherUser = { id: "user-2", personId: "person-1" };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(person);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        otherUser
      );

      try {
        await updateUserData(
          "user-1",
          { personId: "person-1" },
          "user-3",
          mockDb
        );
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe(
          "This person is already linked to another user"
        );
      }
    });

    it("should allow relinking same person to same user", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        personId: "person-1",
      };

      const person = { id: "person-1", firstName: "John", lastName: "Doe" };

      const updated = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        isActive: true,
        personId: "person-1",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(person);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await updateUserData(
        "user-1",
        { personId: "person-1" },
        "user-2",
        mockDb
      );

      expect(result.personId).toBe("person-1");
    });

    it("should unlink user from person when personId is null", async () => {
      const existing = {
        id: "user-1",
        email: "john@example.com",
        personId: "person-1",
      };

      const updated = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        isActive: true,
        personId: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existing
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await updateUserData(
        "user-1",
        { personId: null },
        "user-2",
        mockDb
      );

      expect(result.personId).toBeNull();
    });

    it("should throw error if user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await updateUserData(
          "nonexistent",
          { name: "Jane Doe" },
          "user-2",
          mockDb
        );
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("User not found");
      }
    });
  });

  describe("deleteUserData", () => {
    it("should delete user", async () => {
      const user = { id: "user-1", email: "john@example.com" };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        user
      );
      (mockDb.user.delete as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await deleteUserData("user-1", "user-2", mockDb);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should prevent self-deletion", async () => {
      try {
        await deleteUserData("user-1", "user-1", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Cannot delete yourself");
      }
    });

    it("should throw error if user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await deleteUserData("nonexistent", "user-2", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("User not found");
      }
    });

    it("should log audit trail", async () => {
      const user = { id: "user-1", email: "john@example.com" };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        user
      );
      (mockDb.user.delete as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await deleteUserData("user-1", "user-2", mockDb);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedUserId: "user-1",
          deletedBy: "user-2",
        }),
        "User deleted"
      );
    });
  });

  describe("searchAvailablePersonsData", () => {
    it("should return available persons without search", async () => {
      const mockPersons = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-15"),
        },
        {
          id: "person-2",
          firstName: "Jane",
          lastName: "Smith",
          dateOfBirth: null,
        },
      ];

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPersons
      );

      const result = await searchAvailablePersonsData(undefined, mockDb);

      expect(result).toHaveLength(2);
      expect(result[0].firstName).toBe("John");
      expect(result[1].firstName).toBe("Jane");
    });

    it("should filter by search string", async () => {
      const mockPersons = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Smith",
          dateOfBirth: null,
        },
      ];

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPersons
      );

      await searchAvailablePersonsData("Smith", mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.where?.OR).toBeDefined();
    });

    it("should limit results to 20", async () => {
      const mockPersons = Array.from({ length: 20 }, (_, i) => ({
        id: `person-${i}`,
        firstName: "Person",
        lastName: `${i}`,
        dateOfBirth: null,
      }));

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPersons
      );

      const result = await searchAvailablePersonsData(undefined, mockDb);

      expect(result).toHaveLength(20);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.take).toBe(20);
    });

    it("should only return persons without user link", async () => {
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await searchAvailablePersonsData(undefined, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.where?.user).toBeNull();
    });

    it("should format dateOfBirth correctly", async () => {
      const mockPersons = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-15"),
        },
      ];

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPersons
      );

      const result = await searchAvailablePersonsData(undefined, mockDb);

      expect(result[0].dateOfBirth).toContain("1990-01-15");
    });

    it("should handle null dateOfBirth", async () => {
      const mockPersons = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: null,
        },
      ];

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPersons
      );

      const result = await searchAvailablePersonsData(undefined, mockDb);

      expect(result[0].dateOfBirth).toBeNull();
    });

    it("should sort by lastName then firstName", async () => {
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await searchAvailablePersonsData(undefined, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.orderBy).toEqual([
        { lastName: "asc" },
        { firstName: "asc" },
      ]);
    });
  });

  describe("unlockUserAccountData", () => {
    it("should unlock user account", async () => {
      const user = { id: "user-1", email: "john@example.com" };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        user
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await unlockUserAccountData("user-1", "user-2", mockDb);

      expect(result.success).toBe(true);
    });

    it("should reset failedLoginAttempts to 0", async () => {
      const user = { id: "user-1", email: "john@example.com" };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        user
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await unlockUserAccountData("user-1", "user-2", mockDb);

      const updateCall = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(updateCall?.[0]?.data?.failedLoginAttempts).toBe(0);
    });

    it("should reset lockedUntil to null", async () => {
      const user = { id: "user-1", email: "john@example.com" };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        user
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await unlockUserAccountData("user-1", "user-2", mockDb);

      const updateCall = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(updateCall?.[0]?.data?.lockedUntil).toBeNull();
    });

    it("should reset lastFailedLoginAt to null", async () => {
      const user = { id: "user-1", email: "john@example.com" };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        user
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await unlockUserAccountData("user-1", "user-2", mockDb);

      const updateCall = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(updateCall?.[0]?.data?.lastFailedLoginAt).toBeNull();
    });

    it("should throw error if user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await unlockUserAccountData("nonexistent", "user-2", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("User not found");
      }
    });

    it("should log audit trail", async () => {
      const user = { id: "user-1", email: "john@example.com" };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        user
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await unlockUserAccountData("user-1", "user-2", mockDb);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          unlockedUserId: "user-1",
          unlockedBy: "user-2",
        }),
        "User account unlocked"
      );
    });
  });
});
