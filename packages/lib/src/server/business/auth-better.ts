import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, deviceAuthorization, genericOAuth } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
// import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzleDb, drizzleSchema, getDbDriver } from "@vamsa/api";
import { assertUserCanStartSession } from "./auth-session-policy";
import { isSelfSignupEnabled } from "./auth-registration";
import {
  revokeAllUserApiTokensSafe,
  revokeTokensOnPasswordWrite,
} from "./api-tokens";
import {
  DEVICE_CODE_EXPIRES_IN,
  DEVICE_POLL_INTERVAL,
  DEVICE_RATE_LIMITS,
  USER_CODE_LENGTH,
  deviceVerificationUri,
  isDeviceClient,
  recordDeviceUserAgent,
} from "./device-auth";

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
 * Vamsa-specific user fields exposed through Better Auth.
 *
 * `input: false` keeps these out of sign-up and update-user request bodies, so a
 * client cannot set its own role, status, or linkage. Server code writes them
 * through Drizzle (invites, claim, admin) or relies on DB defaults (OIDC create).
 */
export const userAdditionalFields = {
  role: {
    type: "string",
    required: true,
    defaultValue: "VIEWER",
    input: false,
  },
  personId: {
    type: "string",
    required: false,
    input: false,
  },
  mustChangePassword: {
    type: "boolean",
    defaultValue: false,
    input: false,
  },
  profileClaimStatus: {
    type: "string",
    defaultValue: "PENDING",
    input: false,
  },
  preferredLanguage: {
    type: "string",
    defaultValue: "en",
  },
  isActive: {
    type: "boolean",
    defaultValue: true,
    input: false,
  },
  failedLoginAttempts: {
    type: "number",
    defaultValue: 0,
    input: false,
  },
  lockedUntil: {
    type: "date",
    required: false,
    input: false,
  },
  oidcProvider: {
    type: "string",
    required: false,
    input: false,
  },
  // Set by invite acceptance; Better Auth drops columns it does not know
  invitedById: {
    type: "string",
    required: false,
    input: false,
  },
} as const;

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
    provider: getDbDriver() === "sqlite" ? "sqlite" : "pg",
    schema: drizzleSchema,
  }),

  // Base URL for auth endpoints (required for Better Auth to work correctly)
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    // Invite-only unless ALLOW_SELF_SIGNUP=true. Blocks /sign-up/email only;
    // genericOAuth implicit sign-up uses its own provider options.
    disableSignUp: !isSelfSignupEnabled(),
    minPasswordLength: 12,
    requireEmailVerification: process.env.NODE_ENV !== "test",
    // Forgot-password flow: POST /request-password-reset, then
    // POST /reset-password. Better Auth only reads these from emailAndPassword.
    // Unknown emails get the same response as known ones (no enumeration).
    sendResetPassword: async ({ user, url }) => {
      const { emailService, createPasswordResetEmail } =
        await import("@vamsa/api");

      // Log reset URL in development for easy testing
      if (process.env.NODE_ENV === "development") {
        const { loggers } = await import("@vamsa/lib/logger");
        loggers.api.info(
          { url, email: user.email },
          "Password reset URL (dev mode)"
        );
      }

      // Fire-and-forget to prevent timing attacks. The URL is not stored in
      // email_logs metadata because it carries a live token.
      void emailService.sendEmail(
        user.email,
        createPasswordResetEmail(url),
        "password_reset",
        user.id
      );
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    // Sign the user out everywhere once the password is reset
    revokeSessionsOnPasswordReset: true,
    // Forgot-password reset updates accounts in bulk (the account hook below
    // gets no user id there), so revoke personal access tokens here
    onPasswordReset: async ({ user }: { user: { id: string } }) => {
      await revokeAllUserApiTokensSafe(user.id, "password reset");
    },
    // Cross-runtime password hashing (works in both Node.js/Vite and Bun)
    password: {
      hash: hashPassword,
      verify: async (data: { password: string; hash: string }) => {
        return verifyPassword(data.password, data.hash);
      },
    },
  },

  // Deactivated users cannot obtain a session (covers email/password and OIDC)
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          await assertUserCanStartSession(session.userId);
        },
      },
    },
    // Any password change or set invalidates the user's personal access tokens
    account: {
      update: {
        after: async (account, context) => {
          await revokeTokensOnPasswordWrite(account, context?.path);
        },
      },
    },
  },

  // Better Auth's own limiter (on in production by default). The Hono app also
  // limits /api/auth/request-password-reset per IP.
  rateLimit: {
    customRules: {
      "/request-password-reset": { window: 60 * 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
      ...DEVICE_RATE_LIMITS,
    },
  },

  // Device login: keep the requesting client's User-Agent for the /device page
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/device/code") return;
      const returned = ctx.context.returned as
        { device_code?: unknown } | undefined;
      if (typeof returned?.device_code !== "string") return;
      await recordDeviceUserAgent(
        returned.device_code,
        ctx.headers?.get("user-agent")
      );
    }),
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
    additionalFields: userAdditionalFields,
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

    // OAuth 2.0 device authorization grant (RFC 8628) for `vamsa login`.
    // Approval happens in the browser, so it works with any sign-in method.
    deviceAuthorization({
      expiresIn: DEVICE_CODE_EXPIRES_IN,
      interval: DEVICE_POLL_INTERVAL,
      userCodeLength: USER_CODE_LENGTH,
      validateClient: isDeviceClient,
      verificationUri: deviceVerificationUri(),
    }),

    // TanStack Start cookie plugin (would have to be last) stays off: /api/auth/*
    // responses already carry Set-Cookie, and no active flow needs server-function
    // cookie forwarding. Re-verify dev and prod before enabling.
    // tanstackStartCookies(),
  ],
});

export type Auth = typeof auth;
