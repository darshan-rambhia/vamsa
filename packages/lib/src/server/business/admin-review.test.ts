/**
 * Regression tests for admin business fixes:
 * - updateUserData returns a safe DTO (no passwordHash or lockout fields)
 * - email updates are lowercased and conflict-checked (409 via ConflictError)
 * - resendInviteData refuses revoked invites
 * - patchFamilySettingsData writes only the supplied columns
 */

import { describe, expect, it, vi } from "vitest";
import { resendInviteData } from "./invites";
import { patchFamilySettingsData } from "./settings";
import { isUniqueViolation, updateUserData } from "./users";
import type { InvitesDb } from "./invites";
import type { SettingsDb } from "./settings";
import type { UsersDb } from "./users";

const existing = {
  id: "u2",
  email: "old@example.com",
  name: "B",
  role: "MEMBER",
  isActive: true,
  personId: null,
};

function usersDb(opts: {
  taken?: unknown;
  returned?: Record<string, unknown>;
  updateError?: unknown;
}) {
  const set = vi.fn((_v: Record<string, unknown>) => ({
    where: () => ({
      returning: async () => {
        if (opts.updateError) throw opts.updateError;
        return [opts.returned ?? existing];
      },
    }),
  }));
  let lookups = 0;
  const db = {
    query: {
      users: {
        // first lookup: the user being edited; second: email collision check
        findFirst: vi.fn(async () => (lookups++ === 0 ? existing : opts.taken)),
      },
    },
    update: vi.fn(() => ({ set })),
    delete: vi.fn(() => ({ where: async () => undefined })),
  };
  return { db: db as unknown as UsersDb, set };
}

describe("updateUserData", () => {
  it("never returns passwordHash or other internal columns", async () => {
    const { db } = usersDb({
      returned: {
        ...existing,
        name: "New",
        passwordHash: "$argon2id$secret",
        failedLoginAttempts: 3,
        lockedUntil: new Date(),
        oidcSubject: "sub",
      },
    });
    const result = await updateUserData("u2", { name: "New" }, "admin", db);
    expect(Object.keys(result).sort()).toEqual(
      ["email", "id", "isActive", "name", "personId", "role"].sort()
    );
    expect(JSON.stringify(result)).not.toContain("argon2");
  });

  it("lowercases a new email before saving", async () => {
    const { db, set } = usersDb({ taken: undefined });
    await updateUserData("u2", { email: "  New@Example.COM " }, "admin", db);
    expect(set.mock.calls[0][0]).toMatchObject({ email: "new@example.com" });
  });

  it("rejects an email another user already has", async () => {
    const { db, set } = usersDb({ taken: { id: "u9" } });
    await expect(
      updateUserData("u2", { email: "Taken@example.com" }, "admin", db)
    ).rejects.toMatchObject({
      name: "ConflictError",
      message: "A user already exists with this email",
    });
    expect(set).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: "23505" }, "postgres"],
    [new Error("UNIQUE constraint failed: User.email"), "sqlite"],
  ])(
    "maps a racing unique violation (%s, %s) to a conflict",
    async (err, _driver) => {
      const { db } = usersDb({ taken: undefined, updateError: err });
      await expect(
        updateUserData("u2", { email: "race@example.com" }, "admin", db)
      ).rejects.toMatchObject({ name: "ConflictError" });
    }
  );

  it("isUniqueViolation follows error causes", () => {
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
  });
});

describe("resendInviteData", () => {
  function invitesDb(status: string) {
    const update = vi.fn();
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [{ id: "i1", status }] }),
        }),
      }),
      update,
    };
    return { db: db as unknown as InvitesDb, update };
  }

  it("refuses a revoked invite and changes nothing", async () => {
    const { db, update } = invitesDb("REVOKED");
    await expect(resendInviteData("i1", "admin-1", db)).rejects.toMatchObject({
      name: "ConflictError",
    });
    expect(update).not.toHaveBeenCalled();
  });
});

describe("patchFamilySettingsData", () => {
  it("updates only the supplied columns in one statement", async () => {
    const set = vi.fn((_v: Record<string, unknown>) => ({
      where: async () => undefined,
    }));
    const db = {
      query: {
        familySettings: {
          findFirst: vi.fn(async () => ({
            id: "fs1",
            familyName: "Kapoor",
            description: null,
            allowSelfRegistration: true,
            requireApprovalForEdits: true,
            allowProfileClaiming: false,
            metricsDashboardUrl: null,
            metricsApiUrl: null,
          })),
        },
      },
      update: vi.fn(() => ({ set })),
      insert: vi.fn(),
    };
    await patchFamilySettingsData(
      { allowProfileClaiming: true },
      "ADMIN",
      "admin-1",
      db as unknown as SettingsDb
    );
    expect(set).toHaveBeenCalledTimes(1);
    const written = set.mock.calls[0][0];
    expect(Object.keys(written).sort()).toEqual(
      ["allowProfileClaiming", "updatedAt"].sort()
    );
    expect(db.insert).not.toHaveBeenCalled();
  });
});
