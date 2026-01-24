/**
 * Metrics Module
 *
 * Re-exports all metrics utilities for easy importing.
 *
 * Usage:
 *   import {
 *     recordChartMetrics,
 *     recordSearchMetrics,
 *   } from './metrics';
 */

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
