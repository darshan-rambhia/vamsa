/**
 * Profile claiming gate tests
 *
 * Profile claiming is off by default. When an admin has not enabled it:
 * - the claim endpoints refuse (throw)
 * - unclaimed-profile listing returns nothing
 * - no persons are queried
 *
 * Uses DI: the db is passed explicitly, so no module mocking is needed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimProfileData,
  claimProfileForOIDCData,
  getClaimableProfilesData,
  getUnclaimedProfilesData,
  isProfileClaimingEnabledData,
} from "./index";

type Db = Parameters<typeof isProfileClaimingEnabledData>[0];

/**
 * Minimal db double. Only the query paths used by the gate are provided; any
 * persons query throws, so a test fails if the gate lets a query through.
 */
function fakeDb(settingsRow: { allowProfileClaiming: boolean } | undefined) {
  const explode = () => {
    throw new Error("persons must not be queried while claiming is disabled");
  };
  const db = {
    query: {
      familySettings: { findFirst: vi.fn(async () => settingsRow) },
      users: { findFirst: vi.fn(explode) },
      persons: { findFirst: vi.fn(explode), findMany: vi.fn(explode) },
    },
    select: vi.fn(explode),
  };
  // Test double: only the fields above are exercised by the gate
  return db as unknown as Db;
}

describe("isProfileClaimingEnabledData", () => {
  it("is false when no family settings row exists", async () => {
    const db = fakeDb(undefined);
    await expect(isProfileClaimingEnabledData(db)).resolves.toBe(false);
  });

  it("is false when the admin has not enabled claiming", async () => {
    const db = fakeDb({ allowProfileClaiming: false });
    await expect(isProfileClaimingEnabledData(db)).resolves.toBe(false);
  });

  it("is true only when the admin enabled claiming", async () => {
    const db = fakeDb({ allowProfileClaiming: true });
    await expect(isProfileClaimingEnabledData(db)).resolves.toBe(true);
  });
});

describe("profile claiming disabled (default)", () => {
  let db: Db;
  beforeEach(() => {
    db = fakeDb({ allowProfileClaiming: false });
  });

  it("getUnclaimedProfilesData returns an empty list without querying persons", async () => {
    await expect(getUnclaimedProfilesData(db)).resolves.toEqual([]);
  });

  it("claimProfileData refuses", async () => {
    await expect(
      claimProfileData("new@example.com", "person-1", "password123", db)
    ).rejects.toThrow("Profile claiming is disabled");
  });

  it("getClaimableProfilesData refuses", async () => {
    await expect(getClaimableProfilesData("user-1", db)).rejects.toThrow(
      "Profile claiming is disabled"
    );
  });

  it("claimProfileForOIDCData refuses", async () => {
    await expect(
      claimProfileForOIDCData("user-1", "person-1", db)
    ).rejects.toThrow("Profile claiming is disabled");
  });
});
