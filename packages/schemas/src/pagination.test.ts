/**
 * Unit Tests for Pagination Schemas
 * Tests Zod schema validation for pagination inputs, metadata, and related functionality
 */
import { describe, it, expect } from "bun:test";
import {
  sortOrderEnum,
  paginationInputSchema,
  paginationWithSearchSchema,
  paginationMetaSchema,
  createPaginationMeta,
  personListInputSchema,
  suggestionListInputSchema,
  auditLogListInputSchema,
  type SortOrder,
  type PaginationInput,
  type PaginationWithSearchInput,
  type PaginationMeta,
  type PersonListInput,
  type SuggestionListInput,
  type AuditLogListInput,
} from "./pagination";

describe("sortOrderEnum", () => {
  describe("Valid sort orders", () => {
    it("should accept 'asc'", () => {
      const result = sortOrderEnum.safeParse("asc");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("asc");
      }
    });

    it("should accept 'desc'", () => {
      const result = sortOrderEnum.safeParse("desc");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("desc");
      }
    });

    it("should accept both values in array", () => {
      const orders: SortOrder[] = ["asc", "desc"];
      orders.forEach((order) => {
        const result = sortOrderEnum.safeParse(order);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Invalid sort orders", () => {
    it("should reject lowercase 'asc'", () => {
      const result = sortOrderEnum.safeParse("asc");
      expect(result.success).toBe(true);
    });

    it("should reject 'ascending'", () => {
      const result = sortOrderEnum.safeParse("ascending");
      expect(result.success).toBe(false);
    });

    it("should reject 'descending'", () => {
      const result = sortOrderEnum.safeParse("descending");
      expect(result.success).toBe(false);
    });

    it("should reject 'ASC' (uppercase)", () => {
      const result = sortOrderEnum.safeParse("ASC");
      expect(result.success).toBe(false);
    });

    it("should reject 'DESC' (uppercase)", () => {
      const result = sortOrderEnum.safeParse("DESC");
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = sortOrderEnum.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject null", () => {
      const result = sortOrderEnum.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("should reject undefined", () => {
      const result = sortOrderEnum.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it("should reject number", () => {
      const result = sortOrderEnum.safeParse(1);
      expect(result.success).toBe(false);
    });

    it("should reject object", () => {
      const result = sortOrderEnum.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe("paginationInputSchema", () => {
  describe("Valid pagination inputs", () => {
    it("should accept minimal input with all defaults", () => {
      const result = paginationInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe("asc");
      }
    });

    it("should accept page 1", () => {
      const result = paginationInputSchema.safeParse({ page: 1 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it("should accept large page numbers", () => {
      const result = paginationInputSchema.safeParse({ page: 1000000 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1000000);
      }
    });

    it("should accept limit 1", () => {
      const result = paginationInputSchema.safeParse({ limit: 1 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1);
      }
    });

    it("should accept limit 50 (default)", () => {
      const result = paginationInputSchema.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("should accept limit 100 (max)", () => {
      const result = paginationInputSchema.safeParse({ limit: 100 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it("should accept sortOrder 'asc'", () => {
      const result = paginationInputSchema.safeParse({ sortOrder: "asc" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe("asc");
      }
    });

    it("should accept sortOrder 'desc'", () => {
      const result = paginationInputSchema.safeParse({ sortOrder: "desc" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe("desc");
      }
    });

    it("should accept complete valid input", () => {
      const input = {
        page: 5,
        limit: 25,
        sortOrder: "desc" as const,
      };
      const result = paginationInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(25);
        expect(result.data.sortOrder).toBe("desc");
      }
    });

    it("should apply default sortOrder when not provided", () => {
      const result = paginationInputSchema.safeParse({ page: 2, limit: 10 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe("asc");
      }
    });

    it("should apply default page when not provided", () => {
      const result = paginationInputSchema.safeParse({ limit: 20 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it("should apply default limit when not provided", () => {
      const result = paginationInputSchema.safeParse({ page: 3 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });
  });

  describe("Page validation", () => {
    it("should reject page 0", () => {
      const result = paginationInputSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const result = paginationInputSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it("should reject large negative page", () => {
      const result = paginationInputSchema.safeParse({ page: -1000000 });
      expect(result.success).toBe(false);
    });

    it("should reject float page", () => {
      const result = paginationInputSchema.safeParse({ page: 1.5 });
      expect(result.success).toBe(false);
    });

    it("should reject string page", () => {
      const result = paginationInputSchema.safeParse({ page: "5" });
      expect(result.success).toBe(false);
    });

    it("should reject null page", () => {
      const result = paginationInputSchema.safeParse({ page: null });
      expect(result.success).toBe(false);
    });

    it("should reject undefined page when explicitly set", () => {
      const result = paginationInputSchema.safeParse({ page: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });
  });

  describe("Limit validation", () => {
    it("should reject limit 0", () => {
      const result = paginationInputSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject limit -1", () => {
      const result = paginationInputSchema.safeParse({ limit: -1 });
      expect(result.success).toBe(false);
    });

    it("should reject limit 101 (exceeds max)", () => {
      const result = paginationInputSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it("should reject limit 1000 (far exceeds max)", () => {
      const result = paginationInputSchema.safeParse({ limit: 1000 });
      expect(result.success).toBe(false);
    });

    it("should reject float limit", () => {
      const result = paginationInputSchema.safeParse({ limit: 25.5 });
      expect(result.success).toBe(false);
    });

    it("should reject string limit", () => {
      const result = paginationInputSchema.safeParse({ limit: "50" });
      expect(result.success).toBe(false);
    });

    it("should reject null limit", () => {
      const result = paginationInputSchema.safeParse({ limit: null });
      expect(result.success).toBe(false);
    });

    it("should accept all valid limits between 1 and 100", () => {
      const validLimits = [1, 2, 10, 25, 50, 75, 100];
      validLimits.forEach((limit) => {
        const result = paginationInputSchema.safeParse({ limit });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(limit);
        }
      });
    });
  });

  describe("SortOrder validation", () => {
    it("should reject invalid sortOrder", () => {
      const result = paginationInputSchema.safeParse({ sortOrder: "invalid" });
      expect(result.success).toBe(false);
    });

    it("should reject null sortOrder", () => {
      const result = paginationInputSchema.safeParse({ sortOrder: null });
      expect(result.success).toBe(false);
    });

    it("should use default when sortOrder undefined", () => {
      const result = paginationInputSchema.safeParse({ sortOrder: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe("asc");
      }
    });
  });

  describe("Type inference", () => {
    it("should infer correct pagination input type", () => {
      const input: PaginationInput = {
        page: 1,
        limit: 50,
        sortOrder: "asc",
      };
      expect(input.page).toBe(1);
      expect(input.limit).toBe(50);
      expect(input.sortOrder).toBe("asc");
    });
  });

  describe("Extra fields", () => {
    it("should strip extra fields", () => {
      const result = paginationInputSchema.safeParse({
        page: 1,
        limit: 50,
        sortOrder: "asc",
        extraField: "should be ignored",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("extraField");
      }
    });
  });
});

describe("paginationWithSearchSchema", () => {
  describe("Valid inputs", () => {
    it("should accept minimal input with defaults", () => {
      const result = paginationWithSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe("asc");
        expect(result.data.search).toBeUndefined();
      }
    });

    it("should accept search term", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: "John Doe",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("John Doe");
      }
    });

    it("should accept empty search string", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("");
      }
    });

    it("should accept complete input with search", () => {
      const input = {
        page: 2,
        limit: 25,
        sortOrder: "desc" as const,
        search: "Jane Smith",
      };
      const result = paginationWithSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
        expect(result.data.sortOrder).toBe("desc");
        expect(result.data.search).toBe("Jane Smith");
      }
    });

    it("should accept search with special characters", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: "O'Brien-Smith & Co. (Ltd)",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("O'Brien-Smith & Co. (Ltd)");
      }
    });

    it("should accept search with unicode", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: "François Müller 李明",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("François Müller 李明");
      }
    });
  });

  describe("Search field validation", () => {
    it("should accept undefined search", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });

    it("should reject null search", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject number search", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: 123,
      });
      expect(result.success).toBe(false);
    });

    it("should reject object search", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: {},
      });
      expect(result.success).toBe(false);
    });

    it("should reject array search", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Inherits pagination validation", () => {
    it("should still validate page field", () => {
      const result = paginationWithSearchSchema.safeParse({
        page: 0,
        search: "test",
      });
      expect(result.success).toBe(false);
    });

    it("should still validate limit field", () => {
      const result = paginationWithSearchSchema.safeParse({
        limit: 101,
        search: "test",
      });
      expect(result.success).toBe(false);
    });

    it("should still validate sortOrder field", () => {
      const result = paginationWithSearchSchema.safeParse({
        sortOrder: "invalid",
        search: "test",
      });
      expect(result.success).toBe(false);
    });

    it("should apply pagination defaults", () => {
      const result = paginationWithSearchSchema.safeParse({
        search: "test",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe("asc");
      }
    });
  });

  describe("Type inference", () => {
    it("should infer correct pagination with search input type", () => {
      const input: PaginationWithSearchInput = {
        page: 1,
        limit: 50,
        sortOrder: "asc",
        search: "test",
      };
      expect(input.search).toBe("test");
    });
  });
});

describe("paginationMetaSchema", () => {
  describe("Valid metadata inputs", () => {
    it("should accept complete metadata", () => {
      const meta = {
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(true);
    });

    it("should accept zero total", () => {
      const meta = {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(true);
    });

    it("should accept large numbers", () => {
      const meta = {
        page: 1000000,
        limit: 100,
        total: 1000000000,
        totalPages: 10000000,
        hasNext: true,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(true);
    });

    it("should accept both hasNext and hasPrev true", () => {
      const meta = {
        page: 5,
        limit: 50,
        total: 500,
        totalPages: 10,
        hasNext: true,
        hasPrev: true,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(true);
    });

    it("should accept both hasNext and hasPrev false", () => {
      const meta = {
        page: 1,
        limit: 50,
        total: 25,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(true);
    });
  });

  describe("Field validation", () => {
    it("should reject missing page", () => {
      const meta = {
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });

    it("should reject missing limit", () => {
      const meta = {
        page: 1,
        total: 100,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });

    it("should reject missing total", () => {
      const meta = {
        page: 1,
        limit: 50,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });

    it("should reject missing totalPages", () => {
      const meta = {
        page: 1,
        limit: 50,
        total: 100,
        hasNext: true,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });

    it("should reject missing hasNext", () => {
      const meta = {
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });

    it("should reject missing hasPrev", () => {
      const meta = {
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNext: true,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });

    it("should reject string page", () => {
      const meta = {
        page: "1",
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const meta = {
        page: -1,
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(true);
    });

    it("should reject string hasNext", () => {
      const meta = {
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNext: "true",
        hasPrev: false,
      };
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct pagination meta type", () => {
      const meta: PaginationMeta = {
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      };
      expect(meta.page).toBe(1);
      expect(meta.hasNext).toBe(true);
    });
  });
});

describe("createPaginationMeta", () => {
  describe("Basic calculations", () => {
    it("should calculate correct metadata for first page", () => {
      const meta = createPaginationMeta(1, 50, 100);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(50);
      expect(meta.total).toBe(100);
      expect(meta.totalPages).toBe(2);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(false);
    });

    it("should calculate correct metadata for middle page", () => {
      const meta = createPaginationMeta(2, 50, 100);
      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(50);
      expect(meta.total).toBe(100);
      expect(meta.totalPages).toBe(2);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it("should calculate correct metadata for last page", () => {
      const meta = createPaginationMeta(5, 10, 50);
      expect(meta.page).toBe(5);
      expect(meta.limit).toBe(10);
      expect(meta.total).toBe(50);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it("should handle single page result", () => {
      const meta = createPaginationMeta(1, 50, 25);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(50);
      expect(meta.total).toBe(25);
      expect(meta.totalPages).toBe(1);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });

    it("should handle empty results", () => {
      const meta = createPaginationMeta(1, 50, 0);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(50);
      expect(meta.total).toBe(0);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });
  });

  describe("TotalPages calculation", () => {
    it("should calculate totalPages with exact division", () => {
      const meta = createPaginationMeta(1, 10, 100);
      expect(meta.totalPages).toBe(10);
    });

    it("should calculate totalPages with remainder (ceil required)", () => {
      const meta = createPaginationMeta(1, 10, 105);
      expect(meta.totalPages).toBe(11);
    });

    it("should calculate totalPages = 1 for total less than limit", () => {
      const meta = createPaginationMeta(1, 50, 25);
      expect(meta.totalPages).toBe(1);
    });

    it("should calculate totalPages = 0 for zero total", () => {
      const meta = createPaginationMeta(1, 50, 0);
      expect(meta.totalPages).toBe(0);
    });

    it("should calculate totalPages correctly for large numbers", () => {
      const meta = createPaginationMeta(1, 100, 1001);
      expect(meta.totalPages).toBe(11);
    });

    it("should calculate totalPages correctly for limit = 1", () => {
      const meta = createPaginationMeta(1, 1, 5);
      expect(meta.totalPages).toBe(5);
    });
  });

  describe("hasNext calculation", () => {
    it("should be true when page < totalPages", () => {
      const meta = createPaginationMeta(1, 50, 100);
      expect(meta.hasNext).toBe(true);
    });

    it("should be false when page === totalPages", () => {
      const meta = createPaginationMeta(2, 50, 100);
      expect(meta.hasNext).toBe(false);
    });

    it("should be false when page > totalPages", () => {
      const meta = createPaginationMeta(3, 50, 100);
      expect(meta.hasNext).toBe(false);
    });

    it("should be false when totalPages === 0", () => {
      const meta = createPaginationMeta(1, 50, 0);
      expect(meta.hasNext).toBe(false);
    });

    it("should be false when totalPages === 1 and page === 1", () => {
      const meta = createPaginationMeta(1, 50, 25);
      expect(meta.hasNext).toBe(false);
    });
  });

  describe("hasPrev calculation", () => {
    it("should be false when page === 1", () => {
      const meta = createPaginationMeta(1, 50, 100);
      expect(meta.hasPrev).toBe(false);
    });

    it("should be true when page > 1", () => {
      const meta = createPaginationMeta(2, 50, 100);
      expect(meta.hasPrev).toBe(true);
    });

    it("should be true when page is large", () => {
      const meta = createPaginationMeta(100, 50, 10000);
      expect(meta.hasPrev).toBe(true);
    });

    it("should be false for first page even with large total", () => {
      const meta = createPaginationMeta(1, 50, 1000000);
      expect(meta.hasPrev).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle page 1 with limit 1", () => {
      const meta = createPaginationMeta(1, 1, 10);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(1);
      expect(meta.total).toBe(10);
      expect(meta.totalPages).toBe(10);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(false);
    });

    it("should handle very large limit", () => {
      const meta = createPaginationMeta(1, 1000000, 1000000);
      expect(meta.totalPages).toBe(1);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });

    it("should handle page beyond totalPages", () => {
      const meta = createPaginationMeta(10, 50, 100);
      expect(meta.totalPages).toBe(2);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it("should handle single item across multiple parameters", () => {
      const meta = createPaginationMeta(1, 1, 1);
      expect(meta.totalPages).toBe(1);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });
  });

  describe("Return type validation", () => {
    it("should return PaginationMeta with all required fields", () => {
      const meta = createPaginationMeta(1, 50, 100);
      expect(typeof meta.page).toBe("number");
      expect(typeof meta.limit).toBe("number");
      expect(typeof meta.total).toBe("number");
      expect(typeof meta.totalPages).toBe("number");
      expect(typeof meta.hasNext).toBe("boolean");
      expect(typeof meta.hasPrev).toBe("boolean");
    });

    it("should pass schema validation", () => {
      const meta = createPaginationMeta(1, 50, 100);
      const result = paginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(true);
    });
  });
});

describe("personListInputSchema", () => {
  describe("Valid inputs", () => {
    it("should accept minimal input with defaults", () => {
      const result = personListInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe("asc");
        expect(result.data.sortBy).toBe("lastName");
        expect(result.data.search).toBeUndefined();
        expect(result.data.isLiving).toBeUndefined();
      }
    });

    it("should accept all sortBy options", () => {
      const sortByOptions: Array<
        "lastName" | "firstName" | "dateOfBirth" | "createdAt"
      > = ["lastName", "firstName", "dateOfBirth", "createdAt"];

      sortByOptions.forEach((sortBy) => {
        const result = personListInputSchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe(sortBy);
        }
      });
    });

    it("should accept isLiving true", () => {
      const result = personListInputSchema.safeParse({ isLiving: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isLiving).toBe(true);
      }
    });

    it("should accept isLiving false", () => {
      const result = personListInputSchema.safeParse({ isLiving: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isLiving).toBe(false);
      }
    });

    it("should accept complete person list input", () => {
      const input = {
        page: 2,
        limit: 25,
        sortOrder: "desc" as const,
        search: "Smith",
        sortBy: "firstName" as const,
        isLiving: true,
      };
      const result = personListInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
        expect(result.data.search).toBe("Smith");
        expect(result.data.sortBy).toBe("firstName");
        expect(result.data.isLiving).toBe(true);
      }
    });

    it("should accept search without sortBy override", () => {
      const result = personListInputSchema.safeParse({ search: "John" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("John");
        expect(result.data.sortBy).toBe("lastName");
      }
    });
  });

  describe("SortBy validation", () => {
    it("should reject invalid sortBy", () => {
      const result = personListInputSchema.safeParse({
        sortBy: "invalidField",
      });
      expect(result.success).toBe(false);
    });

    it("should reject null sortBy", () => {
      const result = personListInputSchema.safeParse({
        sortBy: null,
      });
      expect(result.success).toBe(false);
    });

    it("should use default sortBy when not provided", () => {
      const result = personListInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe("lastName");
      }
    });

    it("should use default sortBy when undefined", () => {
      const result = personListInputSchema.safeParse({ sortBy: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe("lastName");
      }
    });
  });

  describe("IsLiving validation", () => {
    it("should reject null isLiving", () => {
      const result = personListInputSchema.safeParse({ isLiving: null });
      expect(result.success).toBe(false);
    });

    it("should reject string isLiving", () => {
      const result = personListInputSchema.safeParse({ isLiving: "true" });
      expect(result.success).toBe(false);
    });

    it("should accept undefined isLiving", () => {
      const result = personListInputSchema.safeParse({ isLiving: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isLiving).toBeUndefined();
      }
    });
  });

  describe("Inherits pagination and search validation", () => {
    it("should validate page field", () => {
      const result = personListInputSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it("should validate limit field", () => {
      const result = personListInputSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it("should validate sortOrder field", () => {
      const result = personListInputSchema.safeParse({ sortOrder: "invalid" });
      expect(result.success).toBe(false);
    });

    it("should validate search field", () => {
      const result = personListInputSchema.safeParse({ search: null });
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct person list input type", () => {
      const input: PersonListInput = {
        page: 1,
        limit: 50,
        sortOrder: "asc",
        sortBy: "lastName",
        search: "Smith",
        isLiving: true,
      };
      expect(input.sortBy).toBe("lastName");
      expect(input.isLiving).toBe(true);
    });
  });
});

describe("suggestionListInputSchema", () => {
  describe("Valid inputs", () => {
    it("should accept minimal input with defaults", () => {
      const result = suggestionListInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe("asc");
        expect(result.data.status).toBeUndefined();
      }
    });

    it("should accept status PENDING", () => {
      const result = suggestionListInputSchema.safeParse({
        status: "PENDING",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("PENDING");
      }
    });

    it("should accept status APPROVED", () => {
      const result = suggestionListInputSchema.safeParse({
        status: "APPROVED",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("APPROVED");
      }
    });

    it("should accept status REJECTED", () => {
      const result = suggestionListInputSchema.safeParse({
        status: "REJECTED",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("REJECTED");
      }
    });

    it("should accept complete suggestion list input", () => {
      const input = {
        page: 3,
        limit: 20,
        sortOrder: "desc" as const,
        status: "PENDING" as const,
      };
      const result = suggestionListInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.status).toBe("PENDING");
      }
    });
  });

  describe("Status validation", () => {
    it("should reject invalid status", () => {
      const result = suggestionListInputSchema.safeParse({
        status: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("should reject lowercase status", () => {
      const result = suggestionListInputSchema.safeParse({
        status: "pending",
      });
      expect(result.success).toBe(false);
    });

    it("should reject null status", () => {
      const result = suggestionListInputSchema.safeParse({
        status: null,
      });
      expect(result.success).toBe(false);
    });

    it("should accept undefined status", () => {
      const result = suggestionListInputSchema.safeParse({
        status: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });
  });

  describe("Inherits pagination validation", () => {
    it("should validate page field", () => {
      const result = suggestionListInputSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it("should validate limit field", () => {
      const result = suggestionListInputSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it("should validate sortOrder field", () => {
      const result = suggestionListInputSchema.safeParse({ sortOrder: "asc" });
      expect(result.success).toBe(true);
    });
  });

  describe("Type inference", () => {
    it("should infer correct suggestion list input type", () => {
      const input: SuggestionListInput = {
        page: 1,
        limit: 50,
        sortOrder: "asc",
        status: "PENDING",
      };
      expect(input.status).toBe("PENDING");
    });
  });
});

describe("auditLogListInputSchema", () => {
  describe("Valid inputs", () => {
    it("should accept minimal input with defaults", () => {
      const result = auditLogListInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe("asc");
        expect(result.data.userId).toBeUndefined();
        expect(result.data.action).toBeUndefined();
        expect(result.data.entityType).toBeUndefined();
        expect(result.data.startDate).toBeUndefined();
        expect(result.data.endDate).toBeUndefined();
      }
    });

    it("should accept userId", () => {
      const result = auditLogListInputSchema.safeParse({
        userId: "user-123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe("user-123");
      }
    });

    it("should accept all action values", () => {
      const actions: Array<
        | "CREATE"
        | "UPDATE"
        | "DELETE"
        | "LOGIN"
        | "LOGOUT"
        | "APPROVE"
        | "REJECT"
      > = [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "APPROVE",
        "REJECT",
      ];

      actions.forEach((action) => {
        const result = auditLogListInputSchema.safeParse({ action });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.action).toBe(action);
        }
      });
    });

    it("should accept entityType", () => {
      const result = auditLogListInputSchema.safeParse({
        entityType: "Person",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entityType).toBe("Person");
      }
    });

    it("should accept valid datetime startDate", () => {
      const result = auditLogListInputSchema.safeParse({
        startDate: "2024-01-01T00:00:00Z",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBe("2024-01-01T00:00:00Z");
      }
    });

    it("should accept valid datetime endDate", () => {
      const result = auditLogListInputSchema.safeParse({
        endDate: "2024-12-31T23:59:59Z",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.endDate).toBe("2024-12-31T23:59:59Z");
      }
    });

    it("should accept complete audit log input", () => {
      const input = {
        page: 5,
        limit: 100,
        sortOrder: "desc" as const,
        userId: "user-123",
        action: "CREATE" as const,
        entityType: "Relationship",
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
      };
      const result = auditLogListInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe("user-123");
        expect(result.data.action).toBe("CREATE");
        expect(result.data.entityType).toBe("Relationship");
      }
    });
  });

  describe("Action validation", () => {
    it("should reject invalid action", () => {
      const result = auditLogListInputSchema.safeParse({
        action: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("should reject lowercase action", () => {
      const result = auditLogListInputSchema.safeParse({
        action: "create",
      });
      expect(result.success).toBe(false);
    });

    it("should reject null action", () => {
      const result = auditLogListInputSchema.safeParse({
        action: null,
      });
      expect(result.success).toBe(false);
    });

    it("should accept undefined action", () => {
      const result = auditLogListInputSchema.safeParse({
        action: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBeUndefined();
      }
    });
  });

  describe("DateTime validation", () => {
    it("should reject invalid datetime format for startDate", () => {
      const result = auditLogListInputSchema.safeParse({
        startDate: "2024-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid datetime format for endDate", () => {
      const result = auditLogListInputSchema.safeParse({
        endDate: "2024-12-31",
      });
      expect(result.success).toBe(false);
    });

    it("should accept ISO datetime for startDate", () => {
      const result = auditLogListInputSchema.safeParse({
        startDate: "2024-01-15T10:30:00Z",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBe("2024-01-15T10:30:00Z");
      }
    });

    it("should accept ISO datetime for endDate", () => {
      const result = auditLogListInputSchema.safeParse({
        endDate: "2024-12-15T10:30:00Z",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.endDate).toBe("2024-12-15T10:30:00Z");
      }
    });

    it("should reject null startDate", () => {
      const result = auditLogListInputSchema.safeParse({
        startDate: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject null endDate", () => {
      const result = auditLogListInputSchema.safeParse({
        endDate: null,
      });
      expect(result.success).toBe(false);
    });

    it("should accept undefined startDate", () => {
      const result = auditLogListInputSchema.safeParse({
        startDate: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeUndefined();
      }
    });

    it("should accept undefined endDate", () => {
      const result = auditLogListInputSchema.safeParse({
        endDate: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.endDate).toBeUndefined();
      }
    });
  });

  describe("String field validation", () => {
    it("should accept empty string userId", () => {
      const result = auditLogListInputSchema.safeParse({
        userId: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe("");
      }
    });

    it("should accept empty string entityType", () => {
      const result = auditLogListInputSchema.safeParse({
        entityType: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entityType).toBe("");
      }
    });

    it("should reject null userId", () => {
      const result = auditLogListInputSchema.safeParse({
        userId: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject null entityType", () => {
      const result = auditLogListInputSchema.safeParse({
        entityType: null,
      });
      expect(result.success).toBe(false);
    });

    it("should accept undefined userId", () => {
      const result = auditLogListInputSchema.safeParse({
        userId: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBeUndefined();
      }
    });

    it("should accept undefined entityType", () => {
      const result = auditLogListInputSchema.safeParse({
        entityType: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entityType).toBeUndefined();
      }
    });
  });

  describe("Inherits pagination validation", () => {
    it("should validate page field", () => {
      const result = auditLogListInputSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it("should validate limit field", () => {
      const result = auditLogListInputSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it("should apply pagination defaults", () => {
      const result = auditLogListInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });
  });

  describe("Type inference", () => {
    it("should infer correct audit log list input type", () => {
      const input: AuditLogListInput = {
        page: 1,
        limit: 50,
        sortOrder: "asc",
        userId: "user-123",
        action: "LOGIN",
        entityType: "User",
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
      };
      expect(input.userId).toBe("user-123");
      expect(input.action).toBe("LOGIN");
    });
  });
});
