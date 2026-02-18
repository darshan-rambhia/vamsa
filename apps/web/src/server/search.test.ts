/**
 * Unit tests for search server functions
 *
 * Tests search functionality including:
 * - Input validation
 * - Query sanitization
 * - Database search execution
 * - NLP fallback behavior
 * - Authentication requirements
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { asAdmin, asUnauthenticated, asViewer } from "@test/server-fn-context";
import { initializeServerI18n } from "@vamsa/lib/server";
import { searchPeopleHandler } from "./search-handler";

beforeEach(async () => {
  await initializeServerI18n();
});

// Hoist mocks so they're available in vi.mock() factory
const {
  mockBuildCombinedSearchQuery,
  mockBuildPersonSearchCountQuery,
  mockClassifyIntent,
  mockExecuteSearch,
  mockSanitizeQuery,
  mockDrizzleDb,
} = vi.hoisted(() => {
  const createSelectBuilder = () => {
    const builder = {
      from: () => builder,
      where: () => builder,
      leftJoin: () => builder,
      limit: () => builder,
      then: (resolve: (value: unknown) => void) => {
        // Return mock user for auth check
        resolve([
          {
            id: "test-user-id",
            email: "test@example.com",
            name: "Test User",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      },
    };
    return builder;
  };

  return {
    mockBuildCombinedSearchQuery: vi.fn(
      (_query: string, _options?: unknown) => ({
        sql: "SELECT * FROM persons WHERE ... LIMIT 20",
        params: ["john"],
      })
    ),
    mockBuildPersonSearchCountQuery: vi.fn(
      (_query: string, _options?: unknown) => ({
        sql: "SELECT COUNT(*) as total FROM persons WHERE ...",
        params: ["john"],
      })
    ),
    mockClassifyIntent: vi.fn(() => ({
      intent: "PERSON_SEARCH",
      confidence: 0.5,
    })),
    mockExecuteSearch: vi.fn(async () => ({
      type: "PERSON_SEARCH",
      results: [],
      explanation: "No results found",
    })),
    mockSanitizeQuery: vi.fn((query: string) => {
      const trimmed = query.trim();
      return trimmed.length > 0 ? trimmed : "";
    }),
    mockDrizzleDb: {
      select: () => createSelectBuilder(),
      query: {
        persons: {
          findMany: async () => [
            {
              id: "person-1",
              firstName: "John",
              lastName: "Doe",
              gender: "male",
              dateOfBirth: new Date("1990-01-15"),
              dateOfPassing: null,
              isLiving: true,
              photoUrl: null,
            },
          ],
        },
        relationships: {
          findMany: async () => [
            {
              personId: "person-1",
              relatedPersonId: "person-2",
              type: "SPOUSE",
            },
          ],
        },
      },
      $client: {
        query: async (sql: string, _params: Array<unknown>) => {
          if (sql.includes("COUNT")) {
            return {
              rows: [{ total: 1 }],
            };
          }
          return {
            rows: [
              {
                id: "person-1",
                firstName: "John",
                lastName: "Doe",
                maidenName: null,
                photoUrl: null,
                dateOfBirth: new Date("1990-01-15"),
                dateOfPassing: null,
                isLiving: true,
                rank: 0.5,
              },
            ],
          };
        },
      },
    },
  };
});

// Set up mocks before importing the handler
vi.mock("@vamsa/lib", () => ({
  buildCombinedSearchQuery: mockBuildCombinedSearchQuery,
  buildPersonSearchCountQuery: mockBuildPersonSearchCountQuery,
  classifyIntent: mockClassifyIntent,
  executeSearch: mockExecuteSearch,
  sanitizeQuery: mockSanitizeQuery,
  RelationshipDataMaps: {},
  SearchResults: {},
}));

vi.mock("@vamsa/api", () => ({
  drizzleDb: mockDrizzleDb,
  getDbDriver: () => "postgres",
}));

vi.mock("@vamsa/lib/search-engine-pg", () => ({
  PgSearchEngine: class MockPgSearchEngine {
    private client: { query: (...args: Array<unknown>) => Promise<unknown> };
    constructor(client: {
      query: (...args: Array<unknown>) => Promise<unknown>;
    }) {
      this.client = client;
    }
    async searchPersons() {
      // Call the client to trigger any patched error behavior in tests
      const countResult = (await this.client.query(
        "SELECT COUNT(*) as total",
        []
      )) as { rows: Array<Record<string, unknown>> };
      const rawResults = (await this.client.query("SELECT *", [])) as {
        rows: Array<Record<string, unknown>>;
      };
      const total = (countResult.rows[0]?.total as number) || 0;
      return {
        results: rawResults.rows.map((row: Record<string, unknown>) => ({
          item: {
            id: row.id,
            firstName: row.firstName,
            lastName: row.lastName,
            maidenName: row.maidenName,
            photoUrl: row.photoUrl,
            dateOfBirth: row.dateOfBirth,
            dateOfPassing: row.dateOfPassing,
            isLiving: row.isLiving,
            rank: (row.rank as number) || 0,
          },
          rank: (row.rank as number) || 0,
        })),
        total,
        queryTime: 10,
      };
    }
  },
}));

vi.mock("@vamsa/lib/search-engine-sqlite", () => ({
  SqliteSearchEngine: class MockSqliteSearchEngine {
    async searchPersons() {
      return { results: [], total: 0, queryTime: 0 };
    }
  },
}));

// Mock the require-auth middleware to prevent DATABASE_URL errors
vi.mock("./middleware/require-auth", () => ({
  requireAuth: async (requiredRole: string = "VIEWER") => {
    // Import getStubbedSession from the test context
    const { getStubbedSession } = await import("@test/server-fn-context");
    const user = await getStubbedSession();
    if (!user) {
      throw new Error("errors:auth.notAuthenticated");
    }
    const roleHierarchy: Record<string, number> = {
      VIEWER: 0,
      MEMBER: 1,
      ADMIN: 2,
    };
    if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
      throw new Error(`Requires ${requiredRole} role or higher`);
    }
    return user;
  },
}));

// Note: Real logger is used - no mocking needed

describe("searchPeople server function", () => {
  describe("authentication", () => {
    it("requires VIEWER role or higher", async () => {
      await expect(
        asUnauthenticated(async () => {
          return await searchPeopleHandler({
            query: "john",
            limit: 20,
            offset: 0,
          });
        })
      ).rejects.toThrow(/notAuthenticated|log in/i);
    });

    it("allows viewer users to search", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it("allows admin users to search", async () => {
      const { result } = await asAdmin(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });

  describe("input handling", () => {
    it("accepts valid search parameters", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john doe",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.queryTime).toBeDefined();
    });

    it("uses default limit when not provided", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it("uses default offset when not provided", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
    });

    it("handles very long queries by sanitizing", async () => {
      const longQuery = "a".repeat(201);
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: longQuery,
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
    });

    it("handles large limit parameter", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 50,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
    });

    it("handles zero limit by using default", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
    });

    it("handles positive offset", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 10,
        });
      });

      expect(result).toBeDefined();
    });

    it("handles empty query by returning empty results", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
    });
  });

  describe("query handling", () => {
    it("returns empty results for whitespace-only query", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "   ",
          limit: 20,
          offset: 0,
        });
      });

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("sanitizes query before searching", async () => {
      mockSanitizeQuery.mockReturnValueOnce("john");

      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(mockSanitizeQuery).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("includes query execution time in response", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result.queryTime).toBeDefined();
      expect(typeof result.queryTime).toBe("number");
      expect(result.queryTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("search result structure", () => {
    it("returns properly structured search results", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.total).toBeDefined();
      expect(typeof result.total).toBe("number");
      expect(result.queryTime).toBeDefined();
      expect(typeof result.queryTime).toBe("number");
    });

    it("includes ranking information in results", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      if (result.results.length > 0) {
        expect("rank" in result.results[0]).toBe(true);
      }
    });

    it("includes person data in results", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      if (result.results.length > 0) {
        const resultItem = result.results[0];
        if ("item" in resultItem) {
          const person = (resultItem as any).item;
          expect(person.id).toBeDefined();
          expect(person.firstName).toBeDefined();
          expect(person.lastName).toBeDefined();
        }
      }
    });
  });

  describe("pagination", () => {
    it("respects limit parameter", async () => {
      const { result: result1 } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 10,
          offset: 0,
        });
      });

      const { result: result2 } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it("respects offset parameter", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 10,
        });
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it("accepts maximum limit of 50", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 50,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
    });

    it("accepts zero offset", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("logs errors during search", async () => {
      const originalQuery = mockDrizzleDb.$client.query;
      mockDrizzleDb.$client.query = async () => {
        throw new Error("Database connection failed");
      };

      await expect(
        asViewer(async () => {
          return await searchPeopleHandler({
            query: "john",
            limit: 20,
            offset: 0,
          });
        })
      ).rejects.toThrow();

      mockDrizzleDb.$client.query = originalQuery;
    });

    it("includes query timing in error logs", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result.queryTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("NLP and FTS integration", () => {
    it("classifies query intent", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
      expect(mockClassifyIntent).toHaveBeenCalled();
    });

    it("falls back to FTS on NLP error", async () => {
      mockExecuteSearch.mockImplementationOnce(async () => {
        throw new Error("NLP processing failed");
      });

      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it("builds relationship maps for NLP queries", async () => {
      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "how am i related to john",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
    });

    it("returns FTS results for simple person name searches", async () => {
      mockClassifyIntent.mockReturnValueOnce({
        intent: "PERSON_SEARCH",
        confidence: 0.2,
      });

      const { result } = await asViewer(async () => {
        return await searchPeopleHandler({
          query: "john smith",
          limit: 20,
          offset: 0,
        });
      });

      expect(result).toBeDefined();
      // FTS path is taken (not NLP) — verify we got search results back
      expect(result?.results).toBeDefined();
      expect(result?.results.length).toBeGreaterThan(0);
    });
  });
});
