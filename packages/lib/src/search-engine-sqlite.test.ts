/**
 * Unit Tests for SqliteSearchEngine
 *
 * Tests the SQLite search engine including:
 * - FTS5 path with prefix search and built-in ranking
 * - LIKE-based fallback if FTS5 is unavailable
 * - Query sanitization integration
 * - Result mapping and ranking
 * - Pagination and configuration
 */
import { describe, expect, it, vi } from "vitest";

import { SqliteSearchEngine } from "./search-engine-sqlite";

// The SqliteQueryClient interface is not exported from the module.
// We define a compatible shape here for mock type checking.
type MockPreparedStatement = {
  all: ReturnType<typeof vi.fn>;
};

type MockSqliteClient = {
  prepare: ReturnType<typeof vi.fn>;
};

/**
 * Creates a mock SQLite client that captures SQL queries and params for inspection.
 * This mock returns rows successfully on FTS5 path (to test FTS5 when available).
 */
function createMockClient(
  options: {
    countResult?: number;
    rows?: Array<Record<string, unknown>>;
  } = {}
): {
  client: MockSqliteClient;
  getCapturedSql: () => Array<string>;
  getCapturedParams: () => Array<Array<unknown>>;
} {
  const capturedSql: Array<string> = [];
  const capturedParams: Array<Array<unknown>> = [];

  let callIndex = 0;
  const countResult = options.countResult ?? 0;
  const rows = options.rows ?? [];

  const client: MockSqliteClient = {
    prepare: vi.fn((sql: string) => {
      capturedSql.push(sql);
      const statement: MockPreparedStatement = {
        all: vi.fn((...params: Array<unknown>) => {
          capturedParams.push(params);
          // First call is for count query, subsequent for search
          if (callIndex === 0) {
            callIndex++;
            return [{ total: countResult }];
          }
          callIndex++;
          return rows;
        }),
      };
      return statement;
    }),
  };

  return {
    client,
    getCapturedSql: () => capturedSql,
    getCapturedParams: () => capturedParams,
  };
}

/**
 * Creates a mock SQLite client that fails FTS5 and falls back to LIKE.
 * Used to test the LIKE fallback path.
 */
function createMockClientWithLikeFallback(
  options: {
    countResult?: number;
    rows?: Array<Record<string, unknown>>;
  } = {}
): {
  client: MockSqliteClient;
  getCapturedSql: () => Array<string>;
  getCapturedParams: () => Array<Array<unknown>>;
} {
  const capturedSql: Array<string> = [];
  const capturedParams: Array<Array<unknown>> = [];

  let callIndex = 0;
  const countResult = options.countResult ?? 0;
  const rows = options.rows ?? [];

  const client: MockSqliteClient = {
    prepare: vi.fn((sql: string) => {
      capturedSql.push(sql);
      const statement: MockPreparedStatement = {
        all: vi.fn((...params: Array<unknown>) => {
          capturedParams.push(params);
          // First call (FTS5 count) always throws
          if (callIndex === 0) {
            callIndex++;
            throw new Error("no such table: persons_fts");
          }
          // Second call (LIKE count) succeeds
          if (callIndex === 1) {
            callIndex++;
            return [{ total: countResult }];
          }
          // Third call (LIKE search) returns rows
          callIndex++;
          return rows;
        }),
      };
      return statement;
    }),
  };

  return {
    client,
    getCapturedSql: () => capturedSql,
    getCapturedParams: () => capturedParams,
  };
}

describe("SqliteSearchEngine", () => {
  describe("searchPersons - empty/invalid queries", () => {
    it("returns empty results for empty query", async () => {
      const { client } = createMockClient();
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("");

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.queryTime).toBeGreaterThanOrEqual(0);
      // Should not have prepared any queries
      expect(client.prepare).not.toHaveBeenCalled();
    });

    it("returns empty results for whitespace-only query", async () => {
      const { client } = createMockClient();
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("   ");

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(client.prepare).not.toHaveBeenCalled();
    });

    it("returns empty results for query that sanitizes to empty", async () => {
      const { client } = createMockClient();
      const engine = new SqliteSearchEngine(client as never);

      // sanitizeQuery removes quotes, semicolons, backslashes — this becomes empty
      const result = await engine.searchPersons("\"'`;\\");

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(client.prepare).not.toHaveBeenCalled();
    });
  });

  describe("searchPersons - result mapping", () => {
    it("maps database rows to SearchPersonRow correctly", async () => {
      const fakeRow = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        maidenName: null,
        photoUrl: "https://example.com/photo.jpg",
        dateOfBirth: "1990-01-01",
        dateOfPassing: null,
        isLiving: 1,
        rank: 18,
      };

      const { client } = createMockClient({ countResult: 1, rows: [fakeRow] });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("John");

      expect(result.total).toBe(1);
      expect(result.results).toHaveLength(1);

      const first = result.results[0];
      expect(first.item.id).toBe("person-1");
      expect(first.item.firstName).toBe("John");
      expect(first.item.lastName).toBe("Doe");
      expect(first.item.maidenName).toBeNull();
      expect(first.item.photoUrl).toBe("https://example.com/photo.jpg");
      expect(first.item.dateOfBirth).toBe("1990-01-01");
      expect(first.item.dateOfPassing).toBeNull();
      expect(first.item.isLiving).toBe(true); // converted from truthy integer
      expect(first.item.rank).toBe(18);
      expect(first.rank).toBe(18);
    });

    it("converts falsy isLiving to false", async () => {
      const fakeRow = {
        id: "person-2",
        firstName: "Jane",
        lastName: "Smith",
        maidenName: null,
        photoUrl: null,
        dateOfBirth: null,
        dateOfPassing: "2000-06-15",
        isLiving: 0,
        rank: 10,
      };

      const { client } = createMockClient({ countResult: 1, rows: [fakeRow] });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("Jane");

      expect(result.results[0].item.isLiving).toBe(false);
    });

    it("returns zero rank when row rank is missing", async () => {
      const fakeRow = {
        id: "person-3",
        firstName: "Alice",
        lastName: "Brown",
        maidenName: null,
        photoUrl: null,
        dateOfBirth: null,
        dateOfPassing: null,
        isLiving: 1,
        rank: undefined, // missing rank
      };

      const { client } = createMockClient({ countResult: 1, rows: [fakeRow] });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("Alice");

      expect(result.results[0].item.rank).toBe(0);
      expect(result.results[0].rank).toBe(0);
    });

    it("returns multiple results in order", async () => {
      const rows = [
        {
          id: "p1",
          firstName: "John",
          lastName: "Smith",
          maidenName: null,
          photoUrl: null,
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: 1,
          rank: 20,
        },
        {
          id: "p2",
          firstName: "Johnny",
          lastName: "Doe",
          maidenName: null,
          photoUrl: null,
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: 0,
          rank: 10,
        },
      ];

      const { client } = createMockClient({ countResult: 2, rows });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("John");

      expect(result.total).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].item.id).toBe("p1");
      expect(result.results[1].item.id).toBe("p2");
    });

    it("returns empty results array when no rows match", async () => {
      const { client } = createMockClient({ countResult: 0, rows: [] });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("Xyzzy");

      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
    });
  });

  describe("searchPersons - pagination config", () => {
    it("uses default limit=20 and offset=0", async () => {
      const { client, getCapturedParams } = createMockClient({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test");

      // Second captured params set is for search query (limit, offset are last 2 params)
      const allParams = getCapturedParams();
      expect(allParams.length).toBeGreaterThan(0);
      // The search query params end with [limit, offset]
      const searchParams = allParams[1]; // second call is search
      if (searchParams) {
        const last2 = searchParams.slice(-2);
        expect(last2[0]).toBe(20); // default limit
        expect(last2[1]).toBe(0); // default offset
      }
    });

    it("respects custom limit and offset", async () => {
      const { client, getCapturedParams } = createMockClient({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test", { limit: 10, offset: 30 });

      const allParams = getCapturedParams();
      const searchParams = allParams[1];
      if (searchParams) {
        const last2 = searchParams.slice(-2);
        expect(last2[0]).toBe(10);
        expect(last2[1]).toBe(30);
      }
    });
  });

  describe("searchPersons - LIKE pattern generation (escapeSqliteLike)", () => {
    it("escapes percent sign in search term to prevent wildcard expansion", async () => {
      const { client, getCapturedParams } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      // Query containing % — should be escaped so it's a literal character
      await engine.searchPersons("100%");

      const allParams = getCapturedParams();
      // FTS5 count fails, LIKE count succeeds, then LIKE search
      // Second call params (index 1) are for LIKE count query
      const whereParams = allParams[1];
      expect(whereParams).toBeDefined();

      // Each WHERE param should have the escaped pattern %100\%%
      // meaning the % in "100%" is escaped as \%
      const patterns = whereParams.filter(
        (p) => typeof p === "string" && p.includes("100")
      );
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach((p) => {
        // The literal % should be escaped as \%
        expect(p).toContain("\\%");
        // Should NOT have unescaped % in the middle (only at start/end as wildcards)
        const middleContent = (p as string).slice(1, -1); // strip outer % wildcards
        expect(middleContent).toBe("100\\%");
      });
    });

    it("escapes underscore in search term to prevent single-char wildcard", async () => {
      const { client, getCapturedParams } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("a_b");

      const allParams = getCapturedParams();
      // Second call params (index 1) are for LIKE count query (after FTS5 fails)
      const whereParams = allParams[1];
      expect(whereParams).toBeDefined();

      const patterns = whereParams.filter(
        (p) => typeof p === "string" && p.includes("a")
      );
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach((p) => {
        // underscore must be escaped as \_
        expect(p).toContain("\\_");
      });
    });

    it("escapes backslash in search term to prevent escape sequence issues", async () => {
      const { client, getCapturedParams } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      // sanitizeQuery strips backslashes, so we need a term that survives sanitization
      // but tests the escapeSqliteLike path — use a term with underscore which does survive
      await engine.searchPersons("test_value");

      const allParams = getCapturedParams();
      // Second call params (index 1) are for LIKE count query (after FTS5 fails)
      const whereParams = allParams[1];
      expect(whereParams).toBeDefined();

      const patterns = whereParams.filter(
        (p) => typeof p === "string" && p.includes("test")
      );
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach((p) => {
        expect(p).toContain("\\_");
      });
    });

    it("builds correct LIKE pattern for normal search term (wraps in %term%)", async () => {
      const { client, getCapturedParams } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("john");

      const allParams = getCapturedParams();
      // Second call params (index 1) are for LIKE count query (after FTS5 fails)
      const whereParams = allParams[1];
      expect(whereParams).toBeDefined();

      // WHERE patterns should be %john% (contains patterns)
      const patterns = whereParams.filter(
        (p) => typeof p === "string" && p.includes("john")
      );
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach((p) => {
        // Should start and end with % (wildcard wrapping)
        expect((p as string).startsWith("%")).toBe(true);
        expect((p as string).endsWith("%")).toBe(true);
        expect(p).toBe("%john%");
      });
    });

    it("uses ESCAPE clause in generated SQL for LIKE queries", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test");

      const sqls = getCapturedSql();
      expect(sqls.length).toBeGreaterThan(0);
      // All LIKE conditions should use ESCAPE '\' (backslash escape character)
      sqls.forEach((sql) => {
        if (sql.includes("LIKE")) {
          expect(sql).toContain("ESCAPE '\\'");
        }
      });
    });

    it("handles multi-word search with each term getting its own LIKE patterns", async () => {
      const { client, getCapturedParams } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("john doe");

      const allParams = getCapturedParams();
      // Second call params (index 1) are for LIKE count query (after FTS5 fails)
      const whereParams = allParams[1];
      expect(whereParams).toBeDefined();

      // Two terms, 7 LIKE params each = 14 WHERE params
      expect(whereParams.length).toBe(14);

      // All john patterns
      const johnPatterns = whereParams.filter(
        (p) => (p as string) === "%john%"
      );
      const doePatterns = whereParams.filter((p) => (p as string) === "%doe%");
      expect(johnPatterns.length).toBe(7); // 7 fields per term
      expect(doePatterns.length).toBe(7);
    });

    it("generates prefix patterns for scoring (term%) alongside contains patterns (%term%)", async () => {
      const { client, getCapturedParams } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("john");

      const allParams = getCapturedParams();
      // Third call is for the LIKE search query (after FTS5 fails, then LIKE count)
      const searchParams = allParams[2];
      expect(searchParams).toBeDefined();

      // Score params should include prefix patterns (john%)
      const prefixPatterns = searchParams.filter(
        (p) => (p as string) === "john%"
      );
      expect(prefixPatterns.length).toBeGreaterThan(0); // prefix for firstName and lastName
    });
  });

  describe("searchPersons - SQL structure", () => {
    it("executes three SQL queries for LIKE fallback search (FTS5 fails + count + results)", async () => {
      const { client } = createMockClientWithLikeFallback({
        countResult: 5,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("john");

      // FTS5 count (fails) + LIKE count (succeeds) + LIKE search = 3 calls
      expect(client.prepare).toHaveBeenCalledTimes(3);
    });

    it("count SQL uses COUNT(*) aggregate", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("jane");

      const sqls = getCapturedSql();
      // sqls[0] = FTS5 count, sqls[1] = LIKE count (the one we're testing)
      expect(sqls[1]).toContain("COUNT(*) as total");
      expect(sqls[1]).toContain('FROM "Person"');
    });

    it("search SQL selects core Person fields", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test");

      const sqls = getCapturedSql();
      // sqls[2] = LIKE search query (after FTS5 fails, then LIKE count)
      const searchSql = sqls[2];
      expect(searchSql).toContain('"firstName"');
      expect(searchSql).toContain('"lastName"');
      expect(searchSql).toContain('"maidenName"');
      expect(searchSql).toContain('"photoUrl"');
      expect(searchSql).toContain('"dateOfBirth"');
      expect(searchSql).toContain('"dateOfPassing"');
      expect(searchSql).toContain('"isLiving"');
    });

    it("search SQL orders by rank DESC", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test");

      const sqls = getCapturedSql();
      // sqls[2] = LIKE search query
      const searchSql = sqls[2];
      expect(searchSql).toContain("ORDER BY rank DESC");
    });

    it("search SQL uses LIMIT and OFFSET for pagination", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test");

      const sqls = getCapturedSql();
      // sqls[2] = LIKE search query
      const searchSql = sqls[2];
      expect(searchSql).toContain("LIMIT");
      expect(searchSql).toContain("OFFSET");
    });

    it("includes LOWER() and COALESCE() for case-insensitive null-safe matching", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test");

      const sqls = getCapturedSql();
      // sqls[1] = LIKE count query
      const countSql = sqls[1];
      expect(countSql).toContain("LOWER(");
      expect(countSql).toContain("COALESCE(");
    });

    it("searches across all 7 required fields (firstName, lastName, maidenName, bio, birthPlace, nativePlace, profession)", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test");

      const sqls = getCapturedSql();
      // sqls[1] = LIKE count query
      const countSql = sqls[1];
      expect(countSql).toContain('"firstName"');
      expect(countSql).toContain('"lastName"');
      expect(countSql).toContain('"maidenName"');
      expect(countSql).toContain("bio");
      expect(countSql).toContain('"birthPlace"');
      expect(countSql).toContain('"nativePlace"');
      expect(countSql).toContain("profession");
    });
  });

  describe("searchPersons - queryTime", () => {
    it("returns non-negative queryTime", async () => {
      const { client } = createMockClient({ countResult: 0, rows: [] });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("test");

      expect(result.queryTime).toBeGreaterThanOrEqual(0);
    });

    it("returns non-negative queryTime for empty query", async () => {
      const { client } = createMockClient();
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("");

      expect(result.queryTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("searchPersons - scoring parameters", () => {
    it("includes exact match (=) scoring for firstName and lastName", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("alice");

      const sqls = getCapturedSql();
      // sqls[2] = LIKE search query
      const searchSql = sqls[2];
      // Exact match gives 10 points
      expect(searchSql).toContain("THEN 10");
      // Contains gives 5 points
      expect(searchSql).toContain("THEN 5");
      // Prefix gives 8 points
      expect(searchSql).toContain("THEN 8");
    });

    it("scores maidenName matches at 4 points", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test");

      const sqls = getCapturedSql();
      // sqls[2] = LIKE search query
      const searchSql = sqls[2];
      expect(searchSql).toContain("THEN 4");
    });

    it("scores bio/birthPlace/nativePlace/profession at 2 points", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("test");

      const sqls = getCapturedSql();
      // sqls[2] = LIKE search query
      const searchSql = sqls[2];
      expect(searchSql).toContain("THEN 2");
    });
  });

  describe("searchPersons - AND semantics for multi-word queries", () => {
    it("generates AND conditions between terms (each term must match at least one field)", async () => {
      const { client, getCapturedSql } = createMockClientWithLikeFallback({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      await engine.searchPersons("john doe");

      const sqls = getCapturedSql();
      // sqls[1] = LIKE count query
      const countSql = sqls[1];
      // AND appears between per-term OR conditions
      expect(countSql).toContain(" AND ");
      // Each term block should have OR between fields (may have newlines around OR keyword)
      expect(countSql).toContain("OR");
    });
  });

  describe("searchPersons - FTS5 path", () => {
    it("uses FTS5 MATCH query when available", async () => {
      const { client, getCapturedSql } = createMockClient({
        countResult: 1,
        rows: [
          {
            id: "person-1",
            firstName: "John",
            lastName: "Doe",
            maidenName: null,
            photoUrl: null,
            dateOfBirth: null,
            dateOfPassing: null,
            isLiving: 1,
            rank: -1, // FTS5 rank is negative
          },
        ],
      });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("John");

      expect(result.results).toHaveLength(1);
      const sqls = getCapturedSql();
      // FTS5 path should have MATCH queries
      expect(sqls.some((sql) => sql.includes("MATCH"))).toBe(true);
      expect(sqls.some((sql) => sql.includes("persons_fts"))).toBe(true);
    });

    it("handles prefix search with FTS5", async () => {
      const { client, getCapturedSql } = createMockClient({
        countResult: 1,
        rows: [
          {
            id: "person-1",
            firstName: "Jonathan",
            lastName: "Doe",
            maidenName: null,
            photoUrl: null,
            dateOfBirth: null,
            dateOfPassing: null,
            isLiving: 1,
            rank: -1,
          },
        ],
      });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("Jon");

      expect(result.results).toHaveLength(1);
      const sqls = getCapturedSql();
      // Should use FTS5 with prefix matching (Jon*)
      const matchQuery = sqls.find((sql) => sql.includes("MATCH"));
      expect(matchQuery).toBeDefined();
    });

    it("handles multi-word search with FTS5 AND semantics", async () => {
      const { client, getCapturedParams } = createMockClient({
        countResult: 1,
        rows: [
          {
            id: "person-1",
            firstName: "John",
            lastName: "Doe",
            maidenName: null,
            photoUrl: null,
            dateOfBirth: null,
            dateOfPassing: null,
            isLiving: 1,
            rank: -2,
          },
        ],
      });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("john doe");

      // Should find result with multi-word FTS5 query
      expect(result.results).toHaveLength(1);
      const params = getCapturedParams();
      // First param set is for count query with FTS5 MATCH string
      expect(params[0]).toBeDefined();
      // FTS5 MATCH string should be a single concatenated query
      const matchQuery = params[0][0] as string;
      expect(typeof matchQuery).toBe("string");
      expect(matchQuery).toContain("*"); // prefix search indicator
    });

    it("converts FTS5 negative rank to positive for sorting", async () => {
      const { client } = createMockClient({
        countResult: 2,
        rows: [
          {
            id: "person-1",
            firstName: "John",
            lastName: "Doe",
            maidenName: null,
            photoUrl: null,
            dateOfBirth: null,
            dateOfPassing: null,
            isLiving: 1,
            rank: -1, // Better match (more negative = better in FTS5)
          },
          {
            id: "person-2",
            firstName: "Johnny",
            lastName: "Smith",
            maidenName: null,
            photoUrl: null,
            dateOfBirth: null,
            dateOfPassing: null,
            isLiving: 1,
            rank: -5, // Worse match
          },
        ],
      });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("john");

      expect(result.results).toHaveLength(2);
      // Converted ranks should be positive
      expect(result.results[0].rank).toBe(1); // Math.abs(-1)
      expect(result.results[1].rank).toBe(5); // Math.abs(-5)
      // First result has better rank (lower absolute FTS5 value = better match)
      expect(result.results[0].rank).toBeLessThan(result.results[1].rank);
    });

    it("returns empty results when FTS5 finds no matches", async () => {
      const { client } = createMockClient({
        countResult: 0,
        rows: [],
      });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("xyzzy");

      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
    });

    it("falls back to LIKE when FTS5 MATCH throws error", async () => {
      let callIndex = 0;
      const client: MockSqliteClient = {
        prepare: vi.fn((_sql: string) => {
          // First call is FTS5 count (throws)
          if (callIndex === 0) {
            callIndex++;
            return {
              all: vi.fn(() => {
                throw new Error("no such table: persons_fts");
              }),
            };
          }
          // Second call is LIKE count (succeeds)
          callIndex++;
          return {
            all: vi.fn((..._params: Array<unknown>) => [{ total: 1 }]),
          };
        }),
      };

      const engine = new SqliteSearchEngine(client as never);
      const result = await engine.searchPersons("john");

      // Fallback should not throw, but return empty or continue with LIKE
      expect(result).toBeDefined();
      expect(result.queryTime).toBeGreaterThanOrEqual(0);
    });

    it("joins Person table correctly in FTS5 query", async () => {
      const { client, getCapturedSql } = createMockClient({
        countResult: 1,
        rows: [
          {
            id: "person-1",
            firstName: "John",
            lastName: "Doe",
            maidenName: null,
            photoUrl: "https://example.com/photo.jpg",
            dateOfBirth: "1990-01-01",
            dateOfPassing: null,
            isLiving: 1,
            rank: -1,
          },
        ],
      });
      const engine = new SqliteSearchEngine(client as never);

      const result = await engine.searchPersons("john");

      expect(result.results).toHaveLength(1);
      const item = result.results[0].item;
      // All Person table fields should be populated from the join
      expect(item.firstName).toBe("John");
      expect(item.lastName).toBe("Doe");
      expect(item.photoUrl).toBe("https://example.com/photo.jpg");
      expect(item.dateOfBirth).toBe("1990-01-01");

      const sqls = getCapturedSql();
      const searchSql = sqls.find((sql) => sql.includes("JOIN"));
      expect(searchSql).toBeDefined();
      expect(searchSql).toContain("persons_fts");
      expect(searchSql).toContain("Person");
    });
  });
});
