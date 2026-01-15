"use server";

import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { requireAuth } from "./middleware/require-auth";
import { logger } from "@vamsa/lib/logger";
import { addYears } from "date-fns";
import {
  generateSecureToken,
  rotateToken,
  revokeToken,
} from "../../server/auth/token-rotation";

/**
 * Get current user's calendar tokens
 */
export const getCalendarTokens = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await requireAuth("MEMBER");

    return prisma.calendarToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  }
);

/**
 * Create new calendar token
 */
export const createCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: { name?: string; rotationPolicy?: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    const token = await prisma.calendarToken.create({
      data: {
        userId: user.id,
        token: generateSecureToken(),
        name: data.name,
        rotationPolicy: data.rotationPolicy || "annual",
        expiresAt: addYears(new Date(), 1),
        isActive: true,
      },
    });

    logger.info(
      { userId: user.id, tokenId: token.id, tokenName: token.name },
      "Calendar token created"
    );

    return token;
  });

/**
 * Rotate a calendar token
 */
export const rotateCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: { tokenId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    // Verify user owns this token
    const existingToken = await prisma.calendarToken.findFirst({
      where: { id: data.tokenId, userId: user.id },
    });

    if (!existingToken) {
      throw new Error("Token not found");
    }

    const newToken = await rotateToken(data.tokenId);

    logger.info(
      { userId: user.id, oldTokenId: data.tokenId, newTokenId: newToken.id },
      "Calendar token rotated manually"
    );

    return newToken;
  });

/**
 * Revoke a calendar token
 */
export const revokeCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: { tokenId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    // Verify user owns this token
    const existingToken = await prisma.calendarToken.findFirst({
      where: { id: data.tokenId, userId: user.id },
    });

    if (!existingToken) {
      throw new Error("Token not found");
    }

    const revokedToken = await revokeToken(data.tokenId);

    logger.info(
      { userId: user.id, tokenId: data.tokenId },
      "Calendar token revoked"
    );

    return revokedToken;
  });

/**
 * Update calendar token name
 */
export const updateTokenName = createServerFn({ method: "POST" })
  .inputValidator((data: { tokenId: string; name: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    // Verify user owns this token
    const existingToken = await prisma.calendarToken.findFirst({
      where: { id: data.tokenId, userId: user.id },
    });

    if (!existingToken) {
      throw new Error("Token not found");
    }

    const updatedToken = await prisma.calendarToken.update({
      where: { id: data.tokenId },
      data: { name: data.name },
    });

    logger.info(
      { userId: user.id, tokenId: data.tokenId, newName: data.name },
      "Calendar token name updated"
    );

    return updatedToken;
  });

/**
 * Delete a revoked calendar token (permanent deletion)
 * Only revoked (inactive) tokens can be deleted
 */
export const deleteCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: { tokenId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    // Verify user owns this token
    const existingToken = await prisma.calendarToken.findFirst({
      where: { id: data.tokenId, userId: user.id },
    });

    if (!existingToken) {
      throw new Error("Token not found");
    }

    // Only allow deletion of revoked (inactive) tokens
    if (existingToken.isActive) {
      throw new Error(
        "Cannot delete an active token. Please revoke it first."
      );
    }

    // Permanently delete the token
    await prisma.calendarToken.delete({
      where: { id: data.tokenId },
    });

    logger.info(
      { userId: user.id, tokenId: data.tokenId },
      "Calendar token permanently deleted"
    );

    return { success: true, deletedId: data.tokenId };
  });

/**
 * Get all calendar tokens across all users (Admin only)
 */
export const getAllCalendarTokens = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAuth("ADMIN");

    return prisma.calendarToken.findMany({
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
);
