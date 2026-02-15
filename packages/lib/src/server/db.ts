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
