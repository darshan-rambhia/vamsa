import crypto from "node:crypto";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { and, eq } from "drizzle-orm";
import { addDays, addYears } from "date-fns";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.auth;

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
  event: RotationEvent
): Promise<{ rotated: number; tokens: Array<string> }> {
  const tokens = await drizzleDb.query.calendarTokens.findMany({
    where: and(
      eq(drizzleSchema.calendarTokens.userId, userId),
      eq(drizzleSchema.calendarTokens.isActive, true)
    ),
  });

  const rotatedTokens: Array<string> = [];
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
      const newToken = await rotateToken(token.id);
      rotatedTokens.push(newToken.token);
      rotatedCount++;

      log.info(
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
export async function rotateToken(oldTokenId: string) {
  const oldToken = await drizzleDb.query.calendarTokens.findFirst({
    where: eq(drizzleSchema.calendarTokens.id, oldTokenId),
  });

  if (!oldToken) {
    throw new Error("Calendar token not found");
  }

  // Create new token with same settings
  const newTokenId = crypto.randomUUID();
  const [newToken] = await drizzleDb
    .insert(drizzleSchema.calendarTokens)
    .values({
      id: newTokenId,
      userId: oldToken.userId,
      token: generateSecureToken(),
      name: oldToken.name,
      scopes: oldToken.scopes,
      rotatedFrom: oldTokenId,
      rotatedAt: new Date(),
      expiresAt: addYears(new Date(), 1),
      rotationPolicy: oldToken.rotationPolicy,
      isActive: true,
    })
    .returning();

  // Grace period: old token valid for 30 days
  await drizzleDb
    .update(drizzleSchema.calendarTokens)
    .set({
      expiresAt: addDays(new Date(), 30),
      name: oldToken.name ? `${oldToken.name} (rotated)` : null,
    })
    .where(eq(drizzleSchema.calendarTokens.id, oldTokenId));

  return newToken;
}

/**
 * Revoke a token immediately (no grace period)
 */
export async function revokeToken(tokenId: string) {
  const [result] = await drizzleDb
    .update(drizzleSchema.calendarTokens)
    .set({
      isActive: false,
      expiresAt: new Date(), // Expire immediately
    })
    .where(eq(drizzleSchema.calendarTokens.id, tokenId))
    .returning();

  return result;
}
