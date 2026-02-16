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

import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { compress } from "hono/compress";
import { NONCE, secureHeaders } from "hono/secure-headers";
import { loggers } from "@vamsa/lib/logger";
import { initializeServerI18n } from "@vamsa/lib/server";
import { auth } from "@vamsa/lib/server/business";
import { closeDrizzleDb, drizzleDb, getDrizzlePoolStats } from "@vamsa/api";
import { sql } from "drizzle-orm";
import { rateLimitMiddleware } from "../src/server/middleware/hono-rate-limiter";
import { initializeRateLimitStore } from "../src/server/middleware/rate-limiter";
import {
  initTrustedProxies,
  trustedProxyMiddleware,
} from "../src/server/middleware/trusted-proxy";
import {
  closeRedisClient,
  getRedisClient,
} from "../src/server/middleware/redis-client";
import { RedisRateLimitStore } from "../src/server/middleware/rate-limit-store";
import { etagMiddleware, getETagMetrics } from "./middleware/etag";
import { telemetryMiddleware } from "./middleware/telemetry";
import { serveMedia } from "./middleware/media-server";
import { mediaAuthMiddleware } from "./middleware/media-auth";
import { metricsAuthMiddleware } from "./middleware/metrics-auth";
import { getTelemetryConfig, startTelemetry, stopTelemetry } from "./telemetry";
import { botGuardMiddleware } from "./middleware/bot-guard";

await startTelemetry();

const log = loggers.api;

// ============================================
// Security Validation
// ============================================

/**
 * Validate critical security credentials on startup
 * Fails fast in production if credentials are missing or weak
 */
function validateSecurityCredentials() {
  const IS_PRODUCTION = process.env.NODE_ENV === "production";
  const warnings: Array<string> = [];
  const errors: Array<string> = [];

  // Check BETTER_AUTH_SECRET
  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret) {
    errors.push("BETTER_AUTH_SECRET is not set");
  } else if (authSecret.length < 32) {
    const msg = `BETTER_AUTH_SECRET is too short (${authSecret.length} chars, need 32+)`;
    if (IS_PRODUCTION) errors.push(msg);
    else warnings.push(msg);
  } else if (
    authSecret.includes("change-in-production") ||
    authSecret === "your-32-character-secret-here-change-in-production"
  ) {
    const msg = "BETTER_AUTH_SECRET appears to be a placeholder value";
    if (IS_PRODUCTION) errors.push(msg);
    else warnings.push(msg);
  }

  // Check DATABASE_URL has non-default password
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const weakPasswords = [
      "password",
      "vamsa",
      "postgres",
      "admin",
      "123456",
      "secret",
    ];
    for (const weak of weakPasswords) {
      if (dbUrl.includes(`:${weak}@`)) {
        const msg = `DATABASE_URL contains weak password "${weak}"`;
        if (IS_PRODUCTION) errors.push(msg);
        else warnings.push(msg);
        break;
      }
    }
  }

  // Check METRICS_BEARER_TOKEN
  const metricsToken = process.env.METRICS_BEARER_TOKEN;
  if (!metricsToken) {
    const msg = "METRICS_BEARER_TOKEN is not set";
    if (IS_PRODUCTION) warnings.push(msg);
    else warnings.push(msg);
  } else if (metricsToken.length < 32) {
    const msg = `METRICS_BEARER_TOKEN is too short (${metricsToken.length} chars, recommended 32+)`;
    warnings.push(msg);
  }

  // Log warnings
  for (const warning of warnings) {
    log.warn({ security: true }, warning);
  }

  // Fail on errors in production
  if (errors.length > 0) {
    for (const error of errors) {
      log.error({ security: true }, error);
    }
    log.error(
      { security: true },
      "Security validation failed. See .env.example for credential generation instructions."
    );
    process.exit(1);
  }

  if (warnings.length === 0 && errors.length === 0) {
    log.info({ security: true }, "Security credentials validated");
  }
}

// Validate credentials before starting
validateSecurityCredentials();

// Initialize trusted proxy configuration
initTrustedProxies();

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

// Bot detection and blocking for AI scrapers
// Prevents data scraping by known AI training bots
app.use("*", botGuardMiddleware);

// Gzip/Brotli compression for responses
// Reduces bandwidth usage significantly for text-based responses
app.use("*", compress());

// CORS configuration for React Native mobile client
app.use(
  "*",
  cors({
    origin: IS_PRODUCTION
      ? (origin) => {
          // In production, only allow exact origin matches
          const allowedOrigins = [
            process.env.APP_URL || "https://vamsa.app",
            // Add your mobile app schemes here when ready
            // 'vamsa://*',
            // 'exp://*', // Expo development
          ];
          // Exact match prevents prefix bypass (e.g. "https://vamsa.app.evil.com")
          const allowed = allowedOrigins.find((allowed) => origin === allowed);
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
          // In production, validate against exact allowed origins
          const allowedOrigins = [
            process.env.APP_URL || "https://vamsa.app",
            // Add mobile app schemes when ready
          ];
          // Exact match prevents prefix bypass (e.g. "https://vamsa.app.evil.com")
          return allowedOrigins.some((allowed) => origin === allowed);
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
    // Uses nonce-based CSP for inline scripts instead of unsafe-inline
    // Per-request nonce is generated and applied to all inline scripts
    // Only apply in production to avoid blocking hot reload in development
    ...(IS_PRODUCTION && {
      contentSecurityPolicy: {
        // Default: only allow same-origin resources
        defaultSrc: ["'self'"],
        // Scripts: self + per-request nonce (no unsafe-inline)
        scriptSrc: ["'self'", NONCE],
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

// X-Robots-Tag header to prevent indexing
// Explicitly tells all crawlers not to index, archive, or snippet any content
app.use("*", async (c, next) => {
  await next();
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
});

// OpenTelemetry HTTP metrics middleware
// Collects request duration, counts, and active connections
app.use("*", telemetryMiddleware);

// Resolve client IP from trusted proxies (before rate limiting)
// Validates proxy headers come from trusted sources to prevent IP spoofing
app.use("*", trustedProxyMiddleware());

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
    // Default: volatile data (auth, real-time) — always revalidate
    cacheControl: "private, max-age=0, must-revalidate",
    // Route-specific cache durations to reduce unnecessary round-trips
    routeCacheConfig: [
      // Volatile: auth endpoints — always revalidate
      { pattern: /^\/api\/auth\//, maxAge: 0 },
      // Stable: person profiles, family data, settings (5 min cache)
      { pattern: /^\/api\/v1\/persons\//, maxAge: 300 },
      { pattern: /^\/api\/v1\/families\//, maxAge: 300 },
      { pattern: /^\/api\/v1\/settings/, maxAge: 300 },
      { pattern: /^\/api\/v1\/media\//, maxAge: 300 },
      // Semi-stable: search, dashboard, charts (2 min cache)
      { pattern: /^\/api\/v1\/search/, maxAge: 120 },
      { pattern: /^\/api\/v1\/dashboard/, maxAge: 120 },
      { pattern: /^\/api\/v1\/charts\//, maxAge: 120 },
    ],
    // Collect metrics in production
    collectMetrics: IS_PRODUCTION,
  })
);

// Health check endpoint for Docker/K8s (public, no authentication required)
// Returns minimal info only — no version or uptime (information disclosure risk)
app.get("/health", async (c) => {
  try {
    const poolStats = getDrizzlePoolStats();
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      db: { connected: true, ...poolStats },
    });
  } catch {
    return c.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        db: { connected: false },
      },
      503
    );
  }
});

// Readiness check endpoint for Kubernetes
// Performs actual database query to verify system is fully operational
app.get("/readyz", async (c) => {
  try {
    await drizzleDb.execute(sql`SELECT 1`);
    return c.json({ status: "ready" });
  } catch (error) {
    return c.json(
      {
        status: "not_ready",
        reason: error instanceof Error ? error.message : "DB unreachable",
      },
      503
    );
  }
});

// robots.txt endpoint
// Explicitly denies all bots, including search engines and AI scrapers
// Vamsa is a private family genealogy app - no public content should be indexed
app.get("/robots.txt", (c) => {
  const robotsTxt = `User-agent: *
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: Claude-Web-Crawler
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: cohere-ai
Disallow: /

User-agent: Diffbot
Disallow: /

User-agent: OAI-SearchBot
Disallow: /

User-agent: YouBot
Disallow: /

User-agent: Bytespider
Disallow: /
`;
  return c.text(robotsTxt, 200, {
    "Content-Type": "text/plain",
    "Cache-Control": "public, max-age=86400",
  });
});

// Protect detailed health endpoints with bearer token authentication
// These expose internal metrics and should only be accessible to authorized monitoring systems
app.use("/health/detail", metricsAuthMiddleware());
app.use("/health/cache", metricsAuthMiddleware());
app.use("/health/telemetry", metricsAuthMiddleware());

// Detailed health endpoint for authorized monitoring systems
// Protected: requires METRICS_BEARER_TOKEN environment variable
app.get("/health/detail", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || "1.0.0",
    runtime: `bun ${Bun.version}`,
    environment: process.env.NODE_ENV || "development",
    node: process.version,
    memory: process.memoryUsage(),
  });
});

// Cache metrics endpoint for monitoring
// Protected: requires METRICS_BEARER_TOKEN environment variable
app.get("/health/cache", (c) => {
  const metrics = getETagMetrics();
  return c.json({
    etag: metrics,
    timestamp: new Date().toISOString(),
  });
});

// Telemetry status endpoint for monitoring
// Protected: requires METRICS_BEARER_TOKEN environment variable
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

// Mount v1 API under /api/v1
apiRouter.route("/v1", apiV1);

// Root API endpoint lists available versions
apiRouter.get("/", (c) =>
  c.json({
    api: "Vamsa API",
    versions: {
      v1: "/api/v1",
    },
    ...(IS_PRODUCTION && process.env.ENABLE_API_DOCS !== "true"
      ? {}
      : { docs: "/api/v1/docs" }),
  })
);

// ============================================
// Web Vitals Ingestion Endpoint
// ============================================

// Receives batched Web Vitals metrics from the client SDK (web-vitals.ts)
// and records them as OpenTelemetry histograms for Grafana dashboards.
// This endpoint is intentionally unauthenticated — it only accepts
// pre-defined metric names and numeric values, so there is no data risk.
app.post("/api/v1/vitals", async (c) => {
  try {
    const body = await c.req.json();

    if (!body?.metrics || !Array.isArray(body.metrics)) {
      return c.json({ error: "Invalid payload" }, 400);
    }

    // Validate and sanitize metrics before recording
    const VALID_METRIC_NAMES = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);
    const validMetrics = body.metrics.filter(
      (m: unknown) =>
        m != null &&
        typeof m === "object" &&
        "name" in m &&
        "value" in m &&
        typeof (m as Record<string, unknown>).name === "string" &&
        typeof (m as Record<string, unknown>).value === "number" &&
        VALID_METRIC_NAMES.has((m as Record<string, string>).name)
    );

    if (validMetrics.length === 0) {
      return c.json({ error: "No valid metrics" }, 400);
    }

    const { recordWebVitals } = await import("./metrics");
    recordWebVitals(
      validMetrics,
      typeof body.url === "string" ? body.url : "/"
    );

    return c.json({ ok: true }, 202);
  } catch {
    return c.json({ error: "Bad request" }, 400);
  }
});

// ============================================
// Better Auth Handler
// ============================================

// Apply rate limiting to specific Better Auth routes
// Sign in: 5 attempts per minute
app.use("/api/auth/sign-in/*", rateLimitMiddleware("login"));

// Sign up: 3 attempts per hour
app.use("/api/auth/sign-up/*", rateLimitMiddleware("register"));

// Forget password: 3 attempts per hour
app.use("/api/auth/forget-password/*", rateLimitMiddleware("passwordReset"));

// Mount Better Auth SDK endpoints at /api/auth/*
// This handles authentication flows from the Better Auth React client
// Note: Using /* instead of /** - Hono uses single * for wildcard matching
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.route("/api", apiRouter);

// Media serving endpoint for image files
// Serves images with appropriate caching headers and Content-Type
// Requires authentication via session token
app.use("/media/*", mediaAuthMiddleware);
app.get("/media/*", serveMedia);

// Static file serving for assets (CSS, JS, images)
// In production, nginx typically handles this, but we need it for:
// - E2E testing in Docker (no nginx)
// - Direct server access during development
app.use("/assets/*", async (c, next) => {
  const path = c.req.path;
  const filePath = `./dist/client${path}`;

  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (exists) {
      const content = await file.arrayBuffer();
      // Determine MIME type from file extension
      const mimeType = path.endsWith(".css")
        ? "text/css; charset=utf-8"
        : path.endsWith(".js")
          ? "application/javascript; charset=utf-8"
          : path.endsWith(".json")
            ? "application/json; charset=utf-8"
            : path.endsWith(".svg")
              ? "image/svg+xml"
              : path.endsWith(".png")
                ? "image/png"
                : path.endsWith(".jpg") || path.endsWith(".jpeg")
                  ? "image/jpeg"
                  : path.endsWith(".woff2")
                    ? "font/woff2"
                    : path.endsWith(".woff")
                      ? "font/woff"
                      : "application/octet-stream";

      return new Response(content, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (error) {
    log.withErr(error).msg("Error serving static file");
  }

  return next();
});

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
  // prettier-ignore
  // @ts-ignore - Build artifact only exists after build, not during typecheck
  const handler = (await import("../dist/server/server.js")) as unknown as TanStackHandler;

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
      // Extract nonce from Hono context (set by secureHeaders middleware)
      const nonce = c.get("secureHeadersNonce");

      // Create a new request with the nonce passed via a custom header
      // TanStack Start's fetch handler will see this and can use it for rendering
      const headers = new Headers(c.req.raw.headers);
      if (nonce) {
        headers.set("x-csp-nonce", nonce);
      }

      const modifiedRequest = new Request(c.req.raw, { headers });

      // Call TanStack Start's fetch handler
      const response = await tanstackFetch(modifiedRequest);
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
  const version = process.env.APP_VERSION || "dev";
  log.info(
    {
      version,
      runtime: Bun.version,
      environment: IS_PRODUCTION ? "production" : "development",
      host: HOST,
      port: PORT,
    },
    "Vamsa server starting"
  );

  // Initialize i18n for server functions
  try {
    await initializeServerI18n();
    log.info({}, "Server-side i18n initialized");
  } catch (error) {
    log.withErr(error).msg("Failed to initialize i18n");
    // Don't exit, continue with default English
  }

  // Initialize rate limit store
  const redis = await getRedisClient();
  if (redis) {
    initializeRateLimitStore(new RedisRateLimitStore(redis));
  } else {
    log.info({}, "Rate limit store: memory (REDIS_URL not set)");
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
  await closeDrizzleDb();
  await closeRedisClient();
  await stopTelemetry();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  log.info({}, "Received SIGTERM, shutting down server...");
  server.stop();
  await closeDrizzleDb();
  await closeRedisClient();
  await stopTelemetry();
  process.exit(0);
});
