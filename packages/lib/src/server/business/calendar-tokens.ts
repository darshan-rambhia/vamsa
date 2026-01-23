import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import { logger } from "@vamsa/lib/logger";
import { addYears } from "date-fns";
import {
  generateSecureToken,
  rotateToken,
  revokeToken,
} from "./token-rotation";

/**
 * Type for the database client used by calendar token functions.
 * This allows dependency injection for testing.
 */
export type CalendarTokensDb = Pick<PrismaClient, "calendarToken">;

/**
 * Get current user's calendar tokens
 * @param userId - ID of the authenticated user
 * @param db - Optional database client (defaults to prisma)
 * @returns List of calendar tokens for the user, ordered by creation date (newest first)
 */
export async function getCalendarTokensData(
  userId: string,
  db: CalendarTokensDb = defaultPrisma
) {
  return db.calendarToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export interface CreateCalendarTokenInput {
  name?: string;
  rotationPolicy?: string;
}

/**
 * Create new calendar token for a user
 * @param userId - ID of the user creating the token
 * @param input - Token creation input (name and rotation policy)
 * @param db - Optional database client (defaults to prisma)
 * @returns Created calendar token
 */
export async function createCalendarTokenData(
  userId: string,
  input: CreateCalendarTokenInput,
  db: CalendarTokensDb = defaultPrisma
) {
  const token = await db.calendarToken.create({
    data: {
      userId,
      token: generateSecureToken(),
      name: input.name,
      rotationPolicy: input.rotationPolicy || "annual",
      expiresAt: addYears(new Date(), 1),
      isActive: true,
    },
  });

  logger.info(
    { userId, tokenId: token.id, tokenName: token.name },
    "Calendar token created"
  );

  return token;
}

/**
 * Verify token ownership - check if token belongs to user
 * @param tokenId - ID of the token to verify
 * @param userId - ID of the user claiming ownership
 * @param db - Optional database client (defaults to prisma)
 * @returns The token if it exists and belongs to the user
 * @throws Error if token not found or doesn't belong to user
 */
export async function verifyTokenOwnership(
  tokenId: string,
  userId: string,
  db: CalendarTokensDb = defaultPrisma
) {
  const existingToken = await db.calendarToken.findFirst({
    where: { id: tokenId, userId },
  });

  if (!existingToken) {
    throw new Error("Token not found");
  }

  return existingToken;
}

/**
 * Rotate a calendar token manually
 * @param tokenId - ID of the token to rotate
 * @param userId - ID of the user performing the rotation
 * @param db - Optional database client (defaults to prisma)
 * @returns The newly created token after rotation
 * @throws Error if token not found or doesn't belong to user
 */
export async function rotateCalendarTokenData(
  tokenId: string,
  userId: string,
  db: CalendarTokensDb = defaultPrisma
) {
  // Verify user owns this token
  await verifyTokenOwnership(tokenId, userId, db);

  const newToken = await rotateToken(tokenId, db);

  logger.info(
    { userId, oldTokenId: tokenId, newTokenId: newToken.id },
    "Calendar token rotated manually"
  );

  return newToken;
}

/**
 * Revoke a calendar token immediately
 * @param tokenId - ID of the token to revoke
 * @param userId - ID of the user performing the revocation
 * @param db - Optional database client (defaults to prisma)
 * @returns The revoked token
 * @throws Error if token not found or doesn't belong to user
 */
export async function revokeCalendarTokenData(
  tokenId: string,
  userId: string,
  db: CalendarTokensDb = defaultPrisma
) {
  // Verify user owns this token
  await verifyTokenOwnership(tokenId, userId, db);

  const revokedToken = await revokeToken(tokenId, db);

  logger.info({ userId, tokenId }, "Calendar token revoked");

  return revokedToken;
}

export interface UpdateTokenNameInput {
  tokenId: string;
  name: string;
}

export interface UpdateTokenNameResult {
  id: string;
  name: string | null;
}

/**
 * Update calendar token name
 * @param tokenId - ID of the token to update
 * @param name - New name for the token
 * @param userId - ID of the user performing the update
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated token with name and timestamp
 * @throws Error if token not found or doesn't belong to user
 */
export async function updateTokenNameData(
  tokenId: string,
  name: string,
  userId: string,
  db: CalendarTokensDb = defaultPrisma
): Promise<UpdateTokenNameResult> {
  // Verify user owns this token
  await verifyTokenOwnership(tokenId, userId, db);

  const updatedToken = await db.calendarToken.update({
    where: { id: tokenId },
    data: { name },
  });

  logger.info(
    { userId, tokenId, newName: name },
    "Calendar token name updated"
  );

  return {
    id: updatedToken.id,
    name: updatedToken.name,
  };
}

export interface DeleteCalendarTokenResult {
  success: boolean;
  deletedId: string;
}

/**
 * Delete a revoked calendar token (permanent deletion)
 * Only revoked (inactive) tokens can be deleted
 * @param tokenId - ID of the token to delete
 * @param userId - ID of the user performing the deletion
 * @param db - Optional database client (defaults to prisma)
 * @returns Success status with deleted token ID
 * @throws Error if token not found, doesn't belong to user, or is still active
 */
export async function deleteCalendarTokenData(
  tokenId: string,
  userId: string,
  db: CalendarTokensDb = defaultPrisma
): Promise<DeleteCalendarTokenResult> {
  // Verify user owns this token
  const existingToken = await verifyTokenOwnership(tokenId, userId, db);

  // Only allow deletion of revoked (inactive) tokens
  if (existingToken.isActive) {
    throw new Error("Cannot delete an active token. Please revoke it first.");
  }

  // Permanently delete the token
  await db.calendarToken.delete({
    where: { id: tokenId },
  });

  logger.info({ userId, tokenId }, "Calendar token permanently deleted");

  return { success: true, deletedId: tokenId };
}

/**
 * Get all calendar tokens across all users (Admin only)
 * @param db - Optional database client (defaults to prisma)
 * @returns List of all calendar tokens with user information, ordered by creation date
 */
export async function getAllCalendarTokensData(
  db: CalendarTokensDb = defaultPrisma
) {
  return db.calendarToken.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
