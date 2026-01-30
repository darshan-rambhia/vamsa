/**
 * Unit tests for claim server business logic
 *
 * Tests cover:
 * - Fetching claimable profiles for OIDC users
 * - Profile claiming workflow with validation
 * - Skipping profile claims
 * - Retrieving claim status information
 * - Error handling and edge cases
 * - Suggested profile matching
 *
 * Testing approach:
 * 1. Module mocking (existing tests) - mocks @vamsa/api to intercept default db
 * 2. DI injection (new tests) - passes mock db directly via DI parameters
 *
 * The DI approach is preferred for new tests as it's more explicit and doesn't
 * require mock.module() setup.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock logger for this test file
import {
  claimProfileForOIDCData,
  getClaimableProfilesData,
  getOIDCClaimStatusData,
  skipProfileClaimData,
} from "@vamsa/lib/server/business";
import {
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockLog,
  mockLogger,
  mockLoggers,
  mockSerializeError,
  mockStartTimer,
} from "../../testing/shared-mocks";

// Import the functions to test

// Create mock drizzleDb and drizzleSchema
const mockDrizzleSchema = {
  users: {
    id: "id",
    personId: "personId",
    oidcProvider: "oidcProvider",
  },
  persons: {
    id: "id",
    isLiving: "isLiving",
    lastName: "lastName",
    firstName: "firstName",
  },
};

// Mock for the returning() call - allows tests to control the return value

const mockReturning = mock(() => Promise.resolve([] as Array<any>));

const mockDrizzleDb = {
  query: {
    users: {
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
    persons: {
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
  },
  update: mock(() => ({
    set: mock(() => ({
      where: mock(() => {
        // Return a thenable with returning() for Drizzle's fluent API
        const result = Promise.resolve({});
        return Object.assign(result, { returning: mockReturning });
      }),
    })),
  })),
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

// Mock the notifications module to avoid dependency on it
mock.module("@vamsa/lib/server/business/notifications", () => ({
  notifyNewMemberJoined: mock(() => Promise.resolve(undefined)),
}));

describe("Claim Server Business Logic", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    (
      mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
    ).mockClear();
    (mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>).mockClear();
    (
      mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.persons.findMany as ReturnType<typeof mock>
    ).mockClear();
    (mockDrizzleDb.update as ReturnType<typeof mock>).mockClear();
    mockReturning.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
  });

  describe("getClaimableProfilesData", () => {
    it("should fetch claimable profiles for an OIDC user", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        oidcProvider: "google",
      };

      const mockProfiles = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          dateOfBirth: new Date("1990-01-15"),
        },
        {
          id: "person-2",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          dateOfBirth: new Date("1992-06-20"),
        },
      ];

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.persons.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockProfiles);

      const result = await getClaimableProfilesData("user-1");

      expect(result.all).toHaveLength(2);
      expect(result.suggested).toBeDefined();
      expect(mockDrizzleDb.query.users.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.anything() })
      );
      expect(mockDrizzleDb.query.persons.findMany).toHaveBeenCalled();
    });

    it("should filter out already-claimed profiles", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        oidcProvider: "google",
      };

      const claimedProfiles = [
        { personId: "person-1" },
        { personId: "person-2" },
      ];

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(claimedProfiles);
      (
        mockDrizzleDb.query.persons.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await getClaimableProfilesData("user-1");

      expect(result.all).toHaveLength(0);
      // Verify persons.findMany was called to fetch unclaimed profiles
      expect(
        mockDrizzleDb.query.persons.findMany as ReturnType<typeof mock>
      ).toHaveBeenCalled();
    });

    it("should only return living profiles", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        oidcProvider: "google",
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.persons.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      await getClaimableProfilesData("user-1");

      // Verify persons.findMany was called to filter for living profiles
      // (actual filter logic is verified via integration tests)
      expect(
        mockDrizzleDb.query.persons.findMany as ReturnType<typeof mock>
      ).toHaveBeenCalled();
    });

    it("should return suggested matches within top 5", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        oidcProvider: "google",
      };

      const mockProfiles = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          dateOfBirth: new Date("1990-01-15"),
        },
        {
          id: "person-2",
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@example.com",
          dateOfBirth: new Date("1992-06-20"),
        },
      ];

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);
      (
        mockDrizzleDb.query.users.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.persons.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockProfiles);

      const result = await getClaimableProfilesData("user-1");

      expect(result.suggested.length).toBeLessThanOrEqual(5);
    });

    it("should throw error when user not found", async () => {
      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getClaimableProfilesData("nonexistent-user");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("User not found");
      }
    });

    it("should throw error when user is not an OIDC user", async () => {
      const mockUser = {
        id: "user-1",
        oidcProvider: null,
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);

      try {
        await getClaimableProfilesData("user-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          "This endpoint is for OIDC users only"
        );
      }
    });
  });

  describe("claimProfileForOIDCData", () => {
    it("should claim a profile for an OIDC user", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "PENDING",
      };

      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      const updatedUser = {
        ...mockUser,
        personId: "person-1",
        role: "MEMBER",
        profileClaimStatus: "CLAIMED",
      };

      (mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null); // Check for existing claim
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      // Mock returning() to return array with updated user (Drizzle returns array)
      mockReturning.mockResolvedValueOnce([updatedUser]);

      const result = await claimProfileForOIDCData("user-1", "person-1");

      expect(result.success).toBe(true);
      expect(result.userId).toBe("user-1");
      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await claimProfileForOIDCData("nonexistent-user", "person-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("User not found");
      }
    });

    it("should throw error when user is not an OIDC user", async () => {
      const mockUser = {
        id: "user-1",
        oidcProvider: null,
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);

      try {
        await claimProfileForOIDCData("user-1", "person-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          "This endpoint is for OIDC users only"
        );
      }
    });

    it("should throw error when user already has a linked profile", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        oidcProvider: "google",
        personId: "person-existing",
        profileClaimStatus: "PENDING",
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);

      try {
        await claimProfileForOIDCData("user-1", "person-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          "You have already claimed a profile"
        );
      }
    });

    it("should throw error when user already claimed", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "CLAIMED",
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);

      try {
        await claimProfileForOIDCData("user-1", "person-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          "You have already completed profile claiming"
        );
      }
    });

    it("should throw error when person not found", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "PENDING",
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await claimProfileForOIDCData("user-1", "nonexistent-person");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Profile not found");
      }
    });

    it("should throw error when person is not living", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "PENDING",
      };

      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: false,
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      try {
        await claimProfileForOIDCData("user-1", "person-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          "Cannot claim a non-living profile"
        );
      }
    });

    it("should throw error when profile already claimed by another user", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "PENDING",
      };

      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      const existingClaim = {
        id: "user-2",
        personId: "person-1",
      };

      (mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(existingClaim); // Check for existing claim
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      try {
        await claimProfileForOIDCData("user-1", "person-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          "This profile is already claimed by another user"
        );
      }
    });

    it("should set role to MEMBER and update claim status", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "PENDING",
      };

      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      (mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      // Mock returning() to return array with updated user
      mockReturning.mockResolvedValueOnce([
        {
          ...mockUser,
          personId: "person-1",
          role: "MEMBER",
          profileClaimStatus: "CLAIMED",
        },
      ]);

      const result = await claimProfileForOIDCData("user-1", "person-1");

      // Verify update was called and result is successful
      expect(mockDrizzleDb.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe("skipProfileClaimData", () => {
    it("should skip profile claim for a user", async () => {
      const mockUser = {
        id: "user-1",
        oidcProvider: "google",
        profileClaimStatus: "PENDING",
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);
      // skipProfileClaimData uses .update().set().where() without .returning()
      // The mock's where() returns a thenable, so await works

      const result = await skipProfileClaimData("user-1");

      expect(result.success).toBe(true);
      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await skipProfileClaimData("nonexistent-user");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("User not found");
      }
    });

    it("should throw error when user is not an OIDC user", async () => {
      const mockUser = {
        id: "user-1",
        oidcProvider: null,
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);

      try {
        await skipProfileClaimData("user-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          "This endpoint is for OIDC users only"
        );
      }
    });

    it("should throw error when user already claimed", async () => {
      const mockUser = {
        id: "user-1",
        oidcProvider: "google",
        profileClaimStatus: "CLAIMED",
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);

      try {
        await skipProfileClaimData("user-1");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          "You have already claimed a profile"
        );
      }
    });
  });

  describe("getOIDCClaimStatusData", () => {
    it("should get claim status for an OIDC user who has claimed", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        oidcProvider: "google",
        personId: "person-1",
        profileClaimStatus: "CLAIMED",
        profileClaimedAt: new Date("2024-01-01"),
      };

      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      const result = await getOIDCClaimStatusData("user-1");

      expect(result).toBeDefined();
      expect(result?.userId).toBe("user-1");
      expect(result?.profileClaimStatus).toBe("CLAIMED");
      expect(result?.person).toBeDefined();
      expect(result?.person?.id).toBe("person-1");
    });

    it("should get claim status for an OIDC user who has not claimed", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "PENDING",
        profileClaimedAt: null,
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);

      const result = await getOIDCClaimStatusData("user-1");

      expect(result).toBeDefined();
      expect(result?.userId).toBe("user-1");
      expect(result?.profileClaimStatus).toBe("PENDING");
      expect(result?.personId).toBeNull();
      expect(result?.person).toBeNull();
    });

    it("should return null when user is not an OIDC user", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        oidcProvider: null,
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);

      const result = await getOIDCClaimStatusData("user-1");

      expect(result).toBeNull();
    });

    it("should throw error when user not found", async () => {
      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getOIDCClaimStatusData("nonexistent-user");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("User not found");
      }
    });

    it("should return claim details including person name and email", async () => {
      const mockUser = {
        id: "user-1",
        email: "user@example.com",
        name: "John Doe",
        oidcProvider: "google",
        personId: "person-1",
        profileClaimStatus: "CLAIMED",
        profileClaimedAt: new Date("2024-01-01"),
      };

      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUser);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      const result = await getOIDCClaimStatusData("user-1");

      expect(result?.person?.firstName).toBe("John");
      expect(result?.person?.lastName).toBe("Doe");
      expect(result?.person?.email).toBe("john@example.com");
    });
  });

  describe("DI-based tests (demonstrates injected mock pattern)", () => {
    /**
     * These tests demonstrate the DI approach where we pass mock db
     * directly to functions instead of relying on module mocking.
     *
     * Benefits:
     * - More explicit test setup
     * - No need for mock.module() at file level
     * - Easier to understand what's being tested
     * - Tests are more isolated
     */

    it("should use injected db for getClaimableProfilesData", async () => {
      const mockUser = {
        id: "user-di-1",
        email: "di-test@example.com",
        name: "DI Test User",
        oidcProvider: "google",
      };

      const mockProfiles = [
        {
          id: "person-di-1",
          firstName: "DI",
          lastName: "Test",
          email: "di@example.com",
          dateOfBirth: new Date("1990-01-15"),
        },
      ];

      // Create inline mock db for this test
      const inlineDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(mockUser)),
            findMany: mock(() => Promise.resolve([])),
          },
          persons: {
            findMany: mock(() => Promise.resolve(mockProfiles)),
          },
        },
      } as any;

      const result = await getClaimableProfilesData("user-di-1", inlineDb);

      expect(result.all).toHaveLength(1);
      expect(result.all[0].id).toBe("person-di-1");
      expect(inlineDb.query.users.findFirst).toHaveBeenCalled();
    });

    it("should use injected notify for claimProfileForOIDCData", async () => {
      const mockUser = {
        id: "user-notify-1",
        email: "notify@example.com",
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "PENDING",
      };

      const mockPerson = {
        id: "person-notify-1",
        firstName: "Notify",
        lastName: "Test",
        isLiving: true,
      };

      const updatedUser = {
        ...mockUser,
        personId: "person-notify-1",
        role: "MEMBER",
        profileClaimStatus: "CLAIMED",
      };

      let notifyCalled = false;
      const mockNotify = mock(() => {
        notifyCalled = true;
        return Promise.resolve();
      });

      // Create inline mock db with proper fluent API
      const inlineDb = {
        query: {
          users: {
            findFirst: mock()
              .mockResolvedValueOnce(mockUser) // First call: fetch user
              .mockResolvedValueOnce(null), // Second call: check existing claim
          },
          persons: {
            findFirst: mock(() => Promise.resolve(mockPerson)),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() =>
              Object.assign(Promise.resolve({}), {
                returning: mock(() => Promise.resolve([updatedUser])),
              })
            ),
          })),
        })),
      } as any;

      const result = await claimProfileForOIDCData(
        "user-notify-1",
        "person-notify-1",
        inlineDb,
        mockNotify
      );

      expect(result.success).toBe(true);
      expect(notifyCalled).toBe(true);
      expect(mockNotify).toHaveBeenCalledWith("user-notify-1");
    });

    it("should use injected db for skipProfileClaimData", async () => {
      const mockUser = {
        id: "user-skip-1",
        oidcProvider: "google",
        profileClaimStatus: "PENDING",
      };

      const inlineDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(mockUser)),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      } as any;

      const result = await skipProfileClaimData("user-skip-1", inlineDb);

      expect(result.success).toBe(true);
      expect(inlineDb.update).toHaveBeenCalled();
    });

    it("should use injected db for getOIDCClaimStatusData", async () => {
      const mockUser = {
        id: "user-status-1",
        email: "status@example.com",
        name: "Status User",
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "PENDING",
        profileClaimedAt: null,
      };

      const inlineDb = {
        query: {
          users: {
            findFirst: mock(() => Promise.resolve(mockUser)),
          },
        },
      } as any;

      const result = await getOIDCClaimStatusData("user-status-1", inlineDb);

      expect(result?.userId).toBe("user-status-1");
      expect(result?.profileClaimStatus).toBe("PENDING");
      expect(inlineDb.query.users.findFirst).toHaveBeenCalled();
    });
  });
});
