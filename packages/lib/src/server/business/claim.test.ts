/**
 * Unit tests for claim server business logic with dependency injection
 *
 * Tests cover:
 * - Fetching claimable profiles for OIDC users
 * - Profile claiming workflow with validation
 * - Skipping profile claims
 * - Retrieving claim status information
 * - Error handling and edge cases
 * - Suggested profile matching
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute global state.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { ClaimDb } from "@vamsa/lib/server/business";

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

// Mock the notifications module to avoid dependency on it
mock.module("@vamsa/lib/server/business/notifications", () => ({
  notifyNewMemberJoined: mock(() => Promise.resolve(undefined)),
}));

// Import the functions to test
import {
  getClaimableProfilesData,
  claimProfileForOIDCData,
  skipProfileClaimData,
  getOIDCClaimStatusData,
} from "@vamsa/lib/server/business";

/**
 * Create a mock claim database client
 */
function createMockClaimDb(): ClaimDb {
  return {
    user: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      update: mock(() => Promise.resolve({})),
    },
    person: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
  } as unknown as ClaimDb;
}

describe("Claim Server Business Logic", () => {
  let mockDb: ClaimDb;

  beforeEach(() => {
    mockDb = createMockClaimDb();
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockProfiles
      );

      const result = await getClaimableProfilesData("user-1", mockDb);

      expect(result.all).toHaveLength(2);
      expect(result.suggested).toBeDefined();
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
      expect(mockDb.person.findMany).toHaveBeenCalled();
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        claimedProfiles
      );
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      const result = await getClaimableProfilesData("user-1", mockDb);

      expect(result.all).toHaveLength(0);
      // Verify the query excluded claimed profiles
      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall[0].where.id.notIn).toEqual(["person-1", "person-2"]);
    });

    it("should only return living profiles", async () => {
      const mockUser = {
        id: "user-1",
        email: "john@example.com",
        name: "John Doe",
        oidcProvider: "google",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getClaimableProfilesData("user-1", mockDb);

      // Verify the query filters for living profiles
      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall[0].where.isLiving).toBe(true);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockProfiles
      );

      const result = await getClaimableProfilesData("user-1", mockDb);

      expect(result.suggested.length).toBeLessThanOrEqual(5);
    });

    it("should throw error when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await getClaimableProfilesData("nonexistent-user", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await getClaimableProfilesData("user-1", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null); // Check for existing claim
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updatedUser
      );

      const result = await claimProfileForOIDCData(
        "user-1",
        "person-1",
        mockDb
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe("user-1");
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          personId: "person-1",
          role: "MEMBER",
          profileClaimStatus: "CLAIMED",
          profileClaimedAt: expect.any(Date),
        },
      });
    });

    it("should throw error when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await claimProfileForOIDCData("nonexistent-user", "person-1", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await claimProfileForOIDCData("user-1", "person-1", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await claimProfileForOIDCData("user-1", "person-1", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await claimProfileForOIDCData("user-1", "person-1", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await claimProfileForOIDCData("user-1", "nonexistent-person", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      try {
        await claimProfileForOIDCData("user-1", "person-1", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(existingClaim); // Check for existing claim
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      try {
        await claimProfileForOIDCData("user-1", "person-1", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        ...mockUser,
        personId: "person-1",
        role: "MEMBER",
      });

      await claimProfileForOIDCData("user-1", "person-1", mockDb);

      const updateCall = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls[0][0];
      expect(updateCall.data.role).toBe("MEMBER");
      expect(updateCall.data.profileClaimStatus).toBe("CLAIMED");
      expect(updateCall.data.profileClaimedAt).toBeDefined();
    });
  });

  describe("skipProfileClaimData", () => {
    it("should skip profile claim for a user", async () => {
      const mockUser = {
        id: "user-1",
        oidcProvider: "google",
        profileClaimStatus: "PENDING",
      };

      const updatedUser = {
        ...mockUser,
        profileClaimStatus: "SKIPPED",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updatedUser
      );

      const result = await skipProfileClaimData("user-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { profileClaimStatus: "SKIPPED" },
      });
    });

    it("should throw error when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await skipProfileClaimData("nonexistent-user", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await skipProfileClaimData("user-1", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      try {
        await skipProfileClaimData("user-1", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      const result = await getOIDCClaimStatusData("user-1", mockDb);

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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      const result = await getOIDCClaimStatusData("user-1", mockDb);

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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      const result = await getOIDCClaimStatusData("user-1", mockDb);

      expect(result).toBeNull();
    });

    it("should throw error when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await getOIDCClaimStatusData("nonexistent-user", mockDb);
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

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      const result = await getOIDCClaimStatusData("user-1", mockDb);

      expect(result?.person?.firstName).toBe("John");
      expect(result?.person?.lastName).toBe("Doe");
      expect(result?.person?.email).toBe("john@example.com");
    });
  });
});
