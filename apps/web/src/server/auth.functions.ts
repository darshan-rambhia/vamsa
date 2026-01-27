"use server";

/**
 * Auth server functions (createServerFn wrappers)
 *
 * This file exports the public API for auth operations.
 * Safe to import from client components.
 *
 * @fileoverview Client-importable server function exports
 */

import { createServerFn } from "@tanstack/react-start";
import {
  getUnclaimedProfilesHandler,
  claimProfileHandler,
  changePasswordHandler,
  getSessionHandler,
  checkAuthHandler,
  logoutHandler,
  getAvailableProvidersHandler,
} from "./auth.server";

/**
 * Get unclaimed living profiles available for claiming
 * Returns profiles not yet linked to any user
 *
 * @returns Array of claimable profiles with id, firstName, lastName
 *
 * @example
 * const profiles = await getUnclaimedProfiles();
 * // [{ id: "person_123", firstName: "John", lastName: "Doe" }, ...]
 */
export const getUnclaimedProfiles = createServerFn({ method: "GET" }).handler(
  getUnclaimedProfilesHandler
);

/**
 * Claim a family profile by creating a user account linked to a Person
 * User must provide email, select a living unclaimed profile, and create password
 *
 * @param email - User email
 * @param personId - ID of the Person profile to claim
 * @param password - User password (min 8 chars)
 * @returns New user ID
 * @throws Error if profile doesn't exist, is already claimed, or email exists
 *
 * @example
 * const { userId } = await claimProfile({
 *   email: "john@example.com",
 *   personId: "person_456",
 *   password: "password123"
 * });
 */
export const claimProfile = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { email: string; personId: string; password: string }) => data
  )
  .handler(async ({ data }) => claimProfileHandler(data));

/**
 * Change user password after verifying current password
 * User must be authenticated (have valid session token)
 *
 * @param currentPassword - Current password for verification
 * @param newPassword - New password (min 8 chars)
 * @param confirmPassword - Password confirmation (validated in schema)
 * @throws Error if session invalid, current password wrong, or user is OAuth-only
 *
 * @example
 * await changePassword({
 *   currentPassword: "oldpass123",
 *   newPassword: "newpass456",
 *   confirmPassword: "newpass456"
 * });
 */
export const changePassword = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => data
  )
  .handler(async ({ data }) => changePasswordHandler(data));

/**
 * Get current authenticated user from session
 * Returns null if session is invalid or expired
 *
 * @returns Current user object with id, email, name, role, etc. or null
 *
 * @example
 * const user = await getSession();
 * if (user) {
 *   console.log(`Logged in as: ${user.email}`);
 * }
 */
export const getSession = createServerFn({ method: "GET" }).handler(
  getSessionHandler
);

/**
 * Validate session without retrieving full user object
 * Useful for route guards and permission checks
 *
 * @returns Object with valid boolean and user object if valid
 *
 * @example
 * const { valid, user } = await checkAuth();
 * if (!valid) {
 *   // Redirect to login
 * }
 */
export const checkAuth = createServerFn({ method: "GET" }).handler(
  checkAuthHandler
);

/**
 * Logout user by invalidating session
 * Safe to call even if user is not authenticated
 *
 * @returns Success confirmation
 *
 * @example
 * await logout();
 */
export const logout = createServerFn({ method: "POST" }).handler(logoutHandler);

/**
 * Get available Better Auth providers
 * Returns which OAuth/OIDC providers are configured
 *
 * @returns Object with boolean flags for each provider
 *
 * @example
 * const providers = await getAvailableProviders();
 * // { google: true, github: false, microsoft: false, oidc: true }
 */
export const getAvailableProviders = createServerFn({ method: "GET" }).handler(
  getAvailableProvidersHandler
);

// Alias exports for backward compatibility
export { getSession as getCurrentUser, checkAuth as validateSession };
