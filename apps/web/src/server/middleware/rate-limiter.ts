/**
 * Rate limiter for server functions
 *
 * Uses a pluggable store for rate limiting (memory by default, Redis for distributed).
 * In production with multiple server instances, use Redis for persistent rate limiting.
 *
 * Usage:
 * ```typescript
 * import { checkRateLimit } from "./middleware/rate-limiter";
 *
 * export const login = createServerFn({ method: "POST" })
 *   .handler(async ({ data }) => {
 *     await checkRateLimit("login", getClientIP(), { limit: 5, windowMs: 60000 });
 *     // ... rest of login logic
 *   });
 * ```
 */

import { loggers } from "@vamsa/lib/logger";
import { MemoryRateLimitStore } from "./rate-limit-store";
import type { RateLimitStore } from "./rate-limit-store";

const log = loggers.api;

// Skip rate limiting in E2E tests to avoid flaky tests due to parallel workers
const SKIP_RATE_LIMITING = process.env.E2E_TESTING === "true";

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// Default to memory store, can be replaced at startup
let store: RateLimitStore = new MemoryRateLimitStore();

/**
 * Initialize the rate limit store. Called at server startup.
 */
export function initializeRateLimitStore(newStore: RateLimitStore): void {
  store = newStore;
  log.info(
    { store: newStore.constructor.name },
    "Rate limit store initialized"
  );
}

/** Get the current store (for testing) */
export function getRateLimitStore(): RateLimitStore {
  return store;
}

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 60 * 1000 }, // 5 attempts per minute
  register: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  claimProfile: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 attempts per hour
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  search: { limit: 30, windowMs: 60 * 1000 }, // 30 searches per minute
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 API requests per minute
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Check rate limit for an action
 * Now async to support Redis store.
 *
 * @param action - The action being rate limited (e.g., "login", "register")
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param options - Optional custom rate limit options (overrides defaults)
 * @throws Error if rate limit exceeded with 429 status info
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string,
  options?: Partial<RateLimitOptions>
): Promise<void> {
  // Skip rate limiting in E2E tests
  if (SKIP_RATE_LIMITING) {
    return;
  }

  const config = { ...RATE_LIMITS[action], ...options };
  const key = `${action}:${identifier}`;

  const result = await store.increment(key, config.windowMs);

  if (result.count > config.limit) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    log.warn(
      {
        action,
        identifier,
        count: result.count,
        limit: config.limit,
        retryAfterSeconds: retryAfter,
      },
      "Rate limit exceeded"
    );

    const error = new Error(
      `Too many requests. Please try again in ${retryAfter} seconds.`
    );
    // Add metadata for the error handler
    (error as Error & { statusCode: number; retryAfter: number }).statusCode =
      429;
    (error as Error & { statusCode: number; retryAfter: number }).retryAfter =
      retryAfter;
    throw error;
  }

  log.info(
    { action, identifier, count: result.count, limit: config.limit },
    "Rate limit check passed"
  );
}

/**
 * Get remaining rate limit for an action
 *
 * @param action - The action being rate limited
 * @param identifier - Unique identifier
 * @returns Object with remaining attempts and reset time
 */
export async function getRateLimitStatus(
  action: RateLimitAction,
  identifier: string
): Promise<{ remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[action];
  const key = `${action}:${identifier}`;
  const entry = await store.get(key);

  if (!entry) {
    return { remaining: config.limit, resetAt: Date.now() + config.windowMs };
  }

  return {
    remaining: Math.max(0, config.limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for an action (e.g., after successful login)
 *
 * @param action - The action to reset
 * @param identifier - Unique identifier
 */
export async function resetRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<void> {
  const key = `${action}:${identifier}`;
  await store.reset(key);
  log.info({ action, identifier }, "Rate limit reset");
}

/**
 * Get client IP address from request headers
 * Works with proxies (X-Forwarded-For, X-Real-IP) and direct connections
 *
 * @returns IP address string or "unknown" if not determinable
 */
export function getClientIP(): string {
  // In TanStack Start server functions, we don't have direct access to headers
  // We need to import getHeaders from @tanstack/react-start/server
  // This will be called within the server function context
  try {
    // Dynamic import to avoid issues if called outside server context

    const { getHeaders } = require("@tanstack/react-start/server");
    const headers = getHeaders();

    // Check various proxy headers
    const xForwardedFor = headers?.["x-forwarded-for"];
    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = xForwardedFor.split(",").map((ip: string) => ip.trim());
      return ips[0] || "unknown";
    }

    const xRealIp = headers?.["x-real-ip"];
    if (xRealIp) {
      return xRealIp;
    }

    // Cloudflare header
    const cfConnectingIp = headers?.["cf-connecting-ip"];
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}
