/**
 * Server Function Testing Utility
 *
 * Provides stubbed server context for testing TanStack Start server function handlers
 * in isolation. Uses fixtures instead of mocks for clearer, more explicit tests.
 *
 * ## Key Concepts
 *
 * - **Stubs**: Pre-configured values for request context (cookies, headers, user)
 * - **Fixtures**: Test data passed directly, not set up globally
 * - **Isolation**: Each call creates an independent context
 *
 * ## Usage
 *
 * ```typescript
 * import { withStubbedServerContext, testUsers } from "@test/server-fn-context";
 *
 * // Simple: just pass stubs and run
 * const { result, response } = await withStubbedServerContext(
 *   { user: testUsers.admin },
 *   () => _myHandler({ data: "test" })
 * );
 *
 * expect(result.success).toBe(true);
 * expect(response.cookies.get("session")).toBeDefined();
 *
 * // With custom cookies/headers
 * const { result } = await withStubbedServerContext(
 *   {
 *     user: testUsers.member,
 *     cookies: { "custom-cookie": "value" },
 *     headers: { "x-request-id": "123" },
 *   },
 *   () => _myHandler({ data: "test" })
 * );
 *
 * // Unauthenticated request
 * await expect(
 *   withStubbedServerContext({}, () => _myHandler({ data: "test" }))
 * ).rejects.toThrow(/not authenticated/i);
 * ```
 *
 * ## Testing Pattern
 *
 * Export handler functions from your server function files for testability:
 *
 * ```typescript
 * // persons.ts
 * export async function _listPersonsHandler(data: PersonListInput) {
 *   await requireAuth("VIEWER");
 *   return listPersonsData(data);
 * }
 *
 * export const listPersons = createServerFn({ method: "GET" })
 *   .inputValidator((data) => personListInputSchema.parse(data))
 *   .handler(({ data }) => _listPersonsHandler(data));
 * ```
 *
 * ## Mocking Business Logic
 *
 * For business logic dependencies, use Bun's mock.module() in your test file:
 *
 * ```typescript
 * import { mock } from "bun:test";
 *
 * const mockListPersonsData = mock(async () => ({ persons: [], total: 0 }));
 *
 * mock.module("@vamsa/lib/server/business", () => ({
 *   listPersonsData: mockListPersonsData,
 *   // Add other stubs as needed
 * }));
 *
 * // Import handler AFTER setting up mocks
 * import { _listPersonsHandler } from "./persons";
 * ```
 */

import { mock } from "bun:test";
import type { MockAuthUser } from "./server-fn-fixtures";
import { testUsers, createMockUser } from "./server-fn-fixtures";

// Re-export fixtures for convenience
export { testUsers, createMockUser } from "./server-fn-fixtures";
export type { MockAuthUser, MockUserRole } from "./server-fn-fixtures";

// ============================================================================
// Types
// ============================================================================

/**
 * Cookie options matching TanStack Start's interface
 */
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  maxAge?: number;
  path?: string;
  domain?: string;
  expires?: Date;
}

/**
 * Stubs for server function context
 */
export interface ServerContextStubs {
  /** Request cookies (read by getCookie) */
  cookies?: Record<string, string>;

  /** Request headers (read by getHeaders) */
  headers?: Record<string, string>;

  /** Authenticated user (null = unauthenticated) */
  user?: MockAuthUser | null;
}

/**
 * Response data collected during handler execution
 */
export interface ServerContextResponse {
  /** Cookies set during execution (null value = deleted) */
  cookies: Map<string, { value: string; options?: CookieOptions } | null>;

  /** Headers set during execution */
  headers: Map<string, string>;

  /** HTTP status code */
  status: number;
}

/**
 * Result of withStubbedServerContext
 */
export interface StubbedServerContextResult<T> {
  /** Return value from the handler */
  result: T;

  /** Response data (cookies, headers, status) */
  response: ServerContextResponse;
}

// ============================================================================
// Context Stack (for isolation)
// ============================================================================

interface ActiveContext {
  stubs: Required<ServerContextStubs>;
  response: ServerContextResponse;
}

const contextStack: ActiveContext[] = [];

function getCurrentContext(): ActiveContext | undefined {
  return contextStack[contextStack.length - 1];
}

function pushContext(ctx: ActiveContext): void {
  contextStack.push(ctx);
}

function popContext(): void {
  contextStack.pop();
}

// ============================================================================
// Stubbed Context Accessors
// ============================================================================

/**
 * Get a cookie value from the stubbed request context
 */
const getStubbedCookie = (name: string): string | undefined => {
  return getCurrentContext()?.stubs.cookies[name];
};

/**
 * Set a cookie in the stubbed response
 */
const setStubbedCookie = (
  name: string,
  value: string,
  options?: CookieOptions
): void => {
  getCurrentContext()?.response.cookies.set(name, { value, options });
};

/**
 * Delete a cookie in the stubbed response
 */
const deleteStubbedCookie = (name: string, _options?: CookieOptions): void => {
  getCurrentContext()?.response.cookies.set(name, null);
};

/**
 * Get headers from the stubbed request context
 */
const getStubbedHeaders = (): Record<string, string> | undefined => {
  return getCurrentContext()?.stubs.headers;
};

/**
 * Get the user session from the stubbed context
 */
const getStubbedSession = async (): Promise<MockAuthUser | null> => {
  return getCurrentContext()?.stubs.user ?? null;
};

// ============================================================================
// Module Stubs Installation
// ============================================================================

let stubsInstalled = false;

/**
 * Install module stubs (called automatically on first use)
 *
 * This replaces the real implementations with stubs that read from
 * the context stack. Only needs to run once per test process.
 */
function ensureStubsInstalled(): void {
  if (stubsInstalled) return;
  stubsInstalled = true;

  // Stub @tanstack/react-start/server
  mock.module("@tanstack/react-start/server", () => ({
    getCookie: getStubbedCookie,
    setCookie: setStubbedCookie,
    deleteCookie: deleteStubbedCookie,
    getHeaders: getStubbedHeaders,
  }));

  // Stub auth function used by requireAuth
  mock.module("@vamsa/lib/server/business/auth-better-api", () => ({
    betterAuthGetSessionWithUserFromCookie: getStubbedSession,
    betterAuthLogin: async () => {
      throw new Error("betterAuthLogin: Use mock.module() in your test");
    },
    betterAuthRegister: async () => {
      throw new Error("betterAuthRegister: Use mock.module() in your test");
    },
    betterAuthGetSession: async () => {
      throw new Error("betterAuthGetSession: Use mock.module() in your test");
    },
    betterAuthChangePassword: async () => {
      throw new Error("betterAuthChangePassword: Use mock.module() in your test");
    },
    betterAuthSignOut: async () => {
      throw new Error("betterAuthSignOut: Use mock.module() in your test");
    },
    betterAuthGetSessionWithUser: async () => {
      throw new Error("betterAuthGetSessionWithUser: Use mock.module() in your test");
    },
    getBetterAuthProviders: () => ({
      google: false,
      github: false,
      microsoft: false,
      oidc: false,
    }),
  }));
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Run a handler with stubbed server context
 *
 * Creates an isolated context with the provided stubs and executes the handler.
 * Returns both the handler result and any response data (cookies, headers).
 *
 * @param stubs - Request context stubs (cookies, headers, user)
 * @param fn - Handler function to execute
 * @returns Object with result and response data
 *
 * @example
 * ```typescript
 * // Authenticated request
 * const { result, response } = await withStubbedServerContext(
 *   { user: testUsers.admin },
 *   () => _myHandler({ data: "test" })
 * );
 *
 * // Check result
 * expect(result.success).toBe(true);
 *
 * // Check response cookies
 * expect(response.cookies.get("session")).toBeDefined();
 *
 * // Unauthenticated request (should throw)
 * await expect(
 *   withStubbedServerContext({}, () => _myHandler({ data: "test" }))
 * ).rejects.toThrow(/not authenticated/i);
 * ```
 */
export async function withStubbedServerContext<T>(
  stubs: ServerContextStubs,
  fn: () => T | Promise<T>
): Promise<StubbedServerContextResult<T>> {
  ensureStubsInstalled();

  // Build complete stubs with defaults
  const completeStubs: Required<ServerContextStubs> = {
    cookies: { ...stubs.cookies },
    headers: { ...stubs.headers },
    user: stubs.user ?? null,
  };

  // Add session cookie if user is provided
  if (stubs.user) {
    completeStubs.cookies["better-auth.session_token"] =
      `stub-session-${stubs.user.id}`;
  }

  // Create response collector
  const response: ServerContextResponse = {
    cookies: new Map(),
    headers: new Map(),
    status: 200,
  };

  // Create and push context
  const ctx: ActiveContext = { stubs: completeStubs, response };
  pushContext(ctx);

  try {
    const result = await fn();
    return { result, response };
  } finally {
    popContext();
  }
}

// ============================================================================
// Convenience Shortcuts
// ============================================================================

/**
 * Run as unauthenticated user
 */
export function asUnauthenticated<T>(
  fn: () => T | Promise<T>
): Promise<StubbedServerContextResult<T>> {
  return withStubbedServerContext({}, fn);
}

/**
 * Run as viewer user
 */
export function asViewer<T>(
  fn: () => T | Promise<T>,
  overrides?: Partial<MockAuthUser>
): Promise<StubbedServerContextResult<T>> {
  return withStubbedServerContext(
    { user: overrides ? createMockUser(testUsers.viewer, overrides) : testUsers.viewer },
    fn
  );
}

/**
 * Run as member user
 */
export function asMember<T>(
  fn: () => T | Promise<T>,
  overrides?: Partial<MockAuthUser>
): Promise<StubbedServerContextResult<T>> {
  return withStubbedServerContext(
    { user: overrides ? createMockUser(testUsers.member, overrides) : testUsers.member },
    fn
  );
}

/**
 * Run as admin user
 */
export function asAdmin<T>(
  fn: () => T | Promise<T>,
  overrides?: Partial<MockAuthUser>
): Promise<StubbedServerContextResult<T>> {
  return withStubbedServerContext(
    { user: overrides ? createMockUser(testUsers.admin, overrides) : testUsers.admin },
    fn
  );
}

// ============================================================================
// Rate Limiter Helper
// ============================================================================

/**
 * Reset rate limiter state
 *
 * Call this if rate limits are affecting your tests.
 */
export function resetRateLimits(): void {
  try {
    const rateLimiter = require("../../src/server/middleware/rate-limiter");
    const actions = ["login", "register", "claimProfile", "passwordReset"] as const;
    for (const action of actions) {
      rateLimiter.resetRateLimit?.(action, "unknown");
      rateLimiter.resetRateLimit?.(action, "127.0.0.1");
      rateLimiter.resetRateLimit?.(action, "::1");
      rateLimiter.resetRateLimit?.(action, "test-client");
    }
  } catch {
    // Rate limiter not available
  }
}

// Export stubbed context accessors for direct use in tests
export {
  getStubbedCookie,
  setStubbedCookie,
  deleteStubbedCookie,
  getStubbedHeaders,
  getStubbedSession,
};
