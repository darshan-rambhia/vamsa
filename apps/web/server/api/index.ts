import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { loggers } from "@vamsa/lib/logger";
import { requireApiAuth } from "../middleware/require-api-auth";
import authRouter from "./auth";
import personsRouter from "./persons";
import relationshipsRouter from "./relationships";
import calendarRouter from "./calendar";
import metricsRouter from "./metrics";
import batchRouter from "./batch";

const log = loggers.api;

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ENABLE_DOCS = process.env.ENABLE_API_DOCS === "true" || !IS_PRODUCTION;

/**
 * Main API router for Vamsa
 *
 * All routes are prefixed with /api/v1 in the main server
 * Uses OpenAPIHono for automatic OpenAPI spec generation
 * This router handles:
 * - Authentication (login, logout, register)
 * - Person management (CRUD)
 * - Relationship management (CRUD)
 * - Calendar feeds (RSS, iCal)
 * - Metrics and monitoring
 */

const apiV1 = new OpenAPIHono();

// ============================================
// Documentation Routes (disabled in production by default)
// ============================================

if (ENABLE_DOCS) {
  log.info({}, "API documentation enabled at /api/v1/docs");

  /**
   * GET /api/v1/docs
   * Swagger UI for interactive API exploration
   */
  apiV1.get(
    "/docs",
    swaggerUI({
      url: "/api/v1/openapi.json",
      title: "Vamsa API Documentation",
    })
  );

  /**
   * GET /api/v1/openapi.json
   * OpenAPI 3.0 specification auto-generated from routes
   */
  apiV1.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "Vamsa API",
      version: "1",
      description: "Family genealogy application REST API",
      contact: {
        name: "Vamsa",
        url: "https://vamsa.app",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api/v1",
        description: "Development server",
      },
      {
        url: "https://vamsa.app/api/v1",
        description: "Production server",
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "User authentication endpoints",
      },
      {
        name: "Persons",
        description: "Family tree person management (requires authentication)",
      },
      {
        name: "Relationships",
        description:
          "Relationship management between persons (requires authentication)",
      },
      {
        name: "Batch",
        description:
          "Batch operations for bulk create, update, and delete (requires MEMBER role)",
      },
      {
        name: "Calendar",
        description: "Calendar feeds (RSS, iCal formats)",
      },
      {
        name: "Metrics",
        description: "Monitoring and performance metrics (requires ADMIN role)",
      },
    ],
  });
} else {
  log.info({}, "API documentation disabled (production mode)");
}

/**
 * GET /api/v1/
 * API root endpoint with basic info
 */
apiV1.get("/", (c) => {
  return c.json(
    {
      name: "Vamsa API",
      description: "Family genealogy application API",
      ...(ENABLE_DOCS
        ? { docs: "/api/v1/docs", openapi: "/api/v1/openapi.json" }
        : {}),
      endpoints: {
        auth: "/api/v1/auth",
        persons: "/api/v1/persons",
        relationships: "/api/v1/relationships",
        batch: "/api/v1/batch",
        calendar: "/api/v1/calendar",
        metrics: "/api/v1/metrics",
      },
    },
    { status: 200 }
  );
});

// ============================================
// Authentication Middleware
// ============================================

/**
 * Require authentication for protected resource routes
 * Middleware is applied BEFORE route mounting in Hono
 *
 * Public routes (no auth required):
 * - /auth/* - Authentication endpoints (login, register, logout)
 * - /calendar/* - Calendar feeds (use token-based auth)
 * - /docs, /openapi.json, / - Documentation and root
 *
 * Protected routes:
 * - /persons/* - Requires VIEWER role (default)
 * - /relationships/* - Requires VIEWER role (default)
 * - /batch/* - Requires MEMBER role
 * - /metrics/* - Requires ADMIN role
 */
apiV1.use("/persons/*", requireApiAuth("VIEWER"));
apiV1.use("/relationships/*", requireApiAuth("VIEWER"));
apiV1.use("/batch/*", requireApiAuth("MEMBER"));
apiV1.use("/metrics/*", requireApiAuth("ADMIN"));

// ============================================
// Resource Routes
// ============================================

/**
 * Mount sub-routers for each resource
 * All routers use OpenAPIHono for consistent spec generation
 */
apiV1.route("/auth", authRouter);
apiV1.route("/persons", personsRouter);
apiV1.route("/relationships", relationshipsRouter);
apiV1.route("/batch", batchRouter);
apiV1.route("/calendar", calendarRouter);
apiV1.route("/metrics", metricsRouter);

// ============================================
// Error Handling
// ============================================

/**
 * 404 handler for undefined routes
 */
apiV1.notFound((c) => {
  log.warn(
    {
      method: c.req.method,
      path: c.req.path,
    },
    "API endpoint not found"
  );

  return c.json(
    {
      error: "Not Found",
      message: `No endpoint found at ${c.req.path}`,
      ...(ENABLE_DOCS ? { documentation: "/api/v1/docs" } : {}),
    },
    { status: 404 }
  );
});

/**
 * Global error handler
 */
apiV1.onError((err, c) => {
  log.error(
    {
      error: err.message,
      path: c.req.path,
      method: c.req.method,
      stack: err.stack,
    },
    "Unhandled API error"
  );

  return c.json(
    {
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "An error occurred processing your request",
    },
    { status: 500 }
  );
});

/**
 * AppType for Hono RPC client
 *
 * This type export enables type-safe API clients using hono/client:
 *
 * ```ts
 * import { hc } from 'hono/client';
 * import type { AppType } from '@vamsa/web/server/api';
 *
 * const client = hc<AppType>('https://api.vamsa.app/api/v1');
 * const persons = await client.persons.$get();
 * ```
 */
export type AppType = typeof apiV1;

export default apiV1;
