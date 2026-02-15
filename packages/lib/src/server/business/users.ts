/**
 * User Server Functions - Business Logic for User Management
 *
 * This module contains the business logic layer for all user operations.
 * Uses Drizzle ORM as the default database client.
 *
 * Exported Functions:
 * - getUsersData: Query users with pagination, filtering by role/status
 * - getUserData: Single user retrieval with relationships
 * - updateUserData: User update (role changes, status, person linking)
 * - deleteUserData: User deletion with audit trail
 * - searchAvailablePersonsData: Find persons available for user linking
 * - unlockUserAccountData: Reset lockout for failed login attempts
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { createPaginationMeta } from "@vamsa/schemas";
import { and, asc, count, desc, eq, isNull, like, ne, or } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";
import { escapeLike } from "../db";
import type { UserRole, UserUpdateInput } from "@vamsa/schemas";
import type { SQL } from "drizzle-orm";

const log = loggers.auth;

/**
 * Type for the database client used by user functions.
 * This module uses Drizzle ORM as the default database client.
 */
export type UsersDb = typeof drizzleDb;

/**
 * Options for querying users with pagination and filtering
 */
export interface UserListOptions {
  page: number;
  limit: number;
  sortOrder: "asc" | "desc";
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Result structure for user list queries
 */
export interface UserListResult {
  items: Array<{
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    isActive: boolean;
    personId: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    person: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  }>;
  pagination: ReturnType<typeof createPaginationMeta>;
}

/**
 * Query users with pagination, filtering, and sorting
 *
 * Supports filtering by:
 * - Search (email and name)
 * - Role (ADMIN, MEMBER, VIEWER)
 * - Active status
 *
 * Results are ordered by creation date.
 *
 * @param options - List options including page, limit, search, role, isActive
 * @param db - Drizzle database instance
 * @returns Paginated list of users with related person data
 * @throws Error if database query fails
 */
export async function getUsersData(
  options: UserListOptions,
  db: UsersDb = drizzleDb
): Promise<UserListResult> {
  const { page, limit, sortOrder, search, role, isActive } = options;

  // Build where conditions
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(drizzleSchema.users.email, `%${escapeLike(search)}%`),
        like(drizzleSchema.users.name, `%${escapeLike(search)}%`)
      )
    );
  }

  if (role) {
    conditions.push(eq(drizzleSchema.users.role, role));
  }

  if (isActive !== undefined) {
    conditions.push(eq(drizzleSchema.users.isActive, isActive));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count for pagination metadata
  const countResult = await db
    .select({ count: count() })
    .from(drizzleSchema.users)
    .where(where);

  const total = countResult[0]?.count ?? 0;

  // Get paginated results
  const users = await db.query.users.findMany({
    where,
    orderBy:
      sortOrder === "asc"
        ? asc(drizzleSchema.users.createdAt)
        : desc(drizzleSchema.users.createdAt),
    limit,
    offset: (page - 1) * limit,
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      personId: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return {
    items: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      person: null,
    })),
    pagination: createPaginationMeta(page, limit, total),
  };
}

/**
 * Single user detail with all relationships and audit information
 */
export interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  personId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Retrieve a single user by ID with all relationships
 *
 * @param userId - ID of the user to retrieve
 * @param db - Drizzle database instance
 * @returns User detail with person relationship
 * @throws Error if user not found
 */
export async function getUserData(
  userId: string,
  db: UsersDb = drizzleDb
): Promise<UserDetail> {
  const user = await db.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    personId: user.personId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    person: null,
  };
}

/**
 * Result of a user update operation
 */
export interface UserUpdateResult {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  personId: string | null;
}

/**
 * Update an existing user with audit trail
 *
 * Supports updating:
 * - Role (with self-demotion prevention)
 * - Active status (with self-deactivation prevention)
 * - Person linkage (with duplicate prevention)
 *
 * @param userId - ID of user to update
 * @param data - Partial user update data
 * @param currentUserId - ID of user performing the update (for audit and self-action checks)
 * @param db - Drizzle database instance
 * @returns Updated user data
 * @throws Error if user not found, duplicate person link, or self-modification violation
 */
export async function updateUserData(
  userId: string,
  data: UserUpdateInput,
  currentUserId: string,
  db: UsersDb = drizzleDb
): Promise<UserUpdateResult> {
  // Get existing user
  const existing = await db.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
  });

  if (!existing) {
    throw new Error("User not found");
  }

  // Prevent self-demotion
  if (data.role && userId === currentUserId && data.role !== "ADMIN") {
    throw new Error("Cannot demote yourself");
  }

  // Prevent self-deactivation
  if (data.isActive === false && userId === currentUserId) {
    throw new Error("Cannot deactivate yourself");
  }

  // If linking to a person, validate
  if (data.personId !== undefined) {
    if (data.personId) {
      const person = await db.query.persons.findFirst({
        where: eq(drizzleSchema.persons.id, data.personId),
      });

      if (!person) {
        throw new Error("Person not found");
      }

      // Check if person is already linked to another user
      const existingLink = await db.query.users.findFirst({
        where: and(
          eq(drizzleSchema.users.personId, data.personId),
          ne(drizzleSchema.users.id, userId)
        ),
      });

      if (existingLink) {
        throw new Error("This person is already linked to another user");
      }
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.personId !== undefined) updateData.personId = data.personId ?? null;

  const result = await db
    .update(drizzleSchema.users)
    .set(updateData)
    .where(eq(drizzleSchema.users.id, userId))
    .returning();

  const updated = result[0];

  log.info(
    {
      targetUserId: userId,
      changes: data,
      updatedBy: currentUserId,
    },
    "User updated"
  );

  return updated;
}

/**
 * Result of a user deletion
 */
export interface UserDeleteResult {
  success: boolean;
}

/**
 * Delete a user (hard delete) with audit trail
 *
 * @param userId - ID of user to delete
 * @param currentUserId - ID of user performing the deletion (for audit and self-delete prevention)
 * @param db - Drizzle database instance
 * @returns Success status
 * @throws Error if user not found or self-deletion attempted
 */
export async function deleteUserData(
  userId: string,
  currentUserId: string,
  db: UsersDb = drizzleDb
): Promise<UserDeleteResult> {
  // Prevent self-deletion
  if (userId === currentUserId) {
    throw new Error("Cannot delete yourself");
  }

  // Check user exists
  const user = await db.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Delete user
  await db
    .delete(drizzleSchema.users)
    .where(eq(drizzleSchema.users.id, userId));

  log.info({ deletedUserId: userId, deletedBy: currentUserId }, "User deleted");

  return { success: true };
}

/**
 * Person available for linking to a user
 */
export interface AvailablePerson {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
}

/**
 * Search for persons not linked to any user
 *
 * Returns persons available for user linking, with optional search filtering.
 * Limited to 20 results for performance.
 *
 * @param search - Optional search string (firstName, lastName)
 * @param db - Drizzle database instance
 * @returns List of available persons (max 20 results)
 */
export async function searchAvailablePersonsData(
  search?: string,
  db: UsersDb = drizzleDb
): Promise<Array<AvailablePerson>> {
  const conditions: Array<SQL<unknown> | undefined> = [
    isNull(drizzleSchema.persons.createdById),
  ];

  if (search) {
    conditions.push(
      or(
        like(drizzleSchema.persons.firstName, `%${escapeLike(search)}%`),
        like(drizzleSchema.persons.lastName, `%${escapeLike(search)}%`)
      )
    );
  }

  const whereClause =
    conditions.length > 1 ? and(...conditions) : conditions[0];

  const persons = await db.query.persons.findMany({
    where: whereClause,
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    },
    orderBy: [
      asc(drizzleSchema.persons.lastName),
      asc(drizzleSchema.persons.firstName),
    ],
    limit: 20,
  });

  return persons.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
  }));
}

/**
 * Result of unlocking a user account
 */
export interface UnlockAccountResult {
  success: boolean;
}

/**
 * Unlock a locked user account by resetting failed login counters
 *
 * Resets:
 * - failedLoginAttempts to 0
 * - lockedUntil to null
 * - lastFailedLoginAt to null
 *
 * @param userId - ID of user to unlock
 * @param currentUserId - ID of user performing the unlock (for audit)
 * @param db - Drizzle database instance
 * @returns Success status
 * @throws Error if user not found
 */
export async function unlockUserAccountData(
  userId: string,
  currentUserId: string,
  db: UsersDb = drizzleDb
): Promise<UnlockAccountResult> {
  // Check user exists
  const user = await db.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Reset lockout fields
  await db
    .update(drizzleSchema.users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    })
    .where(eq(drizzleSchema.users.id, userId));

  log.info(
    { unlockedUserId: userId, unlockedBy: currentUserId },
    "User account unlocked"
  );

  return { success: true };
}
