/**
 * Auth server-side handlers (server-only, testable)
 *
 * This file contains the actual handler implementations for auth operations.
 * These can be imported directly in tests using withStubbedServerContext.
 *
 * @fileoverview Server-only code - never import from client components
 */

import { getRequestHeaders } from "@tanstack/react-start/server";
// Import directly from specific modules to avoid pulling in media module (which imports sharp)
import {
  betterAuthChangePassword,
  betterAuthGetSessionWithUser,
  betterAuthSignOut,
  getBetterAuthProviders,
} from "@vamsa/lib/server/business/auth-better-api";
import {
  claimProfileData,
  getUnclaimedProfilesData,
} from "@vamsa/lib/server/business/auth";
import { changePasswordSchema, claimProfileSchema } from "@vamsa/schemas";
import { loggers } from "@vamsa/lib/logger";
import { checkRateLimit, getClientIP } from "./middleware/rate-limiter";

const log = loggers.auth;

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
  await checkRateLimit("claimProfile", clientIP);

  return claimProfileData(data.email, data.personId, data.password);
}

/**
 * Change user password after verifying current password
 */
export async function changePasswordHandler(input: ChangePasswordInput) {
  // Validate input
  const data = changePasswordSchema.parse(input);

  // Rate limit by IP address
  const clientIP = getClientIP();
  await checkRateLimit("passwordReset", clientIP);

  try {
    await betterAuthChangePassword(
      data.currentPassword,
      data.newPassword,
      getRequestHeaders()
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
    return await betterAuthGetSessionWithUser(getRequestHeaders());
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
    const user = await betterAuthGetSessionWithUser(getRequestHeaders());

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
    await betterAuthSignOut(getRequestHeaders());
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
