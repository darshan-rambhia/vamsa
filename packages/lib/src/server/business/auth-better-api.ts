import { auth } from "./auth-better";
import { logger } from "@vamsa/lib/logger";

/**
 * Better Auth API Wrapper Functions
 *
 * Provides a unified interface for common authentication operations using Better Auth.
 * Handles header conversion, logging, and error handling.
 *
 * The auth.api.* methods return results directly (not wrapped in { data, error }).
 * The tanstackStartCookies plugin automatically handles setting cookies in the response.
 */

/**
 * Helper to convert Headers to plain object for Better Auth API
 * Better Auth requires headers as a plain object for proper cookie handling
 */
function headersToObject(headers?: Headers): Record<string, string> {
  if (!headers) return {};
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * Login user with email and password using Better Auth
 *
 * @param email User email address
 * @param password User password
 * @param headers Request headers (required for cookie handling)
 * @returns Login result with user and session data
 * @throws Error if login fails or credentials are invalid
 *
 * @example
 * const result = await betterAuthLogin(
 *   "user@example.com",
 *   "password123",
 *   request.headers
 * );
 */
export async function betterAuthLogin(
  email: string,
  password: string,
  headers?: Headers
) {
  logger.debug({ email }, "Better Auth login attempt");

  const result = await auth.api.signInEmail({
    body: { email, password },
    headers: headersToObject(headers),
  });

  if (!result) {
    logger.warn({ email }, "Better Auth login failed - no result returned");
    throw new Error("Login failed");
  }

  logger.info({ email }, "Better Auth login successful");
  return result;
}

/**
 * Register new user with email and password using Better Auth
 *
 * @param email User email address
 * @param name User full name
 * @param password User password
 * @param headers Request headers (required for cookie handling)
 * @returns Registration result with user and session data
 * @throws Error if registration fails (e.g., email already exists)
 *
 * @example
 * const result = await betterAuthRegister(
 *   "newuser@example.com",
 *   "John Doe",
 *   "password123",
 *   request.headers
 * );
 */
export async function betterAuthRegister(
  email: string,
  name: string,
  password: string,
  headers?: Headers
) {
  logger.debug({ email, name }, "Better Auth registration attempt");

  const result = await auth.api.signUpEmail({
    body: { email, name, password },
    headers: headersToObject(headers),
  });

  if (!result) {
    logger.warn(
      { email },
      "Better Auth registration failed - no result returned"
    );
    throw new Error("Registration failed");
  }

  logger.info({ email }, "Better Auth registration successful");
  return result;
}

/**
 * Get current session from Better Auth
 *
 * Verifies the session cookie and returns the current user and session data.
 * Returns null if no valid session is found.
 *
 * @param headers Request headers (must contain session cookie)
 * @returns Session data with user info, or null if no valid session
 *
 * @example
 * const session = await betterAuthGetSession(request.headers);
 * if (session) {
 *   console.log("Logged in as:", session.user.email);
 * }
 */
export async function betterAuthGetSession(headers: Headers) {
  const result = await auth.api.getSession({
    headers: headersToObject(headers),
  });

  return result ?? null;
}

/**
 * Change password with Better Auth
 *
 * Requires the user to be authenticated (valid session).
 * The current password must be verified before the new password can be set.
 *
 * @param currentPassword User's current password
 * @param newPassword User's new password
 * @param headers Request headers (must contain valid session cookie)
 * @returns Result of password change operation
 * @throws Error if password change fails (invalid current password, etc.)
 *
 * @example
 * await betterAuthChangePassword(
 *   "oldPassword123",
 *   "newPassword456",
 *   request.headers
 * );
 */
export async function betterAuthChangePassword(
  currentPassword: string,
  newPassword: string,
  headers: Headers
) {
  logger.debug("Better Auth password change attempt");

  const result = await auth.api.changePassword({
    body: { currentPassword, newPassword },
    headers: headersToObject(headers),
  });

  if (!result) {
    logger.warn("Better Auth password change failed - no result returned");
    throw new Error("Password change failed");
  }

  logger.info("Better Auth password changed successfully");
  return result;
}

/**
 * Sign out user with Better Auth
 *
 * Invalidates the current session and clears session cookies.
 * The tanstackStartCookies plugin handles cookie removal in the response.
 *
 * @param headers Request headers (must contain valid session cookie)
 * @returns void
 *
 * @example
 * await betterAuthSignOut(request.headers);
 */
export async function betterAuthSignOut(headers: Headers) {
  logger.debug("Better Auth sign out");

  await auth.api.signOut({
    headers: headersToObject(headers),
  });

  logger.info("Better Auth sign out successful");
}

/**
 * Get current session with Vamsa user fields from cookie
 *
 * Returns user data including Vamsa-specific fields (role, personId, etc.)
 * Returns null if no valid session is found.
 *
 * @param cookieString - Cookie string (can be from headers or direct value)
 * @returns Session user data with Vamsa-specific fields, or null if no valid session
 *
 * @example
 * const user = await betterAuthGetSessionWithUserFromCookie(cookieValue);
 * if (user) {
 *   console.log(`Logged in as: ${user.email}, Role: ${user.role}`);
 * }
 */
export async function betterAuthGetSessionWithUserFromCookie(cookieString?: string) {
  if (!cookieString) {
    return null;
  }

  // Create a Headers-like object with the cookie
  const headers = new Headers({
    cookie: cookieString,
  });

  const session = await auth.api.getSession({
    headers: headersToObject(headers),
  });

  if (!session?.user) {
    return null;
  }

  // Return user with Vamsa-specific fields
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as any).role || "VIEWER",
    personId: (session.user as any).personId || null,
    mustChangePassword: (session.user as any).mustChangePassword || false,
    oidcProvider: (session.user as any).oidcProvider || null,
    profileClaimStatus: (session.user as any).profileClaimStatus || "PENDING",
  };
}

/**
 * Get current session with Vamsa user fields from headers
 *
 * Returns user data including Vamsa-specific fields (role, personId, etc.)
 * Returns null if no valid session is found.
 *
 * @param headers Request headers (must contain session cookie)
 * @returns Session user data with Vamsa-specific fields, or null if no valid session
 *
 * @example
 * const user = await betterAuthGetSessionWithUser(request.headers);
 * if (user) {
 *   console.log(`Logged in as: ${user.email}, Role: ${user.role}`);
 * }
 */
export async function betterAuthGetSessionWithUser(headers: Headers) {
  const session = await auth.api.getSession({
    headers: headersToObject(headers),
  });

  if (!session?.user) {
    return null;
  }

  // Return user with Vamsa-specific fields
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as any).role || "VIEWER",
    personId: (session.user as any).personId || null,
    mustChangePassword: (session.user as any).mustChangePassword || false,
    oidcProvider: (session.user as any).oidcProvider || null,
    profileClaimStatus: (session.user as any).profileClaimStatus || "PENDING",
  };
}

/**
 * Get available authentication providers
 *
 * Checks environment variables to determine which providers are configured
 * and available for use.
 *
 * @returns Object with boolean flags for each provider's availability
 *
 * @example
 * const providers = getBetterAuthProviders();
 * // Returns: { google: true, github: false, microsoft: false, oidc: true }
 */
export function getBetterAuthProviders() {
  return {
    google: !!process.env.GOOGLE_CLIENT_ID,
    github: !!process.env.GITHUB_CLIENT_ID,
    microsoft: !!process.env.MICROSOFT_CLIENT_ID,
    oidc: !!process.env.OIDC_DISCOVERY_URL,
  };
}
