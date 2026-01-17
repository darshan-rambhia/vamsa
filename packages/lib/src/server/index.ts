/**
 * Server-only utilities and business logic
 *
 * These utilities use Node.js APIs and cannot be used in browser code.
 * Import from '@vamsa/lib/server' instead of '@vamsa/lib' to use these.
 *
 * Modules:
 * - ETag/HTTP caching utilities (uses Node.js crypto)
 * - Media processing utilities (server-only due to sharp dependency)
 * - Database utilities (Prisma re-export)
 * - i18n configuration and utilities
 * - Business logic functions (Authentication, Backup, Calendar, Charts, etc.)
 * - Metrics recording
 * - Helper functions (Charts layout, GEDCOM parsing)
 */

// ============================================================================
// Legacy utilities (maintained for backward compatibility)
// ============================================================================

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
} from "../etag";

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
} from "../media/processor";

// ============================================================================
// Database utilities
// ============================================================================
export { prisma } from "./db";

// ============================================================================
// Internationalization
// ============================================================================
export {
  initializeServerI18n,
  getServerI18n,
  t,
  tMultiple,
  getActiveInstance,
  resetServerI18n,
  setLocalesPath,
} from "./i18n";

// ============================================================================
// Metrics & Monitoring
// ============================================================================
export { recordChartMetrics, recordSearchMetrics, recordMediaUpload, recordGedcomValidation, recordGedcomImport, recordGedcomExport, createHistogram, createCounter } from "./metrics";

// ============================================================================
// Helper functions
// ============================================================================

// Chart layout and data collection helpers
export * from "./helpers/charts";

// GEDCOM parsing helpers
export * from "./helpers/gedcom";

// ============================================================================
// Business Logic - All Modules
// ============================================================================
// Re-export all business logic functions and types
export * from "./business";
