/**
 * Account Lockout Logic for Failed Login Attempts
 *
 * Implements progressive account lockout with tiered durations:
 * - 1-9 attempts: no lockout
 * - 10 attempts: 15 minutes
 * - 15 attempts: 30 minutes
 * - 20 attempts: 1 hour
 * - 25 attempts: 2 hours
 * - 30+ attempts: 24 hours
 */

import { eq } from "drizzle-orm";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { loggers } from "../../logger";

import type { DrizzleDB } from "@vamsa/api";

const log = loggers.api;

// Lockout configuration - progressive tiers
const LOCKOUT_TIERS = [
  { threshold: 10, durationMinutes: 15 },
  { threshold: 15, durationMinutes: 30 },
  { threshold: 20, durationMinutes: 60 },
  { threshold: 25, durationMinutes: 120 },
  { threshold: 30, durationMinutes: 1440 },
] as const;

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  remainingMs: number;
  failedAttempts: number;
}

export interface RecordAttemptResult {
  locked: boolean;
  failedAttempts: number;
  lockedUntil: Date | null;
}

/**
 * Check if an account is currently locked.
 *
 * @param email - User email address
 * @param db - Drizzle database instance (defaults to drizzleDb)
 * @returns LockoutStatus with lock information
 */
export async function checkAccountLockout(
  email: string,
  db: DrizzleDB = drizzleDb
): Promise<LockoutStatus> {
  const user = await db.query.users.findFirst({
    where: eq(drizzleSchema.users.email, email),
    columns: {
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    // Don't reveal whether user exists
    return {
      isLocked: false,
      lockedUntil: null,
      remainingMs: 0,
      failedAttempts: 0,
    };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    return {
      isLocked: true,
      lockedUntil: user.lockedUntil,
      remainingMs,
      failedAttempts: user.failedLoginAttempts,
    };
  }

  return {
    isLocked: false,
    lockedUntil: null,
    remainingMs: 0,
    failedAttempts: user.failedLoginAttempts,
  };
}

/**
 * Record a failed login attempt and possibly trigger lockout.
 *
 * @param email - User email address
 * @param db - Drizzle database instance (defaults to drizzleDb)
 * @returns RecordAttemptResult with lockout status
 */
export async function recordFailedLoginAttempt(
  email: string,
  db: DrizzleDB = drizzleDb
): Promise<RecordAttemptResult> {
  const user = await db.query.users.findFirst({
    where: eq(drizzleSchema.users.email, email),
    columns: { id: true, failedLoginAttempts: true },
  });

  if (!user) {
    return { locked: false, failedAttempts: 0, lockedUntil: null };
  }

  const newCount = user.failedLoginAttempts + 1;

  // Determine lockout tier based on attempt count
  let lockedUntil: Date | null = null;
  for (let i = LOCKOUT_TIERS.length - 1; i >= 0; i--) {
    if (newCount >= LOCKOUT_TIERS[i].threshold) {
      lockedUntil = new Date(
        Date.now() + LOCKOUT_TIERS[i].durationMinutes * 60 * 1000
      );
      break;
    }
  }

  await db
    .update(drizzleSchema.users)
    .set({
      failedLoginAttempts: newCount,
      lastFailedLoginAt: new Date(),
      ...(lockedUntil ? { lockedUntil } : {}),
    })
    .where(eq(drizzleSchema.users.id, user.id));

  if (lockedUntil) {
    log.warn(
      {
        email,
        failedAttempts: newCount,
        lockedUntil: lockedUntil.toISOString(),
      },
      "Account locked due to failed login attempts"
    );
  }

  return { locked: !!lockedUntil, failedAttempts: newCount, lockedUntil };
}

/**
 * Reset failed login attempts on successful login.
 *
 * @param email - User email address
 * @param db - Drizzle database instance (defaults to drizzleDb)
 */
export async function resetFailedLoginAttempts(
  email: string,
  db: DrizzleDB = drizzleDb
): Promise<void> {
  await db
    .update(drizzleSchema.users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    })
    .where(eq(drizzleSchema.users.email, email));
}
