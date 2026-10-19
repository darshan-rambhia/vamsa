import { sql } from "drizzle-orm";
import { getDbDriver } from "@vamsa/api";
import type { DbDriver } from "@vamsa/api";
import type { Column, SQL } from "drizzle-orm";

// Re-export Drizzle ORM client and schema from @vamsa/api
// This module provides the database access layer for business logic
export { drizzleDb, drizzleSchema } from "@vamsa/api";

/**
 * Escape special LIKE/ILIKE wildcard characters in user input.
 * Prevents users from injecting % or _ wildcards to manipulate search queries.
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Case-insensitive LIKE comparison, dialect-aware.
 *
 * - PostgreSQL: native `ILIKE`.
 * - SQLite: has no `ILIKE`. Emits `lower(col) LIKE lower(pattern) ESCAPE '\'`.
 *   The explicit ESCAPE is needed so `escapeLike()` backslashes take effect
 *   (SQLite LIKE has no default escape character).
 *
 * @param column - The Drizzle column to compare
 * @param value - The pattern to match (should already include % wildcards)
 * @param driver - Database driver; defaults to the configured driver
 * @returns A Drizzle SQL condition
 */
export function caseInsensitiveLike(
  column: Column,
  value: string,
  driver: DbDriver = getDbDriver()
): SQL {
  if (driver === "sqlite") {
    return sql`lower(${column}) LIKE lower(${value}) ESCAPE '\\'`;
  }
  return sql`${column} ILIKE ${value}`;
}
