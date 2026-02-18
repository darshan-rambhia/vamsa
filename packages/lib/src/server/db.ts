import { ilike } from "drizzle-orm";
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
 * Case-insensitive LIKE comparison.
 *
 * Currently uses PostgreSQL's native `ILIKE` operator. When SQLite support
 * is added, this will dispatch to `LIKE` with `COLLATE NOCASE` or
 * `lower()` wrapping based on the active dialect.
 *
 * @param column - The Drizzle column to compare
 * @param value - The pattern to match (should already include % wildcards)
 * @returns A Drizzle SQL condition
 */
export function caseInsensitiveLike(column: Column, value: string): SQL {
  return ilike(column, value);
}
