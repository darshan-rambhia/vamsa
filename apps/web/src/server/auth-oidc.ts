import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { prisma } from "./db";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { logger } from "@vamsa/lib/logger";
import {
  Google,
  MicrosoftEntraId,
  GitHub,
  generateState,
  generateCodeVerifier,
} from "arctic";
import { t } from "./i18n";

// Constants
const TOKEN_COOKIE_NAME = "vamsa-session";
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const OAUTH_STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Hash session token for secure storage
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Get app URL from environment
function getAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

// Initialize OAuth providers lazily
function getGoogleProvider(): Google | null {
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

function getMicrosoftProvider(): MicrosoftEntraId | null {
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

function getGitHubProvider(): GitHub | null {
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

// Check which providers are available
export const getAvailableProviders = createServerFn({ method: "GET" }).handler(
  async () => {
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
);

// Initiate Google OAuth flow
export const initiateGoogleLogin = createServerFn({ method: "GET" })
  .inputValidator((data: { redirectTo?: string }) => data)
  .handler(async ({ data }) => {
    const google = getGoogleProvider();

    if (!google) {
      throw new Error(
        await t("errors:auth.oauthNotConfigured", { provider: "Google" })
      );
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    // Store state for verification
    await prisma.oAuthState.create({
      data: {
        state,
        codeVerifier,
        provider: "google",
        redirectTo: data.redirectTo,
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
  });

// Initiate Microsoft OAuth flow
export const initiateMicrosoftLogin = createServerFn({ method: "GET" })
  .inputValidator((data: { redirectTo?: string }) => data)
  .handler(async ({ data }) => {
    const microsoft = getMicrosoftProvider();

    if (!microsoft) {
      throw new Error("Microsoft OAuth is not configured");
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    // Store state for verification
    await prisma.oAuthState.create({
      data: {
        state,
        codeVerifier,
        provider: "microsoft",
        redirectTo: data.redirectTo,
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
  });

// Initiate GitHub OAuth flow
export const initiateGitHubLogin = createServerFn({ method: "GET" })
  .inputValidator((data: { redirectTo?: string }) => data)
  .handler(async ({ data }) => {
    const github = getGitHubProvider();

    if (!github) {
      throw new Error("GitHub OAuth is not configured");
    }

    const state = generateState();

    // Store state for verification (GitHub doesn't use PKCE)
    await prisma.oAuthState.create({
      data: {
        state,
        codeVerifier: "", // GitHub doesn't use PKCE
        provider: "github",
        redirectTo: data.redirectTo,
        expiresAt: new Date(Date.now() + OAUTH_STATE_EXPIRY),
      },
    });

    const url = github.createAuthorizationURL(state, ["user:email"]);

    logger.info("Initiated GitHub OAuth flow");

    return { url: url.toString() };
  });

// Google user info response type
interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

// Handle Google OAuth callback
export const handleGoogleCallback = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string; state: string }) => {
    return z
      .object({
        code: z.string(),
        state: z.string(),
      })
      .parse(data);
  })
  .handler(async ({ data }) => {
    const { code, state } = data;

    // Verify state
    const storedState = await prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!storedState) {
      logger.warn({ state }, "OAuth state not found");
      throw new Error("Invalid state - please try again");
    }

    if (storedState.expiresAt < new Date()) {
      await prisma.oAuthState.delete({ where: { id: storedState.id } });
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

    const userInfo: GoogleUserInfo = await userInfoResponse.json();

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        oidcProvider: "google",
        oidcSubject: userInfo.sub,
      },
    });

    if (!user) {
      // Check if a user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userInfo.email.toLowerCase() },
      });

      if (existingUser) {
        // Link OIDC to existing user if they don't have an OIDC provider
        if (!existingUser.oidcProvider) {
          user = await prisma.user.update({
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
        user = await prisma.user.create({
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
      await prisma.user.update({
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

    await prisma.session.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_MAX_AGE * 1000),
      },
    });

    // Set cookie
    setCookie(TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    // Clean up state
    await prisma.oAuthState.delete({ where: { id: storedState.id } });

    logger.info(
      { userId: user.id, email: user.email },
      "Google OAuth login successful"
    );

    return {
      success: true,
      userId: user.id,
      redirectTo: storedState.redirectTo || "/dashboard",
    };
  });

// Microsoft user info response type
interface MicrosoftUserInfo {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
}

// Handle Microsoft OAuth callback
export const handleMicrosoftCallback = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string; state: string }) => {
    return z
      .object({
        code: z.string(),
        state: z.string(),
      })
      .parse(data);
  })
  .handler(async ({ data }) => {
    const { code, state } = data;

    // Verify state
    const storedState = await prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!storedState) {
      logger.warn({ state }, "OAuth state not found");
      throw new Error("Invalid state - please try again");
    }

    if (storedState.expiresAt < new Date()) {
      await prisma.oAuthState.delete({ where: { id: storedState.id } });
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

    const userInfo: MicrosoftUserInfo = await userInfoResponse.json();
    const email = userInfo.email || userInfo.preferred_username;

    if (!email) {
      throw new Error("Could not retrieve email from Microsoft account");
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        oidcProvider: "microsoft",
        oidcSubject: userInfo.sub,
      },
    });

    if (!user) {
      // Check if a user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        // Link OIDC to existing user if they don't have an OIDC provider
        if (!existingUser.oidcProvider) {
          user = await prisma.user.update({
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
        user = await prisma.user.create({
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
        logger.info(
          { userId: user.id },
          "Created new user from Microsoft OAuth"
        );
      }
    } else {
      // Update last login
      await prisma.user.update({
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

    await prisma.session.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_MAX_AGE * 1000),
      },
    });

    // Set cookie
    setCookie(TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    // Clean up state
    await prisma.oAuthState.delete({ where: { id: storedState.id } });

    logger.info(
      { userId: user.id, email: user.email },
      "Microsoft OAuth login successful"
    );

    return {
      success: true,
      userId: user.id,
      redirectTo: storedState.redirectTo || "/dashboard",
    };
  });

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

// Handle GitHub OAuth callback
export const handleGitHubCallback = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string; state: string }) => {
    return z
      .object({
        code: z.string(),
        state: z.string(),
      })
      .parse(data);
  })
  .handler(async ({ data }) => {
    const { code, state } = data;

    // Verify state
    const storedState = await prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!storedState) {
      logger.warn({ state }, "OAuth state not found");
      throw new Error("Invalid state - please try again");
    }

    if (storedState.expiresAt < new Date()) {
      await prisma.oAuthState.delete({ where: { id: storedState.id } });
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

    const userInfo: GitHubUserInfo = await userInfoResponse.json();

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
        const emails: GitHubEmail[] = await emailsResponse.json();
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        email = primaryEmail?.email;
      }
    }

    if (!email) {
      throw new Error("Could not retrieve email from GitHub account");
    }

    const githubSubject = userInfo.id.toString();

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        oidcProvider: "github",
        oidcSubject: githubSubject,
      },
    });

    if (!user) {
      // Check if a user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        // Link OIDC to existing user if they don't have an OIDC provider
        if (!existingUser.oidcProvider) {
          user = await prisma.user.update({
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
        user = await prisma.user.create({
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
      await prisma.user.update({
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

    await prisma.session.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_MAX_AGE * 1000),
      },
    });

    // Set cookie
    setCookie(TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    // Clean up state
    await prisma.oAuthState.delete({ where: { id: storedState.id } });

    logger.info(
      { userId: user.id, email: user.email },
      "GitHub OAuth login successful"
    );

    return {
      success: true,
      userId: user.id,
      redirectTo: storedState.redirectTo || "/dashboard",
    };
  });

// Clean up expired OAuth states (should be called periodically)
export const cleanupExpiredOAuthStates = createServerFn({
  method: "POST",
}).handler(async () => {
  const result = await prisma.oAuthState.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  if (result.count > 0) {
    logger.info({ count: result.count }, "Cleaned up expired OAuth states");
  }

  return { deleted: result.count };
});
