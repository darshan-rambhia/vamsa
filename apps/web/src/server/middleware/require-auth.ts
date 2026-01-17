/**
 * Shared authentication middleware for server functions
 *
 * Centralizes session validation logic with proper token hashing.
 */

import { getCookie } from "@tanstack/react-start/server";
import { createHash } from "crypto";
import { prisma, t } from "@vamsa/lib/server";

const TOKEN_COOKIE_NAME = "vamsa-session";

/**
 * Hash a session token for secure database lookup
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type UserRole = "VIEWER" | "MEMBER" | "ADMIN";

/**
 * Require authentication for a server function
 *
 * @param requiredRole - Minimum role required (defaults to VIEWER)
 * @returns The authenticated user
 * @throws Error if not authenticated or insufficient role
 */
export async function requireAuth(requiredRole: UserRole = "VIEWER") {
  const token = getCookie(TOKEN_COOKIE_NAME);
  if (!token) {
    throw new Error(await t("errors:auth.notAuthenticated"));
  }

  // Hash token for secure database lookup
  const tokenHash = hashToken(token);
  const session = await prisma.session.findFirst({
    where: { token: tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error(await t("errors:auth.sessionExpired"));
  }

  const roleHierarchy: Record<UserRole, number> = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
  };

  if (roleHierarchy[session.user.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  return session.user;
}
