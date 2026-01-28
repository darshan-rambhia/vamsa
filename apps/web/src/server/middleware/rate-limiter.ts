/**
 * Rate limiter for server functions
 *
 * Uses an in-memory store for rate limiting. For production with multiple
 * server instances, consider using Redis or another distributed store.
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

const log = loggers.api;

// Skip rate limiting in E2E tests to avoid flaky tests due to parallel workers
const SKIP_RATE_LIMITING = process.env.E2E_TESTING === "true";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// In-memory store for rate limiting
// Key format: "{action}:{identifier}"
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Start cleanup interval
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL);

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 60 * 1000 }, // 5 attempts per minute
  register: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  claimProfile: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 attempts per hour
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Check rate limit for an action
 *
 * @param action - The action being rate limited (e.g., "login", "register")
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param options - Optional custom rate limit options (overrides defaults)
 * @throws Error if rate limit exceeded with 429 status info
 */
export function checkRateLimit(
  action: RateLimitAction,
  identifier: string,
  options?: Partial<RateLimitOptions>
): void {
  // Skip rate limiting in E2E tests
  if (SKIP_RATE_LIMITING) {
    return;
  }

  const config = { ...RATE_LIMITS[action], ...options };
  const key = `${action}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset if window has passed
  if (entry && entry.resetAt < now) {
    entry = undefined;
    rateLimitStore.delete(key);
  }

  if (!entry) {
    // First request in window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    log.info(
      { action, identifier, count: 1, limit: config.limit },
      "Rate limit check passed"
    );
    return;
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    log.warn(
      {
        action,
        identifier,
        count: entry.count,
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
    { action, identifier, count: entry.count, limit: config.limit },
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
export function getRateLimitStatus(
  action: RateLimitAction,
  identifier: string
): { remaining: number; resetAt: number } {
  const config = RATE_LIMITS[action];
  const key = `${action}:${identifier}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    return {
      remaining: config.limit,
      resetAt: now + config.windowMs,
    };
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
export function resetRateLimit(
  action: RateLimitAction,
  identifier: string
): void {
  const key = `${action}:${identifier}`;
  rateLimitStore.delete(key);
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
