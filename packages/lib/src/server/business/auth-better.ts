import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, genericOAuth } from "better-auth/plugins";
// import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzleDb, drizzleSchema } from "@vamsa/api";

// Cross-runtime password hashing that works in both Node.js (Vite dev) and Bun
const isBunRuntime = typeof globalThis.Bun !== "undefined";

async function hashPassword(password: string): Promise<string> {
  // Use Node.js crypto scrypt for cross-runtime compatibility
  const { scrypt, randomBytes } = await import("node:crypto");
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Handle our scrypt format
  if (hash.startsWith("scrypt:")) {
    const { scrypt, timingSafeEqual } = await import("node:crypto");
    const [, salt, storedHash] = hash.split(":");
    return new Promise((resolve, reject) => {
      scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(timingSafeEqual(Buffer.from(storedHash, "hex"), derivedKey));
      });
    });
  }

  // For argon2id hashes created by Bun (legacy support)
  if (isBunRuntime && hash.startsWith("$argon2")) {
    return globalThis.Bun.password.verify(password, hash);
  }

  return false;
}

/**
 * Better Auth instance with Drizzle adapter
 *
 * This is the new authentication system being migrated to.
 * Currently runs alongside existing auth.ts for gradual migration.
 *
 * Features:
 * - Email/password authentication
 * - Generic OIDC provider support (Authentik, Keycloak)
 * - Extended user model with Vamsa-specific fields
 * - 30-day session expiry with daily refresh
 * - TanStack Start cookie integration
 */
export const auth = betterAuth({
  database: drizzleAdapter(drizzleDb, {
    provider: "pg",
    schema: drizzleSchema,
  }),

  // Base URL for auth endpoints (required for Better Auth to work correctly)
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: process.env.NODE_ENV !== "test",
    // Cross-runtime password hashing (works in both Node.js/Vite and Bun)
    password: {
      hash: hashPassword,
      verify: async (data: { password: string; hash: string }) => {
        return verifyPassword(data.password, data.hash);
      },
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },

  // Email verification configuration
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { emailService, createEmailVerificationTemplate } =
        await import("@vamsa/api");

      const template = createEmailVerificationTemplate(
        user.name || "Family Member",
        url
      );

      // Log verification URL in development for easy testing
      if (process.env.NODE_ENV === "development") {
        const { loggers } = await import("@vamsa/lib/logger");
        loggers.api.info(
          { url, email: user.email },
          "Email verification URL (dev mode)"
        );
      }

      // Fire-and-forget to prevent timing attacks
      void emailService.sendEmail(
        user.email,
        template,
        "email_verification",
        user.id
      );
    },
  },

  // Password reset configuration
  forgetPassword: {
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { id: string; email: string; name?: string };
      url: string;
    }) => {
      const { emailService, createPasswordResetEmail } =
        await import("@vamsa/api");

      const template = createPasswordResetEmail(url);

      // Log reset URL in development for easy testing
      if (process.env.NODE_ENV === "development") {
        const { loggers } = await import("@vamsa/lib/logger");
        loggers.api.info(
          { url, email: user.email },
          "Password reset URL (dev mode)"
        );
      }

      // Fire-and-forget to prevent timing attacks
      void emailService.sendEmail(
        user.email,
        template,
        "password_reset",
        user.id
      );
    },
  },

  // Account linking - allows users to link OAuth accounts to existing email/password accounts
  // Only trust providers that are actually configured
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: [
        ...(process.env.GOOGLE_CLIENT_ID ? ["google"] : []),
        ...(process.env.GITHUB_CLIENT_ID ? ["github"] : []),
        ...(process.env.MICROSOFT_CLIENT_ID ? ["microsoft"] : []),
        ...(process.env.OIDC_DISCOVERY_URL ? ["oidc"] : []),
      ] as Array<"google" | "github" | "microsoft" | "oidc">,
    },
  },

  // Built-in social providers (conditionally enabled)
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    }),
    ...(process.env.GITHUB_CLIENT_ID && {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    }),
    ...(process.env.MICROSOFT_CLIENT_ID && {
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        tenantId: process.env.MICROSOFT_TENANT_ID || "common",
      },
    }),
  },

  // Extend user model with Vamsa-specific fields
  // These will be added to the user table by Better Auth migrations
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "VIEWER",
      },
      personId: {
        type: "string",
        required: false,
      },
      mustChangePassword: {
        type: "boolean",
        defaultValue: false,
      },
      profileClaimStatus: {
        type: "string",
        defaultValue: "PENDING",
      },
      preferredLanguage: {
        type: "string",
        defaultValue: "en",
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
      },
      failedLoginAttempts: {
        type: "number",
        defaultValue: 0,
      },
      lockedUntil: {
        type: "date",
        required: false,
      },
      oidcProvider: {
        type: "string",
        required: false,
      },
    },
  },

  plugins: [
    // Bearer token authentication for mobile apps (React Native)
    // Enables dual auth: web uses cookies, mobile uses Authorization header
    bearer(),

    // Generic OIDC for self-hosted providers (Authentik, Keycloak, etc.)
    genericOAuth({
      config: process.env.OIDC_DISCOVERY_URL
        ? [
            {
              providerId: "oidc",
              clientId: process.env.OIDC_CLIENT_ID!,
              clientSecret: process.env.OIDC_CLIENT_SECRET!,
              discoveryUrl: process.env.OIDC_DISCOVERY_URL,
              scopes: ["openid", "email", "profile"],
            },
          ]
        : [],
    }),

    // TanStack Start cookie handling (MUST be last plugin)
    // Temporarily disabled to debug 500 error in dev server
    // tanstackStartCookies(),
  ],
});

export type Auth = typeof auth;
