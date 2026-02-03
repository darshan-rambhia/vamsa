/**
 * Server-only utilities and business logic
 *
 * These utilities use Node.js APIs and cannot be used in browser code.
 * Import from '@vamsa/lib/server' instead of '@vamsa/lib' to use these.
 *
 * Modules:
 * - ETag/HTTP caching utilities (uses Node.js crypto)
 * - Media processing utilities (server-only due to sharp dependency)
 * - Database utilities (Drizzle ORM re-export)
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

// ============================================================================
// Media processing utilities - NOT EXPORTED FROM BARREL
// ============================================================================
// NOTE: Media processor is NOT exported from barrel to avoid pulling in sharp
// (native image processing library) into bundles that don't need it.
// Import directly from "@vamsa/lib/media/processor" if needed.

// ============================================================================
// Database utilities
// ============================================================================
export { drizzleDb, drizzleSchema } from "./db";

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
export {
  recordChartMetrics,
  recordSearchMetrics,
  recordMediaUpload,
  recordGedcomValidation,
  recordGedcomImport,
  recordGedcomExport,
} from "./metrics";

// ============================================================================
// Pagination utilities
// ============================================================================
export { encodeCursor, decodeCursor, paginateQuery } from "./pagination";

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
