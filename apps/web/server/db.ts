/**
 * Database Client with Performance Monitoring
 *
 * This module re-exports the Prisma client from @vamsa/api and adds
 * performance monitoring capabilities using Prisma Client Extensions.
 *
 * Features:
 * - Query duration metrics via OpenTelemetry
 * - Slow query detection and logging
 * - Query tracing with distributed tracing spans
 * - Query error tracking
 *
 * Usage:
 *   import { db } from './db';
 *   const persons = await db.person.findMany();
 */

import { prisma, getPoolStats, getPool, shutdown } from "@vamsa/api/client";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import {
  recordPrismaQuery,
  recordPrismaError,
  getPrismaErrorType,
  SLOW_QUERY_THRESHOLD_MS,
} from "./metrics/prisma";
import {
  logSlowQuery,
  sanitizeQueryParams,
} from "./metrics/slow-query-logger";

// Create a tracer for Prisma operations
const tracer = trace.getTracer("prisma", "1.0.0");

/**
 * Prisma client extended with performance monitoring
 *
 * Uses Prisma Client Extensions to add:
 * - Query timing and metrics
 * - OpenTelemetry tracing
 * - Slow query logging
 */
export const db = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = Date.now();
        let success = true;
        let result: unknown;

        // Create a span for this query
        return tracer.startActiveSpan(
          `prisma.${model}.${operation}`,
          {
            attributes: {
              "db.system": "postgresql",
              "db.operation": operation,
              "db.prisma.model": model,
            },
          },
          async (span) => {
            try {
              result = await query(args);

              // Add result count attribute for findMany operations
              if (operation === "findMany" && Array.isArray(result)) {
                span.setAttribute("db.result_count", result.length);
              }

              // Mark span as successful
              span.setStatus({ code: SpanStatusCode.OK });

              return result;
            } catch (error) {
              success = false;

              // Mark span as error
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : "Unknown error",
              });

              // Record the exception
              if (error instanceof Error) {
                span.recordException(error);

                // Add Prisma error code if available
                if ("code" in error && typeof (error as { code: unknown }).code === "string") {
                  span.setAttribute("db.prisma.error_code", (error as { code: string }).code);
                }
              }

              // Record error metric
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
              if (duration > SLOW_QUERY_THRESHOLD_MS) {
                logSlowQuery({
                  model,
                  operation,
                  duration,
                  timestamp: new Date(),
                  params: sanitizeQueryParams(args),
                });
              }

              // End the span
              span.end();
            }
          }
        );
      },
    },
  },
});

// Re-export pool utilities
export { getPoolStats, getPool, shutdown };

// Re-export the original prisma client for cases where extensions aren't needed
export { prisma };

// Type for the extended client
export type DbClient = typeof db;
