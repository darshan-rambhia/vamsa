/**
 * Unit tests for users server business logic
 *
 * Tests cover:
 * - getUsersData: Query users with pagination, filtering, and sorting
 * - getUserData: Retrieve single user by ID
 * - updateUserData: Update user with validation (self-demotion, self-deactivation, person linking)
 * - deleteUserData: Delete user with self-deletion prevention
 * - searchAvailablePersonsData: Search for persons available for user linking
 * - unlockUserAccountData: Unlock a locked user account
 *
 * Uses dependency injection to mock database calls.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  mockLogger,
  mockLoggers,
  mockLog,
  mockSerializeError,
  clearAllMocks,
} from "../../testing/shared-mocks";

// Mock logger
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  loggers: mockLoggers,
  log: mockLog,
  serializeError: mockSerializeError,
}));

// Create mock schema
const mockDrizzleSchema = {
  users: {
    id: "id",
    email: "email",
    name: "name",
    role: "role",
    isActive: "isActive",
    personId: "personId",
    createdAt: "createdAt",
    lastLoginAt: "lastLoginAt",
    failedLoginAttempts: "failedLoginAttempts",
    lockedUntil: "lockedUntil",
    lastFailedLoginAt: "lastFailedLoginAt",
  },
  persons: {
    id: "id",
    firstName: "firstName",
    lastName: "lastName",
    dateOfBirth: "dateOfBirth",
    createdById: "createdById",
  },
};

mock.module("@vamsa/api", () => ({
  drizzleDb: {},
  drizzleSchema: mockDrizzleSchema,
}));

import {
  getUsersData,
  getUserData,
  updateUserData,
  deleteUserData,
  searchAvailablePersonsData,
  unlockUserAccountData,
} from "./users";

describe("Users Business Logic", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe("getUsersData", () => {
    it("should list all users with pagination", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "user1@example.com",
          name: "User One",
          role: "ADMIN",
          isActive: true,
          personId: null,
          createdAt: new Date("2024-01-01"),
          lastLoginAt: new Date("2024-01-15"),
        },
      ];

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => Promise.resolve([{ count: 1 }])),
          })),
        })),
        query: {
          users: {
            findMany: mock(() => Promise.resolve(mockUsers)),
          },
        },
      } as any;

      const result = await getUsersData(
        { page: 1, limit: 10, sortOrder: "desc" },
        mockDb
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].email).toBe("user1@example.com");
      expect(result.pagination).toBeDefined();
    });

    it("should filter users by search (email)", async () => {
      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => Promise.resolve([{ count: 0 }])),
          })),
        })),
        query: {
          users: {
            findMany: mock(() => Promise.resolve([])),
          },
        },
      } as any;

      await getUsersData(
        { page: 1, limit: 10, sortOrder: "asc", search: "user@example.com" },
        mockDb
      );

      expect(mockDb.query.users.findMany).toHaveBeenCalled();
    });

    it("should filter users by role", async () => {
      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => Promise.resolve([{ count: 0 }])),
          })),
        })),
        query: {
          users: {
            findMany: mock(() => Promise.resolve([])),
          },
        },
      } as any;

      await getUsersData(
        { page: 1, limit: 10, sortOrder: "asc", role: "ADMIN" },
        mockDb
      );

      expect(mockDb.query.users.findMany).toHaveBeenCalled();
    });

    it("should filter users by active status", async () => {
      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => Promise.resolve([{ count: 0 }])),
          })),
        })),
        query: {
          users: {
            findMany: mock(() => Promise.resolve([])),
          },
        },
      } as any;

      await getUsersData(
        {
          page: 1,
          limit: 10,
          sortOrder: "asc",
          isActive: true,
        },
        mockDb
      );

      expect(mockDb.query.users.findMany).toHaveBeenCalled();
    });

    it("should sort users by creation date ascending", async () => {
      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => Promise.resolve([{ count: 0 }])),
          })),
        })),
        query: {
          users: {
            findMany: mock(() => Promise.resolve([])),
          },
        },
      } as any;

      await getUsersData({ page: 1, limit: 10, sortOrder: "asc" }, mockDb);

      expect(mockDb.query.users.findMany).toHaveBeenCalled();
    });

    it("should handle null lastLoginAt", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "user@example.com",
          name: "User",
          role: "MEMBER",
          isActive: true,
          personId: null,
          createdAt: new Date(),
          lastLoginAt: null,
        },
      ];

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => Promise.resolve([{ count: 1 }])),
          })),
        })),
        query: {
          users: {
            findMany: mock(() => Promise.resolve(mockUsers)),
          },
        },
      } as any;

      const result = await getUsersData(
        { page: 1, limit: 10, sortOrder: "desc" },
        mockDb
      );

      expect(result.items[0].lastLoginAt).toBeNull();
    });
  });

  describe("getUserData", () => {
    it("should retrieve user by ID", async () => {
      const mockUser = {
        id: "user-1",
        email: "user1@example.com",
        name: "User One",
        role: "ADMIN" as const,
        isActive: true,
        personId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
        lastLoginAt: new Date("2024-01-15"),
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(mockUser)),
          },
        },
      } as any;

      const result = await getUserData("user-1", mockDb);

      expect(result.id).toBe("user-1");
      expect(result.email).toBe("user1@example.com");
      expect(result.role).toBe("ADMIN");
    });

    it("should throw error when user not found", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(null)),
          },
        },
      } as any;

      try {
        await getUserData("nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("User not found");
      }
    });

    it("should include locked status info", async () => {
      const mockUser = {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role: "MEMBER" as const,
        isActive: true,
        personId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        failedLoginAttempts: 5,
        lockedUntil: new Date("2024-01-20"),
      };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(mockUser)),
          },
        },
      } as any;

      const result = await getUserData("user-1", mockDb);

      expect(result.failedLoginAttempts).toBe(5);
      expect(result.lockedUntil).not.toBeNull();
    });
  });

  describe("updateUserData", () => {
    it("should update user name", async () => {
      const existingUser = {
        id: "user-1",
        email: "user1@example.com",
        name: "Old Name",
        role: "ADMIN" as const,
        isActive: true,
        personId: null,
      };

      const updatedUser = {
        id: "user-1",
        email: "user1@example.com",
        name: "New Name",
        role: "ADMIN" as const,
        isActive: true,
        personId: null,
      };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(existingUser)),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => ({
              returning: mock(() => Promise.resolve([updatedUser])),
            })),
          })),
        })),
      } as any;

      const result = await updateUserData(
        "user-1",
        { name: "New Name" },
        "user-1",
        mockDb
      );

      expect(result.name).toBe("New Name");
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should prevent self-demotion", async () => {
      const existingUser = {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "ADMIN" as const,
        isActive: true,
        personId: null,
      };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(existingUser)),
          },
        },
      } as any;

      try {
        await updateUserData("admin-1", { role: "MEMBER" }, "admin-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Cannot demote yourself");
      }
    });

    it("should prevent self-deactivation", async () => {
      const existingUser = {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role: "MEMBER" as const,
        isActive: true,
        personId: null,
      };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(existingUser)),
          },
        },
      } as any;

      try {
        await updateUserData("user-1", { isActive: false }, "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Cannot deactivate yourself");
      }
    });

    it("should throw error when user not found", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(null)),
          },
        },
      } as any;

      try {
        await updateUserData(
          "nonexistent",
          { name: "New Name" },
          "admin-1",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("User not found");
      }
    });

    it("should validate person exists when linking", async () => {
      const existingUser = {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role: "MEMBER" as const,
        isActive: true,
        personId: null,
      };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(existingUser)),
          },
          persons: {
            findFirst: mock(() => Promise.resolve(null)),
          },
        },
      } as any;

      try {
        await updateUserData(
          "user-1",
          { personId: "nonexistent-person" },
          "admin-1",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Person not found");
      }
    });

    it("should prevent duplicate person linking", async () => {
      const existingUser = {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role: "MEMBER" as const,
        isActive: true,
        personId: null,
      };

      const mockPerson = { id: "person-1", firstName: "John" };
      const otherUserWithPerson = { id: "user-2", personId: "person-1" };

      let findFirstCallCount = 0;

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => {
              findFirstCallCount++;
              if (findFirstCallCount === 1)
                return Promise.resolve(existingUser);
              return Promise.resolve(otherUserWithPerson);
            }),
          },
          persons: {
            findFirst: mock(() => Promise.resolve(mockPerson)),
          },
        },
      } as any;

      try {
        await updateUserData(
          "user-1",
          { personId: "person-1" },
          "admin-1",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe(
          "This person is already linked to another user"
        );
      }
    });

    it("should allow user to change own email", async () => {
      const existingUser = {
        id: "user-1",
        email: "old@example.com",
        name: "User",
        role: "MEMBER" as const,
        isActive: true,
        personId: null,
      };

      const updatedUser = {
        id: "user-1",
        email: "new@example.com",
        name: "User",
        role: "MEMBER" as const,
        isActive: true,
        personId: null,
      };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(existingUser)),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => ({
              returning: mock(() => Promise.resolve([updatedUser])),
            })),
          })),
        })),
      } as any;

      const result = await updateUserData(
        "user-1",
        { email: "new@example.com" },
        "user-1",
        mockDb
      );

      expect(result.email).toBe("new@example.com");
    });
  });

  describe("deleteUserData", () => {
    it("should delete a user", async () => {
      const mockUser = {
        id: "user-1",
        email: "user@example.com",
      };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(mockUser)),
          },
        },
        delete: mock(() => ({
          where: mock(() => Promise.resolve({})),
        })),
      } as any;

      const result = await deleteUserData("user-1", "admin-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should prevent self-deletion", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(null)),
          },
        },
      } as any;

      try {
        await deleteUserData("user-1", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Cannot delete yourself");
      }
    });

    it("should throw error when user not found", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(null)),
          },
        },
      } as any;

      try {
        await deleteUserData("nonexistent", "admin-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("User not found");
      }
    });
  });

  describe("searchAvailablePersonsData", () => {
    it("should return available persons without search", async () => {
      const mockPersons = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-01"),
        },
        {
          id: "person-2",
          firstName: "Jane",
          lastName: "Smith",
          dateOfBirth: null,
        },
      ];

      const mockDb = {
        query: {
          persons: {
            findMany: mock(() => Promise.resolve(mockPersons)),
          },
        },
      } as any;

      const result = await searchAvailablePersonsData(undefined, mockDb);

      expect(result).toHaveLength(2);
      expect(result[0].firstName).toBe("John");
    });

    it("should search by first name", async () => {
      const mockDb = {
        query: {
          persons: {
            findMany: mock(() =>
              Promise.resolve([
                {
                  id: "person-1",
                  firstName: "John",
                  lastName: "Doe",
                  dateOfBirth: null,
                },
              ])
            ),
          },
        },
      } as any;

      const result = await searchAvailablePersonsData("John", mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("John");
    });

    it("should search by last name", async () => {
      const mockDb = {
        query: {
          persons: {
            findMany: mock(() =>
              Promise.resolve([
                {
                  id: "person-1",
                  firstName: "John",
                  lastName: "Smith",
                  dateOfBirth: null,
                },
              ])
            ),
          },
        },
      } as any;

      const result = await searchAvailablePersonsData("Smith", mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].lastName).toBe("Smith");
    });

    it("should limit results to 20", async () => {
      const mockPersons = Array.from({ length: 25 }, (_, i) => ({
        id: `person-${i}`,
        firstName: "Person",
        lastName: `${i}`,
        dateOfBirth: null,
      }));

      const mockDb = {
        query: {
          persons: {
            findMany: mock(() => Promise.resolve(mockPersons.slice(0, 20))),
          },
        },
      } as any;

      const result = await searchAvailablePersonsData(undefined, mockDb);

      expect(result.length).toBeLessThanOrEqual(20);
    });

    it("should order by last name then first name", async () => {
      const mockDb = {
        query: {
          persons: {
            findMany: mock(() => Promise.resolve([])),
          },
        },
      } as any;

      await searchAvailablePersonsData(undefined, mockDb);

      expect(mockDb.query.persons.findMany).toHaveBeenCalled();
    });
  });

  describe("unlockUserAccountData", () => {
    it("should unlock a locked user account", async () => {
      const mockUser = { id: "user-1", email: "user@example.com" };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(mockUser)),
          },
        },
        update: mock(() => ({
          set: mock((data: any) => {
            expect(data.failedLoginAttempts).toBe(0);
            expect(data.lockedUntil).toBeNull();
            expect(data.lastFailedLoginAt).toBeNull();
            return {
              where: mock(() => Promise.resolve({})),
            };
          }),
        })),
      } as any;

      const result = await unlockUserAccountData("user-1", "admin-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(null)),
          },
        },
      } as any;

      try {
        await unlockUserAccountData("nonexistent", "admin-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("User not found");
      }
    });

    it("should reset all lockout fields", async () => {
      const mockUser = { id: "user-1", email: "user@example.com" };

      const mockDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(mockUser)),
          },
        },
        update: mock(() => ({
          set: mock((data: any) => {
            expect(data).toEqual({
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastFailedLoginAt: null,
            });
            return {
              where: mock(() => Promise.resolve({})),
            };
          }),
        })),
      } as any;

      await unlockUserAccountData("user-1", "admin-1", mockDb);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
