/**
 * Database Client Module
 *
 * Drizzle ORM is now the primary database ORM for Vamsa.
 * This module re-exports the Drizzle client and schema for use throughout the application.
 */

// Drizzle ORM - the primary database client
export {
  db as drizzleDb,
  closeDb as closeDrizzleDb,
  getPoolStats as getDrizzlePoolStats,
  type DrizzleDB,
  type DrizzleSchema,
} from "./drizzle/db";

// Re-export all Drizzle schema for query building
export * as drizzleSchema from "./drizzle/schema";
