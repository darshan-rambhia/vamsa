import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";

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

    console.log("[Auth Server] Login attempt for email:", email.toLowerCase());

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    console.log(
      "[Auth Server] User found:",
      user ? `${user.id} (${user.email})` : "NOT FOUND"
    );

    if (!user || !user.passwordHash) {
      console.log("[Auth Server] User not found or no password hash");
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      console.log("[Auth Server] User account is disabled");
      throw new Error("Account is disabled");
    }

    // Verify password
    console.log("[Auth Server] Comparing passwords...");
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    console.log("[Auth Server] Password valid:", validPassword);
    if (!validPassword) {
      throw new Error("Invalid email or password");
    }

    // Generate session token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_MAX_AGE * 1000);

    console.log("[Auth Server] Creating session for user:", user.id);

    // Create session
    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    console.log("[Auth Server] Session created, updating last login...");

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set cookie
    console.log("[Auth Server] Setting session cookie...");
    setCookie(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    console.log("[Auth Server] Login successful for", user.email);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
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

    console.log(
      "[Auth Server] Registration attempt for email:",
      email.toLowerCase()
    );

    // Check if self-registration is enabled
    const settings = await prisma.familySettings.findFirst();
    if (!settings?.allowSelfRegistration) {
      console.log("[Auth Server] Self-registration is disabled");
      throw new Error("Self-registration is disabled");
    }

    // Check for duplicate email (case-insensitive)
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      console.log("[Auth Server] User with this email already exists");
      throw new Error("User with this email already exists");
    }

    // Hash password
    console.log("[Auth Server] Hashing password...");
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    console.log("[Auth Server] Creating user...");
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: "VIEWER",
        isActive: true,
      },
    });

    console.log("[Auth Server] User registered successfully:", user.id);

    return { success: true, userId: user.id };
  });

// Get unclaimed living profiles that can be claimed
export const getUnclaimedProfiles = createServerFn({ method: "GET" }).handler(
  async () => {
    console.log("[Auth Server] Fetching unclaimed profiles...");

    // Get all personIds that already have users
    const usersWithPeople = await prisma.user.findMany({
      where: { personId: { not: null } },
      select: { personId: true },
    });

    const claimedPersonIds = usersWithPeople
      .map((u) => u.personId)
      .filter((id): id is string => id !== null);

    console.log(
      "[Auth Server] Found",
      claimedPersonIds.length,
      "claimed profiles"
    );

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

    console.log("[Auth Server] Found", profiles.length, "unclaimed profiles");

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

    console.log("[Auth Server] Claim profile attempt for personId:", personId);

    // Verify the person exists and is living
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      console.log("[Auth Server] Profile not found");
      throw new Error("Profile not found");
    }

    if (!person.isLiving) {
      console.log("[Auth Server] Cannot claim a non-living profile");
      throw new Error("Cannot claim a non-living profile");
    }

    console.log(
      "[Auth Server] Profile found:",
      person.firstName,
      person.lastName
    );

    // Verify no user already has this personId
    const existingUserWithPerson = await prisma.user.findUnique({
      where: { personId },
    });

    if (existingUserWithPerson) {
      console.log("[Auth Server] Profile is already claimed");
      throw new Error("This profile is already claimed");
    }

    // Check if email is already taken
    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUserWithEmail) {
      console.log("[Auth Server] Email already in use");
      throw new Error("Email already in use");
    }

    // Hash password with bcrypt (12 rounds)
    console.log("[Auth Server] Hashing password...");
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with role MEMBER, linked to personId
    console.log("[Auth Server] Creating user with MEMBER role...");
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

    console.log("[Auth Server] Profile claimed successfully:", user.id);

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
      throw new Error("Not authenticated");
    }

    // 2. Find session and user
    const session = await prisma.session.findFirst({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new Error("Session expired");
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

    console.log("[Auth Server] Password changed for user:", user.id);

    return { success: true };
  });

// Logout
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(TOKEN_COOKIE_NAME);

  if (token) {
    // Delete session from database
    await prisma.session.deleteMany({
      where: { token },
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

    // Find session
    const session = await prisma.session.findFirst({
      where: { token: token },
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

    const session = await prisma.session.findFirst({
      where: { token: token },
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
      },
    };
  }
);
