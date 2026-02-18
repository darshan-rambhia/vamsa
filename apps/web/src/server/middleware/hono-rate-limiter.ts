/**
 * Hono middleware for rate limiting
 *
 * Provides rate limiting for HTTP requests using the shared rate limiter.
 * Returns proper 429 responses with rate limit headers.
 *
 * Usage:
 * ```typescript
 * import { rateLimitMiddleware } from "./middleware/hono-rate-limiter";
 *
 * app.use("/api/auth/sign-in/*", rateLimitMiddleware("login"));
 * app.use("/api/auth/sign-up/*", rateLimitMiddleware("register"));
 * ```
 */

import { createMiddleware } from "hono/factory";
import { loggers } from "@vamsa/lib/logger";
import { betterAuthGetSessionWithUser } from "@vamsa/lib/server/business/auth-better-api";
import { checkRateLimit, getRateLimitStatus } from "./rate-limiter";
import type { RateLimitAction } from "./rate-limiter";

const log = loggers.api;

/**
 * Extract client IP from the x-vamsa-client-ip header
 *
 * This header is set by the trusted-proxy middleware which validates
 * that proxy headers come from trusted sources, preventing IP spoofing.
 */
function extractClientIP(
  headers: Record<string, string | Array<string> | undefined>
): string {
  const clientIP = headers["x-vamsa-client-ip"];
  if (clientIP) {
    const ipStr = Array.isArray(clientIP) ? clientIP[0] : clientIP;
    if (ipStr) {
      return ipStr;
    }
  }

  // Fallback to unknown if header not set
  return "unknown";
}

/**
 * Create a rate limit middleware for a specific action
 *
 * Uses IP address as the rate limit key.
 *
 * @param action - The action being rate limited
 * @returns Hono middleware function
 */
export function rateLimitMiddleware(action: RateLimitAction) {
  return createMiddleware(async (c, next) => {
    // Extract client IP from request headers
    const headerRecord: Record<string, string | Array<string> | undefined> = {};
    const reqHeaders = c.req.header();
    for (const [key, value] of Object.entries(reqHeaders)) {
      headerRecord[key.toLowerCase()] = value;
    }
    const clientIP = extractClientIP(headerRecord);

    try {
      // Check rate limit - will throw if exceeded
      await checkRateLimit(action, clientIP);

      // Get current rate limit status
      const status = await getRateLimitStatus(action, clientIP);

      // Add rate limit headers to response
      c.header("X-RateLimit-Limit", String(status.remaining + 1));
      c.header("X-RateLimit-Remaining", String(status.remaining));
      c.header("X-RateLimit-Reset", String(Math.floor(status.resetAt / 1000)));

      await next();
    } catch (error) {
      // Check if this is a rate limit error
      if (
        error instanceof Error &&
        (error as Error & { statusCode?: number }).statusCode === 429
      ) {
        const retryAfter = (error as Error & { retryAfter?: number })
          .retryAfter;
        const status = await getRateLimitStatus(action, clientIP);

        log.warn(
          { action, clientIP, error: error.message },
          "Rate limit exceeded"
        );

        // Return 429 with rate limit headers
        return c.json(
          {
            error: "Too Many Requests",
            message: error.message,
            retryAfter,
          },
          429,
          {
            "X-RateLimit-Limit": String(status.remaining + 1),
            "X-RateLimit-Remaining": String(status.remaining),
            "X-RateLimit-Reset": String(Math.floor(status.resetAt / 1000)),
            "Retry-After": String(retryAfter),
          }
        );
      }

      // Re-throw other errors
      throw error;
    }
  });
}

/**
 * Create a per-user API rate limit middleware
 *
 * For authenticated requests: uses user ID as the rate limit key
 * For unauthenticated requests: uses IP address as the rate limit key
 *
 * This allows authenticated users to have higher rate limits than anonymous users.
 * The rate limit is configurable via RATE_LIMIT_API_MAX and RATE_LIMIT_API_WINDOW env vars.
 *
 * @returns Hono middleware function
 *
 * @example
 * app.use("/api/v1/*", perUserApiRateLimitMiddleware());
 */
export function perUserApiRateLimitMiddleware() {
  return createMiddleware(async (c, next) => {
    // Try to get authenticated user
    const user = await betterAuthGetSessionWithUser(c.req.raw.headers);

    // Extract client IP from request headers
    const headerRecord: Record<string, string | Array<string> | undefined> = {};
    const reqHeaders = c.req.header();
    for (const [key, value] of Object.entries(reqHeaders)) {
      headerRecord[key.toLowerCase()] = value;
    }
    const clientIP = extractClientIP(headerRecord);

    // Use user ID if authenticated, otherwise use IP address
    const identifier = user ? `user:${user.id}` : `ip:${clientIP}`;

    try {
      // Check rate limit - will throw if exceeded
      await checkRateLimit("api", identifier);

      // Get current rate limit status
      const status = await getRateLimitStatus("api", identifier);

      // Add rate limit headers to response
      c.header("X-RateLimit-Limit", String(status.remaining + 1));
      c.header("X-RateLimit-Remaining", String(status.remaining));
      c.header("X-RateLimit-Reset", String(Math.floor(status.resetAt / 1000)));

      await next();
    } catch (error) {
      // Check if this is a rate limit error
      if (
        error instanceof Error &&
        (error as Error & { statusCode?: number }).statusCode === 429
      ) {
        const retryAfter = (error as Error & { retryAfter?: number })
          .retryAfter;
        const status = await getRateLimitStatus("api", identifier);

        log.warn(
          {
            identifier,
            userId: user?.id,
            ip: clientIP,
            error: error.message,
          },
          "API rate limit exceeded"
        );

        // Return 429 with rate limit headers
        return c.json(
          {
            error: "Too Many Requests",
            message: error.message,
            retryAfter,
          },
          429,
          {
            "X-RateLimit-Limit": String(status.remaining + 1),
            "X-RateLimit-Remaining": String(status.remaining),
            "X-RateLimit-Reset": String(Math.floor(status.resetAt / 1000)),
            "Retry-After": String(retryAfter),
          }
        );
      }

      // Re-throw other errors
      throw error;
    }
  });
}
