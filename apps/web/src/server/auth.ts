import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { notifyNewMemberJoined } from "./notifications";
import { logger } from "@vamsa/lib/logger";
import {
  checkRateLimit,
  resetRateLimit,
  getClientIP,
} from "./middleware/rate-limiter";
import { t } from "./i18n";

/**
 * Hash a session token for secure database storage
 * Uses SHA-256 which is sufficient for session tokens since:
 * - Tokens are random 256-bit values (high entropy)
 * - No need for slow hashing (unlike passwords)
 * - Fast lookup is desirable for session validation
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const TOKEN_COOKIE_NAME = "vamsa-session";
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    name: z.string().min(1, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const claimProfileSchema = z.object({
  email: z.string().email("Invalid email address"),
  personId: z.string().min(1, "Please select your profile"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Get the current session token from cookie
export const getSessionToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const token = getCookie(TOKEN_COOKIE_NAME);
    return token ?? null;
  }
);

// Set a session token in cookie
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

// Clear the session token
export const clearSessionToken = createServerFn({ method: "POST" }).handler(
  async () => {
    deleteCookie(TOKEN_COOKIE_NAME);
    return { success: true };
  }
);

// Login with email and password
export const login = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => {
    return loginSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const { email, password } = data;

    // Rate limit by IP address
    const clientIP = getClientIP();
    checkRateLimit("login", clientIP);

    logger.info({ email: email.toLowerCase() }, "Login attempt");

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    logger.debug(
      { userId: user?.id, email: user?.email, found: !!user },
      "User lookup result"
    );

    if (!user || !user.passwordHash) {
      logger.warn(
        { email: email.toLowerCase() },
        "User not found or no password hash"
      );
      throw new Error(await t("errors:auth.invalidCredentials"));
    }

    if (!user.isActive) {
      logger.warn({ userId: user.id }, "User account is disabled");
      throw new Error(await t("errors:auth.accountDisabled"));
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      logger.warn({ userId: user.id, remainingMinutes }, "Account is locked");
      throw new Error(
        await t("errors:auth.accountLocked", { minutes: remainingMinutes })
      );
    }

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
      const LOCKOUT_THRESHOLD = 5;
      const LOCKOUT_DURATION_MINUTES = 15;

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

      await prisma.user.update({
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

    // Generate session token
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_MAX_AGE * 1000);

    logger.debug({ userId: user.id }, "Creating session");

    // Create session with hashed token for secure storage
    await prisma.session.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    logger.debug({ userId: user.id }, "Session created, updating last login");

    // Reset failed attempts on successful login and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

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

    logger.info({ userId: user.id, email: user.email }, "Login successful");

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        oidcProvider: user.oidcProvider,
        profileClaimStatus: user.profileClaimStatus,
      },
    };
  });

// Register with email, name, and password
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

    logger.info({ email: email.toLowerCase() }, "Registration attempt");

    // Check if self-registration is enabled
    const settings = await prisma.familySettings.findFirst();
    if (!settings?.allowSelfRegistration) {
      logger.warn("Self-registration is disabled");
      throw new Error("Self-registration is disabled");
    }

    // Check for duplicate email (case-insensitive)
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      logger.warn(
        { email: email.toLowerCase() },
        "User with this email already exists"
      );
      throw new Error(await t("errors:user.alreadyExists"));
    }

    // Hash password
    logger.debug("Hashing password");
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    logger.debug("Creating user");
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: "VIEWER",
        isActive: true,
      },
    });

    logger.info({ userId: user.id }, "User registered successfully");

    // Send notification about new member joined (if they are a viewer, they won't trigger notifications yet)
    // We'll notify when they upgrade to MEMBER role

    return { success: true, userId: user.id };
  });

// Get unclaimed living profiles that can be claimed
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

// Claim a profile by creating a user linked to a person
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

    logger.info({ personId }, "Claim profile attempt");

    // Verify the person exists and is living
    const person = await prisma.person.findUnique({
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
      "Profile found"
    );

    // Verify no user already has this personId
    const existingUserWithPerson = await prisma.user.findUnique({
      where: { personId },
    });

    if (existingUserWithPerson) {
      logger.warn({ personId }, "Profile is already claimed");
      throw new Error("This profile is already claimed");
    }

    // Check if email is already taken
    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUserWithEmail) {
      logger.warn({ email: email.toLowerCase() }, "Email already in use");
      throw new Error(await t("errors:user.alreadyExists"));
    }

    // Hash password with bcrypt (12 rounds)
    logger.debug("Hashing password");
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with role MEMBER, linked to personId
    logger.debug("Creating user with MEMBER role");
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: `${person.firstName} ${person.lastName}`,
        passwordHash,
        personId,
        role: "MEMBER",
        isActive: true,
      },
    });

    logger.info({ userId: user.id, personId }, "Profile claimed successfully");

    // Send notification about new family member joined
    await notifyNewMemberJoined(user.id);

    return { success: true, userId: user.id };
  });

// Change password
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
    // 1. Get current session token
    const token = getCookie(TOKEN_COOKIE_NAME);
    if (!token) {
      throw new Error(await t("errors:auth.notAuthenticated"));
    }

    // 2. Find session and user (hash token for lookup)
    const tokenHash = hashToken(token);
    const session = await prisma.session.findFirst({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new Error(await t("errors:auth.sessionExpired"));
    }

    const user = session.user;

    // 3. Check if user has passwordHash (not OAuth-only)
    if (!user.passwordHash) {
      throw new Error("Cannot change password for OAuth accounts");
    }

    // 4. Verify current password
    const validCurrentPassword = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash
    );
    if (!validCurrentPassword) {
      throw new Error("Current password is incorrect");
    }

    // 5. Hash new password (12 rounds)
    const newPasswordHash = await bcrypt.hash(data.newPassword, 12);

    // 6. Update user with new hash and clear mustChangePassword
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    logger.info({ userId: user.id }, "Password changed");

    return { success: true };
  });

// Logout
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(TOKEN_COOKIE_NAME);

  if (token) {
    // Delete session from database (hash token for lookup)
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({
      where: { token: tokenHash },
    });
  }

  // Clear cookie
  deleteCookie(TOKEN_COOKIE_NAME);

  return { success: true };
});

// Get current user from session
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const token = getCookie(TOKEN_COOKIE_NAME);

    if (!token) {
      return null;
    }

    // Find session (hash token for lookup)
    const tokenHash = hashToken(token);
    const session = await prisma.session.findFirst({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Session expired, clean up
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      deleteCookie(TOKEN_COOKIE_NAME);
      return null;
    }

    const { user } = session;

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
);

// Validate session (for route guards)
export const validateSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const token = getCookie(TOKEN_COOKIE_NAME);

    if (!token) {
      return { valid: false, user: null };
    }

    // Hash token for lookup
    const tokenHash = hashToken(token);
    const session = await prisma.session.findFirst({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return { valid: false, user: null };
    }

    return {
      valid: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        mustChangePassword: session.user.mustChangePassword,
        oidcProvider: session.user.oidcProvider,
        profileClaimStatus: session.user.profileClaimStatus,
      },
    };
  }
);
