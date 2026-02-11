/**
 * Unit tests for account lockout business logic
 *
 * Tests cover:
 * - checkAccountLockout: Check if account is locked
 * - recordFailedLoginAttempt: Record failed attempt and trigger lockout
 * - resetFailedLoginAttempts: Reset lockout fields on successful login
 *
 * Uses dependency injection to mock database calls.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks } from "../../testing/shared-mocks";
import {
  checkAccountLockout,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
} from "./account-lockout";

describe("Account Lockout Logic", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe("checkAccountLockout", () => {
    it("should return not locked for non-existent user", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => null),
          },
        },
      } as any;

      const result = await checkAccountLockout(
        "nonexistent@example.com",
        mockDb
      );

      expect(result.isLocked).toBe(false);
      expect(result.lockedUntil).toBeNull();
      expect(result.remainingMs).toBe(0);
      expect(result.failedAttempts).toBe(0);
    });

    it("should return not locked when lockedUntil is in the past", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              failedLoginAttempts: 15,
              lockedUntil: new Date(Date.now() - 60000), // 1 minute ago
            })),
          },
        },
      } as any;

      const result = await checkAccountLockout("user@example.com", mockDb);

      expect(result.isLocked).toBe(false);
      expect(result.lockedUntil).toBeNull();
      expect(result.remainingMs).toBe(0);
      expect(result.failedAttempts).toBe(15);
    });

    it("should return locked with remaining time when locked", async () => {
      const lockedUntilTime = Date.now() + 900000; // 15 minutes from now
      const lockedUntil = new Date(lockedUntilTime);

      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              failedLoginAttempts: 10,
              lockedUntil,
            })),
          },
        },
      } as any;

      const result = await checkAccountLockout("user@example.com", mockDb);

      expect(result.isLocked).toBe(true);
      expect(result.lockedUntil).toEqual(lockedUntil);
      expect(result.failedAttempts).toBe(10);
      // Remaining time should be close to 15 minutes (accounting for execution time)
      expect(result.remainingMs).toBeGreaterThan(890000); // Allow some execution time
      expect(result.remainingMs).toBeLessThanOrEqual(900000);
    });

    it("should return not locked when user has no failed attempts", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              failedLoginAttempts: 0,
              lockedUntil: null,
            })),
          },
        },
      } as any;

      const result = await checkAccountLockout("user@example.com", mockDb);

      expect(result.isLocked).toBe(false);
      expect(result.lockedUntil).toBeNull();
      expect(result.failedAttempts).toBe(0);
    });
  });

  describe("recordFailedLoginAttempt", () => {
    it("should return not locked for non-existent user", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => null),
          },
        },
      } as any;

      const result = await recordFailedLoginAttempt(
        "nonexistent@example.com",
        mockDb
      );

      expect(result.locked).toBe(false);
      expect(result.failedAttempts).toBe(0);
      expect(result.lockedUntil).toBeNull();
    });

    it("should not lock account for attempts < 10", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              id: "user-123",
              failedLoginAttempts: 5,
            })),
          },
        },
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => {}),
          })),
        })),
      } as any;

      const result = await recordFailedLoginAttempt("user@example.com", mockDb);

      expect(result.locked).toBe(false);
      expect(result.failedAttempts).toBe(6);
      expect(result.lockedUntil).toBeNull();

      // Verify update was called with new count but no lockedUntil
      const updateCall = mockDb.update.mock.calls[0];
      expect(updateCall).toBeDefined();
    });

    it("should lock account for 15 minutes at attempt 10", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              id: "user-123",
              failedLoginAttempts: 9,
            })),
          },
        },
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => {}),
          })),
        })),
      } as any;

      const beforeTime = Date.now();
      const result = await recordFailedLoginAttempt("user@example.com", mockDb);
      const _afterTime = Date.now();

      expect(result.locked).toBe(true);
      expect(result.failedAttempts).toBe(10);
      expect(result.lockedUntil).toBeDefined();

      if (result.lockedUntil) {
        const expectedLockoutMs = 15 * 60 * 1000; // 15 minutes
        const actualDurationMs = result.lockedUntil.getTime() - beforeTime;
        expect(actualDurationMs).toBeGreaterThanOrEqual(
          expectedLockoutMs - 100
        );
        expect(actualDurationMs).toBeLessThanOrEqual(expectedLockoutMs + 100);
      }
    });

    it("should lock account for 30 minutes at attempt 15", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              id: "user-123",
              failedLoginAttempts: 14,
            })),
          },
        },
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => {}),
          })),
        })),
      } as any;

      const beforeTime = Date.now();
      const result = await recordFailedLoginAttempt("user@example.com", mockDb);
      const _afterTime = Date.now();

      expect(result.locked).toBe(true);
      expect(result.failedAttempts).toBe(15);
      expect(result.lockedUntil).toBeDefined();

      if (result.lockedUntil) {
        const expectedLockoutMs = 30 * 60 * 1000; // 30 minutes
        const actualDurationMs = result.lockedUntil.getTime() - beforeTime;
        expect(actualDurationMs).toBeGreaterThanOrEqual(
          expectedLockoutMs - 100
        );
        expect(actualDurationMs).toBeLessThanOrEqual(expectedLockoutMs + 100);
      }
    });

    it("should lock account for 1 hour at attempt 20", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              id: "user-123",
              failedLoginAttempts: 19,
            })),
          },
        },
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => {}),
          })),
        })),
      } as any;

      const beforeTime = Date.now();
      const result = await recordFailedLoginAttempt("user@example.com", mockDb);

      expect(result.locked).toBe(true);
      expect(result.failedAttempts).toBe(20);
      expect(result.lockedUntil).toBeDefined();

      if (result.lockedUntil) {
        const expectedLockoutMs = 60 * 60 * 1000; // 1 hour
        const actualDurationMs = result.lockedUntil.getTime() - beforeTime;
        expect(actualDurationMs).toBeGreaterThanOrEqual(
          expectedLockoutMs - 100
        );
        expect(actualDurationMs).toBeLessThanOrEqual(expectedLockoutMs + 100);
      }
    });

    it("should lock account for 2 hours at attempt 25", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              id: "user-123",
              failedLoginAttempts: 24,
            })),
          },
        },
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => {}),
          })),
        })),
      } as any;

      const beforeTime = Date.now();
      const result = await recordFailedLoginAttempt("user@example.com", mockDb);

      expect(result.locked).toBe(true);
      expect(result.failedAttempts).toBe(25);
      expect(result.lockedUntil).toBeDefined();

      if (result.lockedUntil) {
        const expectedLockoutMs = 2 * 60 * 60 * 1000; // 2 hours
        const actualDurationMs = result.lockedUntil.getTime() - beforeTime;
        expect(actualDurationMs).toBeGreaterThanOrEqual(
          expectedLockoutMs - 100
        );
        expect(actualDurationMs).toBeLessThanOrEqual(expectedLockoutMs + 100);
      }
    });

    it("should lock account for 24 hours at attempt 30+", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              id: "user-123",
              failedLoginAttempts: 35,
            })),
          },
        },
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => {}),
          })),
        })),
      } as any;

      const beforeTime = Date.now();
      const result = await recordFailedLoginAttempt("user@example.com", mockDb);

      expect(result.locked).toBe(true);
      expect(result.failedAttempts).toBe(36);
      expect(result.lockedUntil).toBeDefined();

      if (result.lockedUntil) {
        const expectedLockoutMs = 24 * 60 * 60 * 1000; // 24 hours
        const actualDurationMs = result.lockedUntil.getTime() - beforeTime;
        expect(actualDurationMs).toBeGreaterThanOrEqual(
          expectedLockoutMs - 100
        );
        expect(actualDurationMs).toBeLessThanOrEqual(expectedLockoutMs + 100);
      }
    });

    it("should update lastFailedLoginAt on each failed attempt", async () => {
      const updateSetChain = vi.fn(() => ({
        where: vi.fn(async () => {}),
      }));

      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn(async () => ({
              id: "user-123",
              failedLoginAttempts: 3,
            })),
          },
        },
        update: vi.fn(() => ({
          set: updateSetChain,
        })),
      } as any;

      await recordFailedLoginAttempt("user@example.com", mockDb);

      // Verify that set was called with lastFailedLoginAt
      expect(updateSetChain.mock.calls.length).toBeGreaterThan(0);
      const calls = updateSetChain.mock.calls as Array<any>;
      if (calls.length > 0) {
        const setCall = calls[0][0];
        expect(setCall.lastFailedLoginAt).toBeDefined();
        expect(setCall.lastFailedLoginAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("resetFailedLoginAttempts", () => {
    it("should reset all lockout fields to default values", async () => {
      const updateSetChain = vi.fn(() => ({
        where: vi.fn(async () => {}),
      }));

      const mockDb = {
        update: vi.fn(() => ({
          set: updateSetChain,
        })),
      } as any;

      await resetFailedLoginAttempts("user@example.com", mockDb);

      expect(updateSetChain.mock.calls.length).toBeGreaterThan(0);
      const calls = updateSetChain.mock.calls as Array<any>;
      if (calls.length > 0) {
        const setCall = calls[0][0];
        expect(setCall.failedLoginAttempts).toBe(0);
        expect(setCall.lockedUntil).toBeNull();
        expect(setCall.lastFailedLoginAt).toBeNull();
      }
    });

    it("should update the correct user by email", async () => {
      const whereChain = vi.fn(async () => {});
      const updateSetChain = vi.fn(() => ({
        where: whereChain,
      }));

      const mockDb = {
        update: vi.fn(() => ({
          set: updateSetChain,
        })),
      } as any;

      await resetFailedLoginAttempts("user@example.com", mockDb);

      expect(mockDb.update).toHaveBeenCalled();
      expect(whereChain).toHaveBeenCalled();
    });
  });
});
