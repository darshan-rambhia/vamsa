/**
 * Telemetry Middleware for Hono
 *
 * Collects HTTP metrics for all requests passing through the server.
 * Works in conjunction with OpenTelemetry's automatic HTTP instrumentation
 * to provide comprehensive observability.
 *
 * Metrics collected:
 * - Request duration (histogram)
 * - Request count (counter)
 * - Active connections (gauge)
 * - Response size (histogram)
 *
 * Usage:
 *   import { telemetryMiddleware } from './middleware/telemetry';
 *   app.use('*', telemetryMiddleware);
 */

import type { Context, Next } from "hono";
import { recordHttpRequest, activeConnections } from "../metrics";

/**
 * Paths to exclude from telemetry (high-frequency, low-value)
 */
const EXCLUDED_PATHS = new Set(["/health", "/health/cache", "/metrics"]);

/**
 * Telemetry middleware for Hono
 *
 * Records HTTP metrics for each request:
 * - Tracks active connections
 * - Measures request duration
 * - Records status codes and response sizes
 */
export async function telemetryMiddleware(
  c: Context,
  next: Next
): Promise<void> {
  const path = c.req.path;

  // Skip metrics for excluded paths
  if (EXCLUDED_PATHS.has(path)) {
    await next();
    return;
  }

  const method = c.req.method;
  const start = Date.now();

  // Track active connection
  activeConnections.add(1, { method, path: normalizePath(path) });

  try {
    await next();
  } finally {
    const duration = Date.now() - start;

    // Decrement active connection
    activeConnections.add(-1, { method, path: normalizePath(path) });

    // Get response size if available
    const contentLength = c.res.headers.get("Content-Length");
    const responseBytes = contentLength
      ? parseInt(contentLength, 10)
      : undefined;

    // Record the request metrics
    recordHttpRequest(method, path, c.res.status, duration, responseBytes);
  }
}

/**
 * Normalize a path to prevent high cardinality in metrics
 *
 * Replaces dynamic segments (UUIDs, numeric IDs) with placeholders.
 */
function normalizePath(path: string): string {
  return (
    path
      // Replace UUIDs
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        "/:uuid"
      )
      // Replace numeric IDs
      .replace(/\/\d+/g, "/:id")
      // Replace MongoDB ObjectIds
      .replace(/\/[0-9a-f]{24}/gi, "/:objectId")
  );
}
