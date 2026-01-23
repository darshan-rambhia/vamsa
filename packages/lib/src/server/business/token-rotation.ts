import type { PrismaClient } from "@vamsa/api";
import { prisma as defaultPrisma } from "@vamsa/lib/server";
import { logger } from "@vamsa/lib/logger";
import { addYears, addDays } from "date-fns";
import crypto from "crypto";

/**
 * Database interface for token rotation operations.
 * Allows dependency injection for testing.
 */
export type TokenRotationDb = Pick<PrismaClient, "calendarToken">;

type RotationEvent = "password_change" | "manual" | "annual_check";

/**
 * Generate cryptographically secure random token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Calculate days since a date
 */
export function daysSinceCreation(createdAt: Date): number {
  return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Enforce token rotation policies for a user
 */
export async function enforceRotationPolicy(
  userId: string,
  event: RotationEvent,
  db: TokenRotationDb = defaultPrisma
): Promise<{ rotated: number; tokens: string[] }> {
  const tokens = await db.calendarToken.findMany({
    where: { userId, isActive: true },
  });

  const rotatedTokens: string[] = [];
  let rotatedCount = 0;

  for (const token of tokens) {
    const shouldRotate =
      (event === "password_change" &&
        token.rotationPolicy === "on_password_change") ||
      (event === "annual_check" &&
        token.rotationPolicy === "annual" &&
        daysSinceCreation(token.createdAt) >= 365) ||
      event === "manual";

    if (shouldRotate) {
      const newToken = await rotateToken(token.id, db);
      rotatedTokens.push(newToken.token);
      rotatedCount++;

      logger.info(
        { userId, tokenId: token.id, event, newTokenId: newToken.id },
        "Calendar token rotated"
      );
    }
  }

  return { rotated: rotatedCount, tokens: rotatedTokens };
}

/**
 * Rotate a single token with grace period
 */
export async function rotateToken(
  oldTokenId: string,
  db: TokenRotationDb = defaultPrisma
) {
  const oldToken = await db.calendarToken.findUniqueOrThrow({
    where: { id: oldTokenId },
  });

  // Create new token with same settings
  const newToken = await db.calendarToken.create({
    data: {
      userId: oldToken.userId,
      token: generateSecureToken(),
      name: oldToken.name,
      scopes: oldToken.scopes,
      rotatedFrom: oldTokenId,
      rotatedAt: new Date(),
      expiresAt: addYears(new Date(), 1),
      rotationPolicy: oldToken.rotationPolicy,
      isActive: true,
    },
  });

  // Grace period: old token valid for 30 days
  await db.calendarToken.update({
    where: { id: oldTokenId },
    data: {
      expiresAt: addDays(new Date(), 30),
      name: oldToken.name ? `${oldToken.name} (rotated)` : null,
    },
  });

  return newToken;
}

/**
 * Revoke a token immediately (no grace period)
 */
export async function revokeToken(
  tokenId: string,
  db: TokenRotationDb = defaultPrisma
) {
  return db.calendarToken.update({
    where: { id: tokenId },
    data: {
      isActive: false,
      expiresAt: new Date(), // Expire immediately
    },
  });
}
