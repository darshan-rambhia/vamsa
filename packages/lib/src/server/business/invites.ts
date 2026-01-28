/**
 * Invites Server Functions - Business Logic for Invite Management
 *
 * This module contains the business logic orchestration layer for all invite
 * operations. Uses Drizzle ORM as the default database client.
 *
 * Each function:
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

import { randomBytes } from "crypto";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.auth;
import { createPaginationMeta } from "@vamsa/schemas";

// Drizzle imports
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq, and, desc, asc, sql, SQLWrapper } from "drizzle-orm";

/**
 * Local type definitions to match Drizzle enum values
 * These types are extracted from the Drizzle schema
 */
export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
export type UserRole = "ADMIN" | "MEMBER" | "VIEWER";

/**
 * Type for the database client used by invite functions.
 * This module uses Drizzle ORM as the default database client.
 */
export type InvitesDb = typeof drizzleDb;

/**
 * Type guard to validate if a string is a valid InviteStatus
 */
function isValidInviteStatus(status: string): status is InviteStatus {
  return ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"].includes(status);
}

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
 * @param db - Drizzle database instance
 * @returns Paginated invite list with pagination metadata
 * @throws Error if database query fails
 */
export async function getInvitesData(
  page: number,
  limit: number,
  sortOrder: "asc" | "desc",
  status?: string,
  db: InvitesDb = drizzleDb
) {
  // Build where conditions
  const whereConditions: (SQLWrapper | undefined)[] = [];
  if (status && isValidInviteStatus(status)) {
    whereConditions.push(eq(drizzleSchema.invites.status, status));
  }

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(drizzleSchema.invites)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  const total = parseInt(countResult[0]?.count?.toString() || "0");

  // Get paginated results with relations
  const results = await db
    .select()
    .from(drizzleSchema.invites)
    .leftJoin(
      drizzleSchema.persons,
      eq(drizzleSchema.invites.personId, drizzleSchema.persons.id)
    )
    .leftJoin(
      drizzleSchema.users,
      eq(drizzleSchema.invites.invitedById, drizzleSchema.users.id)
    )
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(
      sortOrder === "asc"
        ? asc(drizzleSchema.invites.createdAt)
        : desc(drizzleSchema.invites.createdAt)
    )
    .limit(limit)
    .offset((page - 1) * limit);

  // Transform results to match the expected format
  const items = results.map((row) => {
    const invite = row.Invite;
    const person = row.Person
      ? {
          id: row.Person.id,
          firstName: row.Person.firstName,
          lastName: row.Person.lastName,
        }
      : null;
    const invitedBy = row.User
      ? {
          id: row.User.id,
          name: row.User.name,
          email: row.User.email,
        }
      : null;

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      token: invite.token,
      personId: invite.personId,
      person,
      invitedBy,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
    };
  });

  return {
    items,
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
 * @param db - Drizzle database instance
 * @returns Created invite with token and metadata
 * @throws Error if validation fails or database operation fails
 */
export async function createInviteData(
  email: string,
  role: UserRole,
  personId: string | null | undefined,
  currentUserId: string,
  db: InvitesDb = drizzleDb
) {
  const normalizedEmail = email.toLowerCase();

  // Check if email already has an active invite
  const existingInvite = await db
    .select()
    .from(drizzleSchema.invites)
    .where(
      and(
        eq(drizzleSchema.invites.email, normalizedEmail),
        eq(drizzleSchema.invites.status, "PENDING")
      )
    )
    .limit(1);

  if (existingInvite.length > 0) {
    throw new Error("An active invite already exists for this email");
  }

  // Check if user already exists with this email
  const existingUser = await db
    .select()
    .from(drizzleSchema.users)
    .where(eq(drizzleSchema.users.email, normalizedEmail))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("A user already exists with this email");
  }

  // If personId provided, verify it exists and isn't already linked
  if (personId) {
    const person = await db
      .select()
      .from(drizzleSchema.persons)
      .where(eq(drizzleSchema.persons.id, personId))
      .limit(1);

    if (person.length === 0) {
      throw new Error("Person not found");
    }

    const userWithPerson = await db
      .select()
      .from(drizzleSchema.users)
      .where(eq(drizzleSchema.users.personId, personId))
      .limit(1);

    if (userWithPerson.length > 0) {
      throw new Error("This person is already linked to a user");
    }
  }

  // Generate unique token (32 bytes = 64 hex characters)
  const token = randomBytes(32).toString("hex");

  // Set expiration to 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create invite
  const inviteResult = await db
    .insert(drizzleSchema.invites)
    .values({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      role,
      personId: personId ?? null,
      invitedById: currentUserId,
      token,
      expiresAt,
      status: "PENDING",
      createdAt: new Date(),
    })
    .returning();

  const invite = inviteResult[0];

  // Get person details if personId was provided
  let personDetails = null;
  if (personId) {
    const personResult = await db
      .select({
        id: drizzleSchema.persons.id,
        firstName: drizzleSchema.persons.firstName,
        lastName: drizzleSchema.persons.lastName,
      })
      .from(drizzleSchema.persons)
      .where(eq(drizzleSchema.persons.id, personId))
      .limit(1);

    if (personResult.length > 0) {
      personDetails = personResult[0];
    }
  }

  log.info(
    { email: normalizedEmail, createdBy: currentUserId },
    "Created invite"
  );

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    personId: invite.personId,
    person: personDetails,
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
 * @param db - Drizzle database instance
 * @returns Object with valid flag and invite data or error
 */
export async function getInviteByTokenData(
  token: string,
  db: InvitesDb = drizzleDb
) {
  const result = await db
    .select()
    .from(drizzleSchema.invites)
    .leftJoin(
      drizzleSchema.persons,
      eq(drizzleSchema.invites.personId, drizzleSchema.persons.id)
    )
    .where(eq(drizzleSchema.invites.token, token))
    .limit(1);

  if (result.length === 0) {
    return { valid: false, error: "Invite not found", invite: null };
  }

  const { Invite: invite, Person: person } = result[0];

  if (invite.status === "ACCEPTED") {
    return { valid: false, error: "Invite already accepted", invite: null };
  }

  if (invite.status === "REVOKED") {
    return { valid: false, error: "Invite has been revoked", invite: null };
  }

  if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
    // Update status if expired
    if (invite.status === "PENDING") {
      await db
        .update(drizzleSchema.invites)
        .set({ status: "EXPIRED" })
        .where(eq(drizzleSchema.invites.id, invite.id));
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
      person: person
        ? {
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
          }
        : null,
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
 * Hashes password using Bun.password (argon2id algorithm).
 *
 * @param token - Invite token
 * @param name - New user's name
 * @param password - New user's password
 * @param db - Drizzle database instance
 * @returns Success response with new user ID
 * @throws Error if validation fails or transaction fails
 */
export async function acceptInviteData(
  token: string,
  name: string,
  password: string,
  db: InvitesDb = drizzleDb
) {
  const inviteResult = await db
    .select()
    .from(drizzleSchema.invites)
    .where(eq(drizzleSchema.invites.token, token))
    .limit(1);

  if (inviteResult.length === 0) {
    throw new Error("Invite not found");
  }

  const invite = inviteResult[0];

  if (invite.status !== "PENDING") {
    throw new Error(`Invite is ${invite.status.toLowerCase()}, cannot accept`);
  }

  if (invite.expiresAt < new Date()) {
    await db
      .update(drizzleSchema.invites)
      .set({ status: "EXPIRED" })
      .where(eq(drizzleSchema.invites.id, invite.id));
    throw new Error("Invite has expired");
  }

  // Check if email is already taken
  const existingUser = await db
    .select()
    .from(drizzleSchema.users)
    .where(eq(drizzleSchema.users.email, invite.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("An account already exists with this email");
  }

  // Hash password using Bun's native password hashing (argon2id by default)
  const passwordHash = await Bun.password.hash(password);

  // Create user and update invite in transaction for atomicity
  const newUser = await db.transaction(async (tx) => {
    // Create user
    const now = new Date();
    const userResult = await tx
      .insert(drizzleSchema.users)
      .values({
        id: crypto.randomUUID(),
        email: invite.email,
        name,
        passwordHash,
        role: invite.role,
        personId: invite.personId,
        invitedById: invite.invitedById,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const createdUser = userResult[0];

    // Update invite status
    await tx
      .update(drizzleSchema.invites)
      .set({
        status: "ACCEPTED",
        acceptedAt: new Date(),
      })
      .where(eq(drizzleSchema.invites.id, invite.id));

    return createdUser;
  });

  log.info(
    { inviteId: invite.id, userId: newUser.id },
    "Invite accepted, user created"
  );

  return { success: true, userId: newUser.id };
}

/**
 * Revoke a pending invite
 *
 * Only allows revoking PENDING invites. Changes status to REVOKED.
 *
 * @param inviteId - ID of invite to revoke
 * @param currentUserId - ID of user performing revocation (for audit trail)
 * @param db - Drizzle database instance
 * @returns Success response
 * @throws Error if invite not found or not in PENDING status
 */
export async function revokeInviteData(
  inviteId: string,
  currentUserId: string,
  db: InvitesDb = drizzleDb
) {
  const inviteResult = await db
    .select()
    .from(drizzleSchema.invites)
    .where(eq(drizzleSchema.invites.id, inviteId))
    .limit(1);

  if (inviteResult.length === 0) {
    throw new Error("Invite not found");
  }

  const invite = inviteResult[0];

  if (invite.status !== "PENDING") {
    throw new Error("Can only revoke pending invites");
  }

  await db
    .update(drizzleSchema.invites)
    .set({ status: "REVOKED" })
    .where(eq(drizzleSchema.invites.id, inviteId));

  log.info({ inviteId, revokedBy: currentUserId }, "Revoked invite");

  return { success: true };
}

/**
 * Delete a revoked invite permanently
 *
 * Only allows deleting REVOKED invites. Completely removes the invite record.
 *
 * @param inviteId - ID of invite to delete
 * @param currentUserId - ID of user performing deletion (for audit trail)
 * @param db - Drizzle database instance
 * @returns Success response
 * @throws Error if invite not found or not in REVOKED status
 */
export async function deleteInviteData(
  inviteId: string,
  currentUserId: string,
  db: InvitesDb = drizzleDb
) {
  const inviteResult = await db
    .select()
    .from(drizzleSchema.invites)
    .where(eq(drizzleSchema.invites.id, inviteId))
    .limit(1);

  if (inviteResult.length === 0) {
    throw new Error("Invite not found");
  }

  const invite = inviteResult[0];

  if (invite.status !== "REVOKED") {
    throw new Error("Only revoked invites can be deleted");
  }

  await db
    .delete(drizzleSchema.invites)
    .where(eq(drizzleSchema.invites.id, inviteId));

  log.info({ inviteId, deletedBy: currentUserId }, "Invite deleted");

  return { success: true };
}

/**
 * Resend invite with new token and extended expiration
 *
 * Generates new token and extends expiration to 7 days from now.
 * Only allowed for non-accepted invites (PENDING, EXPIRED, or REVOKED).
 *
 * @param inviteId - ID of invite to resend
 * @param db - Drizzle database instance
 * @returns Updated invite with new token and expiration
 * @throws Error if invite not found or already accepted
 */
export async function resendInviteData(
  inviteId: string,
  db: InvitesDb = drizzleDb
) {
  const inviteResult = await db
    .select()
    .from(drizzleSchema.invites)
    .where(eq(drizzleSchema.invites.id, inviteId))
    .limit(1);

  if (inviteResult.length === 0) {
    throw new Error("Invite not found");
  }

  const invite = inviteResult[0];

  if (invite.status === "ACCEPTED") {
    throw new Error("Cannot resend an accepted invite");
  }

  // Generate new token
  const newToken = randomBytes(32).toString("hex");
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const updated = await db
    .update(drizzleSchema.invites)
    .set({
      token: newToken,
      expiresAt: newExpiresAt,
      status: "PENDING",
    })
    .where(eq(drizzleSchema.invites.id, inviteId))
    .returning();

  log.info({ inviteId }, "Resent invite");

  return {
    success: true,
    token: updated[0].token,
    expiresAt: updated[0].expiresAt.toISOString(),
  };
}
