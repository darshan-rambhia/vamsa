/**
 * Drizzle ORM Database Connection
 *
 * Production-ready PostgreSQL connection with:
 * - Connection pooling via pg driver
 * - Environment-based configuration
 * - Schema type exports for query building
 *
 * Note: Using pg driver for compatibility. When Bun's native SQL driver
 * matures with connection pooling, migration to bun:sql will provide
 * additional performance gains.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

// Re-export schema for consumers
export * from "./schema";

/**
 * Database configuration from environment
 */
const getPoolConfig = (): PoolConfig => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Parse pool size from env or use defaults
  const poolSize = process.env.DATABASE_POOL_SIZE
    ? parseInt(process.env.DATABASE_POOL_SIZE, 10)
    : 10;

  const idleTimeout = process.env.DATABASE_IDLE_TIMEOUT
    ? parseInt(process.env.DATABASE_IDLE_TIMEOUT, 10)
    : 30000; // 30 seconds

  const connectionTimeout = process.env.DATABASE_CONNECTION_TIMEOUT
    ? parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 10)
    : 10000; // 10 seconds

  return {
    connectionString,
    max: poolSize,
    idleTimeoutMillis: idleTimeout,
    connectionTimeoutMillis: connectionTimeout,
    // Allow SSL in production, disable for local dev
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  };
};

/**
 * PostgreSQL connection pool
 * Lazy initialization - pool is created on first use
 */
let poolInstance: Pool | null = null;

const getPool = (): Pool => {
  if (!poolInstance) {
    poolInstance = new Pool(getPoolConfig());

    // Handle pool errors
    poolInstance.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error:", err);
    });
  }
  return poolInstance;
};

/**
 * Drizzle ORM instance
 * Lazy initialization - created on first access to avoid errors during module import in tests
 */
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

const getDb = () => {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), {
      schema,
      logger: process.env.DRIZZLE_LOG === "true",
    });
  }
  return dbInstance;
};

// Export a proxy that lazily initializes the db on first access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return getDb()[prop as keyof typeof dbInstance];
  },
});

/**
 * Export types for query building
 */
export type DrizzleDB = typeof db;
export type DrizzleSchema = typeof schema;

/**
 * Close the database connection pool
 * Call this during graceful shutdown
 */
export const closeDb = async (): Promise<void> => {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
};

/**
 * Get pool statistics for monitoring
 */
export const getPoolStats = () => {
  const pool = getPool();
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

// Export Pool type for testing
export { Pool };
