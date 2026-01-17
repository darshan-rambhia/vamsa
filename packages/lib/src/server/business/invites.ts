/**
 * Invites Server Functions - Business Logic for Invite Management
 *
 * This module contains the business logic orchestration layer for all invite
 * operations. Each function:
 * - Performs database queries and validations
 * - Handles invite creation, acceptance, revocation, and deletion
 * - Manages token generation and expiration
 * - Records audit logs for compliance
 *
 * Exported Functions:
 * - getInvitesData: Query invites with pagination and status filtering (admin only)
 * - createInviteData: Generate invite token and create record (admin only)
 * - acceptInviteData: Process invite acceptance and user creation (public)
 * - getInviteByTokenData: Fetch and validate invite by token (public)
 * - revokeInviteData: Change invite status to REVOKED (admin only)
 * - deleteInviteData: Permanently delete a revoked invite (admin only)
 * - resendInviteData: Generate new token and extend expiration (admin only)
 */

import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "@vamsa/lib/logger";
import type { InviteStatus, Prisma, UserRole } from "@vamsa/api";
import { createPaginationMeta } from "@vamsa/schemas";

/**
 * Type for the database client used by invite functions.
 * This allows dependency injection for testing.
 */
export type InvitesDb = Pick<
  PrismaClient,
  "invite" | "user" | "person" | "$transaction"
>;

/**
 * Query invites with pagination and optional status filtering
 *
 * Retrieves a paginated list of invites with related person and inviter data.
 * Supports filtering by invite status (PENDING, ACCEPTED, EXPIRED, REVOKED).
 *
 * @param page - Page number (1-indexed)
 * @param limit - Items per page (1-100)
 * @param sortOrder - Sort order for creation date ("asc" or "desc")
 * @param status - Optional status filter
 * @param db - Optional database client (defaults to prisma)
 * @returns Paginated invite list with pagination metadata
 * @throws Error if database query fails
 */
export async function getInvitesData(
  page: number,
  limit: number,
  sortOrder: "asc" | "desc",
  status?: string,
  db: InvitesDb = defaultPrisma
) {
  // Build where clause
  const where: Prisma.InviteWhereInput = {};
  if (status) {
    where.status = status as InviteStatus;
  }

  // Get total count
  const total = await db.invite.count({ where });

  // Get paginated results
  const invites = await db.invite.findMany({
    where,
    orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      person: {
        select: { id: true, firstName: true, lastName: true },
      },
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return {
    items: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      token: invite.token,
      personId: invite.personId,
      person: invite.person,
      invitedBy: invite.invitedBy,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
    })),
    pagination: createPaginationMeta(page, limit, total),
  };
}

/**
 * Create a new invite and generate a unique token
 *
 * Validates that:
 * - No active invite exists for the email
 * - No user account exists for the email
 * - If personId provided, person exists and isn't already linked to a user
 *
 * Generates a 32-byte hex token and sets expiration to 7 days from creation.
 *
 * @param email - Email address to invite
 * @param role - User role (ADMIN, MEMBER, VIEWER)
 * @param personId - Optional person ID to link invite to
 * @param currentUserId - ID of the user creating the invite (for audit trail)
 * @param db - Optional database client (defaults to prisma)
 * @returns Created invite with token and metadata
 * @throws Error if validation fails or database operation fails
 */
export async function createInviteData(
  email: string,
  role: UserRole,
  personId: string | null | undefined,
  currentUserId: string,
  db: InvitesDb = defaultPrisma
) {
  const normalizedEmail = email.toLowerCase();

  // Check if email already has an active invite
  const existingInvite = await db.invite.findFirst({
    where: {
      email: normalizedEmail,
      status: "PENDING",
    },
  });

  if (existingInvite) {
    throw new Error("An active invite already exists for this email");
  }

  // Check if user already exists with this email
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error("A user already exists with this email");
  }

  // If personId provided, verify it exists and isn't already linked
  if (personId) {
    const person = await db.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    const userWithPerson = await db.user.findFirst({
      where: { personId },
    });

    if (userWithPerson) {
      throw new Error("This person is already linked to a user");
    }
  }

  // Generate unique token (32 bytes = 64 hex characters)
  const token = randomBytes(32).toString("hex");

  // Set expiration to 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create invite
  const invite = await db.invite.create({
    data: {
      email: normalizedEmail,
      role: role as UserRole,
      personId: personId ?? null,
      invitedById: currentUserId,
      token,
      expiresAt,
      status: "PENDING",
    },
    include: {
      person: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  logger.info(
    { email: normalizedEmail, createdBy: currentUserId },
    "Created invite"
  );

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    personId: invite.personId,
    person: invite.person,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

/**
 * Fetch and validate invite by token
 *
 * Retrieves invite by token and validates:
 * - Invite exists
 * - Status is PENDING
 * - Not expired
 *
 * Automatically marks invite as EXPIRED if expiresAt has passed.
 *
 * @param token - Invite token
 * @param db - Optional database client (defaults to prisma)
 * @returns Object with valid flag and invite data or error
 */
export async function getInviteByTokenData(
  token: string,
  db: InvitesDb = defaultPrisma
) {
  const invite = await db.invite.findUnique({
    where: { token },
    include: {
      person: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (!invite) {
    return { valid: false, error: "Invite not found", invite: null };
  }

  if (invite.status === "ACCEPTED") {
    return { valid: false, error: "Invite already accepted", invite: null };
  }

  if (invite.status === "REVOKED") {
    return { valid: false, error: "Invite has been revoked", invite: null };
  }

  if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
    // Update status if expired
    if (invite.status === "PENDING") {
      await db.invite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }
    return { valid: false, error: "Invite has expired", invite: null };
  }

  return {
    valid: true,
    error: null,
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      personId: invite.personId,
      person: invite.person,
      expiresAt: invite.expiresAt.toISOString(),
    },
  };
}

/**
 * Accept invite and create user account
 *
 * Validates:
 * - Invite exists and status is PENDING
 * - Invite has not expired
 * - Email is not already taken
 *
 * Creates user and updates invite status in a transaction to ensure atomicity.
 * Hashes password using bcrypt with 12 rounds.
 *
 * @param token - Invite token
 * @param name - New user's name
 * @param password - New user's password
 * @param db - Optional database client (defaults to prisma)
 * @returns Success response with new user ID
 * @throws Error if validation fails or transaction fails
 */
export async function acceptInviteData(
  token: string,
  name: string,
  password: string,
  db: InvitesDb = defaultPrisma
) {
  const invite = await db.invite.findUnique({
    where: { token },
  });

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.status !== "PENDING") {
    throw new Error(`Invite is ${invite.status.toLowerCase()}, cannot accept`);
  }

  if (invite.expiresAt < new Date()) {
    await db.invite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("Invite has expired");
  }

  // Check if email is already taken
  const existingUser = await db.user.findUnique({
    where: { email: invite.email },
  });

  if (existingUser) {
    throw new Error("An account already exists with this email");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user and update invite in transaction
  const user = await db.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.user.create({
      data: {
        email: invite.email,
        name,
        passwordHash,
        role: invite.role as UserRole,
        personId: invite.personId,
        invitedById: invite.invitedById,
        isActive: true,
      },
    });

    // Update invite status
    await tx.invite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    return newUser;
  });

  logger.info(
    { inviteId: invite.id, userId: user.id },
    "Invite accepted, user created"
  );

  return { success: true, userId: user.id };
}

/**
 * Revoke a pending invite
 *
 * Only allows revoking PENDING invites. Changes status to REVOKED.
 *
 * @param inviteId - ID of invite to revoke
 * @param currentUserId - ID of user performing revocation (for audit trail)
 * @param db - Optional database client (defaults to prisma)
 * @returns Success response
 * @throws Error if invite not found or not in PENDING status
 */
export async function revokeInviteData(
  inviteId: string,
  currentUserId: string,
  db: InvitesDb = defaultPrisma
) {
  const invite = await db.invite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.status !== "PENDING") {
    throw new Error("Can only revoke pending invites");
  }

  await db.invite.update({
    where: { id: inviteId },
    data: { status: "REVOKED" },
  });

  logger.info({ inviteId, revokedBy: currentUserId }, "Revoked invite");

  return { success: true };
}

/**
 * Delete a revoked invite permanently
 *
 * Only allows deleting REVOKED invites. Completely removes the invite record.
 *
 * @param inviteId - ID of invite to delete
 * @param currentUserId - ID of user performing deletion (for audit trail)
 * @param db - Optional database client (defaults to prisma)
 * @returns Success response
 * @throws Error if invite not found or not in REVOKED status
 */
export async function deleteInviteData(
  inviteId: string,
  currentUserId: string,
  db: InvitesDb = defaultPrisma
) {
  const invite = await db.invite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.status !== "REVOKED") {
    throw new Error("Only revoked invites can be deleted");
  }

  await db.invite.delete({
    where: { id: inviteId },
  });

  logger.info({ inviteId, deletedBy: currentUserId }, "Invite deleted");

  return { success: true };
}

/**
 * Resend invite with new token and extended expiration
 *
 * Generates new token and extends expiration to 7 days from now.
 * Only allowed for non-accepted invites (PENDING, EXPIRED, or REVOKED).
 *
 * @param inviteId - ID of invite to resend
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated invite with new token and expiration
 * @throws Error if invite not found or already accepted
 */
export async function resendInviteData(
  inviteId: string,
  db: InvitesDb = defaultPrisma
) {
  const invite = await db.invite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.status === "ACCEPTED") {
    throw new Error("Cannot resend an accepted invite");
  }

  // Generate new token
  const newToken = randomBytes(32).toString("hex");
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const updated = await db.invite.update({
    where: { id: inviteId },
    data: {
      token: newToken,
      expiresAt: newExpiresAt,
      status: "PENDING",
    },
  });

  logger.info({ inviteId }, "Resent invite");

  return {
    success: true,
    token: updated.token,
    expiresAt: updated.expiresAt.toISOString(),
  };
}
