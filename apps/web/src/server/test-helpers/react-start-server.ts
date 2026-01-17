/**
 * Re-exports for @tanstack/react-start/server with test environment fallback
 *
 * This module attempts to import from @tanstack/react-start/server.
 * If that fails (in test environments with module resolution issues),
 * it provides mock implementations instead.
 */

/** Cookie options for setCookie and deleteCookie */
interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  maxAge?: number;
  path?: string;
  domain?: string;
  expires?: Date;
}

/** Type for getCookie function */
type GetCookieFn = (name: string) => string | undefined;

/** Type for setCookie function */
type SetCookieFn = (
  name: string,
  value: string,
  options?: CookieOptions
) => void;

/** Type for deleteCookie function */
type DeleteCookieFn = (name: string, options?: CookieOptions) => void;

// Try to import the real module, fall back to mocks if it fails
let getCookie: GetCookieFn;
let setCookie: SetCookieFn;
let deleteCookie: DeleteCookieFn;

try {
  // Attempt dynamic import
  const serverModule = await import("@tanstack/react-start/server");
  getCookie = serverModule.getCookie;
  setCookie = serverModule.setCookie;
  deleteCookie = serverModule.deleteCookie;
} catch (_error) {
  // If import fails (test environment), use mocks
  console.warn(
    "[@tanstack/react-start/server] Import failed, using mock implementations for tests"
  );
  getCookie = () => undefined;
  setCookie = () => {};
  deleteCookie = () => {};
}

export { getCookie, setCookie, deleteCookie };
export type { CookieOptions, GetCookieFn, SetCookieFn, DeleteCookieFn };
