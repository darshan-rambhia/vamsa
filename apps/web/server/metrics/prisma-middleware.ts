/**
 * Prisma Performance Middleware
 *
 * Combines metrics collection, tracing, and slow query logging
 * into a single middleware that can be applied to Prisma.
 *
 * This middleware:
 * - Records query duration and count metrics
 * - Adds OpenTelemetry tracing spans
 * - Logs slow queries for debugging
 * - Tracks query errors
 *
 * Usage:
 *   import { createPrismaPerformanceMiddleware } from './metrics/prisma-middleware';
 *   prisma.$use(createPrismaPerformanceMiddleware());
 */

import {
  recordPrismaQuery,
  recordPrismaError,
  getPrismaErrorType,
  SLOW_QUERY_THRESHOLD_MS,
} from "./prisma";
import { createPrismaTracingMiddleware } from "./prisma-tracing";
import {
  logSlowQuery,
  sanitizeQueryParams,
  SLOW_QUERY_LOG_THRESHOLD_MS,
} from "./slow-query-logger";

/**
 * Prisma middleware parameters type
 * Matches Prisma's internal middleware signature
 */
interface PrismaMiddlewareParams {
  model?: string;
  action: string;
  args?: unknown;
  dataPath?: string[];
  runInTransaction?: boolean;
}

/**
 * Prisma middleware next function type
 */
type PrismaMiddlewareNext = (
  params: PrismaMiddlewareParams
) => Promise<unknown>;

/**
 * Create a comprehensive Prisma performance middleware
 *
 * This middleware combines:
 * - Metrics collection (duration, count, errors)
 * - OpenTelemetry tracing
 * - Slow query logging
 *
 * @returns A Prisma middleware function
 */
export function createPrismaPerformanceMiddleware() {
  // Create the tracing middleware
  const tracingMiddleware = createPrismaTracingMiddleware();

  return async (
    params: PrismaMiddlewareParams,
    next: PrismaMiddlewareNext
  ): Promise<unknown> => {
    const model = params.model || "unknown";
    const operation = params.action;
    const start = Date.now();
    let success = true;
    let result: unknown;

    try {
      // Execute the query with tracing
      result = await tracingMiddleware(params, next);
      return result;
    } catch (error) {
      success = false;

      // Record the error
      recordPrismaError(model, operation, getPrismaErrorType(error));

      throw error;
    } finally {
      const duration = Date.now() - start;

      // Count results for findMany operations
      let resultCount: number | undefined;
      if (operation === "findMany" && Array.isArray(result)) {
        resultCount = result.length;
      }

      // Record metrics
      recordPrismaQuery(model, operation, duration, success, resultCount);

      // Log slow queries
      if (duration > SLOW_QUERY_LOG_THRESHOLD_MS) {
        logSlowQuery({
          model,
          operation,
          duration,
          timestamp: new Date(),
          params: sanitizeQueryParams(params.args),
        });
      }
    }
  };
}

/**
 * Check if a query is considered slow
 *
 * @param durationMs - Query duration in milliseconds
 * @returns True if the query is slow
 */
export function isSlowQuery(durationMs: number): boolean {
  return durationMs > SLOW_QUERY_THRESHOLD_MS;
}
