/**
 * SQLite Search Engine Implementation
 *
 * Provides person search for SQLite using LIKE-based matching with
 * basic relevance scoring. Searches across the same fields as the
 * PG full-text search (firstName, lastName, maidenName, bio, birthPlace,
 * nativePlace, profession) but uses SQLite-compatible operators.
 *
 * When FTS5 virtual tables are available (created in Phase 4 migrations),
 * this engine will be upgraded to use them for better performance and
 * ranking. For typical Vamsa datasets (200-2000 persons), LIKE-based
 * search is more than adequate.
 */

import { sanitizeQuery } from "./search";

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
 * SQLite search engine using LIKE-based matching with relevance scoring.
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

    // Split query into individual terms for multi-word search
    const terms = sanitized
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    if (terms.length === 0) {
      return { results: [], total: 0, queryTime: Date.now() - startTime };
    }

    // Build LIKE conditions for each term across searchable fields
    // Each term must match at least one field (AND across terms)
    const termConditions: Array<string> = [];

    for (const _term of terms) {
      // This term must match at least one searchable field
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

    // WHERE params then scoring params then pagination
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
