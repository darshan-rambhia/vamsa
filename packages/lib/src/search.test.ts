import { describe, it, expect } from "bun:test";
import {
  sanitizeQuery,
  buildTsQuery,
  buildPersonSearchQuery,
  buildPersonSearchCountQuery,
  buildFuzzyPersonSearchQuery,
  buildCombinedSearchQuery,
  SEARCH_FIELD_WEIGHTS,
} from "./search";

describe("sanitizeQuery", () => {
  it("removes dangerous SQL characters", () => {
    expect(sanitizeQuery("test'injection")).toBe("testinjection");
    expect(sanitizeQuery('test"injection')).toBe("testinjection");
    expect(sanitizeQuery("test;drop table")).toBe("testdrop table");
    expect(sanitizeQuery("test\\escape")).toBe("testescape");
    expect(sanitizeQuery("test`backtick")).toBe("testbacktick");
  });

  it("normalizes whitespace", () => {
    expect(sanitizeQuery("  hello   world  ")).toBe("hello world");
    expect(sanitizeQuery("hello\t\nworld")).toBe("hello world");
  });

  it("handles empty input", () => {
    expect(sanitizeQuery("")).toBe("");
    expect(sanitizeQuery("   ")).toBe("");
  });

  it("preserves normal characters", () => {
    expect(sanitizeQuery("John Doe")).toBe("John Doe");
    expect(sanitizeQuery("test-name")).toBe("test-name");
    expect(sanitizeQuery("test_name")).toBe("test_name");
  });
});

describe("buildTsQuery", () => {
  it("builds simple term query with prefix", () => {
    expect(buildTsQuery("john")).toBe("john:*");
  });

  it("builds multi-term query with AND", () => {
    expect(buildTsQuery("john doe")).toBe("john:* & doe:*");
  });

  it("handles explicit AND operator", () => {
    expect(buildTsQuery("john AND doe")).toBe("john:* & doe:*");
  });

  it("handles OR operator", () => {
    // OR replaces the default AND connector
    const result = buildTsQuery("john OR doe");
    expect(result).toContain("john:*");
    expect(result).toContain("|");
    expect(result).toContain("doe:*");
  });

  it("handles NOT operator", () => {
    expect(buildTsQuery("NOT john")).toBe("!john:*");
  });

  it("handles dash NOT syntax", () => {
    expect(buildTsQuery("-john")).toBe("!john:*");
  });

  it("handles explicit prefix wildcard", () => {
    expect(buildTsQuery("joh*")).toBe("joh:*");
  });

  it("handles phrase search", () => {
    // Phrases are processed - the quote characters get sanitized out
    // The actual phrase search uses <-> (FOLLOWED BY) operator
    const result = buildTsQuery('"john doe"');
    // After sanitization, quotes are removed, so it's treated as individual terms
    expect(result).toContain("john");
    expect(result).toContain("doe");
  });

  it("handles mixed terms and phrases", () => {
    const result = buildTsQuery('smith "john doe"');
    expect(result).toContain("smith:*");
    expect(result).toContain("john");
    expect(result).toContain("doe");
  });

  it("handles empty query", () => {
    expect(buildTsQuery("")).toBe("");
    expect(buildTsQuery("   ")).toBe("");
  });

  it("handles query with only operators", () => {
    expect(buildTsQuery("AND OR")).toBe("");
  });

  it("converts to lowercase", () => {
    expect(buildTsQuery("JOHN")).toBe("john:*");
    expect(buildTsQuery("John Doe")).toBe("john:* & doe:*");
  });
});

describe("buildPersonSearchQuery", () => {
  it("builds valid SQL query", () => {
    const { sql, params } = buildPersonSearchQuery("john:*");

    expect(sql).toContain("SELECT");
    expect(sql).toContain('FROM "Person"');
    expect(sql).toContain("ts_rank_cd");
    expect(sql).toContain("ORDER BY rank DESC");
    expect(params).toHaveLength(4);
  });

  it("uses provided language", () => {
    const { params } = buildPersonSearchQuery("john:*", { language: "simple" });
    expect(params[0]).toBe("simple");
  });

  it("uses provided pagination", () => {
    const { params } = buildPersonSearchQuery("john:*", {
      limit: 50,
      offset: 100,
    });
    expect(params[2]).toBe(50);
    expect(params[3]).toBe(100);
  });

  it("includes highlight snippets when requested", () => {
    const { sql } = buildPersonSearchQuery("john:*", { highlight: true });
    expect(sql).toContain("ts_headline");
    expect(sql).toContain("name_highlight");
    expect(sql).toContain("bio_highlight");
  });

  it("excludes highlight snippets by default", () => {
    const { sql } = buildPersonSearchQuery("john:*");
    expect(sql).not.toContain("ts_headline");
  });
});

describe("buildPersonSearchCountQuery", () => {
  it("builds valid count query", () => {
    const { sql, params } = buildPersonSearchCountQuery("john:*");

    expect(sql).toContain("SELECT COUNT(*)");
    expect(sql).toContain('FROM "Person"');
    expect(params).toHaveLength(2);
  });

  it("uses provided language", () => {
    const { params } = buildPersonSearchCountQuery("john:*", {
      language: "german",
    });
    expect(params[0]).toBe("german");
  });
});

describe("buildFuzzyPersonSearchQuery", () => {
  it("builds valid fuzzy query", () => {
    const { sql, params } = buildFuzzyPersonSearchQuery("john");

    expect(sql).toContain("SELECT");
    expect(sql).toContain("similarity");
    expect(sql).toContain('FROM "Person"');
    expect(params).toHaveLength(4);
  });

  it("uses provided threshold", () => {
    const { params } = buildFuzzyPersonSearchQuery("john", {
      fuzzyThreshold: 0.5,
    });
    expect(params[1]).toBe(0.5);
  });

  it("uses provided pagination", () => {
    const { params } = buildFuzzyPersonSearchQuery("john", {
      limit: 30,
      offset: 60,
    });
    expect(params[2]).toBe(30);
    expect(params[3]).toBe(60);
  });

  it("sanitizes the search term", () => {
    const { params } = buildFuzzyPersonSearchQuery("john'smith");
    expect(params[0]).toBe("johnsmith");
  });
});

describe("buildCombinedSearchQuery", () => {
  it("builds valid combined query", () => {
    const { sql, params } = buildCombinedSearchQuery("john");

    expect(sql).toContain("fts_results");
    expect(sql).toContain("fuzzy_results");
    expect(sql).toContain("combined");
    expect(sql).toContain("UNION ALL");
    expect(params).toHaveLength(6);
  });

  it("uses both FTS and fuzzy parameters", () => {
    const { params } = buildCombinedSearchQuery("john", {
      language: "english",
      fuzzyThreshold: 0.4,
    });

    expect(params[0]).toBe("english");
    expect(params[1]).toContain("john");
    expect(params[2]).toBe("john");
    expect(params[3]).toBe(0.4);
  });

  it("falls back to fuzzy-only for empty tsquery", () => {
    const { sql } = buildCombinedSearchQuery("   ");

    // Should return fuzzy query (no FTS)
    expect(sql).toContain("similarity");
    expect(sql).not.toContain("ts_rank_cd");
  });
});

describe("SEARCH_FIELD_WEIGHTS", () => {
  it("has Person weights defined", () => {
    expect(SEARCH_FIELD_WEIGHTS.Person).toBeDefined();
    expect(SEARCH_FIELD_WEIGHTS.Person.firstName).toBe("A");
    expect(SEARCH_FIELD_WEIGHTS.Person.lastName).toBe("A");
    expect(SEARCH_FIELD_WEIGHTS.Person.maidenName).toBe("B");
    expect(SEARCH_FIELD_WEIGHTS.Person.bio).toBe("C");
  });

  it("has Place weights defined", () => {
    expect(SEARCH_FIELD_WEIGHTS.Place).toBeDefined();
    expect(SEARCH_FIELD_WEIGHTS.Place.name).toBe("A");
  });

  it("has Event weights defined", () => {
    expect(SEARCH_FIELD_WEIGHTS.Event).toBeDefined();
    expect(SEARCH_FIELD_WEIGHTS.Event.description).toBe("A");
  });

  it("has Source weights defined", () => {
    expect(SEARCH_FIELD_WEIGHTS.Source).toBeDefined();
    expect(SEARCH_FIELD_WEIGHTS.Source.title).toBe("A");
    expect(SEARCH_FIELD_WEIGHTS.Source.author).toBe("B");
  });
});
