/**
 * Optional OpenTelemetry metrics wrapper
 *
 * This module provides metrics recording functionality that gracefully handles
 * the case where OpenTelemetry is not installed or configured.
 * When OpenTelemetry is available, metrics are recorded. Otherwise, no-op implementations are used.
 */

/**
 * Record chart rendering metrics
 * Tracks chart type, node count, and render duration
 *
 * Note: Currently a no-op. Metrics recording is available when @opentelemetry/api is configured.
 *
 * @param chartType - Type of chart rendered (ancestor, descendant, etc.)
 * @param nodeCount - Number of nodes/entries in the chart
 * @param duration - Render duration in milliseconds
 */
export function recordChartMetrics(
  _chartType: string,
  _nodeCount: number,
  _duration: number
): void {
  // No-op by default. Can be extended with OpenTelemetry integration if needed.
}

/**
 * Record search metrics
 * Tracks search queries, result counts, and performance
 *
 * Note: Currently a no-op. Metrics recording is available when @opentelemetry/api is configured.
 *
 * @param query - Search query string
 * @param resultCount - Number of results returned
 * @param duration - Search duration in milliseconds
 * @param type - Type of search (person_name, person_list, etc.)
 */
export function recordSearchMetrics(
  _query: string,
  _resultCount: number,
  _duration: number,
  _type: string = "generic"
): void {
  // No-op by default. Can be extended with OpenTelemetry integration if needed.
}

/**
 * Record media upload metrics
 * Tracks file size, upload duration, processing time, and format
 *
 * Note: Currently a no-op. Metrics recording is available when @opentelemetry/api is configured.
 *
 * @param fileSize - Size of uploaded file in bytes
 * @param uploadDuration - Time to upload in milliseconds
 * @param processingDuration - Time to process in milliseconds
 * @param mimeType - MIME type of the file
 * @param success - Whether the upload was successful
 */
export function recordMediaUpload(
  _fileSize: number,
  _uploadDuration: number,
  _processingDuration: number,
  _mimeType: string,
  _success: boolean
): void {
  // No-op by default. Can be extended with OpenTelemetry integration if needed.
}

/**
 * Record GEDCOM validation metrics
 * Tracks validation success/failure and error counts
 *
 * Note: Currently a no-op. Metrics recording is available when @opentelemetry/api is configured.
 *
 * @param isValid - Whether validation passed
 * @param errorCount - Number of validation errors
 * @param duration - Validation duration in milliseconds
 */
export function recordGedcomValidation(
  _isValid: boolean,
  _errorCount: number,
  _duration: number
): void {
  // No-op by default. Can be extended with OpenTelemetry integration if needed.
}

/**
 * Record GEDCOM import metrics
 * Tracks import success/failure, conflicts, and duration
 *
 * Note: Currently a no-op. Metrics recording is available when @opentelemetry/api is configured.
 *
 * @param successCount - Number of successfully imported records
 * @param conflictCount - Number of conflicts during import
 * @param duration - Import duration in milliseconds
 * @param fileSize - Size of imported file
 */
export function recordGedcomImport(
  _successCount: number,
  _conflictCount: number,
  _duration: number,
  _fileSize: number
): void {
  // No-op by default. Can be extended with OpenTelemetry integration if needed.
}

/**
 * Record GEDCOM export metrics
 * Tracks number of people and relationships exported
 *
 * Note: Currently a no-op. Metrics recording is available when @opentelemetry/api is configured.
 *
 * @param personCount - Number of people exported
 * @param relationshipCount - Number of relationships exported
 * @param duration - Export duration in milliseconds
 */
export function recordGedcomExport(
  _personCount: number,
  _relationshipCount: number,
  _duration: number
): void {
  // No-op by default. Can be extended with OpenTelemetry integration if needed.
}

/**
 * Create a histogram metric for tracking durations
 *
 * @param _name - Histogram name
 * @param _unit - Unit of measurement (ms, s, bytes, etc.)
 * @returns Histogram instance or no-op mock
 */
export function createHistogram(_name: string, _unit: string = "ms"): any {
  // No-op implementation. Can be extended with OpenTelemetry integration if needed.
  return { record: () => {} };
}

/**
 * Create a counter metric for tracking occurrences
 *
 * @param _name - Counter name
 * @returns Counter instance or no-op mock
 */
export function createCounter(_name: string): any {
  // No-op implementation. Can be extended with OpenTelemetry integration if needed.
  return { add: () => {} };
}
