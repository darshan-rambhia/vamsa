/**
 * Programmatic Drizzle migrations for production startup.
 *
 * Idempotent: drizzle records applied migrations in its migrations table
 * (`__drizzle_migrations`), so re-running on an up-to-date database is a no-op.
 * Runs under Bun for both drivers.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { getDbDriver, getSslConfig } from "./db";

import type { DbDriver } from "./db";

export interface RunMigrationsOptions {
  /** Defaults to the configured driver (DB_DRIVER / DATABASE_URL). */
  driver?: DbDriver;
  /** PostgreSQL connection string, or SQLite file path. */
  databaseUrl: string;
  /** Folder containing meta/_journal.json and the .sql files. */
  migrationsFolder: string;
}

/**
 * Apply all pending migrations for the configured driver.
 * Throws with a descriptive message if the migrations folder is missing.
 */
export async function runMigrations(
  options: RunMigrationsOptions
): Promise<void> {
  const driver = options.driver ?? getDbDriver();
  const journal = path.join(options.migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journal)) {
    throw new Error(
      `Migrations not found: ${journal} does not exist (check MIGRATIONS_DIR)`
    );
  }

  if (driver === "sqlite") {
    await migrateSqlite(options);
  } else {
    await migratePostgres(options);
  }
}

async function migratePostgres({
  databaseUrl,
  migrationsFolder,
}: RunMigrationsOptions): Promise<void> {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");

  // Single connection: migrations run once, sequentially.
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    ssl: getSslConfig(),
  });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

async function migrateSqlite({
  databaseUrl,
  migrationsFolder,
}: RunMigrationsOptions): Promise<void> {
  // Bun-only: bun:sqlite is loaded at runtime, not at module import time
  // (keeps Vite/Vitest from resolving it statically). Same approach as db.ts.
  const { Database } = require("bun:sqlite");
  const { drizzle } = await import("drizzle-orm/bun-sqlite");
  const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");

  const sqlite = new Database(databaseUrl);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  try {
    migrate(drizzle(sqlite), { migrationsFolder });
  } finally {
    sqlite.close();
  }
}
