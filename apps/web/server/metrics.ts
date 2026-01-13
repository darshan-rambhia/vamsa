/**
 * Custom Metrics for Vamsa
 *
 * Provides application-specific metrics using OpenTelemetry's metrics API.
 * These complement the automatic HTTP instrumentation from telemetry.ts.
 *
 * Metric Types:
 * - Counter: Monotonically increasing values (e.g., request counts, errors)
 * - UpDownCounter: Values that can increase or decrease (e.g., active connections)
 * - Histogram: Distribution of values (e.g., request duration, response size)
 *
 * Usage:
 *   import { recordHttpRequest, recordError } from './metrics';
 *   recordHttpRequest('GET', '/api/persons', 200, 45);
 *   recordError('database', 'Connection timeout');
 */

import { metrics } from "@opentelemetry/api";

// Create a meter for Vamsa metrics
const meter = metrics.getMeter("vamsa", "1.0.0");

// ============================================
// HTTP Metrics
// ============================================

/**
 * HTTP request duration histogram
 *
 * Records the time taken to process HTTP requests.
 * Useful for identifying slow endpoints and monitoring latency.
 */
export const httpRequestDuration = meter.createHistogram(
  "http_request_duration_ms",
  {
    description: "Duration of HTTP requests in milliseconds",
    unit: "ms",
  }
);

/**
 * HTTP request counter
 *
 * Total number of HTTP requests processed.
 * Used for calculating throughput and error rates.
 */
export const httpRequestCount = meter.createCounter("http_request_count", {
  description: "Total number of HTTP requests",
});

/**
 * Active HTTP connections gauge
 *
 * Number of currently active HTTP connections.
 * Useful for monitoring concurrency and detecting connection leaks.
 */
export const activeConnections = meter.createUpDownCounter(
  "http_active_connections",
  {
    description: "Number of active HTTP connections",
  }
);

// ============================================
// Error Metrics
// ============================================

/**
 * Error counter
 *
 * Total number of errors by type.
 * Useful for alerting and monitoring error trends.
 */
export const errorCount = meter.createCounter("error_count", {
  description: "Total number of errors",
});

// ============================================
// Business Metrics
// ============================================

/**
 * Database query counter
 *
 * Number of database queries executed.
 * Useful for monitoring database load.
 */
export const dbQueryCount = meter.createCounter("db_query_count", {
  description: "Total number of database queries",
});

/**
 * Database query duration histogram
 *
 * Duration of database queries.
 * Useful for identifying slow queries.
 */
export const dbQueryDuration = meter.createHistogram("db_query_duration_ms", {
  description: "Duration of database queries in milliseconds",
  unit: "ms",
});

/**
 * Authentication events counter
 *
 * Number of authentication events (login, logout, etc.).
 * Useful for security monitoring.
 */
export const authEventCount = meter.createCounter("auth_event_count", {
  description: "Total number of authentication events",
});

/**
 * API response size histogram
 *
 * Size of API responses in bytes.
 * Useful for monitoring bandwidth usage.
 */
export const responseSize = meter.createHistogram("http_response_size_bytes", {
  description: "Size of HTTP responses in bytes",
  unit: "bytes",
});

// ============================================
// Helper Functions
// ============================================

/**
 * Record an HTTP request with all relevant metrics
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path (normalized, e.g., /api/persons/:id)
 * @param statusCode - HTTP status code
 * @param durationMs - Request duration in milliseconds
 * @param responseBytes - Optional response size in bytes
 */
export function recordHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  responseBytes?: number
): void {
  const attributes = {
    method,
    path: normalizePath(path),
    status_code: statusCode,
    status_class: getStatusClass(statusCode),
  };

  httpRequestDuration.record(durationMs, attributes);
  httpRequestCount.add(1, attributes);

  if (responseBytes !== undefined) {
    responseSize.record(responseBytes, attributes);
  }
}

/**
 * Record an error
 *
 * @param errorType - Type of error (database, validation, auth, etc.)
 * @param errorMessage - Error message (sanitized, no sensitive data)
 * @param context - Optional additional context attributes
 */
export function recordError(
  errorType: string,
  errorMessage: string,
  context?: Record<string, string>
): void {
  errorCount.add(1, {
    error_type: errorType,
    error_message: sanitizeErrorMessage(errorMessage),
    ...context,
  });
}

/**
 * Record a database query
 *
 * @param operation - Query operation (select, insert, update, delete)
 * @param table - Table name
 * @param durationMs - Query duration in milliseconds
 * @param success - Whether the query succeeded
 */
export function recordDbQuery(
  operation: string,
  table: string,
  durationMs: number,
  success: boolean
): void {
  const attributes = {
    operation: operation.toLowerCase(),
    table,
    success: String(success),
  };

  dbQueryCount.add(1, attributes);
  dbQueryDuration.record(durationMs, attributes);
}

/**
 * Record an authentication event
 *
 * @param eventType - Event type (login_success, login_failure, logout, etc.)
 * @param provider - Auth provider (credentials, google, github, etc.)
 */
export function recordAuthEvent(
  eventType: string,
  provider: string = "credentials"
): void {
  authEventCount.add(1, {
    event_type: eventType,
    provider,
  });
}

// ============================================
// Internal Utilities
// ============================================

/**
 * Normalize a path to prevent high cardinality
 *
 * Replaces dynamic segments like IDs with placeholders.
 * e.g., /api/persons/123 -> /api/persons/:id
 */
function normalizePath(path: string): string {
  return path
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:uuid"
    )
    .replace(/\/\d+/g, "/:id")
    .replace(/\/[0-9a-f]{24}/gi, "/:objectId");
}

/**
 * Get the status class from a status code
 *
 * @returns "2xx", "3xx", "4xx", or "5xx"
 */
function getStatusClass(statusCode: number): string {
  const classNum = Math.floor(statusCode / 100);
  return `${classNum}xx`;
}

/**
 * Sanitize an error message to remove potentially sensitive data
 */
function sanitizeErrorMessage(message: string): string {
  // Truncate long messages
  if (message.length > 100) {
    message = message.slice(0, 100) + "...";
  }

  // Remove potential sensitive data patterns
  return message
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "[UUID]"
    )
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/password[=:]\s*\S+/gi, "password=[REDACTED]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]");
}
