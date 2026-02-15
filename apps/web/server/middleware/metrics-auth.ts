import { createHash, timingSafeEqual } from "node:crypto";
import { loggers } from "@vamsa/lib/logger";
import type { Context, Next } from "hono";

const log = loggers.api;

/**
 * Hono middleware for metrics endpoint authentication
 *
 * Protects the `/health/cache` and `/health/telemetry` endpoints with a bearer token.
 * These endpoints expose internal application metrics that should only be accessible
 * to authorized monitoring systems.
 *
 * Features:
 * - Bearer token validation via Authorization header
 * - Timing-safe comparison to prevent timing attacks
 * - Dev mode allows access without token (convenience)
 * - Production requires token or fails with 503 (startup failure detection)
 * - Invalid/missing tokens return 401/403 with appropriate error messages
 *
 * Configuration:
 * - Token: METRICS_BEARER_TOKEN environment variable (required in production)
 * - Dev mode: If not set, allows access without authentication
 * - Production mode: If not set, returns 503 Service Unavailable
 *
 * @example
 * // In server/index.ts:
 * import { metricsAuthMiddleware } from "./middleware/metrics-auth";
 *
 * app.use("/health/cache", metricsAuthMiddleware());
 * app.use("/health/telemetry", metricsAuthMiddleware());
 */
export function metricsAuthMiddleware() {
  const token = process.env.METRICS_BEARER_TOKEN;
  const isProduction = process.env.NODE_ENV === "production";

  return async (c: Context, next: Next) => {
    // If no token configured, allow in dev, reject in prod
    if (!token) {
      if (!isProduction) {
        // Dev mode: allow access without token
        await next();
        return;
      }
      // Production mode: fail if token not configured
      log.error(
        { path: c.req.path },
        "Metrics endpoint accessed without METRICS_BEARER_TOKEN configured"
      );
      return c.json({ error: "Metrics authentication not configured" }, 503, {
        "Cache-Control": "no-store",
      });
    }

    const authHeader = c.req.header("Authorization");

    // Check if Authorization header exists
    if (!authHeader) {
      log.warn(
        { path: c.req.path },
        "Metrics auth failed: missing Authorization header"
      );
      return c.json({ error: "Unauthorized" }, 401, {
        "Cache-Control": "no-store",
      });
    }

    // Check if Authorization header has Bearer prefix
    if (!authHeader.startsWith("Bearer ")) {
      log.warn(
        { path: c.req.path, format: authHeader.slice(0, 20) },
        "Metrics auth failed: invalid Authorization format"
      );
      return c.json({ error: "Unauthorized" }, 401, {
        "Cache-Control": "no-store",
      });
    }

    // Extract token from "Bearer <token>"
    const providedToken = authHeader.slice(7);

    // Timing-safe comparison to prevent timing attacks
    if (!safeTokenCompare(providedToken, token)) {
      log.warn({ path: c.req.path }, "Metrics auth failed: invalid token");
      return c.json({ error: "Forbidden" }, 403, {
        "Cache-Control": "no-store",
      });
    }

    // Token is valid, allow request to proceed
    await next();
  };
}

/**
 * Timing-safe token comparison using Node.js crypto.timingSafeEqual
 *
 * Hashes both inputs with SHA-256 before comparing, which:
 * 1. Normalizes to equal length (no length leak)
 * 2. Uses the battle-tested crypto.timingSafeEqual under the hood
 *
 * @param provided - The token provided in the request
 * @param expected - The expected token from environment
 * @returns true if tokens are equal, false otherwise
 */
function safeTokenCompare(provided: string, expected: string): boolean {
  const hashA = createHash("sha256").update(provided).digest();
  const hashB = createHash("sha256").update(expected).digest();
  return timingSafeEqual(hashA, hashB);
}
