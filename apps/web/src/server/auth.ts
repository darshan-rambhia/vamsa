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

    console.log("[Auth Server] User found:", user ? `${user.id} (${user.email})` : "NOT FOUND");

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
      },
    };
  }
);
