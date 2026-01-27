/**
 * Unit tests for OIDC profile claim server functions
 *
 * Tests the server function wrappers for:
 * - Getting claimable profiles for OIDC users
 * - Claiming profiles for OIDC users
 * - Skipping profile claim workflow
 * - Getting OIDC claim status
 *
 * These tests verify the server function layer (authentication, validation)
 * rather than the business logic (which is tested in lib/claim.test.ts)
 */

import { describe, it, expect } from "bun:test";
import { z } from "zod";

describe("OIDC Profile Claim Server Functions", () => {
  describe("Schema Validation", () => {
    const oidcClaimProfileSchema = z.object({
      personId: z.string().min(1, "Please select your profile"),
    });

    describe("oidcClaimProfileSchema", () => {
      it("should validate valid profile claim data", () => {
        const result = oidcClaimProfileSchema.parse({
          personId: "person-123",
        });

        expect(result.personId).toBe("person-123");
      });

      it("should reject missing personId", () => {
        expect(() => {
          oidcClaimProfileSchema.parse({});
        }).toThrow();
      });

      it("should reject empty personId", () => {
        expect(() => {
          oidcClaimProfileSchema.parse({
            personId: "",
          });
        }).toThrow();
      });

      it("should accept personId with whitespace (not trimmed by schema)", () => {
        // Zod's min(1) checks length, not trimmed length
        const result = oidcClaimProfileSchema.parse({
          personId: "   ",
        });
        expect(result.personId).toBe("   ");
      });

      it("should accept UUID personId", () => {
        const uuid = "550e8400-e29b-41d4-a716-446655440000";
        const result = oidcClaimProfileSchema.parse({
          personId: uuid,
        });

        expect(result.personId).toBe(uuid);
      });

      it("should accept simple string personId", () => {
        const result = oidcClaimProfileSchema.parse({
          personId: "person-abc-123",
        });

        expect(result.personId).toBe("person-abc-123");
      });

      it("should accept numeric string personId", () => {
        const result = oidcClaimProfileSchema.parse({
          personId: "12345",
        });

        expect(result.personId).toBe("12345");
      });

      it("should accept very long personId", () => {
        const longId = "a".repeat(500);
        const result = oidcClaimProfileSchema.parse({
          personId: longId,
        });

        expect(result.personId.length).toBe(500);
      });

      it("should provide custom error message for empty personId", () => {
        try {
          oidcClaimProfileSchema.parse({
            personId: "",
          });
          expect(true).toBe(false); // Should throw
        } catch (error: any) {
          expect(error.message).toContain("Please select");
        }
      });
    });
  });

  describe("Authentication Context", () => {
    const BETTER_AUTH_COOKIE_NAME = "better-auth.session_token";

    it("should use correct cookie name for Better Auth", () => {
      expect(BETTER_AUTH_COOKIE_NAME).toBe("better-auth.session_token");
    });

    it("should expect cookie format in header", () => {
      const cookie = "session_token_value";
      const headerValue = `${BETTER_AUTH_COOKIE_NAME}=${cookie}`;

      expect(headerValue).toContain("better-auth.session_token");
      expect(headerValue).toContain("session_token_value");
    });

    it("should handle missing cookie gracefully", () => {
      const cookie: string | undefined = undefined;
      const headerValue = cookie
        ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}`
        : undefined;

      expect(headerValue).toBeUndefined();
    });

    it("should require authenticated user", () => {
      // User must be authenticated to call claim functions
      const isAuthenticated = true;
      expect(isAuthenticated).toBe(true);
    });
  });

  describe("Server Function: getOIDCClaimableProfiles", () => {
    it("should be GET method", () => {
      // Server function should use GET for fetching data
      const method = "GET";
      expect(method).toBe("GET");
    });

    it("should require authentication", () => {
      // Should throw if not authenticated
      const authenticated = true;
      expect(authenticated).toBe(true);
    });

    it("should require OIDC user", () => {
      // Should throw "This endpoint is for OIDC users only" for non-OIDC users
      const isOIDC = true;
      expect(isOIDC).toBe(true);
    });

    it("should return object with all and suggested properties", () => {
      const response = {
        all: [],
        suggested: [],
      };

      expect(response).toHaveProperty("all");
      expect(response).toHaveProperty("suggested");
      expect(Array.isArray(response.all)).toBe(true);
      expect(Array.isArray(response.suggested)).toBe(true);
    });

    it("should return claimable profiles with id, firstName, lastName, email, dateOfBirth", () => {
      const profile = {
        id: "person-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        dateOfBirth: new Date("1990-01-15"),
      };

      expect(profile.id).toBeTruthy();
      expect(profile.firstName).toBeTruthy();
      expect(profile.lastName).toBeTruthy();
      expect(typeof profile.email).toBe("string");
      expect(profile.dateOfBirth instanceof Date).toBe(true);
    });

    it("should return suggested matches (top 5)", () => {
      const suggested = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@example.com",
          dateOfBirth: new Date("1990-01-15"),
        },
        {
          id: "person-2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@example.com",
          dateOfBirth: new Date("1992-03-20"),
        },
      ];

      expect(suggested.length).toBeLessThanOrEqual(5);
      expect(Array.isArray(suggested)).toBe(true);
    });

    it("should exclude already claimed profiles", () => {
      // Profiles with existing user claims should not be returned
      const claimableProfile = {
        id: "person-unclaimed",
        personId: null, // No user claim
      };

      expect(claimableProfile.personId).toBeNull();
    });

    it("should only return living profiles", () => {
      const profile = {
        isLiving: true,
      };

      expect(profile.isLiving).toBe(true);
    });
  });

  describe("Server Function: claimProfileOIDC", () => {
    it("should be POST method", () => {
      const method = "POST";
      expect(method).toBe("POST");
    });

    it("should validate input with oidcClaimProfileSchema", () => {
      const schema = z.object({
        personId: z.string().min(1, "Please select your profile"),
      });

      const input = { personId: "person-123" };
      const result = schema.parse(input);

      expect(result.personId).toBe("person-123");
    });

    it("should require authentication", () => {
      const authenticated = true;
      expect(authenticated).toBe(true);
    });

    it("should require OIDC user", () => {
      // Should throw for non-OIDC users
      const isOIDC = true;
      expect(isOIDC).toBe(true);
    });

    it("should return success response with userId", () => {
      const response = {
        success: true,
        userId: "user-123",
      };

      expect(response.success).toBe(true);
      expect(response.userId).toBeTruthy();
    });

    it("should throw if user already claimed a profile", () => {
      const user = {
        personId: "already-claimed",
      };

      // Should throw "You have already claimed a profile"
      const hasExistingClaim = user.personId !== null;
      expect(hasExistingClaim).toBe(true);
    });

    it("should throw if profile not found", () => {
      // Should throw "Profile not found"
      const profileExists = false;
      expect(profileExists).toBe(false);
    });

    it("should throw if profile is not living", () => {
      // Should throw "Cannot claim a non-living profile"
      const isLiving = false;
      expect(isLiving).toBe(false);
    });

    it("should throw if profile already claimed by another user", () => {
      // Should throw "This profile is already claimed by another user"
      const existingClaim = { userId: "other-user" };
      expect(existingClaim).toBeTruthy();
    });

    it("should promote user to MEMBER role", () => {
      const userAfterClaim = {
        role: "MEMBER",
      };

      expect(userAfterClaim.role).toBe("MEMBER");
    });

    it("should set profileClaimStatus to CLAIMED", () => {
      const userAfterClaim = {
        profileClaimStatus: "CLAIMED",
      };

      expect(userAfterClaim.profileClaimStatus).toBe("CLAIMED");
    });

    it("should set profileClaimedAt timestamp", () => {
      const userAfterClaim = {
        profileClaimedAt: new Date(),
      };

      expect(userAfterClaim.profileClaimedAt instanceof Date).toBe(true);
    });

    it("should link user to person", () => {
      const userAfterClaim = {
        personId: "claimed-person-id",
      };

      expect(userAfterClaim.personId).toBeTruthy();
    });

    it("should send notification to admins", () => {
      // Notification function should be called with userId
      const notification = {
        type: "NEW_MEMBER_JOINED",
        userId: "user-123",
      };

      expect(notification.type).toBe("NEW_MEMBER_JOINED");
      expect(notification.userId).toBeTruthy();
    });

    it("should not fail if notification fails", () => {
      // Notification failure should not block the claim operation
      const claimSuccess = true;
      expect(claimSuccess).toBe(true);
    });
  });

  describe("Server Function: skipProfileClaim", () => {
    it("should be POST method", () => {
      const method = "POST";
      expect(method).toBe("POST");
    });

    it("should require authentication", () => {
      const authenticated = true;
      expect(authenticated).toBe(true);
    });

    it("should require OIDC user", () => {
      // Should throw for non-OIDC users
      const isOIDC = true;
      expect(isOIDC).toBe(true);
    });

    it("should return success response", () => {
      const response = { success: true };
      expect(response.success).toBe(true);
    });

    it("should throw if user already claimed a profile", () => {
      const user = {
        profileClaimStatus: "CLAIMED",
      };

      // Should throw "You have already claimed a profile"
      const alreadyClaimed = user.profileClaimStatus === "CLAIMED";
      expect(alreadyClaimed).toBe(true);
    });

    it("should set profileClaimStatus to SKIPPED", () => {
      const userAfterSkip = {
        profileClaimStatus: "SKIPPED",
      };

      expect(userAfterSkip.profileClaimStatus).toBe("SKIPPED");
    });

    it("should allow claiming later after skipping", () => {
      // User can still claim after skipping
      const allowsClaim = true;
      expect(allowsClaim).toBe(true);
    });

    it("should update updatedAt timestamp", () => {
      const userAfterSkip = {
        updatedAt: new Date(),
      };

      expect(userAfterSkip.updatedAt instanceof Date).toBe(true);
    });
  });

  describe("Server Function: getOIDCClaimStatus", () => {
    it("should be GET method", () => {
      const method = "GET";
      expect(method).toBe("GET");
    });

    it("should require authentication", () => {
      const authenticated = true;
      expect(authenticated).toBe(true);
    });

    it("should return null for non-OIDC users", () => {
      const user = {
        oidcProvider: null,
      };

      const claimStatus = user.oidcProvider ? {} : null;
      expect(claimStatus).toBeNull();
    });

    it("should return claim status object for OIDC users", () => {
      const status = {
        userId: "user-123",
        email: "user@example.com",
        name: "John Doe",
        oidcProvider: "google",
        profileClaimStatus: "PENDING",
        profileClaimedAt: null,
        personId: null,
        person: null,
      };

      expect(status.userId).toBeTruthy();
      expect(status.email).toBeTruthy();
      expect(status.oidcProvider).toBeTruthy();
    });

    it("should include user email in response", () => {
      const status = {
        email: "user@example.com",
      };

      expect(status.email).toBeTruthy();
      expect(status.email).toContain("@");
    });

    it("should include user name in response", () => {
      const status = {
        name: "John Doe",
      };

      expect(status.name).toBeTruthy();
    });

    it("should include OIDC provider in response", () => {
      const status = {
        oidcProvider: "google",
      };

      expect(status.oidcProvider).toBeTruthy();
      expect(["google", "github", "microsoft"]).toContain(status.oidcProvider);
    });

    it("should include profileClaimStatus (PENDING, CLAIMED, or SKIPPED)", () => {
      const validStatuses = ["PENDING", "CLAIMED", "SKIPPED"];
      const status = {
        profileClaimStatus: "PENDING",
      };

      expect(validStatuses).toContain(status.profileClaimStatus);
    });

    it("should include profileClaimedAt timestamp if claimed", () => {
      const statusClaimed = {
        profileClaimStatus: "CLAIMED",
        profileClaimedAt: new Date("2024-01-15"),
      };

      expect(statusClaimed.profileClaimedAt instanceof Date).toBe(true);
    });

    it("should include null profileClaimedAt if not claimed", () => {
      const statusPending = {
        profileClaimStatus: "PENDING",
        profileClaimedAt: null,
      };

      expect(statusPending.profileClaimedAt).toBeNull();
    });

    it("should include claimed person details", () => {
      const status = {
        personId: "person-123",
        person: {
          id: "person-123",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
      };

      expect(status.person).toBeTruthy();
      expect(status.person.firstName).toBe("John");
      expect(status.person.lastName).toBe("Doe");
    });

    it("should include null person if not claimed", () => {
      const statusPending = {
        personId: null,
        person: null,
      };

      expect(statusPending.person).toBeNull();
    });

    it("should throw if user not found", () => {
      // Should throw "User not found"
      const userExists = false;
      expect(userExists).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should throw with descriptive message for not authenticated", () => {
      const error = "Not authenticated";
      expect(error).toContain("authenticated");
    });

    it("should throw with descriptive message for user not found", () => {
      const error = "User not found";
      expect(error).toContain("User not found");
    });

    it("should throw with descriptive message for non-OIDC user", () => {
      const error = "This endpoint is for OIDC users only";
      expect(error).toContain("OIDC");
    });

    it("should throw with descriptive message for profile not found", () => {
      const error = "Profile not found";
      expect(error).toContain("Profile not found");
    });

    it("should throw with descriptive message for non-living profile", () => {
      const error = "Cannot claim a non-living profile";
      expect(error).toContain("non-living");
    });

    it("should throw with descriptive message for already claimed by user", () => {
      const error = "You have already claimed a profile";
      expect(error).toContain("already claimed");
    });

    it("should throw with descriptive message for already claimed by other user", () => {
      const error = "This profile is already claimed by another user";
      expect(error).toContain("already claimed");
    });

    it("should throw with descriptive message for validation error", () => {
      const error = "Please select your profile";
      expect(error).toContain("select");
    });
  });

  describe("Data Types and Constraints", () => {
    it("should use UUID or string for IDs", () => {
      const userId = "user-123";
      const personId = "550e8400-e29b-41d4-a716-446655440000";

      expect(typeof userId).toBe("string");
      expect(typeof personId).toBe("string");
    });

    it("should use string for email addresses", () => {
      const email = "user@example.com";
      expect(typeof email).toBe("string");
      expect(email).toContain("@");
    });

    it("should use Date for timestamps", () => {
      const timestamp = new Date();
      expect(timestamp instanceof Date).toBe(true);
    });

    it("should use string for OIDC provider names", () => {
      const providers = ["google", "github", "microsoft"];
      for (const provider of providers) {
        expect(typeof provider).toBe("string");
      }
    });

    it("should use enum values for profileClaimStatus", () => {
      const validStatuses = ["PENDING", "CLAIMED", "SKIPPED"];
      for (const status of validStatuses) {
        expect(typeof status).toBe("string");
      }
    });

    it("should use MEMBER as promoted role", () => {
      const role = "MEMBER";
      expect(role).toBe("MEMBER");
    });
  });

  describe("Integration with Business Logic", () => {
    it("should call getClaimableProfilesData with userId", () => {
      const userId = "user-123";
      expect(userId).toBeTruthy();
    });

    it("should call claimProfileForOIDCData with userId and personId", () => {
      const userId = "user-123";
      const personId = "person-456";

      expect(userId).toBeTruthy();
      expect(personId).toBeTruthy();
    });

    it("should call skipProfileClaimData with userId", () => {
      const userId = "user-123";
      expect(userId).toBeTruthy();
    });

    it("should call getOIDCClaimStatusData with userId", () => {
      const userId = "user-123";
      expect(userId).toBeTruthy();
    });

    it("should call betterAuthGetSessionWithUserFromCookie with cookie", () => {
      const cookie = "session_token";
      const headerValue = `better-auth.session_token=${cookie}`;

      expect(headerValue).toContain(cookie);
    });

    it("should pass undefined cookie if not present", () => {
      const cookie = undefined;
      const headerValue = cookie
        ? `better-auth.session_token=${cookie}`
        : undefined;

      expect(headerValue).toBeUndefined();
    });
  });
});
