/**
 * OIDC Profile Claiming Server Functions
 *
 * Handles the workflow for OIDC users to claim their person profiles
 * in the family tree.
 */

import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./db";
import { z } from "zod";
import { logger } from "@vamsa/lib/logger";
import {
  findSuggestedMatches,
  validateClaim,
  type ClaimableProfile,
  type ClaimingUser,
  type ProfileMatch,
} from "@vamsa/lib";
import { notifyNewMemberJoined } from "./notifications";
import { createHash } from "crypto";

// Constants
const TOKEN_COOKIE_NAME = "vamsa-session";

// Hash session token for lookup
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Get current authenticated user
async function getCurrentAuthenticatedUser() {
  const token = getCookie(TOKEN_COOKIE_NAME);

  if (!token) {
    throw new Error("Not authenticated");
  }

  const tokenHash = hashToken(token);
  const session = await prisma.session.findFirst({
    where: { token: tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error("Session expired");
  }

  return session.user;
}

// Zod schemas
const oidcClaimProfileSchema = z.object({
  personId: z.string().min(1, "Please select your profile"),
});

// Get claimable profiles for OIDC user
export const getOIDCClaimableProfiles = createServerFn({
  method: "GET",
}).handler(async () => {
  const user = await getCurrentAuthenticatedUser();

  if (!user.oidcProvider) {
    throw new Error("This endpoint is for OIDC users only");
  }

  logger.debug(
    { userId: user.id, provider: user.oidcProvider },
    "Fetching claimable profiles for OIDC user"
  );

  // Get all personIds that are already claimed
  const usersWithPeople = await prisma.user.findMany({
    where: { personId: { not: null } },
    select: { personId: true },
  });

  const claimedPersonIds = usersWithPeople
    .map((u) => u.personId)
    .filter((id): id is string => id !== null);

  logger.debug({ count: claimedPersonIds.length }, "Claimed person IDs");

  // Get all living persons not yet claimed
  const profiles = await prisma.person.findMany({
    where: {
      isLiving: true,
      id: { notIn: claimedPersonIds },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      dateOfBirth: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
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
});

// Claim a profile for OIDC user
export const claimProfileOIDC = createServerFn({ method: "POST" })
  .inputValidator((data) => oidcClaimProfileSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await getCurrentAuthenticatedUser();
    const { personId } = data;

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
    const person = await prisma.person.findUnique({
      where: { id: personId },
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
    const existingClaim = await prisma.user.findUnique({
      where: { personId },
    });

    if (existingClaim) {
      logger.warn({ personId }, "Profile is already claimed by another user");
      throw new Error("This profile is already claimed by another user");
    }

    // Link user to person and promote to MEMBER
    logger.debug({ userId: user.id, personId }, "Linking user to person");
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        personId,
        role: "MEMBER",
        profileClaimStatus: "CLAIMED",
        profileClaimedAt: new Date(),
      },
    });

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
  });

// Skip profile claiming
export const skipProfileClaim = createServerFn({ method: "POST" }).handler(
  async () => {
    const user = await getCurrentAuthenticatedUser();

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
    await prisma.user.update({
      where: { id: user.id },
      data: { profileClaimStatus: "SKIPPED" },
    });

    logger.info({ userId: user.id }, "Profile claim skipped");

    return { success: true };
  }
);

// Get current OIDC user's claim status
export const getOIDCClaimStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await getCurrentAuthenticatedUser();

    if (!user.oidcProvider) {
      return null;
    }

    logger.debug({ userId: user.id }, "Fetching OIDC claim status");

    const person = user.personId
      ? await prisma.person.findUnique({
          where: { id: user.personId },
          select: {
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
);
