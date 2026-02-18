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
 * Parse environment variable as integer with fallback to default
 */
function parseEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    log.warn(
      { key, value },
      `Invalid integer in environment variable, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  return parsed;
}

/**
 * Rate limit configurations for different actions
 * All values are configurable via environment variables
 */
export const RATE_LIMITS = {
  login: {
    limit: parseEnvInt("RATE_LIMIT_LOGIN_MAX", 5),
    windowMs: parseEnvInt("RATE_LIMIT_LOGIN_WINDOW", 60) * 1000, // Convert seconds to ms
  },
  register: {
    limit: parseEnvInt("RATE_LIMIT_REGISTER_MAX", 3),
    windowMs: parseEnvInt("RATE_LIMIT_REGISTER_WINDOW", 3600) * 1000, // 1 hour default
  },
  claimProfile: {
    limit: parseEnvInt("RATE_LIMIT_CLAIM_PROFILE_MAX", 10),
    windowMs: parseEnvInt("RATE_LIMIT_CLAIM_PROFILE_WINDOW", 3600) * 1000, // 1 hour default
  },
  passwordReset: {
    limit: parseEnvInt("RATE_LIMIT_PASSWORD_RESET_MAX", 3),
    windowMs: parseEnvInt("RATE_LIMIT_PASSWORD_RESET_WINDOW", 3600) * 1000, // 1 hour default
  },
  search: {
    limit: parseEnvInt("RATE_LIMIT_SEARCH_MAX", 30),
    windowMs: parseEnvInt("RATE_LIMIT_SEARCH_WINDOW", 60) * 1000, // Per minute
  },
  api: {
    limit: parseEnvInt("RATE_LIMIT_API_MAX", 100),
    windowMs: parseEnvInt("RATE_LIMIT_API_WINDOW", 60) * 1000, // Per minute
  },
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
 *
 * IP resolution is now handled by the trusted-proxy middleware which:
 * 1. Validates that proxy headers come from trusted sources
 * 2. Sets x-vamsa-client-ip header with the resolved IP
 * 3. Prevents IP spoofing attacks
 *
 * @returns IP address string or "unknown" if not determinable
 */
export function getClientIP(): string {
  // In TanStack Start server functions, we don't have direct access to headers
  // We need to import getHeaders from @tanstack/react-start/server
  // This will be called within the server function context
  try {
    const { getHeaders } = require("@tanstack/react-start/server");
    const headers = getHeaders();

    // Get the resolved client IP from the middleware
    return headers?.["x-vamsa-client-ip"] ?? "unknown";
  } catch {
    return "unknown";
  }
}
