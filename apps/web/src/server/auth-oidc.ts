"use server";

import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "./test-helpers/react-start-server";
import { z } from "zod";
import { TOKEN_COOKIE_NAME, TOKEN_MAX_AGE } from "@vamsa/lib/server/business";
import {
  getAvailableProvidersData,
  initiateGoogleLoginData,
  initiateMicrosoftLoginData,
  initiateGitHubLoginData,
  handleGoogleCallbackData,
  handleMicrosoftCallbackData,
  handleGitHubCallbackData,
  cleanupExpiredOAuthStatesData,
} from "@vamsa/lib/server/business";

/**
 * Server function: Check which OAuth providers are available
 * @returns Object indicating availability of each provider
 */
export const getAvailableProviders = createServerFn({ method: "GET" }).handler(
  async () => {
    return getAvailableProvidersData();
  }
);

/**
 * Server function: Initiate Google OAuth flow
 * @input { redirectTo?: string } - Optional redirect URL after successful login
 * @returns Authorization URL to redirect user to Google
 */
export const initiateGoogleLogin = createServerFn({ method: "GET" })
  .inputValidator((data: { redirectTo?: string }) => data)
  .handler(async ({ data }) => {
    return initiateGoogleLoginData(data.redirectTo);
  });

/**
 * Server function: Initiate Microsoft OAuth flow
 * @input { redirectTo?: string } - Optional redirect URL after successful login
 * @returns Authorization URL to redirect user to Microsoft
 */
export const initiateMicrosoftLogin = createServerFn({ method: "GET" })
  .inputValidator((data: { redirectTo?: string }) => data)
  .handler(async ({ data }) => {
    return initiateMicrosoftLoginData(data.redirectTo);
  });

/**
 * Server function: Initiate GitHub OAuth flow
 * @input { redirectTo?: string } - Optional redirect URL after successful login
 * @returns Authorization URL to redirect user to GitHub
 */
export const initiateGitHubLogin = createServerFn({ method: "GET" })
  .inputValidator((data: { redirectTo?: string }) => data)
  .handler(async ({ data }) => {
    return initiateGitHubLoginData(data.redirectTo);
  });

/**
 * Server function: Handle Google OAuth callback
 * Validates authorization code and state, creates session and sets cookie
 * @input { code: string; state: string } - OAuth callback parameters
 * @returns Success response with user ID and redirect URL
 */
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
    const result = await handleGoogleCallbackData(data.code, data.state);

    // Set session cookie
    setCookie(TOKEN_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    // Return response without sessionToken (not needed on client)
    return {
      success: result.success,
      userId: result.userId,
      redirectTo: result.redirectTo,
    };
  });

/**
 * Server function: Handle Microsoft OAuth callback
 * Validates authorization code and state, creates session and sets cookie
 * @input { code: string; state: string } - OAuth callback parameters
 * @returns Success response with user ID and redirect URL
 */
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
    const result = await handleMicrosoftCallbackData(data.code, data.state);

    // Set session cookie
    setCookie(TOKEN_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    // Return response without sessionToken (not needed on client)
    return {
      success: result.success,
      userId: result.userId,
      redirectTo: result.redirectTo,
    };
  });

/**
 * Server function: Handle GitHub OAuth callback
 * Validates authorization code and state, creates session and sets cookie
 * @input { code: string; state: string } - OAuth callback parameters
 * @returns Success response with user ID and redirect URL
 */
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
    const result = await handleGitHubCallbackData(data.code, data.state);

    // Set session cookie
    setCookie(TOKEN_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    // Return response without sessionToken (not needed on client)
    return {
      success: result.success,
      userId: result.userId,
      redirectTo: result.redirectTo,
    };
  });

/**
 * Server function: Clean up expired OAuth states
 * Should be called periodically by a maintenance job
 * @returns Count of deleted OAuth state records
 */
export const cleanupExpiredOAuthStates = createServerFn({
  method: "POST",
}).handler(async () => {
  return cleanupExpiredOAuthStatesData();
});
