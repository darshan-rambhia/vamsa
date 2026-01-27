/**
 * Auth Business Logic Module
 *
 * Provides testable business logic for authentication operations.
 * Uses dependency injection pattern for database access and external services.
 *
 * Functions extracted here:
 * - getUnclaimedProfilesData: Get living profiles not yet linked to users
 * - claimProfileData: Create user account linked to a Person profile
 *
 * Thin wrappers remain in apps/web/src/server/auth.ts for:
 * - Framework-specific code (TanStack cookies, rate limiting)
 * - Session management (getSession, checkAuth, logout)
 * - Provider configuration (getAvailableProviders)
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq } from "drizzle-orm";
import { logger } from "@vamsa/lib/logger";
import { t } from "../i18n";
import { betterAuthRegister } from "./auth-better-api";
import { notifyNewMemberJoined } from "./notifications";

/**
 * Type for the database client used by auth functions.
 * This module uses Drizzle ORM as the default database client.
 */
export type AuthDb = typeof drizzleDb;

/**
 * Unclaimed profile available for claiming
 */
export interface UnclaimedProfile {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Result of claiming a profile
 */
export interface ClaimProfileResult {
  success: boolean;
  userId: string;
}

/**
 * Get unclaimed living profiles available for claiming.
 * Returns profiles not yet linked to any user.
 *
 * @param db - Drizzle database instance (defaults to drizzleDb)
 * @returns Array of claimable profiles with id, firstName, lastName
 *
 * @example
 * const profiles = await getUnclaimedProfilesData();
 * // [{ id: "person_123", firstName: "John", lastName: "Doe" }, ...]
 */
export async function getUnclaimedProfilesData(
  db: AuthDb = drizzleDb
): Promise<UnclaimedProfile[]> {
  logger.debug("Fetching unclaimed profiles");

  // Get all personIds that already have users
  const usersWithPeople = await db
    .select({ personId: drizzleSchema.users.personId })
    .from(drizzleSchema.users)
    .where(eq(drizzleSchema.users.personId, drizzleSchema.users.personId)); // NOT NULL

  const claimedPersonIds = usersWithPeople
    .map((u) => u.personId)
    .filter((id): id is string => id !== null);

  logger.debug({ count: claimedPersonIds.length }, "Claimed profiles found");

  // Get all living persons not yet claimed
  const profiles =
    claimedPersonIds.length > 0
      ? await db
          .select({
            id: drizzleSchema.persons.id,
            firstName: drizzleSchema.persons.firstName,
            lastName: drizzleSchema.persons.lastName,
          })
          .from(drizzleSchema.persons)
          .where(eq(drizzleSchema.persons.isLiving, true))
          .orderBy(
            drizzleSchema.persons.lastName,
            drizzleSchema.persons.firstName
          )
          .then((rows) => rows.filter((r) => !claimedPersonIds.includes(r.id)))
      : await db
          .select({
            id: drizzleSchema.persons.id,
            firstName: drizzleSchema.persons.firstName,
            lastName: drizzleSchema.persons.lastName,
          })
          .from(drizzleSchema.persons)
          .where(eq(drizzleSchema.persons.isLiving, true))
          .orderBy(
            drizzleSchema.persons.lastName,
            drizzleSchema.persons.firstName
          );

  logger.debug({ count: profiles.length }, "Unclaimed profiles found");

  return profiles;
}

/**
 * Claim a family profile by creating a user account linked to a Person.
 * User must provide email, select a living unclaimed profile, and create password.
 *
 * @param email - User email
 * @param personId - ID of the Person profile to claim
 * @param password - User password (min 8 chars)
 * @param db - Drizzle database instance (defaults to drizzleDb)
 * @param register - Better Auth register function (defaults to betterAuthRegister)
 * @param notify - Notification function (defaults to notifyNewMemberJoined)
 * @param translate - Translation function (defaults to t)
 * @returns Success status and new user ID
 * @throws Error if profile doesn't exist, is already claimed, or email exists
 *
 * @example
 * const { userId } = await claimProfileData(
 *   "john@example.com",
 *   "person_456",
 *   "password123"
 * );
 */
export async function claimProfileData(
  email: string,
  personId: string,
  password: string,
  db: AuthDb = drizzleDb,
  register: typeof betterAuthRegister = betterAuthRegister,
  notify: typeof notifyNewMemberJoined = notifyNewMemberJoined,
  translate: typeof t = t
): Promise<ClaimProfileResult> {
  try {
    // Validate person exists and is living
    const [person] = await db
      .select()
      .from(drizzleSchema.persons)
      .where(eq(drizzleSchema.persons.id, personId))
      .limit(1);

    if (!person || !person.isLiving) {
      logger.warn({ personId }, "Profile not found or cannot be claimed");
      throw new Error(await translate("errors:person.notFound"));
    }

    // Check if already claimed
    const [existingUser] = await db
      .select()
      .from(drizzleSchema.users)
      .where(eq(drizzleSchema.users.personId, personId))
      .limit(1);

    if (existingUser) {
      logger.warn({ personId }, "Profile is already claimed");
      throw new Error("This profile is already claimed");
    }

    // Check if email already exists
    const normalizedEmail = email.toLowerCase();
    const [existingEmail] = await db
      .select()
      .from(drizzleSchema.users)
      .where(eq(drizzleSchema.users.email, normalizedEmail))
      .limit(1);

    if (existingEmail) {
      logger.warn({ email: normalizedEmail }, "Email already in use");
      throw new Error(await translate("errors:user.alreadyExists"));
    }

    // Create user via Better Auth
    const fullName = `${person.firstName} ${person.lastName}`;
    const result = await register(normalizedEmail, fullName, password);

    if (!result?.user) {
      logger.warn(
        { email: normalizedEmail },
        "Failed to create user via Better Auth"
      );
      throw new Error("Failed to create user");
    }

    // Update user with Vamsa-specific fields
    await db
      .update(drizzleSchema.users)
      .set({
        personId,
        role: "MEMBER",
        profileClaimStatus: "CLAIMED",
        profileClaimedAt: new Date(),
      })
      .where(eq(drizzleSchema.users.id, result.user.id));

    logger.info(
      { userId: result.user.id, personId },
      "Profile claimed successfully"
    );

    // Send notification about new family member joined
    try {
      await notify(result.user.id);
    } catch (error) {
      logger.warn(
        { userId: result.user.id, error },
        "Failed to send notification"
      );
    }

    return { success: true, userId: result.user.id };
  } catch (error) {
    logger.warn(
      { email: email.toLowerCase(), personId, error },
      "Profile claim failed"
    );
    throw error;
  }
}
