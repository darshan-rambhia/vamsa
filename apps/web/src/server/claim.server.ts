/**
 * OIDC Profile Claiming server-side handlers (server-only, testable)
 *
 * This file contains the actual handler implementations for OIDC claim operations.
 * These can be imported directly in tests using withStubbedServerContext.
 *
 * @fileoverview Server-only code - never import from client components
 */

import { getRequestHeaders } from "@tanstack/react-start/server";
import {
  betterAuthGetSessionWithUser,
  claimProfileForOIDCData,
  getClaimableProfilesData,
  getOIDCClaimStatusData,
  skipProfileClaimData,
} from "@vamsa/lib/server/business";

// ============================================================================
// Types
// ============================================================================

export interface ClaimProfileInput {
  personId: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get current authenticated user from Better Auth session
 * @returns User object with ID, email, name, and OIDC provider info
 * @throws Error if not authenticated or session expired
 */
export async function getCurrentAuthenticatedUser() {
  const user = await betterAuthGetSessionWithUser(getRequestHeaders());

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Get claimable profiles for OIDC user
 */
export async function getOIDCClaimableProfilesHandler() {
  const user = await getCurrentAuthenticatedUser();
  return getClaimableProfilesData(user.id);
}

/**
 * Claim a profile for OIDC user
 */
export async function claimProfileOIDCHandler(input: ClaimProfileInput) {
  const user = await getCurrentAuthenticatedUser();
  return claimProfileForOIDCData(user.id, input.personId);
}

/**
 * Skip profile claiming
 */
export async function skipProfileClaimHandler() {
  const user = await getCurrentAuthenticatedUser();
  return skipProfileClaimData(user.id);
}

/**
 * Get OIDC user's claim status
 */
export async function getOIDCClaimStatusHandler() {
  const user = await getCurrentAuthenticatedUser();
  return getOIDCClaimStatusData(user.id);
}
