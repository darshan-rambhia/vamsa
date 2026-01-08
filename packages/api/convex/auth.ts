import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export type UserWithRole = Doc<"users">;

/**
 * Get the current user from session token
 */
export async function getUser(
  ctx: QueryCtx | MutationCtx,
  token: string | null
): Promise<UserWithRole | null> {
  if (!token) return null;

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (!session) return null;

  // Check if session is expired
  if (session.expiresAt < Date.now()) {
    return null;
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) return null;

  return user;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  token: string | null
): Promise<UserWithRole> {
  const user = await getUser(ctx, token);
  if (!user) {
    throw new Error("Unauthorized: Please log in");
  }
  return user;
}

/**
 * Require admin role
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string | null
): Promise<UserWithRole> {
  const user = await requireAuth(ctx, token);
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }
  return user;
}

/**
 * Require member role (ADMIN or MEMBER)
 */
export async function requireMember(
  ctx: QueryCtx | MutationCtx,
  token: string | null
): Promise<UserWithRole> {
  const user = await requireAuth(ctx, token);
  if (user.role === "VIEWER") {
    throw new Error("Forbidden: Member access required");
  }
  return user;
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Hash password using Web Crypto API (for Convex runtime)
 * Note: In production, consider using a more robust solution
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
