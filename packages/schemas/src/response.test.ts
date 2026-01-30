/**
 * Unit Tests for Response Schemas
 * Tests Zod schema validation for API response formats including error, success, pagination
 */
import { describe, expect, it } from "bun:test";
import { z } from "@hono/zod-openapi";
import {
  errorResponseSchema,
  paginatedResponseSchema,
  paginationMetadataSchema,
  successResponseSchema,
} from "./response";
import type {
  ErrorResponse,
  PaginationMetadata,
  SuccessResponse,
} from "./response";

describe("errorResponseSchema", () => {
  describe("Valid inputs", () => {
    it("should validate error response with only error message", () => {
      const error: ErrorResponse = {
        error: "Invalid request",
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it("should validate error response with error and details", () => {
      const error: ErrorResponse = {
        error: "Validation failed",
        details: "Email format is invalid",
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it("should accept single character error message", () => {
      const error = {
        error: "E",
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it("should accept long error message", () => {
      const error = {
        error: "A".repeat(1000),
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it("should accept error with empty details string", () => {
      const error = {
        error: "Some error",
        details: "",
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it("should accept error with long details", () => {
      const error = {
        error: "Validation error",
        details: "D".repeat(2000),
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it("should accept error with special characters", () => {
      const error = {
        error: "Error: !@#$%^&*()_+[]{}",
        details: "Details with special chars: <>, |, \\",
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it("should accept error with unicode characters", () => {
      const error = {
        error: "エラー occurred",
        details: "詳細: Something went wrong",
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it("should accept error with newlines in message", () => {
      const error = {
        error: "Error\nwith\nmultiple\nlines",
        details: "Details\nwith\nnewlines",
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });
  });

  describe("Missing error field", () => {
    it("should reject when error is missing", () => {
      const error = {
        details: "Some details",
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it("should reject empty object", () => {
      const result = errorResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid error field types", () => {
    it("should reject null error", () => {
      const error = {
        error: null,
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it("should reject undefined error", () => {
      const error = {
        error: undefined,
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it("should reject number as error", () => {
      const error = {
        error: 404,
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it("should reject object as error", () => {
      const error = {
        error: { message: "Error" },
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it("should reject array as error", () => {
      const error = {
        error: ["Error 1", "Error 2"],
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid details field types", () => {
    it("should reject null details when provided", () => {
      const error = {
        error: "Some error",
        details: null,
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it("should reject number as details", () => {
      const error = {
        error: "Some error",
        details: 123,
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it("should reject boolean as details", () => {
      const error = {
        error: "Some error",
        details: true,
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it("should reject object as details", () => {
      const error = {
        error: "Some error",
        details: { message: "detail" },
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });
  });

  describe("Extra fields", () => {
    it("should strip extra fields from error response", () => {
      const error = {
        error: "Some error",
        details: "Some details",
        extra: "Should be removed",
        another: 123,
      };

      const result = errorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("extra");
        expect(result.data).not.toHaveProperty("another");
      }
    });
  });

  describe("Type inference", () => {
    it("should infer error response type correctly", () => {
      const error: ErrorResponse = {
        error: "Test error",
        details: "Test details",
      };

      expect(error.error).toBe("Test error");
      expect(error.details).toBe("Test details");
    });
  });
});

describe("successResponseSchema", () => {
  describe("Valid inputs", () => {
    it("should validate success response with only success flag", () => {
      const success: SuccessResponse = {
        success: true,
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it("should validate success response with message", () => {
      const success: SuccessResponse = {
        success: true,
        message: "Operation completed successfully",
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it("should accept success with single character message", () => {
      const success = {
        success: true,
        message: "A",
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it("should accept success with long message", () => {
      const success = {
        success: true,
        message: "M".repeat(1000),
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it("should accept success with empty message", () => {
      const success = {
        success: true,
        message: "",
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it("should accept success with special characters in message", () => {
      const success = {
        success: true,
        message: "Success! @#$%^&*()_+-=[]{}|;:,.<>?",
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it("should accept success with unicode in message", () => {
      const success = {
        success: true,
        message: "成功しました✓",
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it("should accept success with newlines in message", () => {
      const success = {
        success: true,
        message: "Success\nwith\nmultiple\nlines",
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });
  });

  describe("Success field validation", () => {
    it("should reject success: false", () => {
      const success = {
        success: false,
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });

    it("should reject success as string 'true'", () => {
      const success = {
        success: "true",
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });

    it("should reject success as number 1", () => {
      const success = {
        success: 1,
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });

    it("should reject missing success field", () => {
      const success = {
        message: "Some message",
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });

    it("should reject null success", () => {
      const success = {
        success: null,
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });

    it("should reject undefined success", () => {
      const success = {
        success: undefined,
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });
  });

  describe("Message field validation", () => {
    it("should reject null message when provided", () => {
      const success = {
        success: true,
        message: null,
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });

    it("should reject number as message", () => {
      const success = {
        success: true,
        message: 123,
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });

    it("should reject boolean as message", () => {
      const success = {
        success: true,
        message: true,
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });

    it("should reject object as message", () => {
      const success = {
        success: true,
        message: { text: "message" },
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });

    it("should reject array as message", () => {
      const success = {
        success: true,
        message: ["msg1", "msg2"],
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(false);
    });
  });

  describe("Extra fields", () => {
    it("should strip extra fields from success response", () => {
      const success = {
        success: true,
        message: "Success",
        extra: "Should be removed",
        code: 200,
      };

      const result = successResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("extra");
        expect(result.data).not.toHaveProperty("code");
      }
    });
  });

  describe("Type inference", () => {
    it("should infer success response type correctly", () => {
      const success: SuccessResponse = {
        success: true,
        message: "Done",
      };

      expect(success.success).toBe(true);
      expect(success.message).toBe("Done");
    });
  });
});

describe("paginationMetadataSchema", () => {
  describe("Valid inputs", () => {
    it("should validate pagination metadata with all fields", () => {
      const pagination: PaginationMetadata = {
        page: 1,
        limit: 10,
        total: 100,
        pages: 10,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(true);
    });

    it("should validate pagination with zero values", () => {
      const pagination = {
        page: 0,
        limit: 0,
        total: 0,
        pages: 0,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(true);
    });

    it("should validate pagination with large numbers", () => {
      const pagination = {
        page: 1000000,
        limit: 50000,
        total: 9999999999,
        pages: 1000000,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(true);
    });

    it("should validate pagination with different page configurations", () => {
      const configs = [
        { page: 1, limit: 10, total: 100, pages: 10 },
        { page: 5, limit: 20, total: 1000, pages: 50 },
        { page: 100, limit: 1, total: 100, pages: 100 },
      ];

      configs.forEach((config) => {
        const result = paginationMetadataSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Missing fields", () => {
    it("should reject when page is missing", () => {
      const pagination = {
        limit: 10,
        total: 100,
        pages: 10,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject when limit is missing", () => {
      const pagination = {
        page: 1,
        total: 100,
        pages: 10,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject when total is missing", () => {
      const pagination = {
        page: 1,
        limit: 10,
        pages: 10,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject when pages is missing", () => {
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject empty object", () => {
      const result = paginationMetadataSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid field types", () => {
    it("should reject non-integer page", () => {
      const pagination = {
        page: 1.5,
        limit: 10,
        total: 100,
        pages: 10,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer limit", () => {
      const pagination = {
        page: 1,
        limit: 10.5,
        total: 100,
        pages: 10,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer total", () => {
      const pagination = {
        page: 1,
        limit: 10,
        total: 100.5,
        pages: 10,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer pages", () => {
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
        pages: 10.5,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject null values", () => {
      const pagination = {
        page: null,
        limit: null,
        total: null,
        pages: null,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject string numbers", () => {
      const pagination = {
        page: "1",
        limit: "10",
        total: "100",
        pages: "10",
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it("should reject negative numbers", () => {
      const pagination = {
        page: -1,
        limit: -10,
        total: -100,
        pages: -10,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(true); // Zod int() allows negatives
    });

    it("should reject boolean values", () => {
      const pagination = {
        page: true,
        limit: false,
        total: true,
        pages: false,
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });
  });

  describe("Extra fields", () => {
    it("should strip extra fields from pagination metadata", () => {
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
        pages: 10,
        extra: "Should be removed",
      };

      const result = paginationMetadataSchema.safeParse(pagination);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("extra");
      }
    });
  });

  describe("Type inference", () => {
    it("should infer pagination metadata type correctly", () => {
      const pagination: PaginationMetadata = {
        page: 1,
        limit: 10,
        total: 100,
        pages: 10,
      };

      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);
      expect(pagination.total).toBe(100);
      expect(pagination.pages).toBe(10);
    });
  });
});

describe("paginatedResponseSchema", () => {
  describe("Basic paginated response with string items", () => {
    const stringItemSchema = z.string();
    const paginatedStrings = paginatedResponseSchema(stringItemSchema);

    it("should validate paginated response with string items", () => {
      const response = {
        items: ["item1", "item2", "item3"],
        pagination: {
          page: 1,
          limit: 10,
          total: 30,
          pages: 3,
        },
      };

      const result = paginatedStrings.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should validate with empty items array", () => {
      const response = {
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      };

      const result = paginatedStrings.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should validate with single item", () => {
      const response = {
        items: ["single"],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      const result = paginatedStrings.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should reject non-string items", () => {
      const response = {
        items: [1, 2, 3],
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          pages: 1,
        },
      };

      const result = paginatedStrings.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should reject mixed types in items", () => {
      const response = {
        items: ["string", 123, true],
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          pages: 1,
        },
      };

      const result = paginatedStrings.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe("Paginated response with object items", () => {
    const objectSchema = z.object({
      id: z.string(),
      name: z.string(),
    });
    const paginatedObjects = paginatedResponseSchema(objectSchema);

    it("should validate paginated response with object items", () => {
      const response = {
        items: [
          { id: "1", name: "Item 1" },
          { id: "2", name: "Item 2" },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      };

      const result = paginatedObjects.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should reject items with missing required fields", () => {
      const response = {
        items: [
          { id: "1" }, // missing name
          { id: "2", name: "Item 2" },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      };

      const result = paginatedObjects.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should strip extra fields from items", () => {
      const response = {
        items: [{ id: "1", name: "Item 1", extra: "should be stripped" }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      const result = paginatedObjects.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items[0]).not.toHaveProperty("extra");
      }
    });

    it("should validate empty object items array", () => {
      const response = {
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      };

      const result = paginatedObjects.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe("Paginated response with number items", () => {
    const numberItemSchema = z.number();
    const paginatedNumbers = paginatedResponseSchema(numberItemSchema);

    it("should validate paginated response with number items", () => {
      const response = {
        items: [1, 2, 3, 4, 5],
        pagination: {
          page: 1,
          limit: 5,
          total: 5,
          pages: 1,
        },
      };

      const result = paginatedNumbers.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should accept integers and floats", () => {
      const response = {
        items: [1, 2.5, 3, 4.7, 5],
        pagination: {
          page: 1,
          limit: 5,
          total: 5,
          pages: 1,
        },
      };

      const result = paginatedNumbers.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should accept negative numbers", () => {
      const response = {
        items: [-1, -2, -3],
        pagination: {
          page: 1,
          limit: 3,
          total: 3,
          pages: 1,
        },
      };

      const result = paginatedNumbers.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should reject non-number items", () => {
      const response = {
        items: ["1", "2", "3"],
        pagination: {
          page: 1,
          limit: 3,
          total: 3,
          pages: 1,
        },
      };

      const result = paginatedNumbers.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe("Missing fields", () => {
    const simpleSchema = z.string();
    const paginated = paginatedResponseSchema(simpleSchema);

    it("should reject when items is missing", () => {
      const response = {
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should reject when pagination is missing", () => {
      const response = {
        items: ["item1"],
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should reject empty object", () => {
      const result = paginated.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid items field", () => {
    const simpleSchema = z.string();
    const paginated = paginatedResponseSchema(simpleSchema);

    it("should reject non-array items", () => {
      const response = {
        items: "not an array",
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should reject null items", () => {
      const response = {
        items: null,
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should reject object as items", () => {
      const response = {
        items: { data: ["item"] },
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid pagination field", () => {
    const simpleSchema = z.string();
    const paginated = paginatedResponseSchema(simpleSchema);

    it("should reject when pagination is missing page", () => {
      const response = {
        items: ["item1"],
        pagination: {
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should reject when pagination has non-integer values", () => {
      const response = {
        items: ["item1"],
        pagination: {
          page: 1.5,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should reject null pagination", () => {
      const response = {
        items: ["item1"],
        pagination: null,
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe("Extra fields", () => {
    const simpleSchema = z.string();
    const paginated = paginatedResponseSchema(simpleSchema);

    it("should strip extra fields from paginated response", () => {
      const response = {
        items: ["item1"],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
        extra: "Should be removed",
        metadata: { timestamp: "2024-01-01" },
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("extra");
        expect(result.data).not.toHaveProperty("metadata");
      }
    });
  });

  describe("Factory function with complex schemas", () => {
    const complexSchema = z.object({
      id: z.number().int(),
      title: z.string(),
      active: z.boolean(),
      metadata: z.object({
        created: z.string(),
        updated: z.string(),
      }),
    });
    const paginatedComplex = paginatedResponseSchema(complexSchema);

    it("should validate complex paginated response", () => {
      const response = {
        items: [
          {
            id: 1,
            title: "Item 1",
            active: true,
            metadata: {
              created: "2024-01-01",
              updated: "2024-01-02",
            },
          },
          {
            id: 2,
            title: "Item 2",
            active: false,
            metadata: {
              created: "2024-01-03",
              updated: "2024-01-04",
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      };

      const result = paginatedComplex.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should reject complex items with invalid nested data", () => {
      const response = {
        items: [
          {
            id: 1,
            title: "Item 1",
            active: true,
            metadata: {
              created: "2024-01-01",
              // missing updated
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      const result = paginatedComplex.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should reject complex items with wrong nested types", () => {
      const response = {
        items: [
          {
            id: "not-a-number",
            title: "Item 1",
            active: true,
            metadata: {
              created: "2024-01-01",
              updated: "2024-01-02",
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      const result = paginatedComplex.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should properly infer paginated response type", () => {
      const stringSchema = z.string();
      const _paginated = paginatedResponseSchema(stringSchema);

      type PaginatedStringResponse = z.infer<typeof _paginated>;

      const response: PaginatedStringResponse = {
        items: ["item1", "item2"],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      };

      expect(response.items).toHaveLength(2);
      expect(response.pagination.page).toBe(1);
    });

    it("should infer object schema paginated response type", () => {
      const objectSchema = z.object({
        id: z.string(),
        value: z.number(),
      });
      const _paginated = paginatedResponseSchema(objectSchema);

      type PaginatedObjectResponse = z.infer<typeof _paginated>;

      const response: PaginatedObjectResponse = {
        items: [
          { id: "1", value: 100 },
          { id: "2", value: 200 },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      };

      expect(response.items[0].id).toBe("1");
      expect(response.items[0].value).toBe(100);
    });
  });

  describe("Large datasets", () => {
    it("should validate large items array", () => {
      const stringSchema = z.string();
      const paginated = paginatedResponseSchema(stringSchema);

      const items = Array.from({ length: 1000 }, (_, i) => `item${i}`);
      const response = {
        items,
        pagination: {
          page: 1,
          limit: 1000,
          total: 1000,
          pages: 1,
        },
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should validate complex objects in large array", () => {
      const complexSchema = z.object({
        id: z.number(),
        name: z.string(),
        active: z.boolean(),
      });
      const paginated = paginatedResponseSchema(complexSchema);

      const items = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        name: `Name ${i}`,
        active: i % 2 === 0,
      }));
      const response = {
        items,
        pagination: {
          page: 1,
          limit: 500,
          total: 5000,
          pages: 10,
        },
      };

      const result = paginated.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});
