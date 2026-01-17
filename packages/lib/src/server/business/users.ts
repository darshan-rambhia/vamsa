/**
 * User Server Functions - Business Logic for User Management
 *
 * This module contains the business logic layer for all user operations.
 * Each function:
 * - Performs database queries with Prisma
 * - Handles data transformation and serialization
 * - Records audit logs for compliance
 * - Provides comprehensive error handling
 *
 * Exported Functions:
 * - getUsersData: Query users with pagination, filtering by role/status
 * - getUserData: Single user retrieval with relationships
 * - updateUserData: User update (role changes, status, person linking)
 * - deleteUserData: User deletion with audit trail
 * - searchAvailablePersonsData: Find persons available for user linking
 * - unlockUserAccountData: Reset lockout for failed login attempts
 */

import { prisma as defaultPrisma } from "../db";
import type { Prisma, PrismaClient } from "@vamsa/api";
import { logger } from "@vamsa/lib/logger";
import { createPaginationMeta } from "@vamsa/schemas";
import type { UserUpdateInput, UserRole } from "@vamsa/schemas";

/**
 * Type for the database client used by user functions.
 * This allows dependency injection for testing.
 */
export type UsersDb = Pick<PrismaClient, "user" | "person">;

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
 * @param db - Optional database client (defaults to prisma)
 * @returns Paginated list of users with related person data
 * @throws Error if database query fails
 */
export async function getUsersData(
  options: UserListOptions,
  db: UsersDb = defaultPrisma
): Promise<UserListResult> {
  const { page, limit, sortOrder, search, role, isActive } = options;

  // Build where clause for filtering
  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // Get total count for pagination metadata
  const total = await db.user.count({ where });

  // Get paginated results
  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      personId: true,
      createdAt: true,
      lastLoginAt: true,
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return {
    items: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
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
 * @param db - Optional database client (defaults to prisma)
 * @returns User detail with person relationship
 * @throws Error if user not found
 */
export async function getUserData(
  userId: string,
  db: UsersDb = defaultPrisma
): Promise<UserDetail> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      personId: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
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
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated user data
 * @throws Error if user not found, duplicate person link, or self-modification violation
 */
export async function updateUserData(
  userId: string,
  data: UserUpdateInput,
  currentUserId: string,
  db: UsersDb = defaultPrisma
): Promise<UserUpdateResult> {
  // Get existing user
  const existing = await db.user.findUnique({
    where: { id: userId },
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

  // If linking to a person, validate the person exists and isn't already linked
  if (data.personId !== undefined) {
    if (data.personId) {
      const person = await db.person.findUnique({
        where: { id: data.personId },
      });

      if (!person) {
        throw new Error("Person not found");
      }

      // Check if person is already linked to another user
      const existingLink = await db.user.findFirst({
        where: {
          personId: data.personId,
          id: { not: userId },
        },
      });

      if (existingLink) {
        throw new Error("This person is already linked to another user");
      }
    }
  }

  // Build update data with only changed fields
  const updateData: Prisma.UserUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.personId !== undefined) {
    updateData.person = data.personId
      ? { connect: { id: data.personId } }
      : { disconnect: true };
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      personId: true,
    },
  });

  // Log audit trail
  logger.info(
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
 * @param db - Optional database client (defaults to prisma)
 * @returns Success status
 * @throws Error if user not found or self-deletion attempted
 */
export async function deleteUserData(
  userId: string,
  currentUserId: string,
  db: UsersDb = defaultPrisma
): Promise<UserDeleteResult> {
  // Prevent self-deletion
  if (userId === currentUserId) {
    throw new Error("Cannot delete yourself");
  }

  // Check user exists
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Delete user (cascade behavior handled by Prisma schema)
  await db.user.delete({
    where: { id: userId },
  });

  logger.info(
    { deletedUserId: userId, deletedBy: currentUserId },
    "User deleted"
  );

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
 * @param db - Optional database client (defaults to prisma)
 * @returns List of available persons (max 20 results)
 */
export async function searchAvailablePersonsData(
  search?: string,
  db: UsersDb = defaultPrisma
): Promise<AvailablePerson[]> {
  const persons = await db.person.findMany({
    where: {
      user: null, // Not linked to any user
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 20,
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
 * @param db - Optional database client (defaults to prisma)
 * @returns Success status
 * @throws Error if user not found
 */
export async function unlockUserAccountData(
  userId: string,
  currentUserId: string,
  db: UsersDb = defaultPrisma
): Promise<UnlockAccountResult> {
  // Check user exists
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Reset lockout fields
  await db.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    },
  });

  logger.info(
    { unlockedUserId: userId, unlockedBy: currentUserId },
    "User account unlocked"
  );

  return { success: true };
}
