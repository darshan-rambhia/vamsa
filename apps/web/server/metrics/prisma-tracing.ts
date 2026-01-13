/**
 * Prisma OpenTelemetry Tracing
 *
 * Adds distributed tracing to Prisma queries using OpenTelemetry.
 * Each query creates a span with:
 * - Database system information
 * - Model and operation details
 * - Error status and messages
 *
 * Usage:
 *   import { createPrismaTracingMiddleware } from './metrics/prisma-tracing';
 *   prisma.$use(createPrismaTracingMiddleware());
 */

import { trace, SpanStatusCode } from "@opentelemetry/api";

// Create a tracer for Prisma operations
const tracer = trace.getTracer("prisma", "1.0.0");

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
type PrismaMiddlewareNext = (params: PrismaMiddlewareParams) => Promise<unknown>;

/**
 * Create a Prisma middleware that adds OpenTelemetry tracing to all queries
 *
 * The middleware creates a span for each Prisma operation with:
 * - db.system: 'postgresql'
 * - db.operation: The Prisma action (findMany, create, etc.)
 * - db.prisma.model: The model being queried
 * - Error information if the query fails
 *
 * @returns A Prisma middleware function
 */
export function createPrismaTracingMiddleware() {
  return async (
    params: PrismaMiddlewareParams,
    next: PrismaMiddlewareNext
  ): Promise<unknown> => {
    const model = params.model || "unknown";
    const operation = params.action;

    // Create a span for this query
    return tracer.startActiveSpan(
      `prisma.${model}.${operation}`,
      {
        attributes: {
          "db.system": "postgresql",
          "db.operation": operation,
          "db.prisma.model": model,
          "db.prisma.run_in_transaction": params.runInTransaction ?? false,
        },
      },
      async (span) => {
        try {
          const result = await next(params);

          // Add result count attribute for findMany operations
          if (operation === "findMany" && Array.isArray(result)) {
            span.setAttribute("db.result_count", result.length);
          }

          // Mark span as successful
          span.setStatus({ code: SpanStatusCode.OK });

          return result;
        } catch (error) {
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

          throw error;
        } finally {
          span.end();
        }
      }
    );
  };
}
