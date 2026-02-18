/**
 * PostgreSQL Search Engine Implementation
 *
 * Wraps the existing FTS + pg_trgm search logic behind the SearchEngine
 * interface. Executes raw SQL queries against the PostgreSQL pool obtained
 * from `drizzleDb.$client`.
 *
 * This is the single replacement target for Phase 3 (SQLite search).
 */

import {
  buildCombinedSearchQuery,
  buildPersonSearchCountQuery,
} from "./search";
import type { SearchConfig, SearchResults } from "./search";
import type { SearchEngine, SearchPersonRow } from "./search-engine";

/**
 * Minimal interface for a PostgreSQL query client.
 * Matches the subset of pg.Pool / pg.Client used by the search engine.
 */
interface PgQueryClient {
  query: (
    sql: string,
    params: Array<unknown>
  ) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

/**
 * PostgreSQL search engine using FTS and pg_trgm.
 *
 * Accepts a raw PG client (typically `drizzleDb.$client`) and delegates
 * SQL query building to the existing `buildCombinedSearchQuery` and
 * `buildPersonSearchCountQuery` functions.
 */
export class PgSearchEngine implements SearchEngine {
  constructor(private readonly client: PgQueryClient) {}

  async searchPersons(
    query: string,
    config: SearchConfig = {}
  ): Promise<SearchResults<SearchPersonRow>> {
    const startTime = Date.now();

    const { sql: searchSql, params: searchParams } = buildCombinedSearchQuery(
      query,
      {
        limit: config.limit,
        offset: config.offset,
        fuzzy: true,
      }
    );

    const { sql: countSql, params: countParams } = buildPersonSearchCountQuery(
      query,
      { language: "english" }
    );

    // Execute both queries in parallel
    const [rawResults, countResult] = await Promise.all([
      this.client.query(searchSql, searchParams),
      this.client.query(countSql, countParams),
    ]);

    const total = (countResult.rows[0]?.total as number) || 0;

    const results = rawResults.rows.map((row) => ({
      item: {
        id: row.id as string,
        firstName: row.firstName as string,
        lastName: row.lastName as string,
        maidenName: row.maidenName as string | null,
        photoUrl: row.photoUrl as string | null,
        dateOfBirth: row.dateOfBirth as Date | string | null,
        dateOfPassing: row.dateOfPassing as Date | string | null,
        isLiving: row.isLiving as boolean,
        rank: (row.rank as number) || (row.similarity_score as number) || 0,
      },
      rank: (row.rank as number) || (row.similarity_score as number) || 0,
    }));

    return {
      results,
      total,
      queryTime: Date.now() - startTime,
    };
  }
}
