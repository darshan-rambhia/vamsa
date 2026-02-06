import { describe, expect, it } from "vitest";
import {
  findSuggestedMatches,
  getBestMatch,
  getClaimStatusText,
  groupProfilesByMatch,
  isConfidentMatch,
  scoreProfileMatch,
  shouldShowClaimModal,
  validateClaim,
} from "./profile-claim";
import type { ClaimableProfile, ClaimingUser } from "./profile-claim";

describe("Profile Claiming Utilities", () => {
  const testUser: ClaimingUser = {
    email: "john.doe@example.com",
    name: "John Doe",
    oidcProvider: "google",
  };

  const testProfiles: Array<ClaimableProfile> = [
    {
      id: "1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      dateOfBirth: new Date("1990-01-15"),
    },
    {
      id: "2",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      dateOfBirth: new Date("1992-05-20"),
    },
    {
      id: "3",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@company.com",
      dateOfBirth: new Date("1985-12-10"),
    },
    {
      id: "4",
      firstName: "Alice",
      lastName: "Johnson",
      email: null,
      dateOfBirth: null,
    },
    {
      id: "5",
      firstName: "Bob",
      lastName: "Williams",
      email: "bob@example.com",
      dateOfBirth: new Date("1988-03-25"),
    },
  ];

  describe("scoreProfileMatch", () => {
    it("gives 100+ points for exact email match (may include name match)", () => {
      const match = scoreProfileMatch(testUser, testProfiles[0]);
      expect(match.score).toBeGreaterThanOrEqual(100);
      expect(match.reasons).toContain("Email matches exactly");
    });

    it("gives 80+ points for exact name match (may include other factors)", () => {
      const user: ClaimingUser = {
        email: "different@example.com",
        name: "Jane Doe",
        oidcProvider: "google",
      };
      const match = scoreProfileMatch(user, testProfiles[1]);
      expect(match.score).toBeGreaterThanOrEqual(80);
      expect(match.reasons).toContain("Name matches exactly");
    });

    it("handles name matching with titles and suffixes", () => {
      const user: ClaimingUser = {
        email: "test@example.com",
        name: "Dr. John Doe Jr.",
        oidcProvider: "google",
      };
      const match = scoreProfileMatch(user, testProfiles[0]);
      expect(match.score).toBeGreaterThanOrEqual(70);
    });

    it("gives points for partial name match", () => {
      const user: ClaimingUser = {
        email: "test@example.com",
        name: "John",
        oidcProvider: "google",
      };
      const match = scoreProfileMatch(user, testProfiles[0]);
      expect(match.score).toBeGreaterThanOrEqual(30);
    });

    it("gives 30 points for same email domain", () => {
      const user: ClaimingUser = {
        email: "jane.smith@example.com",
        name: "Jane Smith",
        oidcProvider: "google",
      };
      const match = scoreProfileMatch(user, testProfiles[0]);
      expect(match.score).toBeGreaterThanOrEqual(30);
      expect(match.reasons.some((r) => r.includes("domain"))).toBe(true);
    });

    it("returns 0 for profiles with no matching data", () => {
      const user: ClaimingUser = {
        email: "random@different.com",
        name: "Random Person",
        oidcProvider: "google",
      };
      const match = scoreProfileMatch(user, testProfiles[4]);
      expect(match.score).toBe(0);
    });

    it("handles profiles with null email gracefully", () => {
      const match = scoreProfileMatch(testUser, testProfiles[3]);
      expect(match.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findSuggestedMatches", () => {
    it("returns profiles sorted by score", () => {
      const matches = findSuggestedMatches(testUser, testProfiles);
      expect(matches.length).toBeGreaterThan(0);
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].score).toBeGreaterThanOrEqual(matches[i + 1].score);
      }
    });

    it("filters profiles by minimum score", () => {
      const matches = findSuggestedMatches(testUser, testProfiles, 50);
      for (const match of matches) {
        expect(match.score).toBeGreaterThanOrEqual(50);
      }
    });

    it("returns empty array when no profiles meet minimum score", () => {
      const matches = findSuggestedMatches(testUser, testProfiles, 1000);
      expect(matches).toEqual([]);
    });

    it("includes reasons for each match", () => {
      const matches = findSuggestedMatches(testUser, testProfiles, 0);
      for (const match of matches) {
        if (match.score > 0) {
          expect(match.reasons.length).toBeGreaterThan(0);
          expect(typeof match.reasons[0]).toBe("string");
        }
      }
    });
  });

  describe("isConfidentMatch", () => {
    it("returns true for score >= 100", () => {
      const match = scoreProfileMatch(testUser, testProfiles[0]);
      expect(isConfidentMatch(match)).toBe(true);
    });

    it("returns true for score >= 80 with multiple reasons", () => {
      const match = {
        profile: testProfiles[1],
        score: 80,
        reasons: ["Name matches", "Email domain match"],
      };
      expect(isConfidentMatch(match)).toBe(true);
    });

    it("returns false for score < 80", () => {
      const match = {
        profile: testProfiles[2],
        score: 50,
        reasons: ["First name matches"],
      };
      expect(isConfidentMatch(match)).toBe(false);
    });

    it("returns false for score >= 80 but only one reason", () => {
      const match = {
        profile: testProfiles[2],
        score: 80,
        reasons: ["One reason"],
      };
      expect(isConfidentMatch(match)).toBe(false);
    });
  });

  describe("getBestMatch", () => {
    it("returns the highest scoring match", () => {
      const best = getBestMatch(testUser, testProfiles);
      expect(best).not.toBeNull();
      if (best) {
        expect(best.profile.id).toBe("1"); // Exact email match
      }
    });

    it("returns null if best match score < 50", () => {
      const user: ClaimingUser = {
        email: "xyz@unknown.com",
        name: "XYZ Person",
        oidcProvider: "google",
      };
      const best = getBestMatch(user, testProfiles);
      expect(best).toBeNull();
    });

    it("returns first profile that meets threshold", () => {
      const best = getBestMatch(testUser, testProfiles);
      expect(best?.score).toBeGreaterThanOrEqual(50);
    });
  });

  describe("groupProfilesByMatch", () => {
    it("groups profiles into confident, suggested, and other", () => {
      const grouped = groupProfilesByMatch(testUser, testProfiles);
      expect(grouped).toHaveProperty("confident");
      expect(grouped).toHaveProperty("suggested");
      expect(grouped).toHaveProperty("other");
    });

    it("puts exact email matches in confident", () => {
      const grouped = groupProfilesByMatch(testUser, testProfiles);
      expect(grouped.confident.length).toBeGreaterThan(0);
      expect(grouped.confident[0].profile.id).toBe("1");
    });

    it("sorts confident matches by score", () => {
      const grouped = groupProfilesByMatch(testUser, testProfiles);
      for (let i = 0; i < grouped.confident.length - 1; i++) {
        expect(grouped.confident[i].score).toBeGreaterThanOrEqual(
          grouped.confident[i + 1].score
        );
      }
    });

    it("does not include a profile in multiple groups", () => {
      const grouped = groupProfilesByMatch(testUser, testProfiles);
      const allIds = new Set<string>();

      for (const match of [...grouped.confident, ...grouped.suggested]) {
        expect(allIds.has(match.profile.id)).toBe(false);
        allIds.add(match.profile.id);
      }

      for (const profile of grouped.other) {
        expect(allIds.has(profile.id)).toBe(false);
      }
    });
  });

  describe("validateClaim", () => {
    it("rejects claim if user already has personId", () => {
      const result = validateClaim(
        {
          id: "user1",
          personId: "person1",
          profileClaimStatus: "PENDING",
          oidcProvider: "google",
        },
        { ...testProfiles[0], isLiving: true },
        []
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already claimed");
    });

    it("rejects claim if user status is CLAIMED", () => {
      const result = validateClaim(
        {
          id: "user1",
          personId: null,
          profileClaimStatus: "CLAIMED",
          oidcProvider: "google",
        },
        { ...testProfiles[0], isLiving: true },
        []
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("completed");
    });

    it("rejects claim for non-living profile", () => {
      const result = validateClaim(
        {
          id: "user1",
          personId: null,
          profileClaimStatus: "PENDING",
          oidcProvider: "google",
        },
        { ...testProfiles[0], isLiving: false },
        []
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("non-living");
    });

    it("rejects claim if profile already claimed", () => {
      const result = validateClaim(
        {
          id: "user1",
          personId: null,
          profileClaimStatus: "PENDING",
          oidcProvider: "google",
        },
        { ...testProfiles[0], isLiving: true },
        ["1"]
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already claimed");
    });

    it("allows valid claim", () => {
      const result = validateClaim(
        {
          id: "user1",
          personId: null,
          profileClaimStatus: "PENDING",
          oidcProvider: "google",
        },
        { ...testProfiles[0], isLiving: true },
        ["2", "3"]
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("getClaimStatusText", () => {
    it("returns correct text for PENDING", () => {
      const text = getClaimStatusText("PENDING");
      expect(text).toContain("not yet claimed");
    });

    it("returns correct text for CLAIMED", () => {
      const text = getClaimStatusText("CLAIMED");
      expect(text).toContain("claimed");
    });

    it("returns correct text for SKIPPED", () => {
      const text = getClaimStatusText("SKIPPED");
      expect(text).toContain("skipped");
    });

    it("returns correct text for NA", () => {
      const text = getClaimStatusText("NA");
      expect(text).toContain("Not applicable");
    });
  });

  describe("shouldShowClaimModal", () => {
    it("returns false for non-OIDC users", () => {
      const should = shouldShowClaimModal({
        oidcProvider: null,
        personId: null,
        profileClaimStatus: "PENDING",
      });
      expect(should).toBe(false);
    });

    it("returns true for OIDC users with PENDING status and no personId", () => {
      const should = shouldShowClaimModal({
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "PENDING",
      });
      expect(should).toBe(true);
    });

    it("returns false for OIDC users with CLAIMED status", () => {
      const should = shouldShowClaimModal({
        oidcProvider: "google",
        personId: "person1",
        profileClaimStatus: "CLAIMED",
      });
      expect(should).toBe(false);
    });

    it("returns false for OIDC users with SKIPPED status", () => {
      const should = shouldShowClaimModal({
        oidcProvider: "google",
        personId: null,
        profileClaimStatus: "SKIPPED",
      });
      expect(should).toBe(false);
    });

    it("returns false for OIDC users with personId already set", () => {
      const should = shouldShowClaimModal({
        oidcProvider: "google",
        personId: "person1",
        profileClaimStatus: "PENDING",
      });
      expect(should).toBe(false);
    });
  });
});
