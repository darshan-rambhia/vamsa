/**
 * Metrics Module
 *
 * Re-exports all metrics utilities for easy importing.
 *
 * Usage:
 *   import {
 *     createPrismaPerformanceMiddleware,
 *     recordChartMetrics,
 *     recordSearchMetrics,
 *   } from './metrics';
 */

// Main middleware
export {
  createPrismaPerformanceMiddleware,
  isSlowQuery,
} from "./prisma-middleware";

// Prisma metrics recording functions
export {
  recordPrismaQuery,
  recordPrismaError,
  getPrismaErrorType,
  SLOW_QUERY_THRESHOLD_MS,
  // Metric instances (for testing)
  prismaQueryDuration,
  prismaQueryCount,
  prismaSlowQueryCount,
  prismaErrorCount,
  prismaResultCount,
} from "./prisma";

// Tracing middleware
export { createPrismaTracingMiddleware } from "./prisma-tracing";

// Slow query logging
export {
  logSlowQuery,
  getSlowQueries,
  getSlowQueryStats,
  clearSlowQueries,
  sanitizeQueryParams,
  SLOW_QUERY_LOG_THRESHOLD_MS,
  type SlowQuery,
} from "./slow-query-logger";

// Application-specific metrics
export {
  // Chart metrics
  recordChartMetrics,
  chartRenderDuration,
  chartNodeCount,
  chartViewCount,
  // Search metrics
  recordSearchMetrics,
  searchQueryDuration,
  searchResultCount,
  searchZeroResultCount,
  searchIntentCount,
  // Relationship metrics
  recordRelationshipCalc,
  relationshipCalcDuration,
  relationshipPathLength,
  relationshipCalcCount,
  // GEDCOM metrics
  recordGedcomImport,
  recordGedcomExport,
  recordGedcomValidation,
  gedcomImportDuration,
  gedcomPersonCount,
  gedcomErrorCount,
  gedcomExportDuration,
  gedcomOperationCount,
  // Media metrics
  recordMediaUpload,
  mediaUploadDuration,
  mediaFileSize,
  mediaProcessingDuration,
  mediaUploadCount,
  // User activity metrics
  recordFeatureUsage,
  activeUsers,
  sessionDuration,
  featureUsageCount,
} from "./application";
