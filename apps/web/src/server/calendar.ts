import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { randomBytes } from "crypto";
import { z } from "zod";
import { logger } from "@vamsa/lib/logger";
import { getCurrentUser } from "./auth";

// Validation schemas
const generateTokenSchema = z.object({
  type: z.enum(["birthdays", "anniversaries", "events", "all"]).default("all"),
  expiryDays: z.number().int().positive().default(365),
});

const validateTokenSchema = z.object({
  token: z.string().min(1),
});

/**
 * Generate a calendar token for authenticated calendar access
 */
export const generateCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => generateTokenSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Unauthorized");
      }

      // Generate a cryptographically secure token
      const tokenBytes = randomBytes(32);
      const token = tokenBytes.toString("hex");

      // Calculate expiration date
      const expiresAt = new Date(
        Date.now() + data.expiryDays * 24 * 60 * 60 * 1000
      );

      // Create the calendar token
      const calendarToken = await prisma.calendarToken.create({
        data: {
          token,
          userId: user.id,
          type: data.type,
          expiresAt,
          isActive: true,
        },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entityType: "CalendarToken",
          entityId: calendarToken.id,
          newData: {
            type: calendarToken.type,
            expiresAt: calendarToken.expiresAt,
          },
        },
      });

      logger.info(`Calendar token generated for user ${user.id}`);

      return {
        success: true,
        token: calendarToken.token,
        type: calendarToken.type,
        expiresAt: calendarToken.expiresAt.toISOString(),
      };
    } catch (error) {
      logger.error({ error }, "Failed to generate calendar token");
      throw error;
    }
  });

/**
 * Validate a calendar token
 */
export const validateCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validateTokenSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const calendarToken = await prisma.calendarToken.findUnique({
        where: { token: data.token },
        include: { user: true },
      });

      // Check if token exists, is active, and not expired
      if (
        !calendarToken ||
        !calendarToken.isActive ||
        calendarToken.expiresAt < new Date()
      ) {
        return { valid: false, user: null, type: null };
      }

      return {
        valid: true,
        user: {
          id: calendarToken.user.id,
          email: calendarToken.user.email,
        },
        type: calendarToken.type,
      };
    } catch (error) {
      logger.error({ error }, "Failed to validate calendar token");
      return { valid: false, user: null, type: null };
    }
  });

/**
 * Revoke a calendar token
 */
export const revokeCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validateTokenSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Unauthorized");
      }

      // Find the token and verify it belongs to the current user
      const calendarToken = await prisma.calendarToken.findUnique({
        where: { token: data.token },
      });

      if (!calendarToken || calendarToken.userId !== user.id) {
        throw new Error("Token not found or unauthorized");
      }

      // Revoke the token by marking it as inactive
      await prisma.calendarToken.update({
        where: { id: calendarToken.id },
        data: { isActive: false },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          entityType: "CalendarToken",
          entityId: calendarToken.id,
        },
      });

      logger.info(`Calendar token revoked for user ${user.id}`);

      return { success: true };
    } catch (error) {
      logger.error({ error }, "Failed to revoke calendar token");
      throw error;
    }
  });

/**
 * List all calendar tokens for the current user
 */
export const listCalendarTokens = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Unauthorized");
      }

      const tokens = await prisma.calendarToken.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          type: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return tokens;
    } catch (error) {
      logger.error({ error }, "Failed to list calendar tokens");
      throw error;
    }
  }
);
