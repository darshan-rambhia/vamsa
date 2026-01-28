/**
 * Production server entry point for Vamsa
 *
 * Uses Bun's native HTTP server with Hono for middleware capabilities.
 * TanStack Start exports a fetch handler that we wrap with Hono for:
 * - Request/response logging (Pino structured logging)
 * - CORS handling (for future React Native client)
 * - Custom middleware (rate limiting, auth, etc.)
 * - Health checks and monitoring
 * - OpenTelemetry observability (traces and metrics)
 */

// Initialize OpenTelemetry before other imports (must be first)
import { startTelemetry, stopTelemetry, getTelemetryConfig } from "./telemetry";
await startTelemetry();

import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { loggers } from "@vamsa/lib/logger";
import { etagMiddleware, getETagMetrics } from "./middleware/etag";

const log = loggers.api;
import { telemetryMiddleware } from "./middleware/telemetry";
import { initializeServerI18n } from "@vamsa/lib/server";
import { serveMedia } from "./middleware/media-server";
import { auth } from "@vamsa/lib/server/business";

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

// CSRF protection - validates Origin header for non-safe methods
// Defense-in-depth with sameSite cookies
app.use(
  "*",
  csrf({
    origin: IS_PRODUCTION
      ? (origin) => {
          // In production, validate against allowed origins
          const allowedOrigins = [
            process.env.APP_URL || "https://vamsa.app",
            // Add mobile app schemes when ready
          ];
          return allowedOrigins.some((allowed) => origin.startsWith(allowed));
        }
      : "*", // Allow all in development
  })
);

// Security headers - protect against common web vulnerabilities
app.use(
  "*",
  secureHeaders({
    // HTTP Strict Transport Security
    // In production: enforce HTTPS for 1 year with preload
    strictTransportSecurity: IS_PRODUCTION
      ? "max-age=31536000; includeSubDomains; preload"
      : false,

    // Prevent MIME type sniffing
    xContentTypeOptions: "nosniff",

    // Prevent clickjacking
    xFrameOptions: "DENY",

    // XSS protection (legacy, but still useful for older browsers)
    xXssProtection: "1; mode=block",

    // Control referrer information
    referrerPolicy: "strict-origin-when-cross-origin",

    // Content Security Policy
    // Using a permissive policy to support TanStack Start's SSR/hydration
    // Only apply in production to avoid blocking hot reload in development
    ...(IS_PRODUCTION && {
      contentSecurityPolicy: {
        // Default: only allow same-origin resources
        defaultSrc: ["'self'"],
        // Scripts: self + inline (needed for hydration) + eval (needed for development)
        scriptSrc: ["'self'", "'unsafe-inline'"],
        // Styles: self + inline (needed for Tailwind) + Google Fonts
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        // Fonts: self + Google Fonts
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        // Images: self + data URIs + HTTPS (for external images)
        imgSrc: ["'self'", "data:", "https:"],
        // API connections: self only
        connectSrc: ["'self'"],
        // Frames: none (prevent embedding)
        frameSrc: ["'none'"],
        // Objects: none (disable plugins)
        objectSrc: ["'none'"],
        // Base URI: self only
        baseUri: ["'self'"],
        // Form actions: self only
        formAction: ["'self'"],
        // Upgrade insecure requests
        upgradeInsecureRequests: [],
      },
    }),

    // Permissions Policy - disable unnecessary browser features
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      accelerometer: [],
      gyroscope: [],
    },
  })
);

// OpenTelemetry HTTP metrics middleware
// Collects request duration, counts, and active connections
app.use("*", telemetryMiddleware);

// ETag caching for API responses
// This should be applied after security headers but before route handlers
app.use(
  "*",
  etagMiddleware({
    // Use weak ETags for API responses (semantically equivalent)
    weak: true,
    // Fast hashing algorithm
    algorithm: "md5",
    // Don't apply to very small responses
    minSize: 512,
    // Cache control for API responses
    cacheControl: "private, must-revalidate, max-age=0",
    // Collect metrics in production
    collectMetrics: IS_PRODUCTION,
  })
);

// Health check endpoint for Docker/K8s
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || "1.0.0",
  });
});

// Cache metrics endpoint for monitoring
app.get("/health/cache", (c) => {
  const metrics = getETagMetrics();
  return c.json({
    etag: metrics,
    timestamp: new Date().toISOString(),
  });
});

// Telemetry status endpoint for monitoring
app.get("/health/telemetry", (c) => {
  const telemetryConfig = getTelemetryConfig();
  return c.json({
    telemetry: telemetryConfig,
    timestamp: new Date().toISOString(),
  });
});

// API routes for mobile clients and REST endpoints
// Import the API v1 router with all REST endpoints
const { default: apiV1 } = await import("./api/index.js");

const apiRouter = new Hono();

// API version endpoint
apiRouter.get("/version", (c) => c.json({ version: "1.0.0", runtime: "bun" }));

// Mount v1 API under /api/v1
apiRouter.route("/v1", apiV1);

// Root API endpoint lists available versions
apiRouter.get("/", (c) =>
  c.json({
    api: "Vamsa API",
    versions: {
      v1: "/api/v1",
    },
    docs: "/api/v1/docs",
  })
);

// ============================================
// Better Auth Handler
// ============================================

// Mount Better Auth SDK endpoints at /api/auth/*
// This handles authentication flows from the Better Auth React client
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

app.route("/api", apiRouter);

// Media serving endpoint for image files
// Serves images with appropriate caching headers and Content-Type
app.get("/media/*", serveMedia);

// ============================================
// TanStack Start Handler
// ============================================

// Type for TanStack Start server handler
type FetchHandler = (request: Request) => Promise<Response>;
interface TanStackHandler {
  default?: { fetch?: FetchHandler };
  fetch?: FetchHandler;
}

// Use dynamic import to prevent Bun from auto-starting the TanStack server
async function setupRoutes() {
  // Dynamic import of generated bundle - type assertion needed as bundle structure varies
  const handler =
    (await import("../dist/server/server.js")) as unknown as TanStackHandler;

  // Extract the fetch handler from TanStack Start
  const tanstackFetch = handler.default?.fetch ?? handler.fetch;

  if (!tanstackFetch) {
    log.error(
      { module: "TanStack Start" },
      "Could not find fetch handler in TanStack Start build"
    );
    log.error(
      { module: "TanStack Start" },
      "Expected handler.default.fetch or handler.fetch"
    );
    log.error(
      { module: "TanStack Start" },
      "Make sure you ran: pnpm build:web"
    );
    process.exit(1);
  }

  // All other routes go to TanStack Start (SSR, server functions, etc.)
  app.all("*", async (c) => {
    try {
      // Call TanStack Start's fetch handler
      const response = await tanstackFetch(c.req.raw);
      return response;
    } catch (error) {
      log.withErr(error).msg("TanStack Start error");
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
  log.info({}, "Starting Vamsa server...");
  log.info(
    {
      runtime: Bun.version,
      environment: IS_PRODUCTION ? "production" : "development",
      host: HOST,
      port: PORT,
    },
    "Server configuration"
  );

  // Initialize i18n for server functions
  try {
    await initializeServerI18n();
    log.info({}, "Server-side i18n initialized");
  } catch (error) {
    log.withErr(error).msg("Failed to initialize i18n");
    // Don't exit, continue with default English
  }

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
      log.withErr(error).msg("Bun server error");
      return new Response("Internal Server Error", { status: 500 });
    },
  });

  log.info(
    { url: `http://${HOST}:${PORT}`, health: `http://${HOST}:${PORT}/health` },
    "Server listening"
  );

  return server;
}

// Start the server
const server = await startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  log.info({}, "Received SIGINT, shutting down server...");
  server.stop();
  await stopTelemetry();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  log.info({}, "Received SIGTERM, shutting down server...");
  server.stop();
  await stopTelemetry();
  process.exit(0);
});
