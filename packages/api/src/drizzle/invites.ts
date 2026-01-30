/**
 * Drizzle Query Functions for Invites
 *
 * Database query functions for invite operations.
 * This serves as a reference for the actual implementations in
 * packages/lib/src/server/business/invites.ts
 */

import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { invites, persons, users } from "./schema";
import type { InferSelectModel } from "drizzle-orm";

// Type inference
type Invite = InferSelectModel<typeof invites>;
type User = InferSelectModel<typeof users>;
type Person = InferSelectModel<typeof persons>;

type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

interface ListInvitesOptions {
  page: number;
  limit: number;
  sortOrder?: "asc" | "desc";
  status?: InviteStatus;
}

interface InviteWithRelations extends Invite {
  person: Person | null;
  invitedBy: User | null;
}

/**
 * List invites with pagination and optional status filter
 *
 * @param options - Pagination and filter options
 * @returns Paginated list of invites with relations
 */
export async function listInvites(options: ListInvitesOptions): Promise<{
  items: Array<InviteWithRelations>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page, limit, sortOrder = "desc", status } = options;

  // Build where clause
  const whereConditions = status ? [eq(invites.status, status)] : [];

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(invites)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  const total = parseInt(countResult[0]?.count?.toString() || "0");

  // Get paginated results with relations
  const results = await db
    .select()
    .from(invites)
    .leftJoin(persons, eq(invites.personId, persons.id))
    .leftJoin(users, eq(invites.invitedById, users.id))
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(sortOrder === "desc" ? desc(invites.createdAt) : invites.createdAt)
    .limit(limit)
    .offset((page - 1) * limit);

  // Transform results to include relations
  const items: Array<InviteWithRelations> = results.map((row) => ({
    ...row.Invite,
    person: row.Person,
    invitedBy: row.User,
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Create a new invite with validation
 *
 * Validates:
 * - No active invite exists for the email
 * - No user account exists for the email
 * - Person exists if personId provided
 *
 * @param email - Email to invite
 * @param role - User role
 * @param personId - Optional person ID
 * @param invitedById - ID of user creating invite
 * @returns Created invite with token
 * @throws Error if validation fails
 */
export async function createInvite(
  email: string,
  role: "ADMIN" | "MEMBER" | "VIEWER",
  personId: string | null | undefined,
  invitedById: string
): Promise<Invite> {
  const normalizedEmail = email.toLowerCase();

  // Check for existing active invite
  const existingInvite = await db
    .select()
    .from(invites)
    .where(
      and(eq(invites.email, normalizedEmail), eq(invites.status, "PENDING"))
    )
    .limit(1);

  if (existingInvite.length > 0) {
    throw new Error("An active invite already exists for this email");
  }

  // Check for existing user
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("A user already exists with this email");
  }

  // Validate person if provided
  if (personId) {
    const person = await db
      .select()
      .from(persons)
      .where(eq(persons.id, personId))
      .limit(1);

    if (person.length === 0) {
      throw new Error("Person not found");
    }
  }

  // Generate token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create invite
  const result = await db
    .insert(invites)
    .values({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      role,
      personId: personId ?? null,
      invitedById,
      token,
      expiresAt,
      status: "PENDING",
      createdAt: new Date(),
    })
    .returning();

  return result[0];
}

/**
 * Get invite by token with validation
 *
 * Validates:
 * - Invite exists
 * - Status is PENDING
 * - Not expired
 *
 * @param token - Invite token
 * @returns Invite with relations or error
 */
export async function getInviteByToken(token: string): Promise<{
  valid: boolean;
  error: string | null;
  invite: InviteWithRelations | null;
}> {
  const result = await db
    .select()
    .from(invites)
    .leftJoin(persons, eq(invites.personId, persons.id))
    .leftJoin(users, eq(invites.invitedById, users.id))
    .where(eq(invites.token, token))
    .limit(1);

  if (result.length === 0) {
    return { valid: false, error: "Invite not found", invite: null };
  }

  const { Invite: invite, Person: person, User: user } = result[0];

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
        .update(invites)
        .set({ status: "EXPIRED" })
        .where(eq(invites.id, invite.id));
    }
    return { valid: false, error: "Invite has expired", invite: null };
  }

  return {
    valid: true,
    error: null,
    invite: {
      ...invite,
      person,
      invitedBy: user,
    },
  };
}

/**
 * Update invite status
 *
 * @param inviteId - ID of invite to update
 * @param status - New status
 * @returns Updated invite
 */
export async function updateInviteStatus(
  inviteId: string,
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
): Promise<Invite> {
  const result = await db
    .update(invites)
    .set({
      status,
      acceptedAt: status === "ACCEPTED" ? new Date() : null,
    })
    .where(eq(invites.id, inviteId))
    .returning();

  return result[0];
}

/**
 * Delete invite
 *
 * @param inviteId - ID of invite to delete
 */
export async function deleteInvite(inviteId: string): Promise<void> {
  await db.delete(invites).where(eq(invites.id, inviteId));
}

/**
 * Resend invite (generate new token)
 *
 * @param inviteId - ID of invite to resend
 * @returns Updated invite with new token
 */
export async function resendInvite(inviteId: string): Promise<Invite> {
  const newToken = randomBytes(32).toString("hex");
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await db
    .update(invites)
    .set({
      token: newToken,
      expiresAt: newExpiresAt,
      status: "PENDING",
    })
    .where(eq(invites.id, inviteId))
    .returning();

  return result[0];
}
