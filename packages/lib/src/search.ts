/**
 * PostgreSQL Full-Text Search Utilities
 *
 * Provides utilities for building and executing full-text search queries
 * using PostgreSQL's tsvector/tsquery features.
 *
 * Features:
 * - Query normalization and sanitization
 * - Boolean operator support (AND, OR, NOT)
 * - Phrase search support
 * - Fuzzy matching configuration
 * - Result highlighting
 */

/**
 * Search configuration options
 */
export interface SearchConfig {
  /**
   * PostgreSQL text search configuration to use
   * Default: "english"
   */
  language?: string;

  /**
   * Enable fuzzy matching using pg_trgm
   * Requires pg_trgm extension to be installed
   */
  fuzzy?: boolean;

  /**
   * Minimum similarity threshold for fuzzy matching (0-1)
   * Default: 0.3
   */
  fuzzyThreshold?: number;

  /**
   * Maximum number of results to return
   */
  limit?: number;

  /**
   * Number of results to skip (for pagination)
   */
  offset?: number;

  /**
   * Highlight search terms in results
   */
  highlight?: boolean;

  /**
   * Start tag for highlighting
   * Default: <mark>
   */
  highlightStart?: string;

  /**
   * End tag for highlighting
   * Default: </mark>
   */
  highlightEnd?: string;
}

/**
 * Search result with relevance ranking
 */
export interface SearchResult<T> {
  /** The matched record */
  item: T;
  /** Relevance rank (higher is better) */
  rank: number;
  /** Highlighted snippets (if highlight enabled) */
  highlights?: {
    [field: string]: string;
  };
}

/**
 * Paginated search results
 */
export interface SearchResults<T> {
  /** Search results with ranking */
  results: SearchResult<T>[];
  /** Total number of matches (before pagination) */
  total: number;
  /** Query execution time in milliseconds */
  queryTime: number;
}

/**
 * Sanitize and normalize a search query
 *
 * Removes dangerous characters and normalizes whitespace.
 *
 * @param query - Raw search query from user input
 * @returns Sanitized query string
 */
export function sanitizeQuery(query: string): string {
  return (
    query
      // Remove SQL-dangerous characters
      .replace(/['"`;\\]/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Convert a user-friendly search query to PostgreSQL tsquery format
 *
 * Supports:
 * - Simple terms: "john" -> john:*
 * - Phrases: '"john doe"' -> john <-> doe
 * - Boolean AND: "john AND doe" -> john & doe
 * - Boolean OR: "john OR doe" -> john | doe
 * - Boolean NOT: "NOT john" -> !john
 * - Prefix matching: "john*" -> john:*
 *
 * @param query - User search query
 * @param config - Search configuration
 * @returns PostgreSQL tsquery string
 */
export function buildTsQuery(
  query: string,
  _config: SearchConfig = {}
): string {
  const sanitized = sanitizeQuery(query);
  if (!sanitized) return "";

  const tokens: string[] = [];
  let remaining = sanitized;

  // Extract quoted phrases first
  const phraseRegex = /"([^"]+)"/g;
  let match: RegExpExecArray | null;
  const phrases: string[] = [];

  while ((match = phraseRegex.exec(remaining)) !== null) {
    phrases.push(match[1]);
  }

  // Remove phrases from remaining text
  remaining = remaining.replace(phraseRegex, " ").trim();

  // Parse remaining tokens
  const words = remaining.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase();

    if (word === "and") {
      // Skip AND - it's the default connector
      continue;
    } else if (word === "or") {
      // Replace previous connector with OR
      if (tokens.length > 0 && !tokens[tokens.length - 1].endsWith("|")) {
        tokens.push("|");
      }
      continue;
    } else if (word === "not") {
      // Apply NOT to next term
      const nextWord = words[++i];
      if (nextWord) {
        tokens.push("!" + escapeTsQueryTerm(nextWord) + ":*");
      }
      continue;
    } else if (word.startsWith("-")) {
      // Alternative NOT syntax
      const term = word.slice(1);
      if (term) {
        tokens.push("!" + escapeTsQueryTerm(term) + ":*");
      }
      continue;
    } else if (word.endsWith("*")) {
      // Explicit prefix search
      const term = word.slice(0, -1);
      if (term) {
        tokens.push(escapeTsQueryTerm(term) + ":*");
      }
      continue;
    } else {
      // Regular term with prefix matching
      tokens.push(escapeTsQueryTerm(word) + ":*");
    }
  }

  // Add phrases (exact word sequences)
  for (const phrase of phrases) {
    const phraseWords = phrase.split(/\s+/).filter(Boolean);
    if (phraseWords.length > 0) {
      const phraseTsquery = phraseWords
        .map((w) => escapeTsQueryTerm(w))
        .join(" <-> ");
      tokens.push("(" + phraseTsquery + ")");
    }
  }

  // Join tokens with AND by default
  return tokens.join(" & ");
}

/**
 * Escape a term for use in tsquery
 *
 * @param term - Term to escape
 * @returns Escaped term safe for tsquery
 */
function escapeTsQueryTerm(term: string): string {
  // Remove characters that are special in tsquery
  return term.replace(/[&|!():*<>']/g, "");
}

/**
 * Build a SQL query for full-text search on a Person table
 *
 * @param tsquery - The tsquery string from buildTsQuery
 * @param config - Search configuration
 * @returns SQL query string with parameters
 */
export function buildPersonSearchQuery(
  tsquery: string,
  config: SearchConfig = {}
): {
  sql: string;
  params: unknown[];
} {
  const {
    language = "english",
    limit = 20,
    offset = 0,
    highlight = false,
  } = config;

  const highlightSnippets = highlight
    ? `,
      ts_headline($1::regconfig, "firstName" || ' ' || "lastName", query, 'StartSel=<mark>, StopSel=</mark>') as name_highlight,
      ts_headline($1::regconfig, COALESCE(bio, ''), query, 'StartSel=<mark>, StopSel=</mark>, MaxWords=50') as bio_highlight`
    : "";

  const sql = `
    WITH query AS (
      SELECT to_tsquery($1::regconfig, $2) AS query
    )
    SELECT
      p.*,
      ts_rank_cd(
        setweight(to_tsvector($1::regconfig, COALESCE(p."firstName", '')), 'A') ||
        setweight(to_tsvector($1::regconfig, COALESCE(p."lastName", '')), 'A') ||
        setweight(to_tsvector($1::regconfig, COALESCE(p."maidenName", '')), 'B') ||
        setweight(to_tsvector($1::regconfig, COALESCE(p.bio, '')), 'C'),
        query.query
      ) AS rank
      ${highlightSnippets}
    FROM "Person" p, query
    WHERE (
      setweight(to_tsvector($1::regconfig, COALESCE(p."firstName", '')), 'A') ||
      setweight(to_tsvector($1::regconfig, COALESCE(p."lastName", '')), 'A') ||
      setweight(to_tsvector($1::regconfig, COALESCE(p."maidenName", '')), 'B') ||
      setweight(to_tsvector($1::regconfig, COALESCE(p.bio, '')), 'C')
    ) @@ query.query
    ORDER BY rank DESC
    LIMIT $3 OFFSET $4
  `;

  return {
    sql,
    params: [language, tsquery, limit, offset],
  };
}

/**
 * Build a SQL query for counting total search results
 *
 * @param tsquery - The tsquery string
 * @param config - Search configuration
 * @returns SQL query for counting
 */
export function buildPersonSearchCountQuery(
  tsquery: string,
  config: SearchConfig = {}
): {
  sql: string;
  params: unknown[];
} {
  const { language = "english" } = config;

  const sql = `
    SELECT COUNT(*) as total
    FROM "Person" p
    WHERE (
      setweight(to_tsvector($1::regconfig, COALESCE(p."firstName", '')), 'A') ||
      setweight(to_tsvector($1::regconfig, COALESCE(p."lastName", '')), 'A') ||
      setweight(to_tsvector($1::regconfig, COALESCE(p."maidenName", '')), 'B') ||
      setweight(to_tsvector($1::regconfig, COALESCE(p.bio, '')), 'C')
    ) @@ to_tsquery($1::regconfig, $2)
  `;

  return {
    sql,
    params: [language, tsquery],
  };
}

/**
 * Build a fuzzy search query using pg_trgm
 *
 * Requires pg_trgm extension: CREATE EXTENSION IF NOT EXISTS pg_trgm;
 *
 * @param searchTerm - Term to search for
 * @param config - Search configuration
 * @returns SQL query for fuzzy search
 */
export function buildFuzzyPersonSearchQuery(
  searchTerm: string,
  config: SearchConfig = {}
): {
  sql: string;
  params: unknown[];
} {
  const { fuzzyThreshold = 0.3, limit = 20, offset = 0 } = config;

  const sanitized = sanitizeQuery(searchTerm);

  const sql = `
    SELECT
      p.*,
      GREATEST(
        similarity(p."firstName", $1),
        similarity(p."lastName", $1),
        similarity(COALESCE(p."maidenName", ''), $1)
      ) AS similarity_score
    FROM "Person" p
    WHERE
      similarity(p."firstName", $1) > $2 OR
      similarity(p."lastName", $1) > $2 OR
      similarity(COALESCE(p."maidenName", ''), $1) > $2
    ORDER BY similarity_score DESC
    LIMIT $3 OFFSET $4
  `;

  return {
    sql,
    params: [sanitized, fuzzyThreshold, limit, offset],
  };
}

/**
 * Build a combined search query that uses both FTS and fuzzy matching
 *
 * This provides the best of both worlds:
 * - Full-text search for semantic matching
 * - Fuzzy matching for typo tolerance
 *
 * @param query - User search query
 * @param config - Search configuration
 */
export function buildCombinedSearchQuery(
  query: string,
  config: SearchConfig = {}
): {
  sql: string;
  params: unknown[];
} {
  const {
    language = "english",
    fuzzyThreshold = 0.3,
    limit = 20,
    offset = 0,
  } = config;

  const sanitized = sanitizeQuery(query);
  const tsquery = buildTsQuery(query, config);

  // If we can't build a tsquery, fall back to fuzzy only
  if (!tsquery) {
    return buildFuzzyPersonSearchQuery(sanitized, config);
  }

  const sql = `
    WITH fts_results AS (
      SELECT
        p.id,
        ts_rank_cd(
          setweight(to_tsvector($1::regconfig, COALESCE(p."firstName", '')), 'A') ||
          setweight(to_tsvector($1::regconfig, COALESCE(p."lastName", '')), 'A') ||
          setweight(to_tsvector($1::regconfig, COALESCE(p."maidenName", '')), 'B') ||
          setweight(to_tsvector($1::regconfig, COALESCE(p.bio, '')), 'C'),
          to_tsquery($1::regconfig, $2)
        ) * 2 AS score  -- Weight FTS results higher
      FROM "Person" p
      WHERE (
        setweight(to_tsvector($1::regconfig, COALESCE(p."firstName", '')), 'A') ||
        setweight(to_tsvector($1::regconfig, COALESCE(p."lastName", '')), 'A') ||
        setweight(to_tsvector($1::regconfig, COALESCE(p."maidenName", '')), 'B') ||
        setweight(to_tsvector($1::regconfig, COALESCE(p.bio, '')), 'C')
      ) @@ to_tsquery($1::regconfig, $2)
    ),
    fuzzy_results AS (
      SELECT
        p.id,
        GREATEST(
          similarity(p."firstName", $3),
          similarity(p."lastName", $3),
          similarity(COALESCE(p."maidenName", ''), $3)
        ) AS score
      FROM "Person" p
      WHERE
        similarity(p."firstName", $3) > $4 OR
        similarity(p."lastName", $3) > $4 OR
        similarity(COALESCE(p."maidenName", ''), $3) > $4
    ),
    combined AS (
      SELECT id, MAX(score) as score
      FROM (
        SELECT * FROM fts_results
        UNION ALL
        SELECT * FROM fuzzy_results
      ) all_results
      GROUP BY id
    )
    SELECT p.*, c.score as rank
    FROM "Person" p
    JOIN combined c ON p.id = c.id
    ORDER BY c.score DESC
    LIMIT $5 OFFSET $6
  `;

  return {
    sql,
    params: [language, tsquery, sanitized, fuzzyThreshold, limit, offset],
  };
}

/**
 * Search fields configuration for different entity types
 */
export const SEARCH_FIELD_WEIGHTS = {
  Person: {
    firstName: "A",
    lastName: "A",
    maidenName: "B",
    bio: "C",
    profession: "D",
  },
  Place: {
    name: "A",
    description: "B",
  },
  Event: {
    description: "A",
    place: "B",
  },
  Source: {
    title: "A",
    author: "B",
    description: "C",
  },
} as const;

/**
 * SQL to create the pg_trgm extension (must be run by superuser)
 */
export const CREATE_TRGM_EXTENSION_SQL = `
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
`;

/**
 * SQL to create a GIN index for full-text search on Person table
 */
export const CREATE_PERSON_SEARCH_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS person_fts_idx ON "Person" USING gin(
    (
      setweight(to_tsvector('english', COALESCE("firstName", '')), 'A') ||
      setweight(to_tsvector('english', COALESCE("lastName", '')), 'A') ||
      setweight(to_tsvector('english', COALESCE("maidenName", '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(bio, '')), 'C')
    )
  );
`;

/**
 * SQL to create a GIN index for trigram similarity search on Person table
 */
export const CREATE_PERSON_TRGM_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS person_trgm_firstname_idx ON "Person" USING gin("firstName" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS person_trgm_lastname_idx ON "Person" USING gin("lastName" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS person_trgm_maidenname_idx ON "Person" USING gin("maidenName" gin_trgm_ops);
`;
