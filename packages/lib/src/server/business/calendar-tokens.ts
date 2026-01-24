import { drizzleDb, drizzleSchema } from "../db";
import { logger } from "@vamsa/lib/logger";
import { addYears } from "date-fns";
import { eq, desc, and } from "drizzle-orm";
import {
  generateSecureToken,
  rotateToken,
  revokeToken,
} from "./token-rotation";



export interface CreateCalendarTokenInput {
  name?: string;
  rotationPolicy?: string;
}





export interface UpdateTokenNameInput {
  tokenId: string;
  name: string;
}

export interface UpdateTokenNameResult {
  id: string;
  name: string | null;
}


export interface DeleteCalendarTokenResult {
  success: boolean;
  deletedId: string;
}



/**
 * Get current user's calendar tokens
 * @param userId - ID of the authenticated user
 * @returns List of calendar tokens for the user, ordered by creation date (newest first)
 */
export async function getCalendarTokensData(userId: string) {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq, desc } = await import("drizzle-orm");

  return drizzleDb.query.calendarTokens.findMany({
    where: eq(drizzleSchema.calendarTokens.userId, userId),
    orderBy: desc(drizzleSchema.calendarTokens.createdAt),
  });
}

/**
 * Create new calendar token for a user
 * @param userId - ID of the user creating the token
 * @param input - Token creation input (name and rotation policy)
 * @returns Created calendar token
 */
export async function createCalendarTokenData(
  userId: string,
  input: CreateCalendarTokenInput
) {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");

  const tokenId = crypto.randomUUID();
  const token = generateSecureToken();

  const [created] = await drizzleDb
    .insert(drizzleSchema.calendarTokens)
    .values({
      id: tokenId,
      userId,
      token,
      name: input.name,
      rotationPolicy: input.rotationPolicy || "annual",
      expiresAt: addYears(new Date(), 1),
      isActive: true,
    })
    .returning();

  logger.info(
    { userId, tokenId, tokenName: created.name },
    "Calendar token created"
  );

  return created;
}

/**
 * Verify token ownership - check if token belongs to user
 * @param tokenId - ID of the token to verify
 * @param userId - ID of the user claiming ownership
 * @returns The token if it exists and belongs to the user
 * @throws Error if token not found or doesn't belong to user
 */
export async function verifyTokenOwnership(
  tokenId: string,
  userId: string
) {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq, and } = await import("drizzle-orm");

  const existingToken = await drizzleDb.query.calendarTokens.findFirst({
    where: and(
      eq(drizzleSchema.calendarTokens.id, tokenId),
      eq(drizzleSchema.calendarTokens.userId, userId)
    ),
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
 * @returns The newly created token after rotation
 * @throws Error if token not found or doesn't belong to user
 */
export async function rotateCalendarTokenData(
  tokenId: string,
  userId: string
) {
  // Verify user owns this token
  await verifyTokenOwnership(tokenId, userId);

  const newToken = await rotateToken(tokenId);

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
 * @returns The revoked token
 * @throws Error if token not found or doesn't belong to user
 */
export async function revokeCalendarTokenData(
  tokenId: string,
  userId: string
) {
  // Verify user owns this token
  await verifyTokenOwnership(tokenId, userId);

  const revokedToken = await revokeToken(tokenId);

  logger.info({ userId, tokenId }, "Calendar token revoked");

  return revokedToken;
}

/**
 * Update calendar token name
 * @param tokenId - ID of the token to update
 * @param name - New name for the token
 * @param userId - ID of the user performing the update
 * @returns Updated token with name and timestamp
 * @throws Error if token not found or doesn't belong to user
 */
export async function updateTokenNameData(
  tokenId: string,
  name: string,
  userId: string
): Promise<UpdateTokenNameResult> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  // Verify user owns this token
  await verifyTokenOwnership(tokenId, userId);

  const [updatedToken] = await drizzleDb
    .update(drizzleSchema.calendarTokens)
    .set({ name })
    .where(eq(drizzleSchema.calendarTokens.id, tokenId))
    .returning({ id: drizzleSchema.calendarTokens.id, name: drizzleSchema.calendarTokens.name });

  logger.info(
    { userId, tokenId, newName: name },
    "Calendar token name updated"
  );

  return {
    id: updatedToken.id,
    name: updatedToken.name,
  };
}

/**
 * Delete a revoked calendar token (permanent deletion)
 * @param tokenId - ID of the token to delete
 * @param userId - ID of the user performing the deletion
 * @returns Success status with deleted token ID
 * @throws Error if token not found, doesn't belong to user, or is still active
 */
export async function deleteCalendarTokenData(
  tokenId: string,
  userId: string
): Promise<DeleteCalendarTokenResult> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  // Verify user owns this token
  const existingToken = await verifyTokenOwnership(tokenId, userId);

  // Only allow deletion of revoked (inactive) tokens
  if (existingToken.isActive) {
    throw new Error("Cannot delete an active token. Please revoke it first.");
  }

  // Permanently delete the token
  await drizzleDb
    .delete(drizzleSchema.calendarTokens)
    .where(eq(drizzleSchema.calendarTokens.id, tokenId));

  logger.info({ userId, tokenId }, "Calendar token permanently deleted");

  return { success: true, deletedId: tokenId };
}

/**
 * Get all calendar tokens across all users (Admin only)
 * @returns List of all calendar tokens with user information, ordered by creation date
 */
export async function getAllCalendarTokensData() {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { desc } = await import("drizzle-orm");

  return drizzleDb.query.calendarTokens.findMany({
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: desc(drizzleSchema.calendarTokens.createdAt),
  });
}
