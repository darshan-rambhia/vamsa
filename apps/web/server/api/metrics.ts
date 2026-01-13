/**
 * Metrics API Router
 *
 * Provides endpoints for viewing application metrics and slow queries.
 * These endpoints are intended for admin monitoring and debugging.
 *
 * Endpoints:
 * - GET /api/v1/metrics/slow-queries - View recent slow queries (admin only)
 * - GET /api/v1/metrics/slow-queries/stats - View slow query statistics (admin only)
 * - GET /api/v1/metrics/db/health - Database health check
 * - DELETE /api/v1/metrics/slow-queries - Clear slow query buffer (admin only)
 */

import { Hono } from "hono";
import { prisma, getPoolStats } from "@vamsa/api/client";
import { logger } from "@vamsa/lib/logger";
import {
  getSlowQueries,
  getSlowQueryStats,
  clearSlowQueries,
  SLOW_QUERY_LOG_THRESHOLD_MS,
} from "../metrics";

const metricsRouter = new Hono();

// ============================================
// Slow Query Endpoints
// ============================================

/**
 * GET /slow-queries
 * Get recent slow queries from the in-memory buffer
 *
 * Query params:
 * - limit: Maximum number of queries to return (default: 20, max: 100)
 *
 * Note: This endpoint should be protected by admin authentication
 * in production. For now, it's open for development/monitoring.
 */
metricsRouter.get("/slow-queries", (c) => {
  const limitParam = c.req.query("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;

  const queries = getSlowQueries(limit);

  return c.json({
    count: queries.length,
    threshold_ms: SLOW_QUERY_LOG_THRESHOLD_MS,
    queries,
  });
});

/**
 * GET /slow-queries/stats
 * Get aggregate statistics about slow queries
 *
 * Returns:
 * - totalCount: Total number of slow queries in buffer
 * - averageDuration: Average duration of slow queries
 * - maxDuration: Maximum duration observed
 * - byModel: Count by Prisma model
 * - byOperation: Count by Prisma operation
 */
metricsRouter.get("/slow-queries/stats", (c) => {
  const stats = getSlowQueryStats();

  return c.json({
    ...stats,
    threshold_ms: SLOW_QUERY_LOG_THRESHOLD_MS,
  });
});

/**
 * DELETE /slow-queries
 * Clear the slow query buffer
 *
 * Useful after reviewing issues or for testing.
 */
metricsRouter.delete("/slow-queries", (c) => {
  const previousCount = getSlowQueries(100).length;
  clearSlowQueries();

  logger.info({ previousCount }, "Slow query buffer cleared");

  return c.json({
    success: true,
    cleared_count: previousCount,
  });
});

// ============================================
// Database Health Endpoints
// ============================================

/**
 * GET /db/health
 * Check database connectivity and pool status
 *
 * Returns:
 * - status: 'healthy' or 'unhealthy'
 * - database: Connection status
 * - pool: Connection pool statistics
 * - latency_ms: Query latency
 */
metricsRouter.get("/db/health", async (c) => {
  const start = Date.now();

  try {
    // Execute a simple query to check connectivity
    await prisma.$queryRaw`SELECT 1 as health_check`;
    const latency = Date.now() - start;

    // Get pool statistics
    const poolStats = await getPoolStats();

    return c.json({
      status: "healthy",
      database: "connected",
      pool: poolStats,
      latency_ms: latency,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - start;

    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        latency_ms: latency,
      },
      "Database health check failed"
    );

    return c.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        latency_ms: latency,
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

/**
 * GET /db/pool
 * Get detailed connection pool statistics
 *
 * Returns:
 * - totalConnections: Total connections in pool
 * - idleConnections: Idle connections available
 * - waitingRequests: Requests waiting for a connection
 */
metricsRouter.get("/db/pool", async (c) => {
  const poolStats = await getPoolStats();

  return c.json({
    pool: poolStats,
    timestamp: new Date().toISOString(),
  });
});

export default metricsRouter;
