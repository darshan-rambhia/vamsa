/**
 * Auth server-side handlers (server-only, testable)
 *
 * This file contains the actual handler implementations for auth operations.
 * These can be imported directly in tests using withStubbedServerContext.
 *
 * @fileoverview Server-only code - never import from client components
 */

import { getCookie as getTanStackCookie } from "@tanstack/react-start/server";
import {
  betterAuthGetSessionWithUserFromCookie,
  betterAuthChangePassword,
  betterAuthSignOut,
  getBetterAuthProviders,
  getUnclaimedProfilesData,
  claimProfileData,
} from "@vamsa/lib/server/business";
import { changePasswordSchema, claimProfileSchema } from "@vamsa/schemas";
import { loggers } from "@vamsa/lib/logger";
import { checkRateLimit, getClientIP } from "./middleware/rate-limiter";

const log = loggers.auth;

const BETTER_AUTH_COOKIE_NAME = "better-auth.session_token";

// ============================================================================
// Types
// ============================================================================

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ClaimProfileInput {
  email: string;
  personId: string;
  password: string;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Get unclaimed living profiles available for claiming
 */
export async function getUnclaimedProfilesHandler() {
  return getUnclaimedProfilesData();
}

/**
 * Claim a family profile by creating a user account linked to a Person
 */
export async function claimProfileHandler(input: ClaimProfileInput) {
  // Validate input
  const data = claimProfileSchema.parse(input);

  // Rate limit by IP address
  const clientIP = getClientIP();
  checkRateLimit("claimProfile", clientIP);

  return claimProfileData(data.email, data.personId, data.password);
}

/**
 * Change user password after verifying current password
 */
export async function changePasswordHandler(input: ChangePasswordInput) {
  // Validate input
  const data = changePasswordSchema.parse(input);

  try {
    const cookie = getTanStackCookie(BETTER_AUTH_COOKIE_NAME);
    await betterAuthChangePassword(
      data.currentPassword,
      data.newPassword,
      new Headers({
        cookie: cookie ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}` : "",
      })
    );

    log.info({}, "Password changed successfully");

    return { success: true };
  } catch (error) {
    log.withErr(error).msg("Password change failed");
    throw error;
  }
}

/**
 * Get current authenticated user from session
 */
export async function getSessionHandler() {
  try {
    const cookie = getTanStackCookie(BETTER_AUTH_COOKIE_NAME);
    const user = await betterAuthGetSessionWithUserFromCookie(
      cookie ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}` : undefined
    );
    return user;
  } catch (error) {
    log.withErr(error).msg("Failed to get session");
    return null;
  }
}

/**
 * Validate session without retrieving full user object
 */
export async function checkAuthHandler() {
  try {
    const cookie = getTanStackCookie(BETTER_AUTH_COOKIE_NAME);
    const user = await betterAuthGetSessionWithUserFromCookie(
      cookie ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}` : undefined
    );

    if (!user) {
      return { valid: false, user: null };
    }

    return {
      valid: true,
      user,
    };
  } catch (error) {
    log.withErr(error).msg("Auth check failed");
    return { valid: false, user: null };
  }
}

/**
 * Logout user by invalidating session
 */
export async function logoutHandler() {
  try {
    const cookie = getTanStackCookie(BETTER_AUTH_COOKIE_NAME);
    await betterAuthSignOut(
      new Headers({
        cookie: cookie ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}` : "",
      })
    );
    log.info({}, "Logout completed");
  } catch (error) {
    log.withErr(error).msg("Logout failed");
    // Continue even if logout fails (e.g., no active session)
  }

  return { success: true };
}

/**
 * Get available Better Auth providers
 */
export async function getAvailableProvidersHandler() {
  return getBetterAuthProviders();
}
