import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "@vamsa/lib/logger";

// Load .env from monorepo root (traverse up from packages/api/src)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

// Global singleton for Prisma client to prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * Connection pool configuration
 *
 * These settings balance performance with resource usage:
 * - max: Maximum concurrent connections (adjust based on database limits and expected load)
 * - min: Minimum idle connections to keep warm
 * - idleTimeoutMillis: Close idle connections after this time
 * - connectionTimeoutMillis: Fail if connection can't be established in this time
 * - maxUses: Recycle connections after this many uses (prevents memory leaks)
 *
 * Environment Variables:
 * - DB_POOL_MAX: Override max connections (default: 10 production, 5 development)
 * - DB_POOL_MIN: Override min connections (default: 2 production, 1 development)
 * - DB_POOL_IDLE_TIMEOUT: Override idle timeout in ms (default: 30000)
 * - DB_POOL_CONNECTION_TIMEOUT: Override connection timeout in ms (default: 10000)
 */
function getPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const isProduction = process.env.NODE_ENV === "production";

  // Parse environment overrides
  const maxConnections = process.env.DB_POOL_MAX
    ? parseInt(process.env.DB_POOL_MAX, 10)
    : isProduction
      ? 10
      : 5;

  const minConnections = process.env.DB_POOL_MIN
    ? parseInt(process.env.DB_POOL_MIN, 10)
    : isProduction
      ? 2
      : 1;

  const idleTimeoutMillis = process.env.DB_POOL_IDLE_TIMEOUT
    ? parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10)
    : 30000; // 30 seconds

  const connectionTimeoutMillis = process.env.DB_POOL_CONNECTION_TIMEOUT
    ? parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT, 10)
    : 10000; // 10 seconds

  return {
    connectionString,
    max: maxConnections,
    min: minConnections,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    // Recycle connections after 10,000 uses to prevent memory leaks
    maxUses: 10000,
    // Application name for database monitoring
    application_name: "vamsa",
    // Keep connections alive with periodic pings (every 30 seconds)
    keepAlive: true,
    keepAliveInitialDelayMillis: 30000,
  };
}

/**
 * Create a connection pool with the configured settings
 */
function createPool(): Pool {
  const poolConfig = getPoolConfig();
  const pool = new Pool(poolConfig);

  // Log pool events in development
  if (process.env.NODE_ENV === "development") {
    pool.on("connect", () => {
      logger.debug("DB Pool: New client connected");
    });

    pool.on("remove", () => {
      logger.debug("DB Pool: Client removed from pool");
    });

    pool.on("error", (err) => {
      logger.error({ error: err }, "DB Pool: Unexpected error on idle client");
    });
  }

  // Always log errors in production
  pool.on("error", (err) => {
    logger.error({ error: err }, "DB Pool: Pool error");
  });

  return pool;
}

/**
 * Create Prisma client with connection pooling
 */
function createPrismaClient(): PrismaClient {
  // Create or reuse the connection pool
  const pool = globalForPrisma.pool ?? createPool();

  // Store pool reference for reuse
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  // Create Prisma adapter using the pool
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Get the underlying connection pool for monitoring
 * Returns undefined if pool is not available
 */
export function getPool(): Pool | undefined {
  return globalForPrisma.pool;
}

/**
 * Get pool statistics for health checks and monitoring
 */
export async function getPoolStats(): Promise<{
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
}> {
  const pool = globalForPrisma.pool;
  if (!pool) {
    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
    };
  }

  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
  };
}

/**
 * Gracefully shutdown the database connection
 * Call this before process exit
 */
export async function shutdown(): Promise<void> {
  try {
    await prisma.$disconnect();

    const pool = globalForPrisma.pool;
    if (pool) {
      await pool.end();
      globalForPrisma.pool = undefined;
    }

    logger.info("DB: Connection pool closed gracefully");
  } catch (error) {
    logger.error({ error }, "DB: Error during shutdown");
    throw error;
  }
}

// Register shutdown handlers
if (typeof process !== "undefined") {
  // Handle graceful shutdown signals
  process.on("SIGTERM", async () => {
    logger.info("DB: SIGTERM received, closing connections...");
    await shutdown();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    logger.info("DB: SIGINT received, closing connections...");
    await shutdown();
    process.exit(0);
  });

  // Handle unexpected errors
  process.on("beforeExit", async () => {
    await shutdown();
  });
}

export type { PrismaClient };
