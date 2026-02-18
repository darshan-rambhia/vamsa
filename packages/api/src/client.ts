/**
 * Database Client Module
 *
 * Drizzle ORM is now the primary database ORM for Vamsa.
 * This module re-exports the Drizzle client and schema for use throughout the application.
 * Schema is dynamically selected based on DB_DRIVER (postgres or sqlite).
 */

import * as pgSchema from "./drizzle/schema";
import * as sqliteSchema from "./drizzle/schema-sqlite";
import { getDbDriver } from "./drizzle/db";

// Drizzle ORM - the primary database client
export {
  db as drizzleDb,
  closeDb as closeDrizzleDb,
  getPoolStats as getDrizzlePoolStats,
  getDbDriver,
  type DbDriver,
  type DrizzleDB,
  type DrizzleSchema,
} from "./drizzle/db";

// Re-export Drizzle schema, dynamically selected based on DB_DRIVER
// PG schema type is canonical for TypeScript consumers
export const drizzleSchema: typeof pgSchema =
  getDbDriver() === "sqlite"
    ? (sqliteSchema as unknown as typeof pgSchema)
    : pgSchema;
