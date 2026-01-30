/**
 * User Server Functions - Framework Wrappers
 *
 * This module contains thin `createServerFn` wrappers that call the business logic
 * functions from users.server.ts. These wrappers handle:
 * - Input validation with Zod schemas
 * - Authentication via requireAuth (ADMIN role required)
 * - Error handling
 *
 * Exported Server Functions:
 * - getUsers: List users with pagination and filtering
 * - getUser: Retrieve single user by ID
 * - updateUser: Update user (role, status, person link)
 * - deleteUser: Delete a user
 * - searchAvailablePersons: Find persons available for user linking
 * - unlockAccount: Unlock a locked user account
 *
 * This layer is excluded from unit test coverage as it's framework integration code.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { userUpdateSchema } from "@vamsa/schemas";
import { drizzleDb, drizzleSchema } from "@vamsa/lib/server";
import { eq } from "drizzle-orm";
import {
  deleteUserData,
  getUserData,
  getUsersData,
  searchAvailablePersonsData,
  unlockUserAccountData,
  updateUserData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type {
  AvailablePerson,
  UnlockAccountResult,
  UserDeleteResult,
  UserDetail,
  UserListOptions,
  UserListResult,
  UserUpdateResult,
} from "@vamsa/lib/server/business";
import type { UserUpdateInput } from "@vamsa/schemas";

/**
 * User list input schema with pagination, search, and filters
 */
const userListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
});

type UserListInput = z.infer<typeof userListInputSchema>;

/**
 * Server function: List users with pagination and filtering
 *
 * Supports filtering by:
 * - Search (email and name)
 * - Role (ADMIN, MEMBER, VIEWER)
 * - Active status
 *
 * @param data - List options (page, limit, search, role, isActive)
 * @returns Paginated list of users
 * @requires ADMIN role
 */
export const getUsers = createServerFn({ method: "GET" })
  .inputValidator((data: Partial<UserListInput>) => {
    return userListInputSchema.parse(data);
  })
  .handler(async ({ data }): Promise<UserListResult> => {
    await requireAuth("ADMIN");

    const options: UserListOptions = {
      page: data.page,
      limit: data.limit,
      sortOrder: data.sortOrder,
      search: data.search,
      role: data.role,
      isActive: data.isActive,
    };

    return getUsersData(options);
  });

/**
 * Server function: Get a single user by ID with relationships
 *
 * @param data - Object with user ID
 * @returns User detail with person relationship
 * @requires ADMIN role
 * @throws Error if user not found
 */
export const getUser = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<UserDetail> => {
    await requireAuth("ADMIN");
    return getUserData(data.id);
  });

/**
 * Server function: Update an existing user
 *
 * Supports updating:
 * - Name and email
 * - Role (with self-demotion prevention)
 * - Active status (with self-deactivation prevention)
 * - Person linkage (with duplicate prevention)
 *
 * @param data - Partial user update data with ID
 * @returns Updated user data
 * @requires ADMIN role
 * @throws Error if validation fails, user not found, or permission violation
 */
export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return z
      .intersection(userUpdateSchema, z.object({ id: z.string() }))
      .parse(data);
  })
  .handler(async ({ data }): Promise<UserUpdateResult> => {
    const user = await requireAuth("ADMIN");
    const { id, ...updates } = data as { id: string } & UserUpdateInput;

    return updateUserData(id, updates as UserUpdateInput, user.id);
  });

/**
 * Server function: Delete a user
 *
 * @param data - Object with user ID to delete
 * @returns Success status
 * @requires ADMIN role
 * @throws Error if user not found or self-deletion attempted
 */
export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<UserDeleteResult> => {
    const user = await requireAuth("ADMIN");
    return deleteUserData(data.id, user.id);
  });

/**
 * Server function: Search for persons available for user linking
 *
 * Returns persons not linked to any user, with optional search filtering.
 *
 * @param data - Object with optional search string
 * @returns List of available persons (max 20 results)
 * @requires ADMIN role
 */
export const searchAvailablePersons = createServerFn({ method: "GET" })
  .inputValidator((data: { search?: string }) => data)
  .handler(async ({ data }): Promise<Array<AvailablePerson>> => {
    await requireAuth("ADMIN");
    return searchAvailablePersonsData(data.search);
  });

/**
 * Server function: Unlock a locked user account
 *
 * Resets failed login attempts and lockout timestamp, allowing the user to log in again.
 *
 * @param data - Object with user ID to unlock
 * @returns Success status
 * @requires ADMIN role
 * @throws Error if user not found
 */
export const unlockAccount = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<UnlockAccountResult> => {
    const user = await requireAuth("ADMIN");
    return unlockUserAccountData(data.id, user.id);
  });

/**
 * Schema for updating user role
 */
const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

/**
 * Server function: Update user role
 *
 * Changes the role of a user with self-demotion prevention.
 *
 * @param data - Object with userId and new role
 * @returns Updated user ID and role
 * @requires ADMIN role
 * @throws Error if user not found or self-demotion attempted
 */
export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateUserRoleInput) =>
    updateUserRoleSchema.parse(data)
  )
  .handler(async ({ data }): Promise<{ id: string; role: string }> => {
    const user = await requireAuth("ADMIN");
    const result = await updateUserData(
      data.userId,
      { role: data.role },
      user.id
    );
    return { id: result.id, role: result.role };
  });

/**
 * Server function: Toggle user active status
 *
 * Activates or deactivates a user with self-deactivation prevention.
 *
 * @param data - Object with userId and isActive flag
 * @returns Updated user ID and active status
 * @requires ADMIN role
 * @throws Error if user not found or self-deactivation attempted
 */
export const toggleUserActive = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; isActive: boolean }) => data)
  .handler(async ({ data }): Promise<{ id: string; isActive: boolean }> => {
    const user = await requireAuth("ADMIN");
    const result = await updateUserData(
      data.userId,
      { isActive: data.isActive },
      user.id
    );
    return { id: result.id, isActive: result.isActive };
  });

/**
 * Server function: Link user to person
 *
 * Associates a user account with a person record.
 * Prevents duplicate person links.
 *
 * @param data - Object with userId and personId
 * @returns Updated user with person relationship
 * @requires ADMIN role
 * @throws Error if user/person not found or person already linked
 */
export const linkUserToPerson = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; personId: string | null }) => data)
  .handler(
    async ({
      data,
    }): Promise<{
      id: string;
      personId: string | null;
      person: { id: string; firstName: string; lastName: string } | null;
    }> => {
      const user = await requireAuth("ADMIN");
      const result = await updateUserData(
        data.userId,
        { personId: data.personId },
        user.id
      );

      // Fetch person data if personId exists
      if (result.personId) {
        const [person] = await drizzleDb
          .select({
            id: drizzleSchema.persons.id,
            firstName: drizzleSchema.persons.firstName,
            lastName: drizzleSchema.persons.lastName,
          })
          .from(drizzleSchema.persons)
          .where(eq(drizzleSchema.persons.id, result.personId))
          .limit(1);
        return {
          id: result.id,
          personId: result.personId,
          person: person || null,
        };
      }

      return {
        id: result.id,
        personId: null,
        person: null,
      };
    }
  );

// Alias exports for backward compatibility
export { searchAvailablePersons as getAvailablePersons };
