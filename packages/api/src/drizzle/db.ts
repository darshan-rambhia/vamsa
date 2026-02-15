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

import * as fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import type { PoolConfig } from "pg";

// Re-export schema for consumers
export * from "./schema";

/**
 * PostgreSQL SSL modes for database connections
 */
export type DbSslMode = "disable" | "require" | "verify-ca" | "verify-full";

/**
 * Get SSL configuration based on environment variables
 *
 * Supports four modes:
 * - "disable": No SSL (typically for Docker same-host connections)
 * - "require": SSL required, but no certificate validation (rejectUnauthorized: false)
 * - "verify-ca": SSL required, validate against CA certificate
 * - "verify-full": SSL + hostname validation (most secure)
 *
 * For backward compatibility:
 * - If NODE_ENV=production and DB_SSL_MODE is unset, defaults to { rejectUnauthorized: false }
 * - If NODE_ENV!=production and DB_SSL_MODE is unset, defaults to undefined (no SSL)
 *
 * @returns SSL configuration object or undefined for no SSL
 * @throws Error if verify-ca/verify-full mode but DB_SSL_CA_CERT is missing or invalid
 */
export function getSslConfig() {
  const sslMode = process.env.DB_SSL_MODE as DbSslMode | undefined;

  if (sslMode === "disable") {
    return undefined;
  }

  if (sslMode === "require") {
    return { rejectUnauthorized: false };
  }

  if (sslMode === "verify-ca" || sslMode === "verify-full") {
    const caPath = process.env.DB_SSL_CA_CERT;
    if (!caPath) {
      throw new Error(
        `DB_SSL_MODE=${sslMode} requires DB_SSL_CA_CERT environment variable to be set`
      );
    }

    let ca: string;
    try {
      ca = fs.readFileSync(caPath, "utf-8");
    } catch (err) {
      throw new Error(`Failed to read CA certificate from ${caPath}: ${err}`);
    }

    return { rejectUnauthorized: true, ca };
  }

  // Default: backward compatible behavior
  if (process.env.NODE_ENV === "production") {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

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
    ssl: getSslConfig(),
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
