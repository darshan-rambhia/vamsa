/**
 * Production server entry point for Vamsa
 *
 * Uses Bun's native HTTP server with Hono for middleware capabilities.
 * TanStack Start exports a fetch handler that we wrap with Hono for:
 * - Request/response logging (Pino structured logging)
 * - CORS handling (for future React Native client)
 * - Custom middleware (rate limiting, auth, etc.)
 * - Health checks and monitoring
 */

import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { logger, serializeError } from "@vamsa/lib/logger";

const app = new Hono();

// Configuration from environment
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ============================================
// Middleware
// ============================================

// Request logging via Hono middleware (only in development)
if (!IS_PRODUCTION) {
  app.use("*", honoLogger());
}

// CORS configuration for React Native mobile client
app.use(
  "*",
  cors({
    origin: IS_PRODUCTION
      ? (origin) => {
          // In production, only allow specific origins
          const allowedOrigins = [
            process.env.APP_URL || "https://vamsa.app",
            // Add your mobile app schemes here when ready
            // 'vamsa://*',
            // 'exp://*', // Expo development
          ];
          const allowed = allowedOrigins.find((allowed) =>
            origin.startsWith(allowed)
          );
          // Return the matched origin or null to reject
          return allowed || null;
        }
      : "*", // Allow all origins in development
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  })
);

// Health check endpoint for Docker/K8s
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes for mobile clients
// Future: Add mobile-specific endpoints under /api/*
const apiRouter = new Hono();
apiRouter.get("/version", (c) => c.json({ version: "1.0.0", runtime: "bun" }));
// Add more mobile API routes here

app.route("/api", apiRouter);

// ============================================
// TanStack Start Handler
// ============================================

// Use dynamic import to prevent Bun from auto-starting the TanStack server
async function setupRoutes() {
  // @ts-expect-error - Generated dist file
  const handler = await import("../dist/server/server.js");

  // Extract the fetch handler from TanStack Start
  const tanstackFetch = handler.default?.fetch || handler.fetch;

  if (!tanstackFetch) {
    logger.error("Could not find fetch handler in TanStack Start build");
    logger.error("Expected handler.default.fetch or handler.fetch");
    logger.error("Make sure you ran: pnpm build:web");
    process.exit(1);
  }

  // All other routes go to TanStack Start (SSR, server functions, etc.)
  app.all("*", async (c) => {
    try {
      // Call TanStack Start's fetch handler
      const response = await tanstackFetch(c.req.raw);
      return response;
    } catch (error) {
      logger.error({ error: serializeError(error) }, "TanStack Start error");
      return c.json(
        {
          error: "Internal Server Error",
          message: IS_PRODUCTION ? "Something went wrong" : String(error),
        },
        500
      );
    }
  });
}

// ============================================
// Bun Server
// ============================================

async function startServer() {
  logger.info("Starting Vamsa server...");
  logger.info(
    {
      runtime: Bun.version,
      environment: IS_PRODUCTION ? "production" : "development",
      host: HOST,
      port: PORT,
    },
    "Server configuration"
  );

  // Setup routes with dynamic import
  await setupRoutes();

  const server = Bun.serve({
    port: PORT,
    hostname: HOST,
    fetch: app.fetch,

    // Bun-specific optimizations
    development: !IS_PRODUCTION,

    // Error handler
    error(error: Error) {
      logger.error({ error: serializeError(error) }, "Bun server error");
      return new Response("Internal Server Error", { status: 500 });
    },
  });

  logger.info(
    { url: `http://${HOST}:${PORT}`, health: `http://${HOST}:${PORT}/health` },
    "Server listening"
  );

  return server;
}

// Start the server
const server = await startServer();

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down server...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down server...");
  server.stop();
  process.exit(0);
});
