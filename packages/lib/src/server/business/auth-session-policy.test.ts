/**
 * Unit tests for the session admission policy
 *
 * Covers the rule that deactivated users cannot obtain a session.
 * Uses dependency injection to pass a fake database.
 */

import { describe, expect, it } from "vitest";
import { assertUserCanStartSession, isUserActive } from "./auth-session-policy";

function fakeDb(rows: Array<{ isActive: boolean }>) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  } as any;
}

describe("auth-session-policy", () => {
  describe("isUserActive", () => {
    it("returns true for an active user", async () => {
      expect(await isUserActive("u1", fakeDb([{ isActive: true }]))).toBe(true);
    });

    it("returns false for a deactivated user", async () => {
      expect(await isUserActive("u1", fakeDb([{ isActive: false }]))).toBe(
        false
      );
    });

    it("returns false when the user does not exist", async () => {
      expect(await isUserActive("missing", fakeDb([]))).toBe(false);
    });
  });

  describe("assertUserCanStartSession", () => {
    it("allows session creation for an active user", async () => {
      await expect(
        assertUserCanStartSession("u1", fakeDb([{ isActive: true }]))
      ).resolves.toBeUndefined();
    });

    it("rejects session creation for a deactivated user", async () => {
      await expect(
        assertUserCanStartSession("u1", fakeDb([{ isActive: false }]))
      ).rejects.toThrow(/deactivated/i);
    });

    it("rejects session creation when the user row is missing", async () => {
      await expect(
        assertUserCanStartSession("missing", fakeDb([]))
      ).rejects.toThrow();
    });
  });
});
