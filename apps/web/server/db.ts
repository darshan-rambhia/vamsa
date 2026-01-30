/**
 * Database Client with Performance Monitoring
 *
 * This module re-exports the Drizzle client from @vamsa/api and provides
 * performance monitoring capabilities.
 *
 * Features:
 * - Query duration metrics via OpenTelemetry
 * - Pool statistics for monitoring
 *
 * Usage:
 *   import { db } from './db';
 *   const persons = await db.select().from(schema.persons);
 */

import {
  closeDrizzleDb,
  drizzleDb,
  drizzleSchema,
  getDrizzlePoolStats,
} from "@vamsa/api";

// Re-export the Drizzle database client
export const db = drizzleDb;

// Re-export schema for query building
export { drizzleSchema };

// Re-export pool utilities for monitoring
export const getPoolStats = getDrizzlePoolStats;
export const shutdown = closeDrizzleDb;

// Type for the database client
export type DbClient = typeof db;
