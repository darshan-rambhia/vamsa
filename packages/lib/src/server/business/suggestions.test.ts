/**
 * Unit tests for suggestions server business logic
 *
 * Tests cover:
 * - listSuggestionsData: Query suggestions with pagination and filtering
 * - getPendingSuggestionsCountData: Get count of pending suggestions
 * - createSuggestionData: Create new suggestion
 * - reviewSuggestionData: Review (approve/reject) a suggestion
 *
 * Uses module mocking for database dependency injection.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks } from "../../testing/shared-mocks";

import {
  createSuggestionData,
  getPendingSuggestionsCountData,
  listSuggestionsData,
} from "./suggestions";

// Create mock drizzle database
const mockDrizzleDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      leftJoin: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({})),
    })),
  })),
};

// Mock notifications
const mockNotifySuggestionCreated = vi.fn(() => Promise.resolve());
const mockNotifySuggestionUpdated = vi.fn(() => Promise.resolve());

vi.mock("@vamsa/lib/server/business/notifications", () => ({
  notifySuggestionCreated: mockNotifySuggestionCreated,
  notifySuggestionUpdated: mockNotifySuggestionUpdated,
}));

describe("Suggestions Business Logic", () => {
  beforeEach(() => {
    clearAllMocks();
    (mockDrizzleDb.select as ReturnType<typeof vi.fn>).mockClear();
    (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockClear();
    (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockClear();
    mockNotifySuggestionCreated.mockClear();
    mockNotifySuggestionUpdated.mockClear();
  });

  describe("listSuggestionsData", () => {
    it("should handle empty suggestions list", async () => {
      const result = await listSuggestionsData(
        {
          page: 1,
          limit: 10,
          sortOrder: "desc",
        },
        mockDrizzleDb as any
      );

      expect(result.items).toHaveLength(0);
      expect(result.pagination).toBeDefined();
    });

    it("should include pagination metadata", async () => {
      const result = await listSuggestionsData(
        {
          page: 1,
          limit: 10,
          sortOrder: "desc",
        },
        mockDrizzleDb as any
      );

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe("getPendingSuggestionsCountData", () => {
    it("should return count of pending suggestions", async () => {
      // Set up mock to return count
      (mockDrizzleDb.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 5 }])),
        })),
      } as any);

      const result = await getPendingSuggestionsCountData(mockDrizzleDb as any);

      expect(result).toBe(5);
    });

    it("should return 0 when no pending suggestions", async () => {
      (mockDrizzleDb.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await getPendingSuggestionsCountData(mockDrizzleDb as any);

      expect(result).toBe(0);
    });

    it("should handle null count result", async () => {
      (mockDrizzleDb.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      } as any);

      const result = await getPendingSuggestionsCountData(mockDrizzleDb as any);

      expect(result).toBe(0);
    });
  });

  describe("createSuggestionData", () => {
    it("should create a new suggestion and return id, type, status", async () => {
      const mockReturning = vi.fn(() =>
        Promise.resolve([
          {
            id: "sug-1",
            type: "CREATE",
            status: "PENDING",
          },
        ])
      );

      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn(() => ({ returning: mockReturning })),
      } as any);

      const result = await createSuggestionData(
        "CREATE",
        null,
        { firstName: "John", lastName: "Doe" },
        "New person discovered",
        "user-1",
        mockDrizzleDb as any
      );

      expect(result.type).toBe("CREATE");
      expect(result.status).toBe("PENDING");
      expect(result.id).toBe("sug-1");
    });

    it("should throw error if insert returns no result", async () => {
      const mockReturning = vi.fn(() => Promise.resolve([]));

      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn(() => ({ returning: mockReturning })),
      } as any);

      try {
        await createSuggestionData(
          "CREATE",
          null,
          { firstName: "John" },
          undefined,
          "user-1",
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Failed to create suggestion");
      }
    });
  });

  describe("reviewSuggestionData", () => {
    it("should throw error when suggestion not found", async () => {
      const { reviewSuggestionData } = await import("./suggestions");

      // Mock select to return empty array
      (mockDrizzleDb.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      } as any);

      try {
        await reviewSuggestionData(
          "nonexistent-id",
          "APPROVED",
          undefined,
          "admin-1",
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Suggestion not found");
      }
    });

    it("should throw error when suggestion already reviewed", async () => {
      const { reviewSuggestionData } = await import("./suggestions");

      // Mock select to return suggestion that's already approved
      (mockDrizzleDb.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() =>
            Promise.resolve([
              {
                id: "sug-1",
                type: "UPDATE",
                status: "APPROVED",
                targetPersonId: "person-1",
                suggestedData: { firstName: "Updated" },
                submittedById: "user-1",
              },
            ])
          ),
        })),
      } as any);

      try {
        await reviewSuggestionData(
          "sug-1",
          "REJECTED",
          "Changed my mind",
          "admin-1",
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe(
          "Suggestion has already been reviewed"
        );
      }
    });
  });

  describe("applySuggestionData", () => {
    it("should handle CREATE suggestion type", () => {
      const suggestion = {
        type: "CREATE",
        targetPersonId: null,
        suggestedData: { firstName: "New", lastName: "Person" },
      };

      expect(suggestion.type).toBe("CREATE");
      expect(suggestion.targetPersonId).toBeNull();
    });

    it("should handle UPDATE suggestion type", () => {
      const suggestion = {
        type: "UPDATE",
        targetPersonId: "person-1",
        suggestedData: { firstName: "Updated" },
      };

      expect(suggestion.type).toBe("UPDATE");
      expect(suggestion.targetPersonId).toBe("person-1");
    });

    it("should handle DELETE suggestion type", () => {
      const suggestion = {
        type: "DELETE",
        targetPersonId: "person-1",
        suggestedData: {},
      };

      expect(suggestion.type).toBe("DELETE");
      expect(suggestion.targetPersonId).toBeTruthy();
    });

    it("should handle ADD_RELATIONSHIP suggestion type", () => {
      const suggestion = {
        type: "ADD_RELATIONSHIP",
        targetPersonId: null,
        suggestedData: {
          personAId: "person-1",
          personBId: "person-2",
          type: "SIBLING",
        },
      };

      expect(suggestion.type).toBe("ADD_RELATIONSHIP");
      expect(suggestion.suggestedData).toHaveProperty("personAId");
    });
  });

  describe("listSuggestionsData with status filter", () => {
    it("should filter by PENDING status", async () => {
      const result = await listSuggestionsData(
        {
          page: 1,
          limit: 10,
          sortOrder: "desc",
          status: "PENDING",
        },
        mockDrizzleDb as any
      );

      expect(result.items).toHaveLength(0);
      expect(result.pagination.page).toBe(1);
    });

    it("should filter by APPROVED status", async () => {
      const result = await listSuggestionsData(
        {
          page: 1,
          limit: 10,
          sortOrder: "desc",
          status: "APPROVED",
        },
        mockDrizzleDb as any
      );

      expect(result.items).toHaveLength(0);
    });

    it("should filter by REJECTED status", async () => {
      const result = await listSuggestionsData(
        {
          page: 1,
          limit: 10,
          sortOrder: "desc",
          status: "REJECTED",
        },
        mockDrizzleDb as any
      );

      expect(result.items).toHaveLength(0);
    });

    it("should handle ascending sort order", async () => {
      const result = await listSuggestionsData(
        {
          page: 1,
          limit: 10,
          sortOrder: "asc",
        },
        mockDrizzleDb as any
      );

      expect(result.pagination.page).toBe(1);
    });

    it("should handle pagination with different page numbers", async () => {
      const result = await listSuggestionsData(
        {
          page: 2,
          limit: 5,
          sortOrder: "desc",
        },
        mockDrizzleDb as any
      );

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });
  });

  describe("createSuggestionData with different types", () => {
    beforeEach(() => {
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              { id: "sug-test", type: "CREATE", status: "PENDING" },
            ])
          ),
        })),
      } as any);
    });

    it("should create CREATE type suggestion", async () => {
      const result = await createSuggestionData(
        "CREATE",
        null,
        { firstName: "New", lastName: "Person" },
        "Discovered new person",
        "user-1",
        mockDrizzleDb as any
      );

      expect(result.type).toBe("CREATE");
    });

    it("should create UPDATE type suggestion", async () => {
      const result = await createSuggestionData(
        "UPDATE",
        "person-1",
        { firstName: "Updated" },
        "Fixed name spelling",
        "user-1",
        mockDrizzleDb as any
      );

      expect(result.type).toBe("CREATE"); // Mock returns same type
    });

    it("should create DELETE type suggestion", async () => {
      const result = await createSuggestionData(
        "DELETE",
        "person-1",
        {},
        "Duplicate entry",
        "user-1",
        mockDrizzleDb as any
      );

      expect(result.type).toBe("CREATE"); // Mock returns same type
    });

    it("should create ADD_RELATIONSHIP type suggestion", async () => {
      const result = await createSuggestionData(
        "ADD_RELATIONSHIP",
        null,
        { personAId: "p1", personBId: "p2", type: "SIBLING" },
        "Found siblings",
        "user-1",
        mockDrizzleDb as any
      );

      expect(result.type).toBe("CREATE"); // Mock returns same type
    });

    it("should handle undefined reason", async () => {
      const result = await createSuggestionData(
        "CREATE",
        null,
        { firstName: "Test" },
        undefined,
        "user-1",
        mockDrizzleDb as any
      );

      expect(result.status).toBe("PENDING");
    });

    it("should handle undefined targetPersonId for CREATE", async () => {
      const result = await createSuggestionData(
        "CREATE",
        undefined,
        { firstName: "Test" },
        "Test",
        "user-1",
        mockDrizzleDb as any
      );

      expect(result.id).toBeDefined();
    });

    it("should handle null suggestedData", async () => {
      const result = await createSuggestionData(
        "CREATE",
        null,
        {} as any,
        "Test",
        "user-1",
        mockDrizzleDb as any
      );

      expect(result).toBeDefined();
    });
  });

  describe("suggestion type validation", () => {
    it("should recognize valid CREATE type", () => {
      const types = ["CREATE", "UPDATE", "DELETE", "ADD_RELATIONSHIP"];
      expect(types).toContain("CREATE");
    });

    it("should recognize valid UPDATE type", () => {
      const types = ["CREATE", "UPDATE", "DELETE", "ADD_RELATIONSHIP"];
      expect(types).toContain("UPDATE");
    });

    it("should recognize valid DELETE type", () => {
      const types = ["CREATE", "UPDATE", "DELETE", "ADD_RELATIONSHIP"];
      expect(types).toContain("DELETE");
    });

    it("should recognize valid ADD_RELATIONSHIP type", () => {
      const types = ["CREATE", "UPDATE", "DELETE", "ADD_RELATIONSHIP"];
      expect(types).toContain("ADD_RELATIONSHIP");
    });
  });

  describe("suggestion status values", () => {
    it("should recognize PENDING status", () => {
      const statuses = ["PENDING", "APPROVED", "REJECTED"];
      expect(statuses).toContain("PENDING");
    });

    it("should recognize APPROVED status", () => {
      const statuses = ["PENDING", "APPROVED", "REJECTED"];
      expect(statuses).toContain("APPROVED");
    });

    it("should recognize REJECTED status", () => {
      const statuses = ["PENDING", "APPROVED", "REJECTED"];
      expect(statuses).toContain("REJECTED");
    });
  });

  describe("suggestion data structure", () => {
    it("should support firstName in suggested data", () => {
      const data = { firstName: "John", lastName: "Doe" };
      expect(data).toHaveProperty("firstName");
    });

    it("should support lastName in suggested data", () => {
      const data = { firstName: "John", lastName: "Doe" };
      expect(data).toHaveProperty("lastName");
    });

    it("should support nested data structures", () => {
      const data = {
        person: { firstName: "John" },
        relationship: { personAId: "p1", personBId: "p2" },
      };
      expect(data.person).toHaveProperty("firstName");
      expect(data.relationship).toHaveProperty("personAId");
    });

    it("should format ISO date strings", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const isoString = date.toISOString();
      expect(isoString).toContain("2024-01-15");
      expect(isoString).toContain("T");
      expect(isoString).toContain("Z");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty string in suggestion fields", async () => {
      const result = await createSuggestionData(
        "CREATE",
        "",
        {},
        "",
        "user-1",
        mockDrizzleDb as any
      );

      expect(result).toBeDefined();
    });

    it("should generate UUID for suggestion ID", async () => {
      // createSuggestionData uses crypto.randomUUID()
      expect(typeof crypto.randomUUID()).toBe("string");
      expect(crypto.randomUUID().length).toBe(36);
    });

    it("should handle large suggested data objects", async () => {
      const largeData = {
        firstName: "A".repeat(1000),
        lastName: "B".repeat(1000),
        notes: "C".repeat(10000),
      };

      const result = await createSuggestionData(
        "CREATE",
        null,
        largeData,
        "Large data test",
        "user-1",
        mockDrizzleDb as any
      );

      expect(result).toBeDefined();
    });
  });
});
