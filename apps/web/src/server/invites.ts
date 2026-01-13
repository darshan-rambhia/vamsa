import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "@vamsa/lib/logger";
import { requireAuth } from "./middleware/require-auth";
import type { Prisma } from "@vamsa/api";
import { createPaginationMeta } from "@vamsa/schemas";

// Invite list input schema (extends pagination with status filter)
const inviteListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]).optional(),
});
type InviteListInput = z.infer<typeof inviteListInputSchema>;

// Get invites with pagination (admin only)
export const getInvites = createServerFn({ method: "GET" })
  .inputValidator((data: Partial<InviteListInput>) => {
    return inviteListInputSchema.parse(data);
  })
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const { page, limit, sortOrder, status } = data;

    // Build where clause
    const where: Prisma.InviteWhereInput = {};
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.invite.count({ where });

    // Get paginated results
    const invites = await prisma.invite.findMany({
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
  });

// Create invite schema
const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
  personId: z.string().nullable().optional(),
});

// Create invite (admin only)
export const createInvite = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createInviteSchema>) => {
    return createInviteSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    // Check if email already has an active invite
    const existingInvite = await prisma.invite.findFirst({
      where: {
        email: data.email.toLowerCase(),
        status: "PENDING",
      },
    });

    if (existingInvite) {
      throw new Error("An active invite already exists for this email");
    }

    // Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error("A user already exists with this email");
    }

    // If personId provided, verify it exists and isn't already linked
    if (data.personId) {
      const person = await prisma.person.findUnique({
        where: { id: data.personId },
      });

      if (!person) {
        throw new Error("Person not found");
      }

      const userWithPerson = await prisma.user.findFirst({
        where: { personId: data.personId },
      });

      if (userWithPerson) {
        throw new Error("This person is already linked to a user");
      }
    }

    // Generate unique token
    const token = randomBytes(32).toString("hex");

    // Set expiration to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create invite
    const invite = await prisma.invite.create({
      data: {
        email: data.email.toLowerCase(),
        role: data.role,
        personId: data.personId ?? null,
        invitedById: currentUser.id,
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
      { email: data.email, createdBy: currentUser.id },
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
  });

// Revoke invite schema
const revokeInviteSchema = z.object({
  inviteId: z.string(),
});

// Revoke invite (admin only)
export const revokeInvite = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof revokeInviteSchema>) => {
    return revokeInviteSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    const invite = await prisma.invite.findUnique({
      where: { id: data.inviteId },
    });

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.status !== "PENDING") {
      throw new Error("Can only revoke pending invites");
    }

    await prisma.invite.update({
      where: { id: data.inviteId },
      data: { status: "REVOKED" },
    });

    logger.info(
      { inviteId: data.inviteId, revokedBy: currentUser.id },
      "Revoked invite"
    );

    return { success: true };
  });

// Get invite by token (public - for invite accept page)
export const getInviteByToken = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const invite = await prisma.invite.findUnique({
      where: { token: data.token },
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
        await prisma.invite.update({
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
  });

// Accept invite schema
const acceptInviteSchema = z.object({
  token: z.string(),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Accept invite (public)
export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof acceptInviteSchema>) => {
    return acceptInviteSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const invite = await prisma.invite.findUnique({
      where: { token: data.token },
    });

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.status !== "PENDING") {
      throw new Error(
        `Invite is ${invite.status.toLowerCase()}, cannot accept`
      );
    }

    if (invite.expiresAt < new Date()) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("Invite has expired");
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      throw new Error("An account already exists with this email");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user and update invite in transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: invite.email,
          name: data.name,
          passwordHash,
          role: invite.role,
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
  });

// Resend invite (admin only) - just creates a new token and extends expiration
const resendInviteSchema = z.object({
  inviteId: z.string(),
});

export const resendInvite = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof resendInviteSchema>) => {
    return resendInviteSchema.parse(data);
  })
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const invite = await prisma.invite.findUnique({
      where: { id: data.inviteId },
    });

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.status === "ACCEPTED") {
      throw new Error("Cannot resend an accepted invite");
    }

    // Generate new token and extend expiration
    const newToken = randomBytes(32).toString("hex");
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await prisma.invite.update({
      where: { id: data.inviteId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: "PENDING",
      },
    });

    logger.info({ inviteId: data.inviteId }, "Resent invite");

    return {
      success: true,
      token: updated.token,
      expiresAt: updated.expiresAt.toISOString(),
    };
  });
