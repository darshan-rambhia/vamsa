/**
 * Shared authentication middleware for server functions
 *
 * Centralizes session validation logic using Better Auth.
 */

import { getCookie as getTanStackCookie } from "@tanstack/react-start/server";
import { betterAuthGetSessionWithUserFromCookie } from "@vamsa/lib/server/business";
import { prisma } from "@vamsa/lib/server";
import { t } from "@vamsa/lib/server";

export type UserRole = "VIEWER" | "MEMBER" | "ADMIN";

const BETTER_AUTH_COOKIE_NAME = "better-auth.session_token";

/**
 * Require authentication for a server function
 *
 * @param requiredRole - Minimum role required (defaults to VIEWER)
 * @returns The authenticated user (full Prisma User object)
 * @throws Error if not authenticated or insufficient role
 */
export async function requireAuth(requiredRole: UserRole = "VIEWER") {
  const cookie = getTanStackCookie(BETTER_AUTH_COOKIE_NAME);
  const sessionUser = await betterAuthGetSessionWithUserFromCookie(
    cookie ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}` : undefined
  );

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
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) {
    throw new Error(await t("errors:auth.notAuthenticated"));
  }

  return user;
}
