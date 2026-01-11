import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./db";
import { z } from "zod";

const TOKEN_COOKIE_NAME = "vamsa-session";

// Auth helper function
async function requireAuth(
  requiredRole: "VIEWER" | "MEMBER" | "ADMIN" = "VIEWER"
) {
  const token = getCookie(TOKEN_COOKIE_NAME);
  if (!token) {
    throw new Error("Not authenticated");
  }

  const session = await prisma.session.findFirst({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error("Session expired");
  }

  const roleHierarchy = { VIEWER: 0, MEMBER: 1, ADMIN: 2 };
  if (roleHierarchy[session.user.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  return session.user;
}

// Get all users
export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAuth("ADMIN");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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

  return users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));
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

    console.warn(
      "[Users Server] Updated user role:",
      data.userId,
      "to",
      data.role,
      "by:",
      currentUser.id
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

    console.warn(
      "[Users Server] Updated user active status:",
      data.userId,
      "to",
      data.isActive,
      "by:",
      currentUser.id
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

    console.warn(
      "[Users Server] Linked user to person:",
      data.userId,
      "->",
      data.personId,
      "by:",
      currentUser.id
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

    console.warn(
      "[Users Server] Deleted user:",
      data.userId,
      "by:",
      currentUser.id
    );

    return { success: true };
  });
