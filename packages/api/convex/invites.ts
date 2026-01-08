import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, generateToken, hashPassword } from "./auth";

const inviteRoleArg = v.union(
  v.literal("ADMIN"),
  v.literal("MEMBER"),
  v.literal("VIEWER")
);

/**
 * Create and send an invite (admin only)
 */
export const create = mutation({
  args: {
    token: v.string(),
    email: v.string(),
    personId: v.optional(v.id("persons")),
    role: inviteRoleArg,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const email = args.email.toLowerCase();

    // Check if email is already registered
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existingUser) {
      throw new Error("This email is already registered");
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .first();

    if (existingInvite) {
      throw new Error("An invite is already pending for this email");
    }

    // If personId is provided, verify it exists and isn't linked to another user
    if (args.personId) {
      const person = await ctx.db.get(args.personId);
      if (!person) {
        throw new Error("Person not found");
      }

      const linkedUser = await ctx.db
        .query("users")
        .withIndex("by_personId", (q) => q.eq("personId", args.personId))
        .unique();

      if (linkedUser) {
        throw new Error("This person is already linked to another user");
      }
    }

    // Generate invite token (7 days expiry)
    const inviteToken = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const inviteId = await ctx.db.insert("invites", {
      email,
      personId: args.personId,
      role: args.role,
      invitedById: admin._id,
      token: inviteToken,
      expiresAt,
      status: "PENDING",
    });

    // In a real app, you would send an email here
    // For now, we just return the invite details
    return {
      id: inviteId,
      token: inviteToken,
      email,
      expiresAt,
    };
  },
});

/**
 * List all invites (admin only)
 */
export const list = query({
  args: {
    token: v.string(),
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("ACCEPTED"),
        v.literal("EXPIRED"),
        v.literal("REVOKED")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let invites;
    if (args.status) {
      invites = await ctx.db
        .query("invites")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      invites = await ctx.db.query("invites").collect();
    }

    // Enrich with person and inviter info
    const enriched = await Promise.all(
      invites.map(async (invite) => {
        const invitedBy = await ctx.db.get(invite.invitedById);
        const person = invite.personId
          ? await ctx.db.get(invite.personId)
          : null;

        return {
          id: invite._id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expiresAt,
          acceptedAt: invite.acceptedAt,
          createdAt: invite._creationTime,
          invitedBy: invitedBy
            ? { id: invitedBy._id, name: invitedBy.name, email: invitedBy.email }
            : null,
          person: person
            ? {
                id: person._id,
                firstName: person.firstName,
                lastName: person.lastName,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get invite by token (public - for accept flow)
 */
export const getByToken = query({
  args: {
    inviteToken: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.inviteToken))
      .unique();

    if (!invite) {
      return null;
    }

    // Check if expired
    if (invite.expiresAt < Date.now() && invite.status === "PENDING") {
      // Mark as expired
      await ctx.db.patch(invite._id, { status: "EXPIRED" });
      return { ...invite, status: "EXPIRED" as const };
    }

    const person = invite.personId
      ? await ctx.db.get(invite.personId)
      : null;

    return {
      id: invite._id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      person: person
        ? {
            id: person._id,
            firstName: person.firstName,
            lastName: person.lastName,
          }
        : null,
    };
  },
});

/**
 * Accept an invite and create user account
 */
export const accept = mutation({
  args: {
    inviteToken: v.string(),
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.inviteToken))
      .unique();

    if (!invite) {
      throw new Error("Invalid invite");
    }

    if (invite.status !== "PENDING") {
      throw new Error(`Invite is ${invite.status.toLowerCase()}`);
    }

    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "EXPIRED" });
      throw new Error("Invite has expired");
    }

    // Check if email is already taken (shouldn't happen but be safe)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", invite.email))
      .unique();

    if (existingUser) {
      throw new Error("Email is already registered");
    }

    // Create the user
    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      email: invite.email,
      name: args.name,
      passwordHash,
      role: invite.role,
      personId: invite.personId,
      isActive: true,
      mustChangePassword: false,
      invitedById: invite.invitedById,
    });

    // Mark invite as accepted
    await ctx.db.patch(invite._id, {
      status: "ACCEPTED",
      acceptedAt: Date.now(),
    });

    // Create session for auto-login
    const sessionToken = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("sessions", {
      userId,
      token: sessionToken,
      expiresAt,
    });

    return {
      token: sessionToken,
      user: {
        id: userId,
        email: invite.email,
        name: args.name,
        role: invite.role,
        personId: invite.personId,
      },
    };
  },
});

/**
 * Revoke an invite (admin only)
 */
export const revoke = mutation({
  args: {
    token: v.string(),
    inviteId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.status !== "PENDING") {
      throw new Error("Can only revoke pending invites");
    }

    await ctx.db.patch(args.inviteId, { status: "REVOKED" });

    return { success: true };
  },
});

/**
 * Resend an invite (regenerate token, admin only)
 */
export const resend = mutation({
  args: {
    token: v.string(),
    inviteId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.status !== "PENDING" && invite.status !== "EXPIRED") {
      throw new Error("Can only resend pending or expired invites");
    }

    // Generate new token and extend expiry
    const newToken = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.inviteId, {
      token: newToken,
      expiresAt,
      status: "PENDING",
    });

    return {
      id: args.inviteId,
      token: newToken,
      email: invite.email,
      expiresAt,
    };
  },
});
