/**
 * Slow Query Logger
 *
 * Tracks and stores slow database queries for monitoring and debugging.
 * Maintains an in-memory ring buffer of recent slow queries.
 *
 * Features:
 * - In-memory storage of last N slow queries
 * - Query details including table, operation, and duration
 * - Admin endpoint to retrieve slow queries
 *
 * Usage:
 *   import { logSlowQuery, getSlowQueries } from './metrics/slow-query-logger';
 *   logSlowQuery({ model: 'Person', operation: 'select', duration: 1500 });
 */

import { loggers } from "@vamsa/lib/logger";

const log = loggers.db;

// ============================================
// Types
// ============================================

/**
 * Represents a slow query record
 */
export interface SlowQuery {
  /** Database table/model name */
  model: string;
  /** Query operation (select, insert, update, delete) */
  operation: string;
  /** Query execution time in milliseconds */
  duration: number;
  /** When the query was executed */
  timestamp: Date;
  /** Sanitized query parameters (optional) */
  params?: Record<string, unknown>;
}

// ============================================
// Configuration
// ============================================

/**
 * Maximum number of slow queries to keep in memory
 */
const MAX_SLOW_QUERIES = 100;

/**
 * Threshold for logging slow queries (in milliseconds)
 */
export const SLOW_QUERY_LOG_THRESHOLD_MS = 1000;

// ============================================
// Storage
// ============================================

/**
 * In-memory ring buffer for slow queries
 * Newest queries are at the front
 */
const slowQueries: Array<SlowQuery> = [];

// ============================================
// Functions
// ============================================

/**
 * Log a slow query
 *
 * Adds the query to the in-memory buffer and logs a warning.
 * Automatically removes the oldest query if the buffer is full.
 *
 * @param query - The slow query details
 */
export function logSlowQuery(query: SlowQuery): void {
  // Add to the front of the array
  slowQueries.unshift(query);

  // Remove oldest if we exceed the limit
  if (slowQueries.length > MAX_SLOW_QUERIES) {
    slowQueries.pop();
  }

  // Log a warning for visibility
  log.warn(
    {
      model: query.model,
      operation: query.operation,
      duration: query.duration,
      threshold: SLOW_QUERY_LOG_THRESHOLD_MS,
    },
    "Slow database query detected"
  );
}

/**
 * Get recent slow queries
 *
 * Returns the most recent slow queries from the in-memory buffer.
 *
 * @param limit - Maximum number of queries to return (default: 20)
 * @returns Array of slow queries, newest first
 */
export function getSlowQueries(limit = 20): Array<SlowQuery> {
  return slowQueries.slice(0, Math.min(limit, MAX_SLOW_QUERIES));
}

/**
 * Get slow query statistics
 *
 * Returns aggregate statistics about slow queries.
 *
 * @returns Statistics object
 */
export function getSlowQueryStats(): {
  totalCount: number;
  averageDuration: number;
  maxDuration: number;
  byModel: Record<string, number>;
  byOperation: Record<string, number>;
} {
  if (slowQueries.length === 0) {
    return {
      totalCount: 0,
      averageDuration: 0,
      maxDuration: 0,
      byModel: {},
      byOperation: {},
    };
  }

  const totalDuration = slowQueries.reduce((sum, q) => sum + q.duration, 0);
  const maxDuration = Math.max(...slowQueries.map((q) => q.duration));

  const byModel: Record<string, number> = {};
  const byOperation: Record<string, number> = {};

  for (const query of slowQueries) {
    byModel[query.model] = (byModel[query.model] || 0) + 1;
    byOperation[query.operation] = (byOperation[query.operation] || 0) + 1;
  }

  return {
    totalCount: slowQueries.length,
    averageDuration: Math.round(totalDuration / slowQueries.length),
    maxDuration,
    byModel,
    byOperation,
  };
}

/**
 * Clear all slow queries from the buffer
 *
 * Useful for testing or after reviewing issues.
 */
export function clearSlowQueries(): void {
  slowQueries.length = 0;
}

/**
 * Sanitize query parameters for logging
 *
 * Removes potentially sensitive data from query parameters.
 *
 * @param params - Raw query parameters
 * @returns Sanitized parameters safe for logging
 */
export function sanitizeQueryParams(
  params: unknown
): Record<string, unknown> | undefined {
  if (!params || typeof params !== "object") {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  const rawParams = params as Record<string, unknown>;

  // Only include safe keys
  const safeKeys = ["where", "select", "include", "orderBy", "take", "skip"];

  for (const key of safeKeys) {
    if (key in rawParams) {
      // Deep sanitize the value
      sanitized[key] = sanitizeValue(rawParams[key]);
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Recursively sanitize a value for logging
 */
function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    // Redact potential sensitive strings
    if (
      value.includes("password") ||
      value.includes("token") ||
      value.includes("secret")
    ) {
      return "[REDACTED]";
    }
    // Truncate long strings
    if (value.length > 100) {
      return value.slice(0, 100) + "...";
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    // Only show first few items
    const sanitizedArray = value.slice(0, 5).map(sanitizeValue);
    if (value.length > 5) {
      sanitizedArray.push(`...and ${value.length - 5} more`);
    }
    return sanitizedArray;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      // Skip sensitive keys
      if (
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("hash")
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }

    return sanitized;
  }

  return "[UNKNOWN TYPE]";
}
