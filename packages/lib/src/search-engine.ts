/**
 * Search Engine Abstraction
 *
 * Provides an interface for executing person search queries against
 * the database. Currently only PostgreSQL is supported (PgSearchEngine).
 * When SQLite support is added, a SqliteSearchEngine will implement the
 * same interface using FTS5.
 */

import type { SearchConfig, SearchResults } from "./search";

/**
 * Raw person row returned by the search engine.
 * Represents the database row shape before application-level mapping.
 */
export interface SearchPersonRow {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: Date | string | null;
  dateOfPassing?: Date | string | null;
  isLiving: boolean;
  rank: number;
}

/**
 * Interface for person search execution.
 *
 * Implementations handle the dialect-specific SQL execution:
 * - PgSearchEngine: Uses FTS + pg_trgm via raw pg.Pool queries
 * - (Future) SqliteSearchEngine: Uses FTS5 virtual tables
 */
export interface SearchEngine {
  /**
   * Search for persons by query string.
   *
   * @param query - Sanitized search query
   * @param config - Search options (limit, offset, fuzzy, etc.)
   * @returns Search results with ranking and total count
   */
  searchPersons: (
    query: string,
    config?: SearchConfig
  ) => Promise<SearchResults<SearchPersonRow>>;
}
