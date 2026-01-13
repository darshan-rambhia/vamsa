import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";
import { logger } from "@vamsa/lib/logger";
import { requireAuth } from "./middleware/require-auth";
import type { Prisma } from "@vamsa/api";
import { createPaginationMeta } from "@vamsa/schemas";

// User list input schema (extends pagination with search, role, and isActive filters)
const userListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
});
type UserListInput = z.infer<typeof userListInputSchema>;

// Get users with pagination
export const getUsers = createServerFn({ method: "GET" })
  .inputValidator((data: Partial<UserListInput>) => {
    return userListInputSchema.parse(data);
  })
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const { page, limit, sortOrder, search, role, isActive } = data;

    // Build where clause
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

    // Get total count
    const total = await prisma.user.count({ where });

    // Get paginated results
    const users = await prisma.user.findMany({
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
          select: { id: true, firstName: true, lastName: true },
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
  });

// Update user role schema
const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

// Update user role
export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updateUserRoleSchema>) => {
    return updateUserRoleSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    // Prevent self-demotion (admin can't demote themselves)
    if (data.userId === currentUser.id && data.role !== "ADMIN") {
      throw new Error("Cannot demote yourself");
    }

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: { role: data.role },
    });

    logger.info(
      {
        targetUserId: data.userId,
        newRole: data.role,
        updatedBy: currentUser.id,
      },
      "Updated user role"
    );

    return { id: updated.id, role: updated.role };
  });

// Toggle user active schema
const toggleUserActiveSchema = z.object({
  userId: z.string(),
  isActive: z.boolean(),
});

// Toggle user active status
export const toggleUserActive = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof toggleUserActiveSchema>) => {
    return toggleUserActiveSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    // Prevent self-deactivation
    if (data.userId === currentUser.id && !data.isActive) {
      throw new Error("Cannot deactivate yourself");
    }

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: { isActive: data.isActive },
    });

    logger.info(
      {
        targetUserId: data.userId,
        isActive: data.isActive,
        updatedBy: currentUser.id,
      },
      "Updated user active status"
    );

    return { id: updated.id, isActive: updated.isActive };
  });

// Link user to person schema
const linkUserToPersonSchema = z.object({
  userId: z.string(),
  personId: z.string().nullable(),
});

// Link user to person
export const linkUserToPerson = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof linkUserToPersonSchema>) => {
    return linkUserToPersonSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    // If linking to a person, check if person exists and isn't already linked
    if (data.personId) {
      const person = await prisma.person.findUnique({
        where: { id: data.personId },
      });

      if (!person) {
        throw new Error("Person not found");
      }

      // Check if person is already linked to another user
      const existingLink = await prisma.user.findFirst({
        where: {
          personId: data.personId,
          id: { not: data.userId },
        },
      });

      if (existingLink) {
        throw new Error("This person is already linked to another user");
      }
    }

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: { personId: data.personId },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info(
      {
        targetUserId: data.userId,
        personId: data.personId,
        updatedBy: currentUser.id,
      },
      "Linked user to person"
    );

    return {
      id: updated.id,
      personId: updated.personId,
      person: updated.person,
    };
  });

// Get persons available for linking (not already linked to a user)
export const getAvailablePersons = createServerFn({ method: "GET" })
  .inputValidator((data: { search?: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const { search } = data;

    // Find persons not linked to any user
    const persons = await prisma.person.findMany({
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
  });

// Delete user schema
const deleteUserSchema = z.object({
  userId: z.string(),
});

// Delete user
export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof deleteUserSchema>) => {
    return deleteUserSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    // Prevent self-deletion
    if (data.userId === currentUser.id) {
      throw new Error("Cannot delete yourself");
    }

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Delete user (cascade behavior handled by Prisma schema)
    await prisma.user.delete({
      where: { id: data.userId },
    });

    logger.info(
      { deletedUserId: data.userId, deletedBy: currentUser.id },
      "Deleted user"
    );

    return { success: true };
  });

// Unlock account schema
const unlockAccountSchema = z.object({
  userId: z.string(),
});

// Unlock a locked user account (admin only)
export const unlockAccount = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof unlockAccountSchema>) => {
    return unlockAccountSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Reset lockout fields
    await prisma.user.update({
      where: { id: data.userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      },
    });

    logger.info(
      { unlockedUserId: data.userId, unlockedBy: currentUser.id },
      "Unlocked user account"
    );

    return { success: true };
  });
