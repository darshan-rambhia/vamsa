import { Hono } from "hono";
import { z } from "zod";
import {
  login as serverLogin,
  register as serverRegister,
} from "../../src/server/auth";
import { logger } from "@vamsa/lib/logger";

const authRouter = new Hono();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z
  .object({
    email: z.string().email("Invalid email"),
    name: z.string().min(1, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * POST /api/v1/auth/login
 * Login with email and password
 */
authRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = loginSchema.parse(body);

    // Use server function for login
    const result = await serverLogin({ data: { email, password } });

    if (!result || typeof result !== "object" || "error" in result) {
      return c.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Extract user and token from the result
    const user = result.user || result;
    const token =
      result.token || (result as Record<string, unknown>).sessionToken;

    // Set session cookie via Set-Cookie header
    if (token) {
      const cookieValue = `vamsa-session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`;
      c.header("Set-Cookie", cookieValue);
    }

    return c.json(
      {
        user,
        token: token || "",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.errors[0]?.message,
        },
        { status: 400 }
      );
    }

    logger.error({ error }, "Login error");
    return c.json({ error: "Login failed" }, { status: 500 });
  }
});

/**
 * POST /api/v1/auth/register
 * Register a new account
 */
authRouter.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, password } = registerSchema.parse(body);

    // Use server function for registration
    const result = await serverRegister({
      data: { email, name, password },
    });

    if (!result || typeof result !== "object" || "error" in result) {
      return c.json({ error: "Registration failed" }, { status: 400 });
    }

    // Extract user and token
    const user = result.user || result;
    const token =
      result.token || (result as Record<string, unknown>).sessionToken;

    // Set session cookie
    if (token) {
      const cookieValue = `vamsa-session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`;
      c.header("Set-Cookie", cookieValue);
    }

    return c.json(
      {
        user,
        token: token || "",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.errors[0]?.message,
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    if (
      error instanceof Error &&
      error.message.includes("Email already exists")
    ) {
      return c.json({ error: "Email already in use" }, { status: 409 });
    }

    logger.error({ error }, "Registration error");
    return c.json({ error: "Registration failed" }, { status: 500 });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout the current user
 */
authRouter.post("/logout", async (c) => {
  try {
    // Clear session cookie
    c.header(
      "Set-Cookie",
      "vamsa-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
    );

    return c.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Logout error");
    return c.json({ error: "Logout failed" }, { status: 500 });
  }
});

export default authRouter;
