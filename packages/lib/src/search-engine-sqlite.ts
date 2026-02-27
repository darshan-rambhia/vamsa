/**
 * SQLite Search Engine Implementation
 *
 * Provides person search for SQLite using FTS5 virtual tables for full-text search.
 * Searches across firstName, lastName, maidenName, bio, birthPlace, nativePlace,
 * and profession fields. Falls back to LIKE-based matching if FTS5 table doesn't exist.
 *
 * FTS5 provides:
 * - Phrase search and prefix search support
 * - Built-in ranking by relevance
 * - High performance even on large datasets
 * - Automatic sync triggers on Person table
 */

import { sanitizeQuery } from "./search";
import { logger } from "./logger";

import type { SearchConfig, SearchResults } from "./search";
import type { SearchEngine, SearchPersonRow } from "./search-engine";

/**
 * Minimal interface for a SQLite query client.
 * Matches the Drizzle SQLite `$client` (bun:sqlite Database) API subset.
 */
interface SqliteQueryClient {
  prepare: (sql: string) => {
    all: (...params: Array<unknown>) => Array<Record<string, unknown>>;
  };
}

/**
 * SQLite search engine using FTS5 with automatic fallback to LIKE.
 *
 * Primary strategy: FTS5 MATCH query with built-in ranking
 * Fallback: LIKE-based matching if FTS5 table doesn't exist (graceful degradation)
 */
export class SqliteSearchEngine implements SearchEngine {
  constructor(private readonly client: SqliteQueryClient) {}

  async searchPersons(
    query: string,
    config: SearchConfig = {}
  ): Promise<SearchResults<SearchPersonRow>> {
    const startTime = Date.now();
    const { limit = 20, offset = 0 } = config;

    const sanitized = sanitizeQuery(query);
    if (!sanitized) {
      return { results: [], total: 0, queryTime: Date.now() - startTime };
    }

    // Try FTS5 first, fall back to LIKE if it doesn't exist
    try {
      return await this.searchWithFts5(sanitized, limit, offset, startTime);
    } catch (error) {
      logger.debug(
        { error: String(error) },
        "FTS5 search failed, falling back to LIKE-based search"
      );
      return await this.searchWithLike(sanitized, limit, offset, startTime);
    }
  }

  /**
   * Search using FTS5 virtual table
   * Provides phrase search, prefix search, and built-in ranking
   */
  private async searchWithFts5(
    sanitized: string,
    limit: number,
    offset: number,
    startTime: number
  ): Promise<SearchResults<SearchPersonRow>> {
    // Prepare FTS5 query string
    // FTS5 MATCH syntax:
    // - "phrase" for exact phrase
    // - term* for prefix search
    // - Multiple terms are AND by default
    const fts5Query = sanitized
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map((term) => `${escapeFts5Term(term)}*`) // prefix search
      .join(" ");

    // Count query
    const countSql =
      "SELECT COUNT(*) as total FROM persons_fts WHERE persons_fts MATCH ?";
    const countResult = this.client.prepare(countSql).all(fts5Query);
    const total = (countResult[0]?.total as number) || 0;

    if (total === 0) {
      return { results: [], total: 0, queryTime: Date.now() - startTime };
    }

    // Search query with FTS5 ranking and join to Person table
    // FTS5 rank is negative, so ORDER BY rank DESC gives best matches first
    const searchSql = `
      SELECT
        p.id, p."firstName", p."lastName", p."maidenName", p."photoUrl",
        p."dateOfBirth", p."dateOfPassing", p."isLiving",
        fts.rank as rank
      FROM persons_fts fts
      JOIN "Person" p ON fts.id = p.id
      WHERE fts.persons_fts MATCH ?
      ORDER BY fts.rank ASC
      LIMIT ? OFFSET ?
    `;

    const rows = this.client.prepare(searchSql).all(fts5Query, limit, offset);

    const results = rows.map((row) => ({
      item: {
        id: row.id as string,
        firstName: row.firstName as string,
        lastName: row.lastName as string,
        maidenName: row.maidenName as string | null,
        photoUrl: row.photoUrl as string | null,
        dateOfBirth: row.dateOfBirth as Date | string | null,
        dateOfPassing: row.dateOfPassing as Date | string | null,
        isLiving: Boolean(row.isLiving),
        // FTS5 rank is negative (lower is better), so negate for positive scores
        rank: Math.abs((row.rank as number) || 0),
      },
      rank: Math.abs((row.rank as number) || 0),
    }));

    return {
      results,
      total,
      queryTime: Date.now() - startTime,
    };
  }

  /**
   * Fallback search using LIKE-based matching with relevance scoring.
   * Used if FTS5 table doesn't exist or FTS5 query fails.
   *
   * Scoring strategy:
   * - firstName exact match (case-insensitive): 10 points
   * - lastName exact match (case-insensitive): 10 points
   * - firstName prefix match: 8 points
   * - lastName prefix match: 8 points
   * - firstName/lastName contains: 5 points
   * - maidenName match: 4 points
   * - bio/birthPlace/nativePlace/profession contains: 2 points each
   */
  private async searchWithLike(
    sanitized: string,
    limit: number,
    offset: number,
    startTime: number
  ): Promise<SearchResults<SearchPersonRow>> {
    const terms = sanitized
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    if (terms.length === 0) {
      return { results: [], total: 0, queryTime: Date.now() - startTime };
    }

    // Build LIKE conditions for each term across searchable fields
    const termConditions: Array<string> = [];

    for (const _term of terms) {
      termConditions.push(`(
        LOWER("firstName") LIKE ? ESCAPE '\\' OR
        LOWER("lastName") LIKE ? ESCAPE '\\' OR
        LOWER(COALESCE("maidenName", '')) LIKE ? ESCAPE '\\' OR
        LOWER(COALESCE(bio, '')) LIKE ? ESCAPE '\\' OR
        LOWER(COALESCE("birthPlace", '')) LIKE ? ESCAPE '\\' OR
        LOWER(COALESCE("nativePlace", '')) LIKE ? ESCAPE '\\' OR
        LOWER(COALESCE(profession, '')) LIKE ? ESCAPE '\\'
      )`);
    }

    const whereParams: Array<unknown> = [];
    const scoreParams: Array<unknown> = [];

    for (const term of terms) {
      const likePattern = `%${escapeSqliteLike(term)}%`;
      const prefixPattern = `${escapeSqliteLike(term)}%`;

      // WHERE clause: 7 LIKE params per term
      whereParams.push(
        likePattern,
        likePattern,
        likePattern,
        likePattern,
        likePattern,
        likePattern,
        likePattern
      );

      // Scoring: exact, prefix, contains for each scored field
      scoreParams.push(
        term, // firstName exact
        term, // lastName exact
        prefixPattern, // firstName prefix
        prefixPattern, // lastName prefix
        likePattern, // firstName contains
        likePattern, // lastName contains
        likePattern, // maidenName contains
        likePattern, // bio contains
        likePattern, // birthPlace contains
        likePattern, // nativePlace contains
        likePattern // profession contains
      );
    }

    const whereClause = termConditions.join(" AND ");

    // Build scoring expression - sum scores across all terms
    const scoreExpressions: Array<string> = [];
    for (const _term of terms) {
      scoreExpressions.push(`(
        (CASE WHEN LOWER("firstName") = ? THEN 10 ELSE 0 END) +
        (CASE WHEN LOWER("lastName") = ? THEN 10 ELSE 0 END) +
        (CASE WHEN LOWER("firstName") LIKE ? ESCAPE '\\' THEN 8 ELSE 0 END) +
        (CASE WHEN LOWER("lastName") LIKE ? ESCAPE '\\' THEN 8 ELSE 0 END) +
        (CASE WHEN LOWER("firstName") LIKE ? ESCAPE '\\' THEN 5 ELSE 0 END) +
        (CASE WHEN LOWER("lastName") LIKE ? ESCAPE '\\' THEN 5 ELSE 0 END) +
        (CASE WHEN LOWER(COALESCE("maidenName", '')) LIKE ? ESCAPE '\\' THEN 4 ELSE 0 END) +
        (CASE WHEN LOWER(COALESCE(bio, '')) LIKE ? ESCAPE '\\' THEN 2 ELSE 0 END) +
        (CASE WHEN LOWER(COALESCE("birthPlace", '')) LIKE ? ESCAPE '\\' THEN 2 ELSE 0 END) +
        (CASE WHEN LOWER(COALESCE("nativePlace", '')) LIKE ? ESCAPE '\\' THEN 2 ELSE 0 END) +
        (CASE WHEN LOWER(COALESCE(profession, '')) LIKE ? ESCAPE '\\' THEN 2 ELSE 0 END)
      )`);
    }
    const scoreExpression = scoreExpressions.join(" + ");

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM "Person" WHERE ${whereClause}`;
    const countResult = this.client.prepare(countSql).all(...whereParams);
    const total = (countResult[0]?.total as number) || 0;

    // Search query with scoring, pagination
    const searchSql = `
      SELECT
        id, "firstName", "lastName", "maidenName", "photoUrl",
        "dateOfBirth", "dateOfPassing", "isLiving",
        (${scoreExpression}) as rank
      FROM "Person"
      WHERE ${whereClause}
      ORDER BY rank DESC
      LIMIT ? OFFSET ?
    `;

    const allParams = [...whereParams, ...scoreParams, limit, offset];
    const rows = this.client.prepare(searchSql).all(...allParams);

    const results = rows.map((row) => ({
      item: {
        id: row.id as string,
        firstName: row.firstName as string,
        lastName: row.lastName as string,
        maidenName: row.maidenName as string | null,
        photoUrl: row.photoUrl as string | null,
        dateOfBirth: row.dateOfBirth as Date | string | null,
        dateOfPassing: row.dateOfPassing as Date | string | null,
        isLiving: Boolean(row.isLiving),
        rank: (row.rank as number) || 0,
      },
      rank: (row.rank as number) || 0,
    }));

    return {
      results,
      total,
      queryTime: Date.now() - startTime,
    };
  }
}

/**
 * Escape special characters in a LIKE pattern for SQLite.
 * Uses backslash as the escape character (specified via ESCAPE '\\').
 */
function escapeSqliteLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Escape special characters in an FTS5 MATCH query.
 * FTS5 has special characters: ", *, :, etc.
 * Double quotes delimit phrases, so they must be escaped or removed.
 * Wildcard * is handled separately in the query builder.
 */
function escapeFts5Term(value: string): string {
  // Remove or escape double quotes which have special meaning in FTS5
  return value.replace(/"/g, "");
}
