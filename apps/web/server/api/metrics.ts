/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "@vamsa/schemas";
import { drizzleDb, getDrizzlePoolStats } from "@vamsa/api";
import { sql } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";
import {
  SLOW_QUERY_LOG_THRESHOLD_MS,
  clearSlowQueries,
  getSlowQueries,
  getSlowQueryStats,
} from "../metrics/slow-query-logger";

const log = loggers.api;

const metricsRouter = new OpenAPIHono();

// Response schemas for metrics
const slowQuerySchema = z
  .object({
    query: z.string().openapi({
      description: "SQL query string",
      example: "SELECT * FROM person WHERE id = $1",
    }),
    duration: z.number().openapi({
      description: "Query duration in milliseconds",
      example: 150,
    }),
    timestamp: z.string().openapi({
      description: "Query timestamp",
      example: "2024-01-14T10:00:00Z",
    }),
  })
  .openapi("SlowQuery");

const slowQueryListSchema = z
  .object({
    count: z.number().openapi({
      description: "Number of slow queries in this response",
      example: 5,
    }),
    threshold_ms: z.number().openapi({
      description: "Threshold for what is considered slow",
      example: 100,
    }),
    queries: z.array(slowQuerySchema).openapi({
      description: "Array of slow queries",
    }),
  })
  .openapi("SlowQueryList");

const slowQueryStatsSchema = z
  .object({
    totalCount: z.number().openapi({
      description: "Total number of slow queries",
      example: 42,
    }),
    averageDuration: z.number().openapi({
      description: "Average duration of slow queries",
      example: 125,
    }),
    maxDuration: z.number().openapi({
      description: "Maximum duration observed",
      example: 523,
    }),
    byModel: z.record(z.string(), z.number()).openapi({
      description: "Count of slow queries by database model",
      example: { Person: 15, Event: 10 },
    }),
    byOperation: z.record(z.string(), z.number()).openapi({
      description: "Count of slow queries by database operation",
      example: { findMany: 20, findUnique: 10 },
    }),
    threshold_ms: z.number().openapi({
      description: "Threshold for what is considered slow",
      example: 100,
    }),
  })
  .openapi("SlowQueryStats");

const poolStatsSchema = z
  .object({
    totalConnections: z.number().optional().openapi({
      description: "Total connections in pool",
      example: 10,
    }),
    idleConnections: z.number().optional().openapi({
      description: "Idle connections available",
      example: 5,
    }),
    waitingRequests: z.number().optional().openapi({
      description: "Requests waiting for connection",
      example: 0,
    }),
  })
  .openapi("PoolStats");

const dbHealthSchema = z
  .object({
    status: z.enum(["healthy", "unhealthy"]).openapi({
      description: "Database health status",
      example: "healthy",
    }),
    database: z.enum(["connected", "disconnected"]).openapi({
      description: "Database connection status",
      example: "connected",
    }),
    pool: poolStatsSchema.openapi({
      description: "Connection pool statistics",
    }),
    latency_ms: z.number().openapi({
      description: "Query latency in milliseconds",
      example: 5,
    }),
    timestamp: z.string().openapi({
      description: "Health check timestamp",
      example: "2024-01-14T10:00:00Z",
    }),
    error: z.string().optional().openapi({
      description: "Error message if unhealthy",
    }),
  })
  .openapi("DBHealth");

/**
 * GET /api/v1/metrics/slow-queries
 * Get recent slow queries from the in-memory buffer
 */
const slowQueriesRoute = createRoute({
  method: "get",
  path: "/slow-queries",
  tags: ["Metrics"],
  summary: "Get recent slow queries",
  description:
    "Retrieve recent slow queries from in-memory buffer for admin monitoring",
  operationId: "getSlowQueries",
  request: {
    query: z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
          description: "Maximum number of queries to return",
          example: 20,
        }),
      })
      .openapi({
        description: "Query parameters for slow queries endpoint",
      }),
  },
  responses: {
    200: {
      description: "Slow queries retrieved successfully",
      content: {
        "application/json": {
          schema: slowQueryListSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

metricsRouter.openapi(slowQueriesRoute, (c) => {
  try {
    const { limit } = c.req.valid("query");
    const queries = getSlowQueries(limit);

    return c.json({
      count: queries.length,
      threshold_ms: SLOW_QUERY_LOG_THRESHOLD_MS,
      queries,
    });
  } catch (error) {
    log.withErr(error).msg("Error fetching slow queries");
    return c.json(
      { error: "Failed to fetch slow queries" },
      { status: 500 }
    ) as any;
  }
}) as any;

/**
 * GET /api/v1/metrics/slow-queries/stats
 * Get aggregate statistics about slow queries
 */
const slowQueryStatsRoute = createRoute({
  method: "get",
  path: "/slow-queries/stats",
  tags: ["Metrics"],
  summary: "Get slow query statistics",
  description:
    "Get aggregate statistics about slow queries including averages and breakdowns",
  operationId: "getSlowQueryStats",
  responses: {
    200: {
      description: "Slow query statistics retrieved successfully",
      content: {
        "application/json": {
          schema: slowQueryStatsSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

metricsRouter.openapi(slowQueryStatsRoute, (c) => {
  try {
    const stats = getSlowQueryStats();

    return c.json({
      ...stats,
      threshold_ms: SLOW_QUERY_LOG_THRESHOLD_MS,
    });
  } catch (error) {
    log.withErr(error).msg("Error fetching slow query stats");
    return c.json(
      { error: "Failed to fetch slow query statistics" },
      { status: 500 }
    ) as any;
  }
}) as any;

/**
 * DELETE /api/v1/metrics/slow-queries
 * Clear the slow query buffer
 */
const clearSlowQueriesRoute = createRoute({
  method: "delete",
  path: "/slow-queries",
  tags: ["Metrics"],
  summary: "Clear slow query buffer",
  description:
    "Clear the slow query buffer for testing or after reviewing issues",
  operationId: "clearSlowQueries",
  responses: {
    200: {
      description: "Slow query buffer cleared successfully",
      content: {
        "application/json": {
          schema: z
            .object({
              success: z.boolean().openapi({
                description: "Whether the operation was successful",
                example: true,
              }),
              cleared_count: z.number().openapi({
                description: "Number of queries that were cleared",
                example: 15,
              }),
            })
            .openapi("ClearSlowQueriesResponse"),
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

metricsRouter.openapi(clearSlowQueriesRoute, (c) => {
  try {
    const previousCount = getSlowQueries(100).length;
    clearSlowQueries();

    log.info({ previousCount }, "Slow query buffer cleared");

    return c.json({
      success: true,
      cleared_count: previousCount,
    });
  } catch (error) {
    log.withErr(error).msg("Error clearing slow queries");
    return c.json(
      { error: "Failed to clear slow queries" },
      { status: 500 }
    ) as any;
  }
}) as any;

/**
 * GET /api/v1/metrics/db/health
 * Check database connectivity and pool status
 */
const dbHealthRoute = createRoute({
  method: "get",
  path: "/db/health",
  tags: ["Metrics"],
  summary: "Check database health",
  description: "Get database connectivity status, pool statistics, and latency",
  operationId: "getDBHealth",
  responses: {
    200: {
      description: "Database is healthy",
      content: {
        "application/json": {
          schema: dbHealthSchema,
        },
      },
    },
    503: {
      description: "Database is unhealthy",
      content: {
        "application/json": {
          schema: dbHealthSchema,
        },
      },
    },
  },
});

metricsRouter.openapi(dbHealthRoute, async (c) => {
  const start = Date.now();

  try {
    await drizzleDb.execute(sql`SELECT 1 as health_check`);
    const latency = Date.now() - start;

    const poolStats = getDrizzlePoolStats();

    return c.json({
      status: "healthy",
      database: "connected",
      pool: {
        totalConnections: poolStats.totalCount,
        idleConnections: poolStats.idleCount,
        waitingRequests: poolStats.waitingCount,
      },
      latency_ms: latency,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - start;

    log
      .withErr(error)
      .ctx({
        latency_ms: latency,
      })
      .msg("Database health check failed");

    return c.json(
      {
        status: "unhealthy",
        database: "disconnected",
        pool: {},
        error: error instanceof Error ? error.message : "Unknown error",
        latency_ms: latency,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
});

/**
 * GET /api/v1/metrics/db/pool
 * Get detailed connection pool statistics
 */
const dbPoolRoute = createRoute({
  method: "get",
  path: "/db/pool",
  tags: ["Metrics"],
  summary: "Get connection pool statistics",
  description: "Get detailed statistics about database connection pool usage",
  operationId: "getDBPool",
  responses: {
    200: {
      description: "Pool statistics retrieved successfully",
      content: {
        "application/json": {
          schema: z
            .object({
              pool: poolStatsSchema,
              timestamp: z.string().openapi({
                description: "Timestamp of the stats",
                example: "2024-01-14T10:00:00Z",
              }),
            })
            .openapi("PoolStatsResponse"),
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

metricsRouter.openapi(dbPoolRoute, async (c) => {
  try {
    const poolStats = getDrizzlePoolStats();

    return c.json({
      pool: {
        totalConnections: poolStats.totalCount,
        idleConnections: poolStats.idleCount,
        waitingRequests: poolStats.waitingCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.withErr(error).msg("Error fetching pool stats");
    return c.json(
      { error: "Failed to fetch pool statistics" },
      { status: 500 }
    ) as any;
  }
}) as any;

export default metricsRouter;
