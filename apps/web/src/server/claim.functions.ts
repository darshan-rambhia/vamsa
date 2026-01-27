"use server";

/**
 * OIDC Profile Claiming server functions (createServerFn wrappers)
 *
 * This file exports the public API for OIDC claim operations.
 * Safe to import from client components.
 *
 * @fileoverview Client-importable server function exports
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getOIDCClaimableProfilesHandler,
  claimProfileOIDCHandler,
  skipProfileClaimHandler,
  getOIDCClaimStatusHandler,
} from "./claim.server";

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
}).handler(getOIDCClaimableProfilesHandler);

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
  .handler(async ({ data }) => claimProfileOIDCHandler(data));

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
  skipProfileClaimHandler
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
  getOIDCClaimStatusHandler
);
