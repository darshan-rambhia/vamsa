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
import { checkRateLimit, getRateLimitStatus } from "./rate-limiter";
import type { RateLimitAction } from "./rate-limiter";

const log = loggers.api;

/**
 * Extract client IP from request headers
 * Checks multiple proxy headers in order of preference
 */
function extractClientIP(
  headers: Record<string, string | Array<string> | undefined>
): string {
  // Check X-Forwarded-For header (most common with proxies)
  const xForwardedFor = headers["x-forwarded-for"];
  if (xForwardedFor) {
    const forwardedStr = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor;
    if (forwardedStr) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = forwardedStr.split(",").map((ip) => ip.trim());
      if (ips[0]) {
        return ips[0];
      }
    }
  }

  // Check X-Real-IP header (common with nginx)
  const xRealIp = headers["x-real-ip"];
  if (xRealIp) {
    const realIpStr = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    if (realIpStr) {
      return realIpStr;
    }
  }

  // Check Cloudflare header
  const cfConnectingIp = headers["cf-connecting-ip"];
  if (cfConnectingIp) {
    const cfIpStr = Array.isArray(cfConnectingIp)
      ? cfConnectingIp[0]
      : cfConnectingIp;
    if (cfIpStr) {
      return cfIpStr;
    }
  }

  // Fallback to unknown
  return "unknown";
}

/**
 * Create a rate limit middleware for a specific action
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
