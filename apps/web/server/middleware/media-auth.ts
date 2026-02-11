import { createMiddleware } from "hono/factory";
import { betterAuthGetSessionWithUserFromCookie } from "@vamsa/lib/server/business/auth-better-api";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.api;

/**
 * Session cache entry with expiration
 */
interface CacheEntry {
  userId: string;
  expiresAt: number;
}

/**
 * Simple in-memory session cache for media requests
 * Prevents hitting DB for every image on a page (20-50 images = 20-50 DB queries)
 *
 * The cache is keyed by session token and stores userId + expiration time.
 * Cache entries are cleaned up when they expire or when the cache exceeds MAX_CACHE_ENTRIES.
 */
const sessionCache = new Map<string, CacheEntry>();

// Cache TTL: 5 minutes (long enough to serve a page, short enough for security)
const CACHE_TTL = 5 * 60 * 1000;

// Maximum number of cached sessions to prevent memory growth
const MAX_CACHE_ENTRIES = 100;

/**
 * Remove expired entries from cache and evict oldest if needed
 */
function cleanupCache(): void {
  const now = Date.now();

  // Remove expired entries
  for (const [key, value] of sessionCache.entries()) {
    if (value.expiresAt < now) {
      sessionCache.delete(key);
    }
  }

  // Evict oldest entries if over limit
  if (sessionCache.size > MAX_CACHE_ENTRIES) {
    const entries = [...sessionCache.entries()];
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
    for (const [key] of toRemove) {
      sessionCache.delete(key);
    }
  }
}

/**
 * Hono middleware for media file authentication
 *
 * Validates that requests to `/media/*` include a valid `better-auth.session_token` cookie.
 * Uses an in-memory cache to avoid DB hits for every image request.
 *
 * Features:
 * - Requires authentication (401 Unauthorized if missing)
 * - Caches session validation for 5 minutes to avoid DB overhead
 * - Returns 401 with no-store cache header to prevent caching auth failures
 * - Logs auth failures for security monitoring
 *
 * @example
 * // In server/index.ts:
 * app.use('/media/*', mediaAuthMiddleware);
 * app.get('/media/*', serveMedia);
 */
export const mediaAuthMiddleware = createMiddleware(async (c, next) => {
  const cookieHeader = c.req.header("cookie");

  if (!cookieHeader) {
    return c.json(
      { error: "Unauthorized", message: "Authentication required" },
      401,
      {
        "Cache-Control": "no-store",
      }
    );
  }

  // Extract session token from cookie for cache key
  const tokenMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
  const sessionToken = tokenMatch?.[1];

  if (!sessionToken) {
    return c.json(
      { error: "Unauthorized", message: "Authentication required" },
      401,
      {
        "Cache-Control": "no-store",
      }
    );
  }

  // Check cache first to avoid DB hit
  const cached = sessionCache.get(sessionToken);
  if (cached && cached.expiresAt > Date.now()) {
    // Valid cached session, allow request to proceed
    await next();
    return;
  }

  // Validate session against DB
  const user = await betterAuthGetSessionWithUserFromCookie(cookieHeader);

  if (!user) {
    log.warn({ path: c.req.path }, "Media auth failed: invalid session");
    return c.json(
      { error: "Unauthorized", message: "Authentication required" },
      401,
      {
        "Cache-Control": "no-store",
      }
    );
  }

  // Cache the session for future requests
  sessionCache.set(sessionToken, {
    userId: user.id,
    expiresAt: Date.now() + CACHE_TTL,
  });

  // Cleanup cache if needed
  cleanupCache();

  // Allow request to proceed
  await next();
});
