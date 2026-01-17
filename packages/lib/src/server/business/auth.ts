import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import { logger } from "@vamsa/lib/logger";
import { t } from "../i18n";

/**
 * Type for the database client used by auth functions.
 * This allows dependency injection for testing.
 */
export type AuthDb = Pick<
  PrismaClient,
  "session" | "user" | "person" | "familySettings"
>;

/**
 * Constants for session and account lockout management
 */
export const TOKEN_COOKIE_NAME = "vamsa-session";
export const TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Hash a password using bcrypt for secure storage
 * Uses 12 rounds which provides good balance between security and performance
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to bcrypt hash
 * @throws Error if hashing fails
 *
 * @example
 * const hash = await hashPassword("myPassword123");
 * // Store hash in database
 */
export async function hashPassword(password: string): Promise<string> {
  logger.debug("Hashing password with bcrypt");
  return bcrypt.hash(password, 12);
}

/**
 * Hash a session token using SHA-256 for database storage
 * Uses SHA-256 (not bcrypt) because:
 * - Tokens are already random 256-bit values with high entropy
 * - No need for slow hashing (unlike passwords)
 * - Fast lookup is desirable for session validation
 *
 * @param token - Raw session token (hex string)
 * @returns SHA-256 hash of the token
 *
 * @example
 * const hash = hashToken("abc123def456");
 * // Store hash in database, not the raw token
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a new session token and its database record
 * Returns the unhashed token for cookie storage
 *
 * @param userId - ID of the user to create session for
 * @returns Object containing the unhashed token for cookie and session ID
 * @throws Error if session creation fails
 *
 * @example
 * const { token, sessionId } = await createSessionToken(user.id);
 * setCookie("vamsa-session", token, { httpOnly: true });
 */
export async function createSessionToken(
  userId: string,
  db: AuthDb = defaultPrisma
): Promise<{
  token: string;
  sessionId: string;
}> {
  logger.debug({ userId }, "Creating session token");

  // Generate random 32-byte token
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_MAX_AGE * 1000);

  // Store hashed token in database
  const session = await db.session.create({
    data: {
      token: tokenHash,
      userId,
      expiresAt,
    },
  });

  logger.debug({ userId, sessionId: session.id }, "Session created");

  return {
    token,
    sessionId: session.id,
  };
}

/**
 * Verify a session token and retrieve the associated user
 * Handles token hashing and expiration validation
 *
 * @param token - Raw session token from cookie
 * @returns User object if session is valid, null otherwise
 *
 * @example
 * const user = await verifySessionToken(cookieToken);
 * if (user) {
 *   // Session is valid
 * }
 */
export async function verifySessionToken(
  token: string | null | undefined,
  db: AuthDb = defaultPrisma
): Promise<{
  id: string;
  email: string;
  name: string | null;
  role: string;
  personId: string | null;
  mustChangePassword: boolean;
  oidcProvider: string | null;
  profileClaimStatus: string;
} | null> {
  if (!token) {
    logger.debug("No session token provided");
    return null;
  }

  logger.debug("Verifying session token");

  const tokenHash = hashToken(token);
  const session = await db.session.findFirst({
    where: { token: tokenHash },
    include: { user: true },
  });

  if (!session) {
    logger.warn("Session not found in database");
    return null;
  }

  if (session.expiresAt < new Date()) {
    logger.debug({ sessionId: session.id }, "Session expired, cleaning up");
    // Clean up expired session
    await db.session.delete({ where: { id: session.id } });
    return null;
  }

  const { user } = session;

  logger.debug({ userId: user.id }, "Session verified successfully");

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    personId: user.personId,
    mustChangePassword: user.mustChangePassword,
    oidcProvider: user.oidcProvider,
    profileClaimStatus: user.profileClaimStatus,
  };
}

/**
 * Check if a user account is locked due to failed login attempts
 * Returns remaining lockout time if locked, null if account is accessible
 *
 * @param user - User object from database
 * @returns Lockout info if locked, null if account is accessible
 * @throws Error with translated message if account is locked
 *
 * @example
 * try {
 *   await checkAccountLockout(user);
 * } catch (err) {
 *   // Account is locked
 * }
 */
export async function checkAccountLockout(user: {
  id: string;
  lockedUntil: Date | null;
  failedLoginAttempts: number;
}): Promise<void> {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    logger.warn(
      { userId: user.id, remainingMinutes },
      "Account is locked due to too many failed attempts"
    );
    throw new Error(
      await t("errors:auth.accountLocked", { minutes: remainingMinutes })
    );
  }
}

/**
 * Authenticate a user with email and password
 * Handles rate limiting, account lockout, and password verification
 *
 * @param email - User email (case-insensitive)
 * @param password - Plain text password
 * @param clientIP - Client IP address for rate limiting
 * @returns Authenticated user object with token
 * @throws Error with translated messages for various failure cases
 *
 * @example
 * const { user, token } = await loginUser("john@example.com", "password123", "192.168.1.1");
 * setCookie("vamsa-session", token, { httpOnly: true });
 */
export async function loginUser(
  email: string,
  password: string,
  db: AuthDb = defaultPrisma
): Promise<{
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    mustChangePassword: boolean;
    oidcProvider: string | null;
    profileClaimStatus: string;
  };
  token: string;
}> {
  const normalizedEmail = email.toLowerCase();

  logger.info({ email: normalizedEmail }, "Login attempt");

  // Find user by email
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  logger.debug(
    { userId: user?.id, email: user?.email, found: !!user },
    "User lookup result"
  );

  if (!user || !user.passwordHash) {
    logger.warn(
      { email: normalizedEmail },
      "User not found or no password hash"
    );
    throw new Error(await t("errors:auth.invalidCredentials"));
  }

  if (!user.isActive) {
    logger.warn({ userId: user.id }, "User account is disabled");
    throw new Error(await t("errors:auth.accountDisabled"));
  }

  // Check account lockout
  await checkAccountLockout(user);

  // Verify password
  logger.debug({ userId: user.id }, "Comparing passwords");
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  logger.debug(
    { userId: user.id, valid: validPassword },
    "Password validation result"
  );

  if (!validPassword) {
    // Increment failed attempts
    const failedAttempts = user.failedLoginAttempts + 1;

    const updateData: {
      failedLoginAttempts: number;
      lastFailedLoginAt: Date;
      lockedUntil?: Date;
    } = {
      failedLoginAttempts: failedAttempts,
      lastFailedLoginAt: new Date(),
    };

    // Lock account after threshold exceeded
    if (failedAttempts >= LOCKOUT_THRESHOLD) {
      updateData.lockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
      );
      logger.warn(
        { userId: user.id, failedAttempts },
        "Account locked due to too many failed attempts"
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    if (failedAttempts >= LOCKOUT_THRESHOLD) {
      throw new Error(
        await t("errors:auth.accountLockedAfterThreshold", {
          minutes: LOCKOUT_DURATION_MINUTES,
        })
      );
    }

    const attemptsRemaining = LOCKOUT_THRESHOLD - failedAttempts;
    logger.warn(
      { userId: user.id, failedAttempts, attemptsRemaining },
      "Failed login attempt"
    );

    const errorMsg = await t("errors:auth.invalidCredentials");
    const attemptsMsg = await t("auth:attempts_remaining", {
      count: attemptsRemaining,
    });
    throw new Error(`${errorMsg}. ${attemptsMsg}`);
  }

  // Create session and get token
  const { token } = await createSessionToken(user.id, db);

  logger.debug(
    { userId: user.id },
    "Updating last login and resetting attempts"
  );

  // Reset failed attempts on successful login and update last login
  await db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  logger.info({ userId: user.id, email: user.email }, "Login successful");

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      oidcProvider: user.oidcProvider,
      profileClaimStatus: user.profileClaimStatus,
    },
    token,
  };
}

/**
 * Register a new user with email, name, and password
 * Handles self-registration settings and duplicate email validation
 *
 * @param email - User email (will be normalized to lowercase)
 * @param name - User full name
 * @param password - Plain text password (must be at least 8 chars)
 * @returns New user ID
 * @throws Error if registration is disabled, email exists, or creation fails
 *
 * @example
 * const userId = await registerUser("john@example.com", "John Doe", "password123");
 */
export async function registerUser(
  email: string,
  name: string,
  password: string,
  db: AuthDb = defaultPrisma
): Promise<string> {
  const normalizedEmail = email.toLowerCase();

  logger.info({ email: normalizedEmail }, "Registration attempt");

  // Check if self-registration is enabled
  const settings = await db.familySettings.findFirst();
  if (!settings?.allowSelfRegistration) {
    logger.warn("Self-registration is disabled");
    throw new Error("Self-registration is disabled");
  }

  // Check for duplicate email (case-insensitive)
  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    logger.warn(
      { email: normalizedEmail },
      "User with this email already exists"
    );
    throw new Error(await t("errors:user.alreadyExists"));
  }

  // Hash password
  logger.debug("Hashing password");
  const passwordHash = await hashPassword(password);

  // Create user
  logger.debug("Creating user");
  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name,
      passwordHash,
      role: "VIEWER",
      isActive: true,
    },
  });

  logger.info({ userId: user.id }, "User registered successfully");

  return user.id;
}

/**
 * Claim a family profile by creating a user linked to a Person
 * User must provide email, password, and select a living unclaimed profile
 *
 * @param email - User email (will be normalized to lowercase)
 * @param personId - ID of the Person profile to claim
 * @param password - Plain text password
 * @returns New user ID
 * @throws Error if profile doesn't exist, is already claimed, email exists, etc.
 *
 * @example
 * const userId = await claimProfileAsUser("jane@example.com", "person_123", "password123");
 */
export async function claimProfileAsUser(
  email: string,
  personId: string,
  password: string,
  db: AuthDb = defaultPrisma
): Promise<string> {
  const normalizedEmail = email.toLowerCase();

  logger.info({ personId }, "Profile claim attempt");

  // Verify the person exists and is living
  const person = await db.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    logger.warn({ personId }, "Profile not found");
    throw new Error(await t("errors:person.notFound"));
  }

  if (!person.isLiving) {
    logger.warn({ personId }, "Cannot claim a non-living profile");
    throw new Error("Cannot claim a non-living profile");
  }

  logger.debug(
    { personId, firstName: person.firstName, lastName: person.lastName },
    "Profile found and is living"
  );

  // Verify no user already has this personId
  const existingUserWithPerson = await db.user.findUnique({
    where: { personId },
  });

  if (existingUserWithPerson) {
    logger.warn({ personId }, "Profile is already claimed");
    throw new Error("This profile is already claimed");
  }

  // Check if email is already taken
  const existingUserWithEmail = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUserWithEmail) {
    logger.warn({ email: normalizedEmail }, "Email already in use");
    throw new Error(await t("errors:user.alreadyExists"));
  }

  // Hash password
  logger.debug("Hashing password for profile claim");
  const passwordHash = await hashPassword(password);

  // Create user with MEMBER role, linked to personId
  logger.debug("Creating user with MEMBER role");
  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name: `${person.firstName} ${person.lastName}`,
      passwordHash,
      personId,
      role: "MEMBER",
      isActive: true,
      profileClaimStatus: "CLAIMED",
      profileClaimedAt: new Date(),
    },
  });

  logger.info({ userId: user.id, personId }, "Profile claimed successfully");

  return user.id;
}

/**
 * Change user password after verifying current password
 * User must be authenticated (have valid session token)
 *
 * @param sessionToken - Current session token from cookie
 * @param currentPassword - Plain text current password for verification
 * @param newPassword - Plain text new password (must be at least 8 chars)
 * @throws Error if session is invalid, password is wrong, or user is OAuth-only
 *
 * @example
 * await changeUserPassword(token, "oldpass123", "newpass456");
 */
export async function changeUserPassword(
  sessionToken: string | null | undefined,
  currentPassword: string,
  newPassword: string,
  db: AuthDb = defaultPrisma
): Promise<void> {
  if (!sessionToken) {
    throw new Error(await t("errors:auth.notAuthenticated"));
  }

  logger.debug("Verifying session for password change");

  // Verify session and get user
  const user = await db.user.findFirst({
    where: {
      sessions: {
        some: {
          token: hashToken(sessionToken),
          expiresAt: { gt: new Date() },
        },
      },
    },
  });

  if (!user) {
    throw new Error(await t("errors:auth.sessionExpired"));
  }

  // Check if user has passwordHash (not OAuth-only)
  if (!user.passwordHash) {
    throw new Error("Cannot change password for OAuth accounts");
  }

  // Verify current password
  logger.debug({ userId: user.id }, "Verifying current password");
  const validCurrentPassword = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!validCurrentPassword) {
    logger.warn({ userId: user.id }, "Current password verification failed");
    throw new Error("Current password is incorrect");
  }

  // Hash new password
  logger.debug({ userId: user.id }, "Hashing new password");
  const newPasswordHash = await hashPassword(newPassword);

  // Update user with new hash and clear mustChangePassword flag
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    },
  });

  logger.info({ userId: user.id }, "Password changed successfully");
}
