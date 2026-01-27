/**
 * Unit tests for OIDC profile claiming server function handlers
 *
 * Tests the handler implementations in claim.server.ts using
 * withStubbedServerContext for isolated testing.
 *
 * Business logic (findSuggestedMatches, validateClaim) is tested in @vamsa/lib.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  withStubbedServerContext,
  testUsers,
  getStubbedSession,
} from "@test/server-fn-context";

// =============================================================================
// Mocks for Handler Tests
// =============================================================================

const mockGetClaimableProfilesData = mock(async () => ({
  all: [
    {
      id: "person-1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      dateOfBirth: null,
    },
    {
      id: "person-2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      dateOfBirth: null,
    },
  ],
  suggested: [
    {
      id: "person-1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      dateOfBirth: null,
      score: 100,
      matchReason: "Email match",
    },
  ],
}));

const mockClaimProfileForOIDCData = mock(async () => ({
  success: true,
  userId: "user-1",
}));

const mockSkipProfileClaimData = mock(async () => ({
  success: true,
}));

const mockGetOIDCClaimStatusData = mock(
  async () =>
    ({
      userId: "user-1",
      email: "test@example.com",
      name: "Test User",
      oidcProvider: "google",
      profileClaimStatus: "PENDING",
      profileClaimedAt: null,
      personId: null,
      person: null,
    }) as unknown
);

mock.module("@vamsa/lib/server/business", () => ({
  getClaimableProfilesData: mockGetClaimableProfilesData,
  claimProfileForOIDCData: mockClaimProfileForOIDCData,
  skipProfileClaimData: mockSkipProfileClaimData,
  getOIDCClaimStatusData: mockGetOIDCClaimStatusData,
  betterAuthGetSessionWithUserFromCookie: getStubbedSession,
}));

// Import handlers AFTER setting up mocks
import {
  getOIDCClaimableProfilesHandler,
  claimProfileOIDCHandler,
  skipProfileClaimHandler,
  getOIDCClaimStatusHandler,
} from "./claim.server";

// =============================================================================
// Handler Tests
// =============================================================================

describe("OIDC Claim Handlers", () => {
  beforeEach(() => {
    mockGetClaimableProfilesData.mockClear();
    mockClaimProfileForOIDCData.mockClear();
    mockSkipProfileClaimData.mockClear();
    mockGetOIDCClaimStatusData.mockClear();
  });

  describe("getOIDCClaimableProfilesHandler", () => {
    it("returns claimable profiles for authenticated user", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.viewer },
        () => getOIDCClaimableProfilesHandler()
      );

      expect(result.all).toHaveLength(2);
      expect(result.suggested).toHaveLength(1);
      expect(mockGetClaimableProfilesData).toHaveBeenCalledWith(
        testUsers.viewer.id
      );
    });

    it("throws error when not authenticated", async () => {
      await expect(
        withStubbedServerContext({}, () => getOIDCClaimableProfilesHandler())
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("claimProfileOIDCHandler", () => {
    it("claims profile for authenticated user", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.viewer },
        () => claimProfileOIDCHandler({ personId: "person-1" })
      );

      expect(result.success).toBe(true);
      expect(mockClaimProfileForOIDCData).toHaveBeenCalledWith(
        testUsers.viewer.id,
        "person-1"
      );
    });

    it("throws error when not authenticated", async () => {
      await expect(
        withStubbedServerContext({}, () =>
          claimProfileOIDCHandler({ personId: "person-1" })
        )
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("skipProfileClaimHandler", () => {
    it("skips profile claim for authenticated user", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.viewer },
        () => skipProfileClaimHandler()
      );

      expect(result.success).toBe(true);
      expect(mockSkipProfileClaimData).toHaveBeenCalledWith(
        testUsers.viewer.id
      );
    });

    it("throws error when not authenticated", async () => {
      await expect(
        withStubbedServerContext({}, () => skipProfileClaimHandler())
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("getOIDCClaimStatusHandler", () => {
    it("returns claim status for authenticated user", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.viewer },
        () => getOIDCClaimStatusHandler()
      );

      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user-1");
      expect(result!.oidcProvider).toBe("google");
      expect(result!.profileClaimStatus).toBe("PENDING");
      expect(mockGetOIDCClaimStatusData).toHaveBeenCalledWith(
        testUsers.viewer.id
      );
    });

    it("throws error when not authenticated", async () => {
      expect(
        withStubbedServerContext({}, () => getOIDCClaimStatusHandler())
      ).rejects.toThrow("Not authenticated");
    });

    it("returns claimed status with person details", async () => {
      mockGetOIDCClaimStatusData.mockImplementationOnce(async () => ({
        userId: "user-1",
        email: "test@example.com",
        name: "Test User",
        oidcProvider: "google",
        profileClaimStatus: "CLAIMED",
        profileClaimedAt: new Date("2026-01-15"),
        personId: "person-1",
        person: {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
        },
      }));

      const { result } = await withStubbedServerContext(
        { user: testUsers.member },
        () => getOIDCClaimStatusHandler()
      );

      expect(result).not.toBeNull();
      expect(result!.profileClaimStatus).toBe("CLAIMED");
      expect(result!.personId).toBe("person-1");
      expect(result!.person?.firstName).toBe("John");
    });
  });
});
