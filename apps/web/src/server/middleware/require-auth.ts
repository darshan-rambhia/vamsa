/**
 * Shared authentication middleware for server functions
 *
 * Centralizes session validation logic using Better Auth.
 */

import { getRequestHeaders } from "@tanstack/react-start/server";
// Import directly from specific modules to avoid pulling sharp into the bundle
import { betterAuthGetSessionWithUser } from "@vamsa/lib/server/business/auth-better-api";
import { drizzleDb, drizzleSchema } from "@vamsa/lib/server/db";
import { t } from "@vamsa/lib/server/i18n";
import { eq } from "drizzle-orm";

export type UserRole = "VIEWER" | "MEMBER" | "ADMIN";

/**
 * Require authentication for a server function
 *
 * @param requiredRole - Minimum role required (defaults to VIEWER)
 * @returns The authenticated user (full User object)
 * @throws Error if not authenticated or insufficient role
 */
export async function requireAuth(requiredRole: UserRole = "VIEWER") {
  // Pass all request headers so Better Auth resolves its own session cookie
  // name (`better-auth.session_token`, or `__Secure-` prefixed over HTTPS).
  const sessionUser = await betterAuthGetSessionWithUser(getRequestHeaders());

  if (!sessionUser) {
    throw new Error(await t("errors:auth.notAuthenticated"));
  }

  const roleHierarchy: Record<UserRole, number> = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
  };

  if (
    roleHierarchy[sessionUser.role as UserRole] < roleHierarchy[requiredRole]
  ) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  // Fetch full user object from database for business logic that needs all fields
  const [user] = await drizzleDb
    .select()
    .from(drizzleSchema.users)
    .where(eq(drizzleSchema.users.id, sessionUser.id))
    .limit(1);

  if (!user) {
    throw new Error(await t("errors:auth.notAuthenticated"));
  }

  return user;
}
