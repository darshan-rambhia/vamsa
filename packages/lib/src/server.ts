/**
 * Server-only utilities
 *
 * These utilities use Node.js APIs and cannot be used in browser code.
 * Import from '@vamsa/lib/server' instead of '@vamsa/lib' to use these.
 */

// ETag/HTTP caching utilities (uses Node.js crypto)
export {
  generateETag,
  generateETagFromObject,
  generateTimestampETag,
  generateVersionETag,
  etagMatches,
  parseETag,
  createCacheHeaders,
  CacheControl,
} from "./etag";

// Media processing utilities (server-only due to sharp dependency)
export {
  type ImageSize,
  type ProcessedImage,
  generateWebP,
  generateThumbnail,
  generateResponsiveSizes,
  processUploadedImage,
  cleanupOldImages,
  getMediaDir,
} from "./media/processor";
