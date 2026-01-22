import { createAuthClient } from "better-auth/react";

/**
 * Client-side Better Auth instance
 *
 * Provides reactive hooks and methods for authentication in React components.
 * Communicates with the server through the /api/auth/* endpoints.
 *
 * Usage:
 * - `signIn()` - Sign in user
 * - `signOut()` - Sign out user
 * - `signUp()` - Register new user
 * - `useSession()` - React hook to get current session
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

export const { signIn, signOut, signUp, useSession } = authClient;
