import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireAuth,
  requireAdmin,
  generateToken,
  hashPassword,
  verifyPassword,
} from "./auth";

const userRoleArg = v.union(
  v.literal("ADMIN"),
  v.literal("MEMBER"),
  v.literal("VIEWER")
);

/**
 * Login with email and password
 */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (!user || !user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      throw new Error("Account is disabled");
    }

    const isValid = await verifyPassword(args.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Update last login
    await ctx.db.patch(user._id, { lastLoginAt: Date.now() });

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
    });

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        personId: user.personId,
      },
    };
  },
});

/**
 * Logout - invalidate session
 */
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

/**
 * Get current user
 */
export const me = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) return null;

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      personId: user.personId,
    };
  },
});

/**
 * Register a new user (if self-registration is enabled)
 */
export const register = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if self-registration is allowed
    const settings = await ctx.db.query("familySettings").first();
    if (settings && !settings.allowSelfRegistration) {
      throw new Error("Self-registration is not allowed");
    }

    // Check if email is already taken
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (existing) {
      throw new Error("Email is already registered");
    }

    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      name: args.name,
      passwordHash,
      role: "VIEWER",
      isActive: true,
      mustChangePassword: false,
    });

    // Auto-login
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
    });

    return {
      token,
      user: {
        id: userId,
        email: args.email.toLowerCase(),
        name: args.name,
        role: "VIEWER" as const,
        mustChangePassword: false,
      },
    };
  },
});

/**
 * Change password
 */
export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    if (user.passwordHash) {
      const isValid = await verifyPassword(
        args.currentPassword,
        user.passwordHash
      );
      if (!isValid) {
        throw new Error("Current password is incorrect");
      }
    }

    const newHash = await hashPassword(args.newPassword);

    await ctx.db.patch(user._id, {
      passwordHash: newHash,
      mustChangePassword: false,
    });

    return { success: true };
  },
});

/**
 * List all users (admin only)
 */
export const list = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const users = await ctx.db.query("users").collect();

    return users.map((u) => ({
      id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      personId: u.personId,
      lastLoginAt: u.lastLoginAt,
      _creationTime: u._creationTime,
    }));
  },
});

/**
 * Create a new user (admin only)
 */
export const create = mutation({
  args: {
    token: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    password: v.string(),
    role: userRoleArg,
    personId: v.optional(v.id("persons")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);

    // Check if email is taken
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (existing) {
      throw new Error("Email is already registered");
    }

    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      name: args.name,
      passwordHash,
      role: args.role,
      personId: args.personId,
      isActive: true,
      mustChangePassword: true,
      invitedById: admin._id,
    });

    return userId;
  },
});

/**
 * Update a user (admin only)
 */
export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(userRoleArg),
    isActive: v.optional(v.boolean()),
    personId: v.optional(v.id("persons")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const { token, id, ...updates } = args;

    // If email is being changed, check it's not taken
    if (updates.email) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", updates.email!.toLowerCase()))
        .unique();

      if (existing && existing._id !== id) {
        throw new Error("Email is already registered");
      }
      updates.email = updates.email.toLowerCase();
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, cleanUpdates);

    return id;
  },
});

/**
 * Delete a user (admin only)
 */
export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);

    if (admin._id === args.id) {
      throw new Error("Cannot delete your own account");
    }

    // Delete user's sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.id))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});
