/**
 * OIDC Profile Claiming Server Functions
 *
 * This module provides TanStack React Start server function wrappers
 * for OIDC profile claiming operations. Each function handles:
 * - Input validation with Zod schemas
 * - Auth context retrieval (session token)
 * - Delegation to business logic in claim.server.ts
 *
 * The actual business logic is separated to claim.server.ts for testability
 * and reusability.
 */

import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  getClaimableProfilesData,
  claimProfileForOIDCData,
  skipProfileClaimData,
  getOIDCClaimStatusData,
} from "@vamsa/lib/server/business";
import { hashToken } from "@vamsa/lib/server/business";
import { prisma } from "@vamsa/lib/server";

// Constants
const TOKEN_COOKIE_NAME = "vamsa-session";

/**
 * Get current authenticated user from session token
 * @returns User object with ID, email, name, and OIDC provider info
 * @throws Error if not authenticated or session expired
 */
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

/**
 * Server function: Get claimable profiles for OIDC user
 *
 * Returns all unclaimed living person profiles and suggested matches
 * based on email/name similarity.
 *
 * @requires OIDC authenticated user
 * @returns Object with all unclaimed profiles and suggested matches
 */
export const getOIDCClaimableProfiles = createServerFn({
  method: "GET",
}).handler(async () => {
  const user = await getCurrentAuthenticatedUser();
  return getClaimableProfilesData(user.id);
});

/**
 * Server function: Claim a profile for OIDC user
 *
 * Links the OIDC user to a person profile, promotes them to MEMBER role,
 * and sends notification to admins. User becomes a full family member
 * after claiming their profile.
 *
 * @requires OIDC authenticated user
 * @requires User has not yet claimed a profile
 * @throws Error if profile not found, already claimed, or user lacks permission
 */
export const claimProfileOIDC = createServerFn({ method: "POST" })
  .inputValidator((data) => oidcClaimProfileSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await getCurrentAuthenticatedUser();
    const { personId } = data;

    return claimProfileForOIDCData(user.id, personId);
  });

/**
 * Server function: Skip profile claiming
 *
 * Marks OIDC user as having skipped the profile claim workflow.
 * User can still claim a profile later if desired.
 *
 * @requires OIDC authenticated user
 * @requires User has not yet claimed a profile
 */
export const skipProfileClaim = createServerFn({ method: "POST" }).handler(
  async () => {
    const user = await getCurrentAuthenticatedUser();
    return skipProfileClaimData(user.id);
  }
);

/**
 * Server function: Get OIDC user's claim status
 *
 * Returns detailed information about the current OIDC user's profile
 * claim status, including which profile they've claimed (if any).
 *
 * @requires OIDC authenticated user
 * @returns Claim status object with user and person details, or null if not OIDC user
 */
export const getOIDCClaimStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await getCurrentAuthenticatedUser();
    return getOIDCClaimStatusData(user.id);
  }
);
