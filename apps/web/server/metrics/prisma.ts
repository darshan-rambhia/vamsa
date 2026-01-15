/**
 * Prisma Query Performance Metrics
 *
 * Instruments Prisma queries to collect performance metrics:
 * - Query duration histogram
 * - Query count by model and operation
 * - Slow query detection (>1000ms)
 * - Query error tracking
 * - Result count distribution
 *
 * Usage:
 *   import { recordPrismaQuery, recordPrismaError } from './metrics/prisma';
 *   recordPrismaQuery('Person', 'findMany', 50, true, 10);
 */

import { metrics } from "@opentelemetry/api";

// Create a meter for Prisma metrics
const meter = metrics.getMeter("vamsa-prisma", "1.0.0");

// ============================================
// Metric Definitions
// ============================================

/**
 * Query duration histogram
 *
 * Records the execution time of Prisma queries in milliseconds.
 * Used for identifying slow operations and monitoring latency.
 */
export const prismaQueryDuration = meter.createHistogram(
  "prisma_query_duration_ms",
  {
    description: "Prisma query execution time in milliseconds",
    unit: "ms",
  }
);

/**
 * Query count counter
 *
 * Total number of Prisma queries executed.
 * Used for calculating throughput by model and operation.
 */
export const prismaQueryCount = meter.createCounter("prisma_query_count", {
  description: "Total number of Prisma queries executed",
});

/**
 * Slow query counter (>1000ms)
 *
 * Number of queries exceeding the slow query threshold.
 * Used for alerting and identifying performance issues.
 */
export const prismaSlowQueryCount = meter.createCounter(
  "prisma_slow_query_count",
  {
    description: "Number of slow Prisma queries (>1000ms)",
  }
);

/**
 * Error counter
 *
 * Total number of Prisma query errors by type.
 * Used for error rate monitoring and alerting.
 */
export const prismaErrorCount = meter.createCounter("prisma_error_count", {
  description: "Number of Prisma query errors",
});

/**
 * Result count histogram
 *
 * Distribution of result counts for findMany operations.
 * Used for identifying queries returning too many results.
 */
export const prismaResultCount = meter.createHistogram("prisma_result_count", {
  description: "Number of results returned by findMany queries",
  unit: "records",
});

// ============================================
// Configuration
// ============================================

/**
 * Slow query threshold in milliseconds
 * Queries exceeding this threshold are counted as slow queries
 */
export const SLOW_QUERY_THRESHOLD_MS = 1000;

// ============================================
// Helper Functions
// ============================================

/**
 * Record a Prisma query execution with all relevant metrics
 *
 * @param model - Prisma model name (e.g., 'Person', 'Relationship')
 * @param operation - Prisma operation (e.g., 'findMany', 'create', 'update')
 * @param durationMs - Query execution time in milliseconds
 * @param success - Whether the query succeeded
 * @param resultCount - Optional number of results (for findMany operations)
 */
export function recordPrismaQuery(
  model: string,
  operation: string,
  durationMs: number,
  success: boolean,
  resultCount?: number
): void {
  const attributes = {
    model,
    operation,
    success: success.toString(),
  };

  // Record duration
  prismaQueryDuration.record(durationMs, attributes);

  // Count query
  prismaQueryCount.add(1, attributes);

  // Track slow queries
  if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
    prismaSlowQueryCount.add(1, {
      ...attributes,
      threshold_ms: SLOW_QUERY_THRESHOLD_MS.toString(),
    });
  }

  // Record result count if provided
  if (resultCount !== undefined) {
    prismaResultCount.record(resultCount, {
      model,
      operation,
    });
  }
}

/**
 * Record a Prisma query error
 *
 * @param model - Prisma model name (e.g., 'Person', 'Relationship')
 * @param operation - Prisma operation (e.g., 'findMany', 'create', 'update')
 * @param errorType - Type of error (e.g., 'ValidationError', 'P2002', 'P2025')
 */
export function recordPrismaError(
  model: string,
  operation: string,
  errorType: string
): void {
  prismaErrorCount.add(1, {
    model,
    operation,
    error_type: errorType,
  });
}

/**
 * Get the error type from a Prisma error
 *
 * @param error - The error object
 * @returns A string identifying the error type
 */
export function getPrismaErrorType(error: unknown): string {
  if (error instanceof Error) {
    // Prisma Client Known Request Error (has error code like P2002)
    if (
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
    ) {
      return (error as { code: string }).code;
    }
    // Use the error name as fallback
    return error.name;
  }
  return "UnknownError";
}
