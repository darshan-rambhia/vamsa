/**
 * OIDC Profile Claiming Business Logic
 *
 * This module contains pure business logic functions for OIDC users claiming
 * their person profiles in the family tree. These functions accept primitive
 * parameters and return typed results, with auth checks performed at the
 * server function layer.
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq, and, notInArray, asc, isNotNull } from "drizzle-orm";
import { logger } from "@vamsa/lib/logger";
import {
  findSuggestedMatches,
  type ClaimableProfile,
  type ClaimingUser,
  type ProfileMatch,
} from "@vamsa/lib";
import { notifyNewMemberJoined } from "./notifications";


/**
 * Fetch claimable profiles for an OIDC user
 *
 * Returns all living person profiles that are not yet claimed by any user,
 * along with suggested matches based on the user's email and name.
 *
 * @param userId - ID of the OIDC user
 * @returns Object with all unclaimed profiles and suggested matches
 * @throws Error if user not found or not an OIDC user
 */
export async function getClaimableProfilesData(userId: string) {
  const user = await drizzleDb.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.oidcProvider) {
    throw new Error("This endpoint is for OIDC users only");
  }

  logger.debug(
    { userId: user.id, provider: user.oidcProvider },
    "Fetching claimable profiles for OIDC user"
  );

  // Get all personIds that are already claimed
  const usersWithPeople = await drizzleDb.query.users.findMany({
    where: isNotNull(drizzleSchema.users.personId),
    columns: { personId: true },
  });

  const claimedPersonIds = usersWithPeople
    .map((u) => u.personId)
    .filter((id): id is string => id !== null);

  logger.debug({ count: claimedPersonIds.length }, "Claimed person IDs");

  // Get all living persons not yet claimed
  const profiles = await drizzleDb.query.persons.findMany({
    where: and(
      eq(drizzleSchema.persons.isLiving, true),
      notInArray(drizzleSchema.persons.id, claimedPersonIds)
    ),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      dateOfBirth: true,
    },
    orderBy: [
      asc(drizzleSchema.persons.lastName),
      asc(drizzleSchema.persons.firstName),
    ],
  });

  logger.debug({ count: profiles.length }, "Unclaimed living profiles found");

  // Build user data for matching
  const claimingUser: ClaimingUser = {
    email: user.email,
    name: user.name,
    oidcProvider: user.oidcProvider,
  };

  // Convert profiles to ClaimableProfile type
  const claimableProfiles: ClaimableProfile[] = profiles.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    dateOfBirth: p.dateOfBirth,
  }));

  // Find suggested matches
  const suggestedMatches = findSuggestedMatches(
    claimingUser,
    claimableProfiles
  );
  const suggested = suggestedMatches
    .slice(0, 5)
    .map((m: ProfileMatch) => m.profile);

  logger.debug({ count: suggested.length }, "Suggested matches found");

  return {
    all: profiles,
    suggested,
  };
}

/**
 * Claim a person profile for an OIDC user
 *
 * Links a user to a person profile, promoting the user to MEMBER role and
 * marking their profile as claimed. Sends notification to admins about the
 * new member joining.
 *
 * @param userId - ID of the OIDC user claiming
 * @param personId - ID of the person profile to claim
 * @returns Object with success status and updated user ID
 * @throws Error if user/person not found, already claimed, or validation fails
 */
export async function claimProfileForOIDCData(userId: string, personId: string) {
  // Fetch user with current state
  const user = await drizzleDb.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.oidcProvider) {
    throw new Error("This endpoint is for OIDC users only");
  }

  logger.info(
    { userId: user.id, personId, provider: user.oidcProvider },
    "Attempting to claim profile for OIDC user"
  );

  // Check if user already has a personId
  if (user.personId) {
    logger.warn({ userId: user.id }, "User already has a linked profile");
    throw new Error("You have already claimed a profile");
  }

  // Check profile claim status
  if (user.profileClaimStatus === "CLAIMED") {
    logger.warn({ userId: user.id }, "User already claimed a profile");
    throw new Error("You have already completed profile claiming");
  }

  // Verify person exists and is living
  const person = await drizzleDb.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, personId),
  });

  if (!person) {
    logger.warn({ personId }, "Profile not found");
    throw new Error("Profile not found");
  }

  if (!person.isLiving) {
    logger.warn({ personId }, "Cannot claim a non-living profile");
    throw new Error("Cannot claim a non-living profile");
  }

  logger.debug(
    { personId, firstName: person.firstName, lastName: person.lastName },
    "Person found and is living"
  );

  // Verify no other user has claimed this person
  const existingClaim = await drizzleDb.query.users.findFirst({
    where: eq(drizzleSchema.users.personId, personId),
  });

  if (existingClaim) {
    logger.warn({ personId }, "Profile is already claimed by another user");
    throw new Error("This profile is already claimed by another user");
  }

  // Link user to person and promote to MEMBER
  logger.debug({ userId: user.id, personId }, "Linking user to person");
  const [updatedUser] = await drizzleDb
    .update(drizzleSchema.users)
    .set({
      personId,
      role: "MEMBER",
      profileClaimStatus: "CLAIMED",
      profileClaimedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(drizzleSchema.users.id, user.id))
    .returning();

  logger.info({ userId: user.id, personId }, "Profile claimed successfully");

  // Send notification to admins about new member
  try {
    await notifyNewMemberJoined(user.id);
    logger.debug({ userId: user.id }, "Notification sent");
  } catch (error) {
    logger.error({ userId: user.id, error }, "Failed to send notification");
    // Don't throw - notification failure shouldn't block claiming
  }

  return { success: true, userId: updatedUser.id };
}

/**
 * Skip profile claiming for an OIDC user
 *
 * Marks a user as having skipped the profile claiming workflow. They can
 * still claim a profile later if they choose.
 *
 * @param userId - ID of the OIDC user skipping
 * @returns Object with success status
 * @throws Error if user not found, already claimed, or not an OIDC user
 */
export async function skipProfileClaimData(userId: string) {
  const user = await drizzleDb.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.oidcProvider) {
    throw new Error("This endpoint is for OIDC users only");
  }

  logger.info(
    { userId: user.id, provider: user.oidcProvider },
    "User skipping profile claim"
  );

  // Check if already claimed
  if (user.profileClaimStatus === "CLAIMED") {
    logger.warn({ userId: user.id }, "User already claimed a profile");
    throw new Error("You have already claimed a profile");
  }

  // Update status to SKIPPED
  await drizzleDb
    .update(drizzleSchema.users)
    .set({
      profileClaimStatus: "SKIPPED",
      updatedAt: new Date(),
    })
    .where(eq(drizzleSchema.users.id, user.id));

  logger.info({ userId: user.id }, "Profile claim skipped");

  return { success: true };
}

/**
 * Get OIDC claim status for a user
 *
 * Returns detailed claim status information including whether the user has
 * claimed a profile, which profile they claimed, and their OIDC provider.
 *
 * @param userId - ID of the OIDC user
 * @returns Claim status object with user and person details, or null if not OIDC user
 */
export async function getOIDCClaimStatusData(userId: string) {
  const user = await drizzleDb.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.oidcProvider) {
    return null;
  }

  logger.debug({ userId: user.id }, "Fetching OIDC claim status");

  const person = user.personId
    ? await drizzleDb.query.persons.findFirst({
        where: eq(drizzleSchema.persons.id, user.personId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      })
    : null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    oidcProvider: user.oidcProvider,
    profileClaimStatus: user.profileClaimStatus,
    profileClaimedAt: user.profileClaimedAt,
    personId: user.personId,
    person,
  };
}
