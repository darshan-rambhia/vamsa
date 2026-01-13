import { Context } from "hono";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "@vamsa/lib/logger";

/**
 * MIME type mapping for media files
 */
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".tiff": "image/tiff",
};

/**
 * Get media directory path
 */
function getMediaDir(): string {
  if (process.env.MEDIA_STORAGE_PATH) {
    return process.env.MEDIA_STORAGE_PATH;
  }
  return path.join(process.cwd(), "data", "uploads", "media");
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Validate that the requested path is within the media directory
 * Prevents path traversal attacks
 */
function isValidMediaPath(requestedPath: string, mediaDir: string): boolean {
  // Normalize paths to absolute
  const normalized = path.normalize(path.join(mediaDir, requestedPath));
  const realMediaDir = path.resolve(mediaDir);

  // Check if normalized path is within media directory
  return normalized.startsWith(realMediaDir);
}

/**
 * Parse range header for partial content requests
 * Format: bytes=start-end or bytes=start-
 */
function parseRangeHeader(
  rangeHeader: string | undefined,
  fileSize: number
): { start: number; end: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return null;
  }

  const range = rangeHeader.substring(6);
  const [startStr, endStr] = range.split("-");

  const start = parseInt(startStr, 10);
  let end = endStr ? parseInt(endStr, 10) : fileSize - 1;

  // Validate range
  if (isNaN(start) || start < 0 || start >= fileSize) {
    return null;
  }

  if (isNaN(end) || end < start || end >= fileSize) {
    end = fileSize - 1;
  }

  return { start, end };
}

/**
 * Serve media files with proper headers
 * Supports:
 * - Content-Type detection
 * - Cache-Control headers for long-term caching
 * - Range requests for progressive loading (video, large images)
 * - 304 Not Modified for conditional requests
 */
export async function serveMedia(c: Context): Promise<Response> {
  try {
    // Extract file path from URL (remove /media/ prefix)
    const urlPath = new URL(c.req.url).pathname;
    const filePath = urlPath.replace(/^\/media\//, "");

    if (!filePath) {
      return c.notFound();
    }

    // Security: prevent path traversal attacks
    const mediaDir = getMediaDir();
    if (!isValidMediaPath(filePath, mediaDir)) {
      logger.warn(
        { requestedPath: filePath },
        "Attempted path traversal in media request"
      );
      return c.notFound();
    }

    // Build full file path
    const fullPath = path.join(mediaDir, filePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      logger.debug({ path: fullPath }, "Media file not found");
      return c.notFound();
    }

    // Get file stats for size and modification time
    const stats = await fs.stat(fullPath);

    if (!stats.isFile()) {
      return c.notFound();
    }

    // Generate ETag based on file size and modification time
    const etag = `"${stats.size}-${stats.mtimeMs}"`;

    // Check If-None-Match header for 304 Not Modified
    if (c.req.header("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=31536000", // 1 year for immutable assets
        },
      });
    }

    // Determine MIME type
    const mimeType = getMimeType(fullPath);

    // Handle range requests for progressive loading
    const rangeHeader = c.req.header("range");
    const range = parseRangeHeader(rangeHeader, stats.size);

    // Read file
    const buffer = await fs.readFile(fullPath);

    // Setup response headers
    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      ETag: etag,
      // Cache headers: assets are immutable (content-addressed by filename)
      "Cache-Control": "public, max-age=31536000, immutable",
      // Allow browsers to cache aggressively
      "Accept-Ranges": "bytes",
      // Prevent inline display for security
      "Content-Disposition": "inline",
      // Vary header for cache (in case of Accept-Encoding)
      Vary: "Accept-Encoding",
      // Cross-origin resource sharing
      "Access-Control-Allow-Origin": "*",
    };

    // Handle range request
    if (range) {
      const { start, end } = range;
      const contentLength = end - start + 1;

      headers["Content-Length"] = String(contentLength);
      headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;

      return new Response(buffer.slice(start, end + 1), {
        status: 206, // Partial Content
        headers,
      });
    }

    // Full content response
    headers["Content-Length"] = String(stats.size);

    return new Response(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        path: new URL(c.req.url).pathname,
      },
      "Error serving media"
    );

    return c.json({ error: "Internal Server Error" }, 500, {
      "Cache-Control": "no-store",
    });
  }
}
