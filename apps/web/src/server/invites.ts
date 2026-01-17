/**
 * Invites Server Functions - Framework Wrappers
 *
 * This module contains thin `createServerFn` wrappers that call the business logic
 * functions from invites.server.ts. These wrappers handle:
 * - Input validation with Zod schemas
 * - Calling the corresponding server function
 * - Authentication (delegated to server layer via requireAuth)
 * - Error handling
 *
 * This layer is excluded from unit test coverage as it's framework integration code.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./middleware/require-auth";
import {
  getInvitesData,
  createInviteData,
  acceptInviteData,
  revokeInviteData,
  deleteInviteData,
  getInviteByTokenData,
  resendInviteData,
} from "@vamsa/lib/server/business";

// Validation schemas
const inviteListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]).optional(),
});

const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
  personId: z.string().nullable().optional(),
});

const acceptInviteSchema = z.object({
  token: z.string(),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const inviteIdSchema = z.object({
  inviteId: z.string(),
});

const tokenSchema = z.object({
  token: z.string(),
});

/**
 * Get invites with pagination (admin only)
 *
 * Retrieves a paginated list of invites with optional status filtering.
 */
export const getInvites = createServerFn({ method: "GET" })
  .inputValidator((data: Partial<z.infer<typeof inviteListInputSchema>>) => {
    return inviteListInputSchema.parse(data);
  })
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const { page, limit, sortOrder, status } = data;

    return getInvitesData(page, limit, sortOrder, status);
  });

/**
 * Create invite (admin only)
 *
 * Generates a unique token and creates an invite record.
 * Email must not already have an active invite or user account.
 */
export const createInvite = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createInviteSchema>) => {
    return createInviteSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    return createInviteData(
      data.email,
      data.role,
      data.personId,
      currentUser.id
    );
  });

/**
 * Get invite by token (public)
 *
 * Fetches and validates invite by token.
 * No authentication required.
 */
export const getInviteByToken = createServerFn({ method: "GET" })
  .inputValidator((data: z.infer<typeof tokenSchema>) => {
    return tokenSchema.parse(data);
  })
  .handler(async ({ data }) => {
    return getInviteByTokenData(data.token);
  });

/**
 * Accept invite (public)
 *
 * Accepts an invite and creates a new user account.
 * No authentication required.
 */
export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof acceptInviteSchema>) => {
    return acceptInviteSchema.parse(data);
  })
  .handler(async ({ data }) => {
    return acceptInviteData(data.token, data.name, data.password);
  });

/**
 * Revoke invite (admin only)
 *
 * Changes a pending invite status to REVOKED, preventing further acceptance.
 */
export const revokeInvite = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof inviteIdSchema>) => {
    return inviteIdSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("ADMIN");

    return revokeInviteData(data.inviteId, user.id);
  });

/**
 * Delete invite (admin only)
 *
 * Permanently deletes a revoked invite record.
 */
export const deleteInvite = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof inviteIdSchema>) => {
    return inviteIdSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("ADMIN");

    return deleteInviteData(data.inviteId, user.id);
  });

/**
 * Resend invite (admin only)
 *
 * Generates a new token and extends expiration to 7 days from now.
 */
export const resendInvite = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof inviteIdSchema>) => {
    return inviteIdSchema.parse(data);
  })
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    return resendInviteData(data.inviteId);
  });
