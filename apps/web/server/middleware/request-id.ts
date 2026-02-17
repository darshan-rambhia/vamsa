/**
 * Request ID Middleware for Hono
 *
 * Generates a unique request ID (UUID) for each request or reuses an incoming
 * X-Request-Id header (for distributed tracing). The request ID is stored in
 * the Hono context and set on response headers for end-to-end tracing.
 *
 * Usage:
 *   import { requestIdMiddleware } from './middleware/request-id';
 *   app.use('*', requestIdMiddleware);
 *
 * Benefits:
 *   - Request correlation across logs and system boundaries
 *   - Distributed tracing when X-Request-Id is propagated upstream
 *   - Error attribution to specific requests
 */

import type { Context, MiddlewareHandler } from "hono";

/**
 * Augment Hono's context variables to include request ID
 */
declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}

/**
 * Generate or reuse request ID for distributed tracing.
 *
 * Priority:
 * 1. Existing X-Request-Id header (for upstream propagation)
 * 2. Generate new UUID (for new requests)
 *
 * @param c Hono context
 * @returns Request ID (UUID format)
 */
function getOrGenerateRequestId(c: Context): string {
  // Check for incoming request ID (distributed tracing from upstream)
  const incomingRequestId = c.req.header("X-Request-Id");
  if (incomingRequestId && typeof incomingRequestId === "string") {
    return incomingRequestId;
  }

  // Generate new UUID for this request
  return crypto.randomUUID();
}

/**
 * Request ID middleware for Hono.
 *
 * Generates or reuses a request ID, stores it in Hono context,
 * and sets it on response headers for distributed tracing.
 *
 * @returns Hono middleware handler
 */
export function requestIdMiddleware(): MiddlewareHandler {
  return async (c: Context, next) => {
    // Generate or reuse request ID
    const requestId = getOrGenerateRequestId(c);

    // Store in Hono context for use in handlers
    c.set("requestId", requestId);

    // Call next middleware/handler
    await next();

    // Set response header for client to receive
    c.header("X-Request-Id", requestId);
  };
}
