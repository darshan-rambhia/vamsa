/**
 * Database Connection Factory
 *
 * Creates standalone database connections for seed scripts and CLI tools.
 * The main app uses the lazy singleton in db.ts instead.
 */

import { getDbDriver } from "./db";

import type { DrizzleDB } from "./db";
import type * as pgSchemaTypes from "./schema";

export { getDbDriver, type DbDriver } from "./db";

interface SeedConnection {
  db: DrizzleDB;
  schema: typeof pgSchemaTypes;
  close: () => Promise<void>;
}

/**
 * Create a standalone database connection for seed scripts.
 * Uses dynamic imports to load only the needed driver.
 *
 * @param connectionString - PostgreSQL connection URL or SQLite file path
 */
export async function createSeedConnection(
  connectionString: string
): Promise<SeedConnection> {
  const driver = getDbDriver();

  if (driver === "sqlite") {
    const { Database } = await import("bun:sqlite");
    const { drizzle } = await import("drizzle-orm/bun-sqlite");
    const sqliteSchema = await import("./schema-sqlite");

    const sqlite = new Database(connectionString);
    sqlite.exec("PRAGMA journal_mode = WAL;");
    sqlite.exec("PRAGMA foreign_keys = ON;");

    const db = drizzle(sqlite, { schema: sqliteSchema });
    return {
      db: db as unknown as DrizzleDB,
      schema: sqliteSchema as unknown as typeof pgSchemaTypes,
      close: async () => sqlite.close(),
    };
  }

  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pgSchema = await import("./schema");

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema: pgSchema });
  return {
    db: db as unknown as DrizzleDB,
    schema: pgSchema,
    close: async () => {
      await pool.end();
    },
  };
}
