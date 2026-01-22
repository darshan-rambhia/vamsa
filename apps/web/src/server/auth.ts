"use server";

import { createServerFn } from "@tanstack/react-start";
import { getCookie as getTanStackCookie } from "@tanstack/react-start/server";
import {
  betterAuthGetSessionWithUserFromCookie,
  betterAuthChangePassword,
  betterAuthSignOut,
  getBetterAuthProviders,
  betterAuthRegister,
} from "@vamsa/lib/server/business";
import {
  changePasswordSchema,
  claimProfileSchema,
} from "@vamsa/schemas";
import { prisma } from "@vamsa/lib/server";
import { logger } from "@vamsa/lib/logger";
import { t } from "@vamsa/lib/server";
import {
  checkRateLimit,
  getClientIP,
} from "./middleware/rate-limiter";
import { notifyNewMemberJoined } from "@vamsa/lib/server/business";

const BETTER_AUTH_COOKIE_NAME = "better-auth.session_token";

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
  async () => {
    logger.debug("Fetching unclaimed profiles");

    // Get all personIds that already have users
    const usersWithPeople = await prisma.user.findMany({
      where: { personId: { not: null } },
      select: { personId: true },
    });

    const claimedPersonIds = usersWithPeople
      .map((u) => u.personId)
      .filter((id): id is string => id !== null);

    logger.debug({ count: claimedPersonIds.length }, "Claimed profiles found");

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
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    logger.debug({ count: profiles.length }, "Unclaimed profiles found");

    return profiles;
  }
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
    (data: { email: string; personId: string; password: string }) => {
      return claimProfileSchema.parse(data);
    }
  )
  .handler(async ({ data }) => {
    const { email, personId, password } = data;

    // Rate limit by IP address
    const clientIP = getClientIP();
    checkRateLimit("claimProfile", clientIP);

    try {
      // Validate person exists and is living
      const person = await prisma.person.findUnique({
        where: { id: personId },
      });

      if (!person || !person.isLiving) {
        logger.warn({ personId }, "Profile not found or cannot be claimed");
        throw new Error(await t("errors:person.notFound"));
      }

      // Check if already claimed
      const existingUser = await prisma.user.findUnique({
        where: { personId },
      });

      if (existingUser) {
        logger.warn({ personId }, "Profile is already claimed");
        throw new Error("This profile is already claimed");
      }

      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingEmail) {
        logger.warn({ email: email.toLowerCase() }, "Email already in use");
        throw new Error(await t("errors:user.alreadyExists"));
      }

      // Create user via Better Auth - note: can't pass headers directly from server function
      // Better Auth will create user and set cookie via tanstackStartCookies plugin
      const result = await betterAuthRegister(
        email,
        `${person.firstName} ${person.lastName}`,
        password
      );

      if (!result?.user) {
        logger.warn({ email }, "Failed to create user via Better Auth");
        throw new Error("Failed to create user");
      }

      // Update user with Vamsa-specific fields
      await prisma.user.update({
        where: { id: result.user.id },
        data: {
          personId,
          role: "MEMBER",
          profileClaimStatus: "CLAIMED",
          profileClaimedAt: new Date(),
        },
      });

      logger.info({ userId: result.user.id, personId }, "Profile claimed successfully");

      // Send notification about new family member joined
      try {
        await notifyNewMemberJoined(result.user.id);
      } catch (error) {
        logger.warn({ userId: result.user.id, error }, "Failed to send notification");
      }

      return { success: true, userId: result.user.id };
    } catch (error) {
      logger.warn(
        { email: email.toLowerCase(), personId, error },
        "Profile claim failed"
      );
      throw error;
    }
  });

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
    }) => {
      return changePasswordSchema.parse(data);
    }
  )
  .handler(async ({ data }) => {
    try {
      const cookie = getTanStackCookie(BETTER_AUTH_COOKIE_NAME);
      await betterAuthChangePassword(
        data.currentPassword,
        data.newPassword,
        new Headers({
          cookie: cookie ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}` : "",
        })
      );

      logger.info("Password changed successfully");

      return { success: true };
    } catch (error) {
      logger.warn({ error }, "Password change failed");
      throw error;
    }
  });

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
  async () => {
    try {
      const cookie = getTanStackCookie(BETTER_AUTH_COOKIE_NAME);
      const user = await betterAuthGetSessionWithUserFromCookie(
        cookie ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}` : undefined
      );
      return user;
    } catch (error) {
      logger.debug({ error }, "Failed to get session");
      return null;
    }
  }
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
export const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
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
    logger.debug({ error }, "Auth check failed");
    return { valid: false, user: null };
  }
});

/**
 * Logout user by invalidating session
 * Safe to call even if user is not authenticated
 *
 * @returns Success confirmation
 *
 * @example
 * await logout();
 */
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const cookie = getTanStackCookie(BETTER_AUTH_COOKIE_NAME);
    await betterAuthSignOut(
      new Headers({
        cookie: cookie ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}` : "",
      })
    );
    logger.info("Logout completed");
  } catch (error) {
    logger.warn({ error }, "Logout failed");
    // Continue even if logout fails (e.g., no active session)
  }

  return { success: true };
});

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
  async () => {
    return getBetterAuthProviders();
  }
);

// Alias exports for backward compatibility
export { getSession as getCurrentUser, checkAuth as validateSession };
