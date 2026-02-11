import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchPeopleTool } from "./search";
import { getPersonDetailsTool } from "./person";
import { findAncestorsTool } from "./ancestors";
import { findDescendantsTool } from "./descendants";
import {
  findCommonAncestorTool,
  findRelationshipPathTool,
} from "./relationships";
import { chatTools, storyTools, suggestTools } from "./index";

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.VAMSA_APP_URL = "http://test-app:3000";
});

afterEach(() => {
  delete process.env.VAMSA_APP_URL;
});

// ============================================
// Tool set composition
// ============================================

describe("tool sets", () => {
  it("should export chatTools with all 6 tools", () => {
    expect(Object.keys(chatTools)).toEqual([
      "search_people",
      "get_person_details",
      "find_ancestors",
      "find_descendants",
      "find_relationship_path",
      "find_common_ancestor",
    ]);
  });

  it("should export storyTools with 4 read-only tools", () => {
    expect(Object.keys(storyTools)).toEqual([
      "search_people",
      "get_person_details",
      "find_ancestors",
      "find_descendants",
    ]);
  });

  it("should export suggestTools with 4 tools", () => {
    expect(Object.keys(suggestTools)).toEqual([
      "get_person_details",
      "find_ancestors",
      "find_descendants",
      "search_people",
    ]);
  });
});

// ============================================
// searchPeopleTool
// ============================================

describe("searchPeopleTool", () => {
  it("should search with query and return results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            { id: "p1", firstName: "Hari", lastName: "Prasad" },
            { id: "p2", firstName: "Hari", lastName: "Kumar" },
          ],
          total: 2,
        }),
        { status: 200 }
      )
    );

    const result = await searchPeopleTool.execute!(
      { query: "Hari", limit: 10 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({
      results: [
        { id: "p1", firstName: "Hari", lastName: "Prasad" },
        { id: "p2", firstName: "Hari", lastName: "Kumar" },
      ],
      total: 2,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("http://test-app:3000/api/v1/persons?"),
      expect.anything()
    );
  });

  it("should use 'results' key as fallback when 'items' is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [{ id: "p1" }], total: 1 }), {
        status: 200,
      })
    );

    const result = await searchPeopleTool.execute!(
      { query: "Test", limit: 5 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ results: [{ id: "p1" }], total: 1 });
  });

  it("should return error on HTTP failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 500 })
    );

    const result = await searchPeopleTool.execute!(
      { query: "Hari", limit: 10 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Search failed: HTTP 500" });
  });

  it("should return error on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Connection refused")
    );

    const result = await searchPeopleTool.execute!(
      { query: "Test", limit: 10 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Search failed: Connection refused" });
  });

  it("should handle non-Error thrown values", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce("timeout string");

    const result = await searchPeopleTool.execute!(
      { query: "Test", limit: 10 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Search failed: timeout string" });
  });

  it("should return empty results when response has neither items nor results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ count: 0 }), { status: 200 })
    );

    const result = await searchPeopleTool.execute!(
      { query: "Nobody", limit: 10 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ results: [], total: 0 });
  });

  it("should pass query and limit as URL parameters", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })
    );

    await searchPeopleTool.execute!(
      { query: "Lakshmi", limit: 5 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    const calledURL = vi.mocked(fetch).mock.calls[0][0] as string;
    const url = new URL(calledURL);
    expect(url.searchParams.get("q")).toBe("Lakshmi");
    expect(url.searchParams.get("limit")).toBe("5");
  });
});

// ============================================
// getPersonDetailsTool
// ============================================

describe("getPersonDetailsTool", () => {
  it("should fetch person details by ID", async () => {
    const personData = {
      id: "p-123",
      firstName: "Hari",
      lastName: "Prasad",
      dateOfBirth: "1945-03-15",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(personData), { status: 200 })
    );

    const result = await getPersonDetailsTool.execute!(
      { personId: "p-123" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual(personData);
    expect(fetch).toHaveBeenCalledWith(
      "http://test-app:3000/api/v1/persons/p-123",
      expect.anything()
    );
  });

  it("should return error when person is not found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 404 })
    );

    const result = await getPersonDetailsTool.execute!(
      { personId: "nonexistent" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Person lookup failed: HTTP 404" });
  });

  it("should return error on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("ECONNREFUSED")
    );

    const result = await getPersonDetailsTool.execute!(
      { personId: "p-123" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Person lookup failed: ECONNREFUSED" });
  });

  it("should handle non-Error thrown values", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(42);

    const result = await getPersonDetailsTool.execute!(
      { personId: "p-123" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Person lookup failed: 42" });
  });
});

// ============================================
// findAncestorsTool
// ============================================

describe("findAncestorsTool", () => {
  it("should fetch ancestors with generation limit", async () => {
    const ancestorData = {
      ancestors: [
        { id: "p-001", firstName: "Father", generation: 1 },
        { id: "p-002", firstName: "Grandfather", generation: 2 },
      ],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(ancestorData), { status: 200 })
    );

    const result = await findAncestorsTool.execute!(
      { personId: "p-123", maxGenerations: 3 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual(ancestorData);

    const calledURL = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledURL).toContain("/api/v1/persons/p-123/ancestors");
    expect(calledURL).toContain("generations=3");
  });

  it("should return error on HTTP failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 500 })
    );

    const result = await findAncestorsTool.execute!(
      { personId: "p-123", maxGenerations: 5 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Ancestor lookup failed: HTTP 500" });
  });

  it("should return error on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Timeout"));

    const result = await findAncestorsTool.execute!(
      { personId: "p-123", maxGenerations: 5 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Ancestor lookup failed: Timeout" });
  });

  it("should handle non-Error thrown values", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(undefined);

    const result = await findAncestorsTool.execute!(
      { personId: "p-123", maxGenerations: 5 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Ancestor lookup failed: undefined" });
  });
});

// ============================================
// findDescendantsTool
// ============================================

describe("findDescendantsTool", () => {
  it("should fetch descendants with generation limit", async () => {
    const descendantData = {
      descendants: [{ id: "p-200", firstName: "Son", generation: 1 }],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(descendantData), { status: 200 })
    );

    const result = await findDescendantsTool.execute!(
      { personId: "p-123", maxGenerations: 2 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual(descendantData);

    const calledURL = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledURL).toContain("/api/v1/persons/p-123/descendants");
    expect(calledURL).toContain("generations=2");
  });

  it("should return error on HTTP failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 403 })
    );

    const result = await findDescendantsTool.execute!(
      { personId: "p-123", maxGenerations: 5 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Descendant lookup failed: HTTP 403" });
  });

  it("should return error on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("DNS resolution failed")
    );

    const result = await findDescendantsTool.execute!(
      { personId: "p-123", maxGenerations: 5 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({
      error: "Descendant lookup failed: DNS resolution failed",
    });
  });

  it("should handle non-Error thrown values", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(null);

    const result = await findDescendantsTool.execute!(
      { personId: "p-123", maxGenerations: 5 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Descendant lookup failed: null" });
  });
});

// ============================================
// findRelationshipPathTool
// ============================================

describe("findRelationshipPathTool", () => {
  it("should find relationship path between two people", async () => {
    const pathData = {
      path: [
        { from: "p-1", to: "p-2", relationship: "parent" },
        { from: "p-2", to: "p-3", relationship: "parent" },
      ],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(pathData), { status: 200 })
    );

    const result = await findRelationshipPathTool.execute!(
      { fromPersonId: "p-1", toPersonId: "p-3" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual(pathData);

    const calledURL = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledURL).toContain("/api/v1/relationships/path");
    expect(calledURL).toContain("from=p-1");
    expect(calledURL).toContain("to=p-3");
  });

  it("should return error on HTTP failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 500 })
    );

    const result = await findRelationshipPathTool.execute!(
      { fromPersonId: "p-1", toPersonId: "p-2" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Path lookup failed: HTTP 500" });
  });

  it("should return error on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Request timed out")
    );

    const result = await findRelationshipPathTool.execute!(
      { fromPersonId: "p-1", toPersonId: "p-2" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Path lookup failed: Request timed out" });
  });

  it("should handle non-Error thrown values", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(false);

    const result = await findRelationshipPathTool.execute!(
      { fromPersonId: "p-1", toPersonId: "p-2" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Path lookup failed: false" });
  });
});

// ============================================
// findCommonAncestorTool
// ============================================

describe("findCommonAncestorTool", () => {
  it("should find common ancestor of two people", async () => {
    const ancestorData = {
      commonAncestor: { id: "p-50", firstName: "Grandfather" },
      person1Distance: 2,
      person2Distance: 3,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(ancestorData), { status: 200 })
    );

    const result = await findCommonAncestorTool.execute!(
      { personId1: "p-100", personId2: "p-200" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual(ancestorData);

    const calledURL = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledURL).toContain("/api/v1/relationships/common-ancestor");
    expect(calledURL).toContain("person1=p-100");
    expect(calledURL).toContain("person2=p-200");
  });

  it("should return error on HTTP failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 500 })
    );

    const result = await findCommonAncestorTool.execute!(
      { personId1: "p-1", personId2: "p-2" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({
      error: "Common ancestor lookup failed: HTTP 500",
    });
  });

  it("should return error on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ETIMEDOUT"));

    const result = await findCommonAncestorTool.execute!(
      { personId1: "p-1", personId2: "p-2" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({
      error: "Common ancestor lookup failed: ETIMEDOUT",
    });
  });

  it("should handle non-Error thrown values", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(0);

    const result = await findCommonAncestorTool.execute!(
      { personId1: "p-1", personId2: "p-2" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as any }
    );

    expect(result).toEqual({ error: "Common ancestor lookup failed: 0" });
  });
});
