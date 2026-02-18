/**
 * Production server entry point for Vamsa
 *
 * Uses Bun's native HTTP server with Hono.
 * The Hono app is created by the shared factory in ./app.ts.
 */

// Initialize OpenTelemetry before other imports (must be first)
import { loggers } from "@vamsa/lib/logger";
import { initializeServerI18n } from "@vamsa/lib/server";
import { closeDrizzleDb } from "@vamsa/api";
import { initializeRateLimitStore } from "../src/server/middleware/rate-limiter";
import {
  closeRedisClient,
  getRedisClient,
} from "../src/server/middleware/redis-client";
import { RedisRateLimitStore } from "../src/server/middleware/rate-limit-store";
import { startTelemetry, stopTelemetry } from "./telemetry";
import { createHonoApp } from "./app";

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

// ============================================
// Server Startup
// ============================================

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Validate credentials before starting
validateSecurityCredentials();

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
  }

  // Initialize rate limit store
  const redis = await getRedisClient();
  if (redis) {
    initializeRateLimitStore(new RedisRateLimitStore(redis));
  } else {
    log.info({}, "Rate limit store: memory (REDIS_URL not set)");
  }

  // Load TanStack Start handler
  type FetchHandler = (request: Request) => Promise<Response>;
  interface TanStackHandler {
    default?: { fetch?: FetchHandler };
    fetch?: FetchHandler;
  }

  // Variable prevents TypeScript from resolving the path at typecheck time
  // (dist/ only exists after build). This file runs under Bun, not Vite.
  const serverModule = "../dist/server/server.js";
  const handler = (await import(serverModule)) as unknown as TanStackHandler;
  const tanstackFetch = handler.default?.fetch ?? handler.fetch;

  if (!tanstackFetch) {
    log.error(
      { module: "TanStack Start" },
      "Could not find fetch handler in TanStack Start build"
    );
    process.exit(1);
  }

  // Create the Hono app with all middleware
  const app = await createHonoApp({
    tanstackFetch,
    isProduction: IS_PRODUCTION,
  });

  const server = Bun.serve({
    port: PORT,
    hostname: HOST,
    fetch: app.fetch,
    development: !IS_PRODUCTION,
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
