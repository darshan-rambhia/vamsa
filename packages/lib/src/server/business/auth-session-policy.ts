/**
 * Session admission policy for Better Auth
 *
 * Deactivated accounts (`isActive = false`) must not obtain new sessions,
 * whichever sign-in path is used (email/password or OIDC). Existing sessions
 * are rejected at lookup time and deleted when an admin deactivates the user.
 */

import { APIError } from "better-auth/api";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq } from "drizzle-orm";

export type SessionPolicyDb = typeof drizzleDb;

/**
 * Returns true only when the user exists and is active.
 */
export async function isUserActive(
  userId: string,
  db: SessionPolicyDb = drizzleDb
): Promise<boolean> {
  const [row] = await db
    .select({ isActive: drizzleSchema.users.isActive })
    .from(drizzleSchema.users)
    .where(eq(drizzleSchema.users.id, userId))
    .limit(1);

  return row?.isActive === true;
}

/**
 * Throws FORBIDDEN unless the user is active. Used by the Better Auth
 * `session.create.before` hook so deactivated users cannot log in.
 */
export async function assertUserCanStartSession(
  userId: string,
  db: SessionPolicyDb = drizzleDb
): Promise<void> {
  if (!(await isUserActive(userId, db))) {
    throw new APIError("FORBIDDEN", {
      message: "Account is deactivated",
    });
  }
}
