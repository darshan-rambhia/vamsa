/**
 * Drizzle ORM Database Connection
 *
 * Supports both PostgreSQL and SQLite (via Bun's built-in sqlite).
 * Defaults to sqlite for zero-dependency development.
 * Set DB_DRIVER=postgres to use PostgreSQL instead.
 *
 * PostgreSQL features:
 * - Connection pooling via pg driver
 * - Environment-based configuration
 * - SSL support with multiple modes
 *
 * SQLite features:
 * - WAL mode for concurrent reads
 * - Foreign keys enforcement
 * - Zero-config embedded database
 */

import * as fs from "node:fs";

import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as pgSchema from "./schema";
import * as sqliteSchema from "./schema-sqlite";

import type { PoolConfig } from "pg";

// Re-export PG schema for consumers (types remain dialect-agnostic)
export * from "./schema";

/**
 * Database driver type
 */
export type DbDriver = "postgres" | "sqlite";

/**
 * Get the configured database driver.
 * Priority: explicit DB_DRIVER env → auto-detect from DATABASE_URL → sqlite.
 * Auto-detects postgres:// URLs so E2E/production don't need DB_DRIVER set.
 */
export function getDbDriver(): DbDriver {
  if (process.env.DB_DRIVER === "postgres") return "postgres";
  if (process.env.DB_DRIVER === "sqlite") return "sqlite";
  // Auto-detect from DATABASE_URL protocol
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgres";
  }
  return "sqlite";
}

/**
 * Get the active schema based on the configured driver.
 * Returns PG schema types for TypeScript compatibility.
 */
export function getActiveSchema(): typeof pgSchema {
  return getDbDriver() === "sqlite"
    ? (sqliteSchema as unknown as typeof pgSchema)
    : pgSchema;
}

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
    // Warn operators: SSL is active but certificate verification is disabled.
    // Set DB_SSL_MODE=verify-full and DB_SSL_CA_CERT=<path> for full validation.
    console.warn(
      "[security] DB_SSL_MODE is not set in production. Connecting with SSL but " +
        "rejectUnauthorized=false (no certificate verification). " +
        "Set DB_SSL_MODE=verify-full for full certificate validation."
    );
    return { rejectUnauthorized: false };
  }
  return undefined;
}

/**
 * Database configuration from environment (PostgreSQL only)
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
 * Lazy initialization - pool is created on first use (PG mode only)
 */
let poolInstance: Pool | null = null;

/**
 * SQLite database instance (SQLite mode only)
 * Typed loosely to avoid importing bun:sqlite at the top level (breaks Vite/Vitest).
 */
let sqliteInstance: { close: () => void } | null = null;

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
let dbInstance: ReturnType<typeof pgDrizzle<typeof pgSchema>> | null = null;

/**
 * Initialize SQLite database connection.
 * Uses require() to avoid Vite/Vitest static analysis of bun:sqlite built-in.
 * This function is only called at runtime in Bun when DB_DRIVER=sqlite.
 */
function initSqliteDb(dbPath: string): void {
  const { Database } = require("bun:sqlite");
  const { drizzle: sqliteDrizzle } = require("drizzle-orm/bun-sqlite");

  const sqlite = new Database(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  sqliteInstance = sqlite;
  dbInstance = sqliteDrizzle(sqlite, {
    schema: sqliteSchema,
    logger: process.env.DRIZZLE_LOG === "true",
  }) as unknown as ReturnType<typeof pgDrizzle<typeof pgSchema>>;
}

const getDb = () => {
  if (!dbInstance) {
    const driver = getDbDriver();

    if (driver === "sqlite") {
      const dbPath = process.env.DATABASE_URL;
      if (!dbPath) {
        throw new Error(
          "DATABASE_URL environment variable is not set (expected SQLite file path)"
        );
      }
      initSqliteDb(dbPath);
    } else {
      dbInstance = pgDrizzle(getPool(), {
        schema: pgSchema,
        logger: process.env.DRIZZLE_LOG === "true",
      });
    }
  }
  return dbInstance!;
};

// Export a proxy that lazily initializes the db on first access
export const db = new Proxy(
  {} as ReturnType<typeof pgDrizzle<typeof pgSchema>>,
  {
    get(_target, prop) {
      return getDb()[prop as keyof typeof dbInstance];
    },
  }
);

/**
 * Export types for query building
 */
export type DrizzleDB = typeof db;
export type DrizzleSchema = typeof pgSchema;

/**
 * Close the database connection
 * Call this during graceful shutdown
 */
export const closeDb = async (): Promise<void> => {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
  }
  dbInstance = null;
};

/**
 * Get pool statistics for monitoring
 * Returns zeros in SQLite mode (no connection pool)
 */
export const getPoolStats = () => {
  if (getDbDriver() === "sqlite") {
    return { totalCount: 0, idleCount: 0, waitingCount: 0 };
  }
  const pool = getPool();
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

// Export Pool type for testing
export { Pool };
