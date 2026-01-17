"use server";

import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "./test-helpers/react-start-server";
import {
  loginUser,
  registerUser,
  claimProfileAsUser,
  changeUserPassword,
  verifySessionToken,
  createSessionToken,
  hashToken,
  TOKEN_COOKIE_NAME,
  TOKEN_MAX_AGE,
} from "@vamsa/lib/server/business";
import {
  loginSchema,
  registerSchema,
  claimProfileSchema,
  changePasswordSchema,
} from "@vamsa/schemas";
import { prisma } from "@vamsa/lib/server";
import { logger } from "@vamsa/lib/logger";
import { t } from "@vamsa/lib/server";
import {
  checkRateLimit,
  resetRateLimit,
  getClientIP,
} from "./middleware/rate-limiter";
import { notifyNewMemberJoined } from "@vamsa/lib/server/business";

/**
 * Get the current session token from cookie
 * Wrapper function for retrieving session token without validation
 *
 * @returns Current session token or null if not set
 *
 * @example
 * const token = await getSessionToken();
 */
export const getSessionToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const token = getCookie(TOKEN_COOKIE_NAME);
    return token ?? null;
  }
);

/**
 * Set a session token in cookie
 * Raw cookie operation - typically used internally
 *
 * @param token - Session token to store
 * @returns Success confirmation
 *
 * @example
 * await setSessionToken(token);
 */
export const setSessionToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    setCookie(TOKEN_COOKIE_NAME, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });
    return { success: true };
  });

/**
 * Clear the session token from cookie
 * Used during logout
 *
 * @returns Success confirmation
 *
 * @example
 * await clearSessionToken();
 */
export const clearSessionToken = createServerFn({ method: "POST" }).handler(
  async () => {
    deleteCookie(TOKEN_COOKIE_NAME);
    return { success: true };
  }
);

/**
 * Login user with email and password
 * Validates credentials, handles account lockout, and creates session
 *
 * @param email - User email
 * @param password - User password
 * @returns Authenticated user object
 * @throws Error for invalid credentials, disabled account, or lockout
 *
 * @example
 * const { user } = await login({ email: "john@example.com", password: "pass123" });
 */
export const login = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => {
    return loginSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const { email, password } = data;

    // Rate limit by IP address
    const clientIP = getClientIP();
    checkRateLimit("login", clientIP);

    try {
      const { user, token } = await loginUser(email, password);

      // Set cookie
      logger.debug({ userId: user.id }, "Setting session cookie");
      setCookie(TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: TOKEN_MAX_AGE,
        path: "/",
      });

      // Reset rate limit on successful login
      resetRateLimit("login", clientIP);

      return {
        success: true,
        user,
      };
    } catch (error) {
      logger.warn({ email: email.toLowerCase(), error }, "Login failed");
      throw error;
    }
  });

/**
 * Register new user with email, name, and password
 * Creates VIEWER role account, requires self-registration to be enabled
 *
 * @param email - User email
 * @param name - User full name
 * @param password - User password (min 8 chars)
 * @param confirmPassword - Password confirmation (validated in schema)
 * @returns New user ID
 * @throws Error if email exists, self-registration disabled, or validation fails
 *
 * @example
 * const { userId } = await register({
 *   email: "jane@example.com",
 *   name: "Jane Doe",
 *   password: "newpass123",
 *   confirmPassword: "newpass123"
 * });
 */
export const register = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      email: string;
      name: string;
      password: string;
      confirmPassword: string;
    }) => {
      return registerSchema.parse(data);
    }
  )
  .handler(async ({ data }) => {
    const { email, name, password } = data;

    // Rate limit by IP address
    const clientIP = getClientIP();
    checkRateLimit("register", clientIP);

    try {
      const userId = await registerUser(email, name, password);

      logger.info({ userId }, "Registration successful");

      return { success: true, userId };
    } catch (error) {
      logger.warn({ email: email.toLowerCase(), error }, "Registration failed");
      throw error;
    }
  });

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
      const userId = await claimProfileAsUser(email, personId, password);

      // Send notification about new family member joined
      await notifyNewMemberJoined(userId);

      logger.info({ userId, personId }, "Profile claimed successfully");

      return { success: true, userId };
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
    const token = getCookie(TOKEN_COOKIE_NAME);

    try {
      await changeUserPassword(token, data.currentPassword, data.newPassword);

      logger.info("Password changed successfully");

      return { success: true };
    } catch (error) {
      logger.warn({ error }, "Password change failed");
      throw error;
    }
  });

/**
 * Logout user by deleting session from database and clearing cookie
 * Safe to call even if user is not authenticated
 *
 * @returns Success confirmation
 *
 * @example
 * await logout();
 */
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(TOKEN_COOKIE_NAME);

  if (token) {
    try {
      // Delete session from database (hash token for lookup)
      const tokenHash = hashToken(token);
      await prisma.session.deleteMany({
        where: { token: tokenHash },
      });
      logger.debug("Session deleted from database");
    } catch (error) {
      logger.warn({ error }, "Failed to delete session from database");
      // Continue with cookie deletion even if DB deletion fails
    }
  }

  // Clear cookie
  deleteCookie(TOKEN_COOKIE_NAME);

  logger.info("Logout completed");

  return { success: true };
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
    const token = getCookie(TOKEN_COOKIE_NAME);
    const user = await verifySessionToken(token);

    if (!user) {
      // Session invalid or expired, ensure cookie is cleared
      deleteCookie(TOKEN_COOKIE_NAME);
      return null;
    }

    return user;
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
  const token = getCookie(TOKEN_COOKIE_NAME);
  const user = await verifySessionToken(token);

  if (!user) {
    return { valid: false, user: null };
  }

  return {
    valid: true,
    user,
  };
});

/**
 * Refresh session token by creating a new one
 * Invalidates old session and sets new cookie
 * Useful for extending session timeout on activity
 *
 * @returns New session token
 * @throws Error if user is not authenticated
 *
 * @example
 * const { token } = await refreshSession();
 */
export const refreshSession = createServerFn({ method: "POST" }).handler(
  async () => {
    const token = getCookie(TOKEN_COOKIE_NAME);

    // Verify current session
    const user = await verifySessionToken(token);
    if (!user) {
      throw new Error(await t("errors:auth.notAuthenticated"));
    }

    logger.debug({ userId: user.id }, "Refreshing session token");

    // Delete old session if token exists
    if (token) {
      const tokenHash = hashToken(token);
      await prisma.session.deleteMany({
        where: { token: tokenHash },
      });
    }

    // Create new session token
    const { token: newToken } = await createSessionToken(user.id);

    // Set new cookie
    setCookie(TOKEN_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    logger.info({ userId: user.id }, "Session token refreshed");

    return {
      success: true,
      token: newToken,
    };
  }
);

// Alias exports for backward compatibility
export { getSession as getCurrentUser, checkAuth as validateSession };
