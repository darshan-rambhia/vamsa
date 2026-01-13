/**
 * ETag (Entity Tag) utilities for HTTP caching
 *
 * ETags identify specific versions of resources. Clients use them for
 * conditional requests to avoid re-downloading unchanged content.
 *
 * @example
 * // Generate ETag from content
 * const etag = generateETag(JSON.stringify(data));
 *
 * // Check if client ETag matches
 * if (etagMatches(clientETag, serverETag)) {
 *   return notModifiedResponse(serverETag);
 * }
 */

import { createHash } from "crypto";

/**
 * Generate an ETag from string or buffer content
 *
 * Uses MD5 by default for speed - security is not a concern for ETags,
 * they just need to be unique for different content.
 *
 * @param content - The content to hash
 * @param options - Configuration options
 * @returns ETag string in format "hash" or W/"hash" for weak ETags
 *
 * @example
 * const etag = generateETag(JSON.stringify(person));
 * // "a1b2c3d4e5f6g7h8"
 *
 * const weakEtag = generateETag(content, { weak: true });
 * // W/"a1b2c3d4e5f6g7h8"
 */
export function generateETag(
  content: string | Buffer,
  options: {
    /**
     * Use weak ETag indicator (W/)
     * Weak ETags indicate semantic equivalence, not byte-for-byte identical
     */
    weak?: boolean;
    /**
     * Hash algorithm - md5 is fast and sufficient for caching
     */
    algorithm?: "md5" | "sha1" | "sha256";
    /**
     * Length of hash to use (shorter = less collision resistance but more readable)
     */
    length?: number;
  } = {}
): string {
  const { weak = false, algorithm = "md5", length = 16 } = options;

  const hash = createHash(algorithm)
    .update(typeof content === "string" ? content : content.toString("utf8"))
    .digest("hex")
    .slice(0, length);

  return weak ? `W/"${hash}"` : `"${hash}"`;
}

/**
 * Generate an ETag from any JSON-serializable object
 *
 * Serializes the object to JSON first, then generates the ETag.
 * Use this for API response bodies.
 *
 * @param obj - Object to generate ETag from
 * @param options - Same options as generateETag
 * @returns ETag string
 *
 * @example
 * const etag = generateETagFromObject(person);
 */
export function generateETagFromObject(
  obj: unknown,
  options: {
    weak?: boolean;
    algorithm?: "md5" | "sha1" | "sha256";
    length?: number;
  } = {}
): string {
  return generateETag(JSON.stringify(obj), options);
}

/**
 * Generate a weak ETag from a timestamp
 *
 * Fast alternative when you have a reliable "last modified" timestamp.
 * Uses base36 encoding for a shorter, URL-safe string.
 *
 * @param timestamp - Date object or Unix timestamp in milliseconds
 * @returns Weak ETag string
 *
 * @example
 * const etag = generateTimestampETag(person.updatedAt);
 * // W/"lk8p42"
 */
export function generateTimestampETag(timestamp: Date | number): string {
  const ts = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  return `W/"${ts.toString(36)}"`;
}

/**
 * Generate an ETag from a version number
 *
 * Use this when you maintain a version counter that increments on changes.
 *
 * @param version - Version number
 * @returns Weak ETag string
 *
 * @example
 * const etag = generateVersionETag(entity.version);
 * // W/"v42"
 */
export function generateVersionETag(version: number): string {
  return `W/"v${version}"`;
}

/**
 * Check if a client's ETag matches the server's ETag
 *
 * Handles:
 * - Multiple ETags in If-None-Match header (comma-separated)
 * - Wildcard (*) matching
 * - Weak vs strong ETag comparison (ignores W/ prefix for comparison)
 *
 * @param clientETag - The ETag from If-None-Match header (may be comma-separated)
 * @param serverETag - The current server ETag
 * @returns true if any client ETag matches the server ETag
 *
 * @example
 * const clientETag = req.header("If-None-Match");
 * if (etagMatches(clientETag, currentETag)) {
 *   return new Response(null, { status: 304 });
 * }
 */
export function etagMatches(
  clientETag: string | null | undefined,
  serverETag: string
): boolean {
  if (!clientETag) return false;

  // Handle multiple ETags in If-None-Match header
  const clientETags = clientETag.split(",").map((tag) => tag.trim());

  return clientETags.some((tag) => {
    // * matches any ETag
    if (tag === "*") return true;

    // Compare ETags - per RFC 7232, weak comparison ignores W/ prefix
    const normalizedClient = tag.replace(/^W\//, "");
    const normalizedServer = serverETag.replace(/^W\//, "");

    return normalizedClient === normalizedServer;
  });
}

/**
 * Parse an ETag string to extract the hash value
 *
 * @param etag - ETag string (with or without W/ prefix and quotes)
 * @returns Object with isWeak flag and hash value
 *
 * @example
 * parseETag('W/"abc123"')
 * // { isWeak: true, hash: "abc123" }
 *
 * parseETag('"abc123"')
 * // { isWeak: false, hash: "abc123" }
 */
export function parseETag(etag: string): { isWeak: boolean; hash: string } {
  const isWeak = etag.startsWith("W/");
  const hash = etag.replace(/^W\//, "").replace(/^"/, "").replace(/"$/, "");

  return { isWeak, hash };
}

/**
 * HTTP Cache-Control header values for common scenarios
 */
export const CacheControl = {
  /**
   * No caching at all - always fetch fresh
   */
  noStore: "no-store, no-cache, must-revalidate",

  /**
   * Validate with server on every request (ETag/If-None-Match)
   */
  revalidate: "private, must-revalidate, max-age=0",

  /**
   * Cache for a short time, then revalidate
   */
  shortTerm: (seconds: number = 60) =>
    `private, max-age=${seconds}, must-revalidate`,

  /**
   * Cache publicly for longer periods (CDN-friendly)
   */
  public: (seconds: number = 3600) =>
    `public, max-age=${seconds}, must-revalidate`,

  /**
   * Immutable content (like versioned static assets)
   */
  immutable: (seconds: number = 31536000) =>
    `public, max-age=${seconds}, immutable`,

  /**
   * Stale-while-revalidate pattern for better UX
   */
  staleWhileRevalidate: (maxAge: number = 60, staleWhile: number = 3600) =>
    `public, max-age=${maxAge}, stale-while-revalidate=${staleWhile}`,
} as const;

/**
 * Create standard cache headers for a response
 *
 * @param etag - The ETag for this response
 * @param cacheControl - Cache-Control header value
 * @returns Headers object
 */
export function createCacheHeaders(
  etag: string,
  cacheControl: string = CacheControl.revalidate
): Record<string, string> {
  return {
    ETag: etag,
    "Cache-Control": cacheControl,
    Vary: "Accept, Accept-Encoding",
  };
}
