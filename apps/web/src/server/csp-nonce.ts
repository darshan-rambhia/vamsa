/**
 * CSP nonce utility
 *
 * Reads the Content Security Policy nonce for the current request.
 * Hono's secureHeaders middleware generates the nonce (see server/app.ts) and
 * app.all("*") forwards it to TanStack Start as the `x-csp-nonce` request header.
 *
 * Must be called inside a request context (server function, route loader,
 * or SSR render). Returns undefined elsewhere.
 */

import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Get the CSP nonce for the current request
 *
 * @returns The nonce string (e.g., "abc123def456") or undefined if not available
 */
export function getCspNonce(): string | undefined {
  try {
    return getRequestHeader("x-csp-nonce") || undefined;
  } catch {
    // No request context (client-side, or outside an H3 event)
    return undefined;
  }
}
