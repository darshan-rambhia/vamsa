/**
 * Application-Specific Performance Metrics
 *
 * Provides custom metrics for key application features:
 * - Chart rendering performance
 * - Search query performance
 * - Relationship calculations
 * - GEDCOM import/export operations
 * - Media upload and processing
 * - User activity tracking
 *
 * Usage:
 *   import { recordChartMetrics, recordSearchMetrics } from './metrics/application';
 *   recordChartMetrics('ancestor', 25, 150);
 *   recordSearchMetrics('john doe', 5, 45, 'person_name');
 */

import { metrics } from "@opentelemetry/api";

// Create a meter for Vamsa application metrics
const meter = metrics.getMeter("vamsa-app", "1.0.0");

// ============================================
// Chart Metrics
// ============================================

/**
 * Chart render duration histogram
 *
 * Records the time taken to generate chart data.
 * Used for monitoring chart performance by type.
 */
export const chartRenderDuration = meter.createHistogram(
  "chart_render_duration_ms",
  {
    description: "Time to generate chart data in milliseconds",
    unit: "ms",
  }
);

/**
 * Chart node count histogram
 *
 * Records the number of nodes in generated charts.
 * Used for understanding chart complexity.
 */
export const chartNodeCount = meter.createHistogram("chart_node_count", {
  description: "Number of nodes in generated chart",
});

/**
 * Chart view counter
 *
 * Counts how many times each chart type is viewed.
 * Used for understanding feature usage.
 */
export const chartViewCount = meter.createCounter("chart_view_count", {
  description: "Number of times charts are viewed",
});

// ============================================
// Search Metrics
// ============================================

/**
 * Search query duration histogram
 *
 * Records the execution time of search queries.
 * Used for monitoring search performance.
 */
export const searchQueryDuration = meter.createHistogram(
  "search_query_duration_ms",
  {
    description: "Search query execution time in milliseconds",
    unit: "ms",
  }
);

/**
 * Search result count histogram
 *
 * Records the number of results returned by searches.
 * Used for understanding search effectiveness.
 */
export const searchResultCount = meter.createHistogram("search_result_count", {
  description: "Number of search results returned",
});

/**
 * Search zero-result counter
 *
 * Counts searches that return zero results.
 * High rates may indicate search quality issues.
 */
export const searchZeroResultCount = meter.createCounter(
  "search_zero_result_count",
  {
    description: "Number of searches returning zero results",
  }
);

/**
 * Search intent counter
 *
 * Counts searches by detected intent type.
 * Used for understanding search patterns.
 */
export const searchIntentCount = meter.createCounter("search_intent_count", {
  description: "Search queries by detected intent",
});

// ============================================
// Relationship Metrics
// ============================================

/**
 * Relationship calculation duration histogram
 *
 * Records the time to calculate relationship paths.
 * Used for monitoring relationship algorithm performance.
 */
export const relationshipCalcDuration = meter.createHistogram(
  "relationship_calc_duration_ms",
  {
    description: "Time to calculate relationship paths in milliseconds",
    unit: "ms",
  }
);

/**
 * Relationship path length histogram
 *
 * Records the length of relationship paths found.
 * Used for understanding family tree depth.
 */
export const relationshipPathLength = meter.createHistogram(
  "relationship_path_length",
  {
    description: "Length of relationship paths found",
  }
);

/**
 * Relationship calculation counter
 *
 * Counts relationship calculations by type.
 * Used for understanding feature usage.
 */
export const relationshipCalcCount = meter.createCounter(
  "relationship_calc_count",
  {
    description: "Number of relationship calculations performed",
  }
);

// ============================================
// GEDCOM Metrics
// ============================================

/**
 * GEDCOM import duration histogram
 *
 * Records the time to process GEDCOM imports.
 * Used for monitoring import performance.
 */
export const gedcomImportDuration = meter.createHistogram(
  "gedcom_import_duration_ms",
  {
    description: "GEDCOM import processing time in milliseconds",
    unit: "ms",
  }
);

/**
 * GEDCOM person count histogram
 *
 * Records the number of persons in GEDCOM imports.
 * Used for understanding import sizes.
 */
export const gedcomPersonCount = meter.createHistogram("gedcom_person_count", {
  description: "Number of persons in GEDCOM import",
});

/**
 * GEDCOM error counter
 *
 * Counts GEDCOM validation and parsing errors.
 * Used for monitoring data quality.
 */
export const gedcomErrorCount = meter.createCounter("gedcom_error_count", {
  description: "Number of GEDCOM validation errors",
});

/**
 * GEDCOM export duration histogram
 *
 * Records the time to generate GEDCOM exports.
 * Used for monitoring export performance.
 */
export const gedcomExportDuration = meter.createHistogram(
  "gedcom_export_duration_ms",
  {
    description: "GEDCOM export generation time in milliseconds",
    unit: "ms",
  }
);

/**
 * GEDCOM operation counter
 *
 * Counts GEDCOM operations by type.
 * Used for understanding feature usage.
 */
export const gedcomOperationCount = meter.createCounter(
  "gedcom_operation_count",
  {
    description: "Number of GEDCOM operations performed",
  }
);

// ============================================
// Media Metrics
// ============================================

/**
 * Media upload duration histogram
 *
 * Records the total time for media uploads.
 * Used for monitoring upload performance.
 */
export const mediaUploadDuration = meter.createHistogram(
  "media_upload_duration_ms",
  {
    description: "Media upload and processing time in milliseconds",
    unit: "ms",
  }
);

/**
 * Media file size histogram
 *
 * Records the size of uploaded media files.
 * Used for understanding storage patterns.
 */
export const mediaFileSize = meter.createHistogram("media_file_size_bytes", {
  description: "Uploaded media file size in bytes",
  unit: "bytes",
});

/**
 * Media processing duration histogram
 *
 * Records the time for image optimization.
 * Used for monitoring image processing performance.
 */
export const mediaProcessingDuration = meter.createHistogram(
  "media_processing_duration_ms",
  {
    description: "Image optimization processing time in milliseconds",
    unit: "ms",
  }
);

/**
 * Media upload counter
 *
 * Counts media uploads by type.
 * Used for understanding feature usage.
 */
export const mediaUploadCount = meter.createCounter("media_upload_count", {
  description: "Number of media uploads",
});

// ============================================
// User Activity Metrics
// ============================================

/**
 * Active users gauge
 *
 * Tracks the number of currently active users.
 * Used for monitoring system load.
 */
export const activeUsers = meter.createUpDownCounter("active_users", {
  description: "Number of currently active users",
});

/**
 * Session duration histogram
 *
 * Records user session durations.
 * Used for understanding user engagement.
 */
export const sessionDuration = meter.createHistogram(
  "session_duration_seconds",
  {
    description: "User session duration in seconds",
    unit: "s",
  }
);

/**
 * Feature usage counter
 *
 * Counts feature usage by endpoint.
 * Used for understanding feature popularity.
 */
export const featureUsageCount = meter.createCounter("feature_usage_count", {
  description: "Feature usage by endpoint",
});

// ============================================
// Helper Functions
// ============================================

/**
 * Record chart generation metrics
 *
 * @param chartType - Type of chart (ancestor, descendant, hourglass, fan, etc.)
 * @param nodeCount - Number of nodes in the chart
 * @param durationMs - Time to generate chart in milliseconds
 * @param userId - Optional user ID for tracking
 */
export function recordChartMetrics(
  chartType: string,
  nodeCount: number,
  durationMs: number,
  userId?: string
): void {
  const attributes = {
    chart_type: chartType,
    user_id: userId || "anonymous",
  };

  chartRenderDuration.record(durationMs, attributes);
  chartNodeCount.record(nodeCount, attributes);
  chartViewCount.add(1, attributes);
}

/**
 * Record search query metrics
 *
 * @param query - The search query (not recorded for privacy)
 * @param resultCount - Number of results returned
 * @param durationMs - Search execution time in milliseconds
 * @param intent - Detected search intent (optional)
 */
export function recordSearchMetrics(
  query: string,
  resultCount: number,
  durationMs: number,
  intent?: string
): void {
  const attributes = {
    has_results: resultCount > 0 ? "true" : "false",
    intent: intent || "unknown",
  };

  searchQueryDuration.record(durationMs, attributes);
  searchResultCount.record(resultCount, attributes);

  if (resultCount === 0) {
    searchZeroResultCount.add(1, {
      query_length: getQueryLengthBucket(query.length),
    });
  }

  if (intent) {
    searchIntentCount.add(1, { intent });
  }
}

/**
 * Record relationship calculation metrics
 *
 * @param calcType - Type of calculation (path, common_ancestor, cousins, tree_layout)
 * @param durationMs - Calculation time in milliseconds
 * @param pathLength - Length of path found (optional)
 * @param found - Whether a result was found
 */
export function recordRelationshipCalc(
  calcType: "path" | "common_ancestor" | "cousins" | "tree_layout",
  durationMs: number,
  pathLength?: number,
  found: boolean = true
): void {
  const attributes = {
    calc_type: calcType,
    found: found.toString(),
  };

  relationshipCalcDuration.record(durationMs, attributes);
  relationshipCalcCount.add(1, attributes);

  if (pathLength !== undefined) {
    relationshipPathLength.record(pathLength, attributes);
  }
}

/**
 * Record GEDCOM import metrics
 *
 * @param personCount - Number of persons imported
 * @param relationshipCount - Number of relationships imported
 * @param durationMs - Import processing time in milliseconds
 * @param errorCount - Number of validation/parsing errors
 * @param fileSize - Size of GEDCOM file in bytes (optional)
 */
export function recordGedcomImport(
  personCount: number,
  relationshipCount: number,
  durationMs: number,
  errorCount: number,
  _fileSize?: number // Reserved for future file size metric
): void {
  const attributes = {
    person_count_range: getPersonCountRange(personCount),
    relationship_count_range: getPersonCountRange(relationshipCount),
    success: errorCount === 0 ? "true" : "false",
  };

  gedcomImportDuration.record(durationMs, attributes);
  gedcomPersonCount.record(personCount, attributes);
  gedcomOperationCount.add(1, { operation: "import", ...attributes });

  if (errorCount > 0) {
    gedcomErrorCount.add(errorCount, { operation: "import" });
  }
}

/**
 * Record GEDCOM export metrics
 *
 * @param personCount - Number of persons exported
 * @param relationshipCount - Number of relationships exported
 * @param durationMs - Export generation time in milliseconds
 */
export function recordGedcomExport(
  personCount: number,
  relationshipCount: number,
  durationMs: number
): void {
  const attributes = {
    person_count_range: getPersonCountRange(personCount),
  };

  gedcomExportDuration.record(durationMs, attributes);
  gedcomOperationCount.add(1, { operation: "export", ...attributes });
}

/**
 * Record GEDCOM validation metrics
 *
 * @param valid - Whether the file is valid
 * @param errorCount - Number of validation errors
 * @param durationMs - Validation time in milliseconds
 */
export function recordGedcomValidation(
  valid: boolean,
  errorCount: number,
  durationMs: number
): void {
  const attributes = {
    success: valid.toString(),
  };

  // Record validation duration
  gedcomImportDuration.record(durationMs, {
    ...attributes,
    operation: "validate",
  });
  gedcomOperationCount.add(1, { operation: "validate", ...attributes });

  if (errorCount > 0) {
    gedcomErrorCount.add(errorCount, { operation: "validate" });
  }
}

/**
 * Record media upload metrics
 *
 * @param fileSizeBytes - Size of uploaded file in bytes
 * @param uploadMs - Time to upload file in milliseconds
 * @param processingMs - Time to process/optimize image in milliseconds
 * @param fileType - MIME type of the file
 * @param success - Whether upload succeeded
 */
export function recordMediaUpload(
  fileSizeBytes: number,
  uploadMs: number,
  processingMs: number,
  fileType: string,
  success: boolean = true
): void {
  const attributes = {
    file_type: normalizeFileType(fileType),
    size_range: getFileSizeRange(fileSizeBytes),
    success: success.toString(),
  };

  mediaUploadDuration.record(uploadMs, attributes);
  mediaFileSize.record(fileSizeBytes, attributes);

  if (processingMs > 0) {
    mediaProcessingDuration.record(processingMs, attributes);
  }

  mediaUploadCount.add(1, attributes);
}

/**
 * Record feature usage
 *
 * @param endpoint - The endpoint/feature being used
 * @param userId - Optional user ID for tracking
 */
export function recordFeatureUsage(endpoint: string, userId?: string): void {
  featureUsageCount.add(1, {
    endpoint: normalizeEndpoint(endpoint),
    user_type: userId ? "authenticated" : "anonymous",
  });
}

// ============================================
// Internal Utilities
// ============================================

/**
 * Categorize person counts into buckets to reduce cardinality
 */
function getPersonCountRange(count: number): string {
  if (count < 10) return "0-10";
  if (count < 50) return "10-50";
  if (count < 100) return "50-100";
  if (count < 500) return "100-500";
  if (count < 1000) return "500-1000";
  return "1000+";
}

/**
 * Categorize file sizes into buckets to reduce cardinality
 */
function getFileSizeRange(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.5) return "<0.5MB";
  if (mb < 1) return "0.5-1MB";
  if (mb < 5) return "1-5MB";
  if (mb < 10) return "5-10MB";
  return ">10MB";
}

/**
 * Categorize query length into buckets to reduce cardinality
 */
function getQueryLengthBucket(length: number): string {
  if (length <= 3) return "short";
  if (length <= 10) return "medium";
  if (length <= 25) return "long";
  return "very_long";
}

/**
 * Normalize file type to reduce cardinality
 */
function normalizeFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) {
    const subtype = mimeType.split("/")[1];
    return subtype === "jpeg" || subtype === "jpg"
      ? "jpeg"
      : subtype === "png"
        ? "png"
        : subtype === "webp"
          ? "webp"
          : subtype === "gif"
            ? "gif"
            : "image_other";
  }
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "other";
}

/**
 * Normalize endpoint to reduce cardinality
 */
function normalizeEndpoint(endpoint: string): string {
  return (
    endpoint
      // Replace UUIDs
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ":uuid"
      )
      // Replace numeric IDs
      .replace(/\/\d+/g, "/:id")
  );
}
