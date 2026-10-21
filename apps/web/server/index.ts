/**
 * Production server entry point for Vamsa
 *
 * Uses Bun's native HTTP server with Hono.
 * The Hono app is created by the shared factory in ./app.ts.
 */

import path from "node:path";

// Initialize OpenTelemetry before other imports (must be first)
import { loggers } from "@vamsa/lib/logger";
import { initializeServerI18n } from "@vamsa/lib/server";
import {
  bootstrapAdminUser,
  closeDrizzleDb,
  getDbDriver,
  runMigrations,
} from "@vamsa/api";
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

  // Production-only requirements are errors; in development they are warnings
  const requireInProduction = (msg: string) => {
    if (IS_PRODUCTION) errors.push(msg);
    else warnings.push(msg);
  };

  // Public URLs: Better Auth cookies/OIDC callbacks and CORS/CSRF depend on these.
  // Unset values fall back to localhost / vamsa.app, which breaks behind a proxy.
  for (const name of ["BETTER_AUTH_URL", "APP_URL"]) {
    const value = process.env[name];
    if (!value) {
      requireInProduction(
        `${name} is not set (public URL, e.g. https://vamsa.example.com)`
      );
      continue;
    }
    try {
      new URL(value);
    } catch {
      requireInProduction(`${name} is not a valid absolute URL`);
    }
  }

  // Generic OIDC: discovery URL needs client credentials
  if (process.env.OIDC_DISCOVERY_URL) {
    for (const name of ["OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET"]) {
      if (!process.env[name]) {
        requireInProduction(
          `${name} is required when OIDC_DISCOVERY_URL is set`
        );
      }
    }
  }

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

  // API_TOKEN_SECRET keys PAT hashes; falls back to BETTER_AUTH_SECRET
  const apiTokenSecret = process.env.API_TOKEN_SECRET;
  if (apiTokenSecret && apiTokenSecret.length < 32) {
    requireInProduction(
      `API_TOKEN_SECRET is too short (${apiTokenSecret.length} chars, need 32+)`
    );
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

/**
 * Production database setup: apply pending migrations, then bootstrap the first admin.
 * Runs before the HTTP server listens, so /health only reports up once this succeeds.
 *
 * - MIGRATIONS_DIR: folder with postgres/ and sqlite/ migration sets
 *   (default: ./migrations relative to cwd; the Docker image sets /app/migrations)
 * - MIGRATE_ON_START=false: skip migrations (schema managed externally)
 * - ADMIN_EMAIL: if no ADMIN user exists, that email becomes ADMIN (see bootstrap-admin.ts)
 */
async function prepareDatabase(): Promise<void> {
  const driver = getDbDriver();

  if (process.env.MIGRATE_ON_START === "false") {
    log.info({}, "MIGRATE_ON_START=false, skipping database migrations");
  } else {
    const migrationsRoot =
      process.env.MIGRATIONS_DIR || path.resolve(process.cwd(), "migrations");
    const migrationsFolder = path.join(migrationsRoot, driver);
    try {
      await runMigrations({
        driver,
        databaseUrl: process.env.DATABASE_URL ?? "",
        migrationsFolder,
      });
    } catch (error) {
      log.withErr(error).msg("Database migrations failed, refusing to start");
      process.exit(1);
    }
    log.info({ driver, migrationsFolder }, "Database migrations applied");
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    log.info({}, "ADMIN_EMAIL not set, skipping first-admin bootstrap");
    return;
  }
  try {
    const result = await bootstrapAdminUser(adminEmail);
    log.info({ action: result.action }, "First-admin bootstrap checked");
  } catch (error) {
    log.withErr(error).msg("First-admin bootstrap failed, refusing to start");
    process.exit(1);
  }
}

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

  if (IS_PRODUCTION) {
    await prepareDatabase();
  }

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
