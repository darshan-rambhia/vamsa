import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import { randomBytes } from "crypto";
import { logger } from "@vamsa/lib/logger";
import {
  Google,
  MicrosoftEntraId,
  GitHub,
  generateState,
  generateCodeVerifier,
} from "arctic";
import { t } from "../i18n";
import { TOKEN_MAX_AGE, hashToken } from "./auth";

/**
 * Type for the database client used by OIDC auth functions.
 * This allows dependency injection for testing.
 */
export type AuthOidcDb = Pick<PrismaClient, "oAuthState" | "user" | "session">;

// Constants
export const OAUTH_STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

/**
 * Get application URL from environment or default to localhost
 * @returns The base URL for the application
 */
export function getAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

/**
 * Initialize Google OAuth provider with credentials from environment
 * @returns Google provider instance or null if credentials not configured
 */
export function getGoogleProvider(): Google | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new Google(
    clientId,
    clientSecret,
    `${getAppUrl()}/auth/google/callback`
  );
}

/**
 * Initialize Microsoft Entra ID OAuth provider with credentials from environment
 * @returns MicrosoftEntraId provider instance or null if credentials not configured
 */
export function getMicrosoftProvider(): MicrosoftEntraId | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";

  if (!clientId || !clientSecret) {
    return null;
  }

  return new MicrosoftEntraId(
    tenantId,
    clientId,
    clientSecret,
    `${getAppUrl()}/auth/microsoft/callback`
  );
}

/**
 * Initialize GitHub OAuth provider with credentials from environment
 * @returns GitHub provider instance or null if credentials not configured
 */
export function getGitHubProvider(): GitHub | null {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new GitHub(
    clientId,
    clientSecret,
    `${getAppUrl()}/auth/github/callback`
  );
}

/**
 * Check which OAuth providers are available based on environment configuration
 * @returns Object indicating availability of each provider
 */
export async function getAvailableProvidersData(): Promise<{
  google: boolean;
  microsoft: boolean;
  github: boolean;
}> {
  return {
    google:
      !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    microsoft:
      !!process.env.MICROSOFT_CLIENT_ID &&
      !!process.env.MICROSOFT_CLIENT_SECRET,
    github:
      !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET,
  };
}

/**
 * Initiate Google OAuth flow by generating state and code verifier, storing them in database
 * @param redirectTo - Optional redirect URL after successful login
 * @param db - Optional database client (defaults to prisma)
 * @returns Authorization URL to redirect user to Google
 * @throws Error if Google OAuth is not configured
 */
export async function initiateGoogleLoginData(
  redirectTo?: string,
  db: AuthOidcDb = defaultPrisma
): Promise<{
  url: string;
}> {
  const google = getGoogleProvider();

  if (!google) {
    throw new Error(
      await t("errors:auth.oauthNotConfigured", { provider: "Google" })
    );
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  // Store state for verification
  await db.oAuthState.create({
    data: {
      state,
      codeVerifier,
      provider: "google",
      redirectTo,
      expiresAt: new Date(Date.now() + OAUTH_STATE_EXPIRY),
    },
  });

  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  logger.info("Initiated Google OAuth flow");

  return { url: url.toString() };
}

/**
 * Initiate Microsoft OAuth flow by generating state and code verifier, storing them in database
 * @param redirectTo - Optional redirect URL after successful login
 * @param db - Optional database client (defaults to prisma)
 * @returns Authorization URL to redirect user to Microsoft
 * @throws Error if Microsoft OAuth is not configured
 */
export async function initiateMicrosoftLoginData(
  redirectTo?: string,
  db: AuthOidcDb = defaultPrisma
): Promise<{
  url: string;
}> {
  const microsoft = getMicrosoftProvider();

  if (!microsoft) {
    throw new Error("Microsoft OAuth is not configured");
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  // Store state for verification
  await db.oAuthState.create({
    data: {
      state,
      codeVerifier,
      provider: "microsoft",
      redirectTo,
      expiresAt: new Date(Date.now() + OAUTH_STATE_EXPIRY),
    },
  });

  const url = microsoft.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  logger.info("Initiated Microsoft OAuth flow");

  return { url: url.toString() };
}

/**
 * Initiate GitHub OAuth flow by generating state, storing it in database
 * @param redirectTo - Optional redirect URL after successful login
 * @param db - Optional database client (defaults to prisma)
 * @returns Authorization URL to redirect user to GitHub
 * @throws Error if GitHub OAuth is not configured
 */
export async function initiateGitHubLoginData(
  redirectTo?: string,
  db: AuthOidcDb = defaultPrisma
): Promise<{
  url: string;
}> {
  const github = getGitHubProvider();

  if (!github) {
    throw new Error("GitHub OAuth is not configured");
  }

  const state = generateState();

  // Store state for verification (GitHub doesn't use PKCE)
  await db.oAuthState.create({
    data: {
      state,
      codeVerifier: "", // GitHub doesn't use PKCE
      provider: "github",
      redirectTo,
      expiresAt: new Date(Date.now() + OAUTH_STATE_EXPIRY),
    },
  });

  const url = github.createAuthorizationURL(state, ["user:email"]);

  logger.info("Initiated GitHub OAuth flow");

  return { url: url.toString() };
}

// Google user info response type
interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

/**
 * Process Google OAuth callback, exchange code for tokens, and create/link user
 * @param code - Authorization code from Google OAuth
 * @param state - State value for verification
 * @param db - Optional database client (defaults to prisma)
 * @returns Success response with user ID, redirect URL, and session token for cookie setting
 * @throws Error if state invalid, expired, or user linking fails
 */
export async function handleGoogleCallbackData(
  code: string,
  state: string,
  db: AuthOidcDb = defaultPrisma
): Promise<{
  success: boolean;
  userId: string;
  redirectTo: string;
  sessionToken: string;
}> {
  // Verify state
  const storedState = await db.oAuthState.findUnique({
    where: { state },
  });

  if (!storedState) {
    logger.warn({ state }, "OAuth state not found");
    throw new Error("Invalid state - please try again");
  }

  if (storedState.expiresAt < new Date()) {
    await db.oAuthState.delete({ where: { id: storedState.id } });
    logger.warn({ state }, "OAuth state expired");
    throw new Error("Session expired - please try again");
  }

  if (storedState.provider !== "google") {
    throw new Error("Invalid provider");
  }

  const google = getGoogleProvider();
  if (!google) {
    throw new Error("Google OAuth is not configured");
  }

  // Exchange code for tokens
  const tokens = await google.validateAuthorizationCode(
    code,
    storedState.codeVerifier
  );

  // Get user info from Google
  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    }
  );

  if (!userInfoResponse.ok) {
    throw new Error("Failed to fetch user info from Google");
  }

  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

  // Find or create user
  let user = await db.user.findFirst({
    where: {
      oidcProvider: "google",
      oidcSubject: userInfo.sub,
    },
  });

  if (!user) {
    // Check if a user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: userInfo.email.toLowerCase() },
    });

    if (existingUser) {
      // Link OIDC to existing user if they don't have an OIDC provider
      if (!existingUser.oidcProvider) {
        user = await db.user.update({
          where: { id: existingUser.id },
          data: {
            oidcProvider: "google",
            oidcSubject: userInfo.sub,
            emailVerified: userInfo.email_verified,
            lastLoginAt: new Date(),
          },
        });
        logger.info(
          { userId: user.id },
          "Linked Google account to existing user"
        );
      } else {
        throw new Error(
          "An account with this email already exists with a different provider"
        );
      }
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          email: userInfo.email.toLowerCase(),
          name: userInfo.name || userInfo.email,
          oidcProvider: "google",
          oidcSubject: userInfo.sub,
          emailVerified: userInfo.email_verified,
          role: "VIEWER",
          isActive: true,
          profileClaimStatus: "PENDING",
        },
      });
      logger.info({ userId: user.id }, "Created new user from Google OAuth");
    }
  } else {
    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  if (!user.isActive) {
    throw new Error("Account is disabled");
  }

  // Create session
  const sessionToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(sessionToken);

  await db.session.create({
    data: {
      token: tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_MAX_AGE * 1000),
    },
  });

  // Clean up state
  await db.oAuthState.delete({ where: { id: storedState.id } });

  logger.info(
    { userId: user.id, email: user.email },
    "Google OAuth login successful"
  );

  return {
    success: true,
    userId: user.id,
    redirectTo: storedState.redirectTo || "/dashboard",
    sessionToken,
  };
}

// Microsoft user info response type
interface MicrosoftUserInfo {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
}

/**
 * Process Microsoft OAuth callback, exchange code for tokens, and create/link user
 * @param code - Authorization code from Microsoft OAuth
 * @param state - State value for verification
 * @param db - Optional database client (defaults to prisma)
 * @returns Success response with user ID, redirect URL, and session token for cookie setting
 * @throws Error if state invalid, expired, email missing, or user linking fails
 */
export async function handleMicrosoftCallbackData(
  code: string,
  state: string,
  db: AuthOidcDb = defaultPrisma
): Promise<{
  success: boolean;
  userId: string;
  redirectTo: string;
  sessionToken: string;
}> {
  // Verify state
  const storedState = await db.oAuthState.findUnique({
    where: { state },
  });

  if (!storedState) {
    logger.warn({ state }, "OAuth state not found");
    throw new Error("Invalid state - please try again");
  }

  if (storedState.expiresAt < new Date()) {
    await db.oAuthState.delete({ where: { id: storedState.id } });
    logger.warn({ state }, "OAuth state expired");
    throw new Error("Session expired - please try again");
  }

  if (storedState.provider !== "microsoft") {
    throw new Error("Invalid provider");
  }

  const microsoft = getMicrosoftProvider();
  if (!microsoft) {
    throw new Error("Microsoft OAuth is not configured");
  }

  // Exchange code for tokens
  const tokens = await microsoft.validateAuthorizationCode(
    code,
    storedState.codeVerifier
  );

  // Get user info from Microsoft Graph
  const userInfoResponse = await fetch(
    "https://graph.microsoft.com/oidc/userinfo",
    {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    }
  );

  if (!userInfoResponse.ok) {
    throw new Error("Failed to fetch user info from Microsoft");
  }

  const userInfo = (await userInfoResponse.json()) as MicrosoftUserInfo;
  const email = userInfo.email || userInfo.preferred_username;

  if (!email) {
    throw new Error("Could not retrieve email from Microsoft account");
  }

  // Find or create user
  let user = await db.user.findFirst({
    where: {
      oidcProvider: "microsoft",
      oidcSubject: userInfo.sub,
    },
  });

  if (!user) {
    // Check if a user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // Link OIDC to existing user if they don't have an OIDC provider
      if (!existingUser.oidcProvider) {
        user = await db.user.update({
          where: { id: existingUser.id },
          data: {
            oidcProvider: "microsoft",
            oidcSubject: userInfo.sub,
            emailVerified: true, // Microsoft accounts have verified emails
            lastLoginAt: new Date(),
          },
        });
        logger.info(
          { userId: user.id },
          "Linked Microsoft account to existing user"
        );
      } else {
        throw new Error(
          "An account with this email already exists with a different provider"
        );
      }
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          email: email.toLowerCase(),
          name: userInfo.name || email,
          oidcProvider: "microsoft",
          oidcSubject: userInfo.sub,
          emailVerified: true,
          role: "VIEWER",
          isActive: true,
          profileClaimStatus: "PENDING",
        },
      });
      logger.info({ userId: user.id }, "Created new user from Microsoft OAuth");
    }
  } else {
    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  if (!user.isActive) {
    throw new Error("Account is disabled");
  }

  // Create session
  const sessionToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(sessionToken);

  await db.session.create({
    data: {
      token: tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_MAX_AGE * 1000),
    },
  });

  // Clean up state
  await db.oAuthState.delete({ where: { id: storedState.id } });

  logger.info(
    { userId: user.id, email: user.email },
    "Microsoft OAuth login successful"
  );

  return {
    success: true,
    userId: user.id,
    redirectTo: storedState.redirectTo || "/dashboard",
    sessionToken,
  };
}

// GitHub user info and email response types
interface GitHubUserInfo {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Process GitHub OAuth callback, exchange code for tokens, and create/link user
 * @param code - Authorization code from GitHub OAuth
 * @param state - State value for verification
 * @param db - Optional database client (defaults to prisma)
 * @returns Success response with user ID, redirect URL, and session token for cookie setting
 * @throws Error if state invalid, expired, email missing, or user linking fails
 */
export async function handleGitHubCallbackData(
  code: string,
  state: string,
  db: AuthOidcDb = defaultPrisma
): Promise<{
  success: boolean;
  userId: string;
  redirectTo: string;
  sessionToken: string;
}> {
  // Verify state
  const storedState = await db.oAuthState.findUnique({
    where: { state },
  });

  if (!storedState) {
    logger.warn({ state }, "OAuth state not found");
    throw new Error("Invalid state - please try again");
  }

  if (storedState.expiresAt < new Date()) {
    await db.oAuthState.delete({ where: { id: storedState.id } });
    logger.warn({ state }, "OAuth state expired");
    throw new Error("Session expired - please try again");
  }

  if (storedState.provider !== "github") {
    throw new Error("Invalid provider");
  }

  const github = getGitHubProvider();
  if (!github) {
    throw new Error("GitHub OAuth is not configured");
  }

  // Exchange code for tokens (GitHub doesn't use PKCE)
  const tokens = await github.validateAuthorizationCode(code);

  // Get user info from GitHub
  const userInfoResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.accessToken()}`,
      Accept: "application/json",
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error("Failed to fetch user info from GitHub");
  }

  const userInfo = (await userInfoResponse.json()) as GitHubUserInfo;

  // Get user's primary email
  let email = userInfo.email;
  if (!email) {
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
        Accept: "application/json",
      },
    });

    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as GitHubEmail[];
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      email = primaryEmail?.email;
    }
  }

  if (!email) {
    throw new Error("Could not retrieve email from GitHub account");
  }

  const githubSubject = userInfo.id.toString();

  // Find or create user
  let user = await db.user.findFirst({
    where: {
      oidcProvider: "github",
      oidcSubject: githubSubject,
    },
  });

  if (!user) {
    // Check if a user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // Link OIDC to existing user if they don't have an OIDC provider
      if (!existingUser.oidcProvider) {
        user = await db.user.update({
          where: { id: existingUser.id },
          data: {
            oidcProvider: "github",
            oidcSubject: githubSubject,
            emailVerified: true,
            lastLoginAt: new Date(),
          },
        });
        logger.info(
          { userId: user.id },
          "Linked GitHub account to existing user"
        );
      } else {
        throw new Error(
          "An account with this email already exists with a different provider"
        );
      }
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          email: email.toLowerCase(),
          name: userInfo.name || userInfo.login,
          oidcProvider: "github",
          oidcSubject: githubSubject,
          emailVerified: true,
          role: "VIEWER",
          isActive: true,
          profileClaimStatus: "PENDING",
        },
      });
      logger.info({ userId: user.id }, "Created new user from GitHub OAuth");
    }
  } else {
    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  if (!user.isActive) {
    throw new Error("Account is disabled");
  }

  // Create session
  const sessionToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(sessionToken);

  await db.session.create({
    data: {
      token: tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_MAX_AGE * 1000),
    },
  });

  // Clean up state
  await db.oAuthState.delete({ where: { id: storedState.id } });

  logger.info(
    { userId: user.id, email: user.email },
    "GitHub OAuth login successful"
  );

  return {
    success: true,
    userId: user.id,
    redirectTo: storedState.redirectTo || "/dashboard",
    sessionToken,
  };
}

/**
 * Clean up expired OAuth states from the database
 * Should be called periodically by a maintenance job
 * @param db - Optional database client (defaults to prisma)
 * @returns Count of deleted OAuth state records
 */
export async function cleanupExpiredOAuthStatesData(
  db: AuthOidcDb = defaultPrisma
): Promise<{
  deleted: number;
}> {
  const result = await db.oAuthState.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  if (result.count > 0) {
    logger.info({ count: result.count }, "Cleaned up expired OAuth states");
  }

  return { deleted: result.count };
}
