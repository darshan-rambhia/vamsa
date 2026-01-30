/**
 * Calendar Server Functions - Framework Wrappers
 *
 * This module contains thin `createServerFn` wrappers that call the business logic
 * functions from calendar.server.ts. These wrappers handle:
 * - Input validation with Zod schemas
 * - Authentication checks via requireAuth
 * - Calling the corresponding server function
 * - Error handling
 *
 * This layer is excluded from unit test coverage as it's framework integration code.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loggers } from "@vamsa/lib/logger";
import {
  deleteCalendarTokenLogic,
  generateCalendarTokenLogic,
  listCalendarTokensLogic,
  revokeCalendarTokenLogic,
  validateCalendarTokenLogic,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";

const log = loggers.db;

// Validation schemas
const generateTokenSchema = z.object({
  name: z.string().optional(),
  expiryDays: z.number().int().positive().default(365),
});

const validateTokenSchema = z.object({
  token: z.string().min(1),
});

const revokeTokenSchema = z.object({
  token: z.string().min(1), // This is the token ID, not the token value
});

/**
 * Generate a calendar token for authenticated calendar access
 */
export const generateCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => generateTokenSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const user = await requireAuth();

      return await generateCalendarTokenLogic(
        user.id,
        data.name,
        data.expiryDays
      );
    } catch (error) {
      log.withErr(error).msg("Failed to generate calendar token");
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
      return await validateCalendarTokenLogic(data.token);
    } catch (error) {
      log.withErr(error).msg("Failed to validate calendar token");
      return { valid: false, user: null };
    }
  });

/**
 * Revoke a calendar token by ID
 */
export const revokeCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => revokeTokenSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const user = await requireAuth();

      return await revokeCalendarTokenLogic(data.token, user.id);
    } catch (error) {
      log.withErr(error).msg("Failed to revoke calendar token");
      throw error;
    }
  });

/**
 * List all calendar tokens for the current user
 */
export const listCalendarTokens = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const user = await requireAuth();

      return await listCalendarTokensLogic(user.id);
    } catch (error) {
      log.withErr(error).msg("Failed to list calendar tokens");
      throw error;
    }
  }
);

/**
 * Delete a calendar token permanently (only allowed for revoked tokens)
 */
export const deleteCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => revokeTokenSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const user = await requireAuth();

      return await deleteCalendarTokenLogic(data.token, user.id);
    } catch (error) {
      log.withErr(error).msg("Failed to delete calendar token");
      throw error;
    }
  });
