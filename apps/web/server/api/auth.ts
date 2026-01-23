import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  loginSchema,
  registerSchema,
  errorResponseSchema,
  successResponseSchema,
} from "@vamsa/schemas";
import {
  betterAuthLogin,
  betterAuthRegister,
  betterAuthSignOut,
} from "@vamsa/lib/server/business";
import { logger } from "@vamsa/lib/logger";

const authRouter = new OpenAPIHono();

// Response schema for auth endpoints
const authSuccessSchema = z
  .object({
    user: z
      .object({
        id: z.string().openapi({
          description: "User ID",
          example: "user_123",
        }),
        email: z.string().email().openapi({
          description: "User email address",
          example: "user@example.com",
        }),
        name: z.string().nullable().openapi({
          description: "User display name",
          example: "John Doe",
        }),
        role: z.string().openapi({
          description: "User role",
          example: "MEMBER",
        }),
      })
      .openapi({
        description: "Authenticated user information",
      }),
    token: z.string().openapi({
      description: "Session token",
      example: "eyJhbGciOiJIUzI1NiIs...",
    }),
  })
  .openapi("AuthSuccessResponse");

/**
 * POST /api/v1/auth/login
 * Login with email and password
 */
const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Authentication"],
  summary: "Login with email and password",
  description: "Authenticate user and create session",
  operationId: "login",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: loginSchema.openapi({
            description: "Login credentials",
            example: {
              email: "user@example.com",
              password: "password123",
            },
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: authSuccessSchema,
        },
      },
    },
    400: {
      description: "Invalid credentials or validation error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Invalid email or password",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

authRouter.openapi(loginRoute, async (c) => {
  try {
    const { email, password } = c.req.valid("json");

    // Use Better Auth for login - pass request headers for cookie handling
    const result = await betterAuthLogin(email, password, c.req.raw.headers);

    if (!result?.user) {
      return c.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Better Auth handles session cookies automatically
    return c.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role:
            ((result.user as Record<string, unknown>).role as string) ||
            "VIEWER",
        },
        token: "", // Token is in HttpOnly cookie, not exposed to JS
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.issues[0]?.message,
        },
        { status: 400 }
      );
    }

    logger.error({ error }, "Login error");
    return c.json({ error: "Invalid email or password" }, { status: 401 });
  }
});

/**
 * POST /api/v1/auth/register
 * Register a new account
 */
const registerRoute = createRoute({
  method: "post",
  path: "/register",
  tags: ["Authentication"],
  summary: "Register a new account",
  description: "Create new user account and authenticate",
  operationId: "register",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: registerSchema.openapi({
            description: "Registration details",
            example: {
              email: "newuser@example.com",
              name: "John Doe",
              password: "securepass123",
              confirmPassword: "securepass123",
            },
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Account created successfully",
      content: {
        "application/json": {
          schema: authSuccessSchema,
        },
      },
    },
    400: {
      description: "Validation error or registration failed",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    409: {
      description: "Email already in use",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

authRouter.openapi(registerRoute, async (c) => {
  try {
    const {
      email,
      name,
      password,
      confirmPassword: _confirmPassword,
    } = c.req.valid("json");

    // Use Better Auth for registration - pass request headers for cookie handling
    const result = await betterAuthRegister(
      email,
      name,
      password,
      c.req.raw.headers
    );

    if (!result?.user) {
      return c.json({ error: "Registration failed" }, { status: 400 });
    }

    // Better Auth handles session cookies automatically
    return c.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role:
            ((result.user as Record<string, unknown>).role as string) ||
            "VIEWER",
        },
        token: "", // Token is in HttpOnly cookie, not exposed to JS
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.issues[0]?.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("already exists")) {
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
const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Authentication"],
  summary: "Logout current user",
  description: "Clear session cookie and logout",
  operationId: "logout",
  responses: {
    200: {
      description: "Logout successful",
      content: {
        "application/json": {
          schema: successResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

authRouter.openapi(logoutRoute, async (c) => {
  try {
    // Use Better Auth for logout
    await betterAuthSignOut(c.req.raw.headers);

    // Clear the Better Auth session cookie
    c.header(
      "Set-Cookie",
      "better-auth.session_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
    );

    return c.json({ success: true as const }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Logout error");
    // Still clear cookie even if signOut fails (user may already be logged out)
    c.header(
      "Set-Cookie",
      "better-auth.session_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
    );
    return c.json({ success: true as const }, { status: 200 });
  }
});

export default authRouter;
