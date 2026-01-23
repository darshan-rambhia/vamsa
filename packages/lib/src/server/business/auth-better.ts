import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
// import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "@vamsa/api";

/**
 * Better Auth instance with Prisma adapter
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
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Base URL for auth endpoints (required for Better Auth to work correctly)
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable email verification for E2E tests
    // Use bcrypt for password hashing (to match existing user passwords in seed)
    password: {
      async hash(password: string) {
        const bcrypt = await import("bcryptjs");
        return bcrypt.hash(password, 12);
      },
      async verify(data: { password: string; hash: string }) {
        const bcrypt = await import("bcryptjs");
        return bcrypt.compare(data.password, data.hash);
      },
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
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
      ] as ("google" | "github" | "microsoft" | "oidc")[],
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
