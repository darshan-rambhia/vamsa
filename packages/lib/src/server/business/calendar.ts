/**
 * Calendar Server Functions - Business Logic for Calendar Token Management
 *
 * This module contains the business logic orchestration layer for all calendar
 * operations. Each function:
 * - Performs authentication and authorization checks
 * - Manages calendar token generation, validation, and revocation
 * - Records audit logs for compliance
 * - Returns typed results
 *
 * Exported Functions:
 * - generateCalendarTokenLogic: Creates a new calendar token with expiration
 * - validateCalendarTokenLogic: Validates token authenticity and expiration
 * - revokeCalendarTokenLogic: Deactivates a calendar token
 * - listCalendarTokensLogic: Retrieves user's calendar tokens
 * - deleteCalendarTokenLogic: Permanently deletes a revoked token
 */

import { randomBytes } from "crypto";
import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import { logger } from "@vamsa/lib/logger";

/**
 * Type for the database client used by calendar functions.
 * This allows dependency injection for testing.
 */
export type CalendarDb = Pick<
  PrismaClient,
  "calendarToken" | "auditLog" | "user"
>;

/**
 * Generate a new calendar token with expiration
 *
 * Creates a cryptographically secure token and stores it in the database
 * with the specified expiration date.
 *
 * @param userId ID of user requesting token
 * @param name Optional name for the token
 * @param expiryDays Number of days until token expires
 * @param db Optional database client (defaults to prisma)
 * @returns Generated token and metadata
 * @throws Error if database operation fails
 */
export async function generateCalendarTokenLogic(
  userId: string,
  name: string | undefined,
  expiryDays: number,
  db: CalendarDb = defaultPrisma
) {
  // Generate a cryptographically secure token
  const tokenBytes = randomBytes(32);
  const token = tokenBytes.toString("hex");

  // Calculate expiration date
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  // Create the calendar token
  const calendarToken = await db.calendarToken.create({
    data: {
      token,
      userId,
      name,
      expiresAt,
      isActive: true,
    },
  });

  // Log the action
  await db.auditLog.create({
    data: {
      userId,
      action: "CREATE",
      entityType: "CalendarToken",
      entityId: calendarToken.id,
      newData: {
        name: calendarToken.name,
        expiresAt: calendarToken.expiresAt,
      },
    },
  });

  logger.info(`Calendar token generated for user ${userId}`);

  return {
    success: true,
    token: calendarToken.token,
    name: calendarToken.name,
    expiresAt: calendarToken.expiresAt.toISOString(),
  };
}

/**
 * Validate a calendar token
 *
 * Checks if a token exists, is active, and not expired.
 *
 * @param token Token value to validate
 * @param db Optional database client (defaults to prisma)
 * @returns Validation result with user info if valid
 */
export async function validateCalendarTokenLogic(
  token: string,
  db: CalendarDb = defaultPrisma
) {
  try {
    const calendarToken = await db.calendarToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists, is active, and not expired
    if (
      !calendarToken ||
      !calendarToken.isActive ||
      calendarToken.expiresAt < new Date()
    ) {
      return { valid: false, user: null };
    }

    return {
      valid: true,
      user: {
        id: calendarToken.user.id,
        email: calendarToken.user.email,
      },
    };
  } catch (error) {
    logger.error({ error }, "Failed to validate calendar token");
    return { valid: false, user: null };
  }
}

/**
 * Revoke a calendar token by ID
 *
 * Marks a token as inactive without deleting it from database.
 * Records audit trail for compliance.
 *
 * @param tokenId ID of token to revoke
 * @param userId ID of user performing revocation
 * @param db Optional database client (defaults to prisma)
 * @returns Success status
 * @throws Error if token not found or user unauthorized
 */
export async function revokeCalendarTokenLogic(
  tokenId: string,
  userId: string,
  db: CalendarDb = defaultPrisma
) {
  // Find the token by ID and verify it belongs to the current user
  const calendarToken = await db.calendarToken.findUnique({
    where: { id: tokenId },
  });

  if (!calendarToken || calendarToken.userId !== userId) {
    throw new Error("Token not found or unauthorized");
  }

  // Revoke the token by marking it as inactive
  await db.calendarToken.update({
    where: { id: calendarToken.id },
    data: { isActive: false },
  });

  // Log the action
  await db.auditLog.create({
    data: {
      userId,
      action: "DELETE",
      entityType: "CalendarToken",
      entityId: calendarToken.id,
    },
  });

  logger.info(`Calendar token revoked for user ${userId}`);

  return { success: true };
}

/**
 * List all calendar tokens for a user
 *
 * Retrieves all tokens associated with a user, ordered by creation date.
 *
 * @param userId ID of user
 * @param db Optional database client (defaults to prisma)
 * @returns Array of token records
 * @throws Error if database query fails
 */
export async function listCalendarTokensLogic(
  userId: string,
  db: CalendarDb = defaultPrisma
) {
  const tokens = await db.calendarToken.findMany({
    where: { userId },
    select: {
      id: true,
      token: true,
      name: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return tokens;
}

/**
 * Delete a calendar token permanently
 *
 * Permanently removes a token from database. Only allows deleting
 * revoked (inactive) tokens for safety.
 *
 * @param tokenId ID of token to delete
 * @param userId ID of user performing deletion
 * @param db Optional database client (defaults to prisma)
 * @returns Success status
 * @throws Error if token not found, user unauthorized, or token is still active
 */
export async function deleteCalendarTokenLogic(
  tokenId: string,
  userId: string,
  db: CalendarDb = defaultPrisma
) {
  // Find the token by ID and verify it belongs to the current user
  const calendarToken = await db.calendarToken.findUnique({
    where: { id: tokenId },
  });

  if (!calendarToken || calendarToken.userId !== userId) {
    throw new Error("Token not found or unauthorized");
  }

  // Only allow deleting revoked (inactive) tokens
  if (calendarToken.isActive) {
    throw new Error(
      "Only revoked tokens can be deleted. Revoke the token first."
    );
  }

  // Delete the token permanently
  await db.calendarToken.delete({
    where: { id: calendarToken.id },
  });

  // Log the action
  await db.auditLog.create({
    data: {
      userId,
      action: "DELETE",
      entityType: "CalendarToken",
      entityId: calendarToken.id,
    },
  });

  logger.info(`Calendar token deleted for user ${userId}`);

  return { success: true };
}
