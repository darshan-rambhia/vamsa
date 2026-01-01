"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import {
  userCreateSchema,
  userUpdateSchema,
  changePasswordSchema,
  registerSchema,
  claimProfileSchema,
  type UserCreateInput,
  type UserUpdateInput,
  type ChangePasswordInput,
  type RegisterInput,
  type ClaimProfileInput,
} from "@/schemas/user";

export async function getUsers() {
  await requireAdmin();

  return db.user.findMany({
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
}

export async function getUser(id: string) {
  await requireAdmin();

  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      personId: true,
      createdAt: true,
      lastLoginAt: true,
      person: true,
    },
  });
}

export async function createUser(input: UserCreateInput) {
  await requireAdmin();
  const validated = userCreateSchema.parse(input);

  const existing = await db.user.findUnique({
    where: { email: validated.email.toLowerCase() },
  });

  if (existing) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(validated.password, 12);

  const user = await db.user.create({
    data: {
      email: validated.email.toLowerCase(),
      name: validated.name,
      passwordHash,
      role: validated.role,
      personId: validated.personId,
      mustChangePassword: true,
    },
  });

  revalidatePath("/admin/users");

  return { success: true, user: { id: user.id, email: user.email } };
}

export async function updateUser(id: string, input: UserUpdateInput) {
  await requireAdmin();
  const validated = userUpdateSchema.parse(input);

  const user = await db.user.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);

  return { success: true, user: { id: user.id, email: user.email } };
}

export async function deleteUser(id: string) {
  const currentUser = await requireAdmin();

  if (currentUser.id === id) {
    throw new Error("Cannot delete your own account");
  }

  await db.user.delete({ where: { id } });

  revalidatePath("/admin/users");

  return { success: true };
}

export async function changePassword(input: ChangePasswordInput) {
  const currentUser = await requireAuth();
  const validated = changePasswordSchema.parse(input);

  const user = await db.user.findUnique({
    where: { id: currentUser.id },
  });

  if (!user?.passwordHash) {
    throw new Error("Cannot change password for OAuth users");
  }

  const isValid = await bcrypt.compare(
    validated.currentPassword,
    user.passwordHash
  );

  if (!isValid) {
    throw new Error("Current password is incorrect");
  }

  const newPasswordHash = await bcrypt.hash(validated.newPassword, 12);

  await db.user.update({
    where: { id: currentUser.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    },
  });

  return { success: true };
}

export async function register(input: RegisterInput) {
  const validated = registerSchema.parse(input);

  const settings = await db.familySettings.findFirst();
  if (!settings?.allowSelfRegistration) {
    throw new Error("Self-registration is disabled");
  }

  const existing = await db.user.findUnique({
    where: { email: validated.email.toLowerCase() },
  });

  if (existing) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(validated.password, 12);

  const user = await db.user.create({
    data: {
      email: validated.email.toLowerCase(),
      name: validated.name,
      passwordHash,
      role: "VIEWER",
    },
  });

  return { success: true, userId: user.id };
}

export async function claimProfile(input: ClaimProfileInput) {
  const validated = claimProfileSchema.parse(input);

  const person = await db.person.findUnique({
    where: { id: validated.personId },
  });

  if (!person) {
    throw new Error("Profile not found");
  }

  const existingLink = await db.user.findUnique({
    where: { personId: validated.personId },
  });

  if (existingLink) {
    throw new Error("This profile is already claimed");
  }

  const existingUser = await db.user.findUnique({
    where: { email: validated.email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(validated.password, 12);

  const user = await db.user.create({
    data: {
      email: validated.email.toLowerCase(),
      name: `${person.firstName} ${person.lastName}`,
      passwordHash,
      personId: validated.personId,
      role: "MEMBER",
    },
  });

  return { success: true, userId: user.id };
}

export async function getUnclaimedProfiles() {
  const claimedPersonIds = await db.user.findMany({
    where: { personId: { not: null } },
    select: { personId: true },
  });

  const claimedIds = claimedPersonIds
    .map((u) => u.personId)
    .filter((id): id is string => id !== null);

  return db.person.findMany({
    where: {
      id: { notIn: claimedIds },
      isLiving: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
