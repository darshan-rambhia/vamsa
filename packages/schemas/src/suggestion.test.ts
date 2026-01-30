/**
 * Unit Tests for Suggestion Schemas
 * Tests Zod schema validation for suggestion creation, review, and status management
 */
import { describe, expect, it } from "bun:test";
import {
  suggestionCreateSchema,
  suggestionReviewSchema,
  suggestionStatusEnum,
  suggestionTypeEnum,
} from "./suggestion";
import type {
  SuggestionCreateInput,
  SuggestionReviewInput,
  SuggestionStatus,
  SuggestionType,
} from "./suggestion";

describe("suggestionTypeEnum", () => {
  it("should accept all valid suggestion types", () => {
    const validTypes: Array<SuggestionType> = [
      "CREATE",
      "UPDATE",
      "DELETE",
      "ADD_RELATIONSHIP",
    ];

    validTypes.forEach((type) => {
      const result = suggestionTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(type);
      }
    });
  });

  it("should reject invalid suggestion types", () => {
    const invalidTypes = [
      "create",
      "update",
      "delete",
      "add_relationship",
      "EDIT",
      "REMOVE",
      "INVALID",
      "",
      null,
      123,
      undefined,
    ];

    invalidTypes.forEach((type) => {
      const result = suggestionTypeEnum.safeParse(type);
      expect(result.success).toBe(false);
    });
  });

  it("should reject lowercase CREATE", () => {
    const result = suggestionTypeEnum.safeParse("create");
    expect(result.success).toBe(false);
  });

  it("should reject lowercase UPDATE", () => {
    const result = suggestionTypeEnum.safeParse("update");
    expect(result.success).toBe(false);
  });

  it("should reject lowercase DELETE", () => {
    const result = suggestionTypeEnum.safeParse("delete");
    expect(result.success).toBe(false);
  });

  it("should reject lowercase ADD_RELATIONSHIP", () => {
    const result = suggestionTypeEnum.safeParse("add_relationship");
    expect(result.success).toBe(false);
  });

  it("should accept CREATE type", () => {
    const result = suggestionTypeEnum.safeParse("CREATE");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("CREATE");
    }
  });

  it("should accept UPDATE type", () => {
    const result = suggestionTypeEnum.safeParse("UPDATE");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("UPDATE");
    }
  });

  it("should accept DELETE type", () => {
    const result = suggestionTypeEnum.safeParse("DELETE");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("DELETE");
    }
  });

  it("should accept ADD_RELATIONSHIP type", () => {
    const result = suggestionTypeEnum.safeParse("ADD_RELATIONSHIP");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("ADD_RELATIONSHIP");
    }
  });

  it("should reject empty string", () => {
    const result = suggestionTypeEnum.safeParse("");
    expect(result.success).toBe(false);
  });

  it("should reject null value", () => {
    const result = suggestionTypeEnum.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("should reject number", () => {
    const result = suggestionTypeEnum.safeParse(123);
    expect(result.success).toBe(false);
  });

  it("should reject object", () => {
    const result = suggestionTypeEnum.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("suggestionStatusEnum", () => {
  it("should accept all valid suggestion statuses", () => {
    const validStatuses: Array<SuggestionStatus> = [
      "PENDING",
      "APPROVED",
      "REJECTED",
    ];

    validStatuses.forEach((status) => {
      const result = suggestionStatusEnum.safeParse(status);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(status);
      }
    });
  });

  it("should reject invalid suggestion statuses", () => {
    const invalidStatuses = [
      "pending",
      "approved",
      "rejected",
      "ACCEPTED",
      "DENIED",
      "IN_PROGRESS",
      "",
      null,
      123,
      undefined,
    ];

    invalidStatuses.forEach((status) => {
      const result = suggestionStatusEnum.safeParse(status);
      expect(result.success).toBe(false);
    });
  });

  it("should reject lowercase PENDING", () => {
    const result = suggestionStatusEnum.safeParse("pending");
    expect(result.success).toBe(false);
  });

  it("should reject lowercase APPROVED", () => {
    const result = suggestionStatusEnum.safeParse("approved");
    expect(result.success).toBe(false);
  });

  it("should reject lowercase REJECTED", () => {
    const result = suggestionStatusEnum.safeParse("rejected");
    expect(result.success).toBe(false);
  });

  it("should accept PENDING status", () => {
    const result = suggestionStatusEnum.safeParse("PENDING");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("PENDING");
    }
  });

  it("should accept APPROVED status", () => {
    const result = suggestionStatusEnum.safeParse("APPROVED");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("APPROVED");
    }
  });

  it("should accept REJECTED status", () => {
    const result = suggestionStatusEnum.safeParse("REJECTED");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("REJECTED");
    }
  });

  it("should reject empty string", () => {
    const result = suggestionStatusEnum.safeParse("");
    expect(result.success).toBe(false);
  });

  it("should reject null value", () => {
    const result = suggestionStatusEnum.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("should reject number", () => {
    const result = suggestionStatusEnum.safeParse(123);
    expect(result.success).toBe(false);
  });

  it("should reject object", () => {
    const result = suggestionStatusEnum.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("suggestionCreateSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete suggestion creation", () => {
      const suggestion: SuggestionCreateInput = {
        type: "CREATE",
        targetPersonId: "person-123",
        suggestedData: {
          firstName: "John",
          lastName: "Doe",
        },
        reason: "User submitted via form",
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate suggestion with minimal required fields", () => {
      const suggestion = {
        type: "UPDATE",
        suggestedData: {
          email: "john@example.com",
        },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate CREATE type suggestion", () => {
      const suggestion = {
        type: "CREATE",
        suggestedData: { name: "Test" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate UPDATE type suggestion", () => {
      const suggestion = {
        type: "UPDATE",
        suggestedData: { age: 30 },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate DELETE type suggestion", () => {
      const suggestion = {
        type: "DELETE",
        suggestedData: {},
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate ADD_RELATIONSHIP type suggestion", () => {
      const suggestion = {
        type: "ADD_RELATIONSHIP",
        suggestedData: {
          relatedPersonId: "person-456",
          relationshipType: "PARENT",
        },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate suggestion with null targetPersonId", () => {
      const suggestion = {
        type: "CREATE",
        targetPersonId: null,
        suggestedData: { firstName: "Jane" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate suggestion with undefined targetPersonId", () => {
      const suggestion = {
        type: "UPDATE",
        targetPersonId: undefined,
        suggestedData: { lastName: "Smith" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate suggestion with undefined reason", () => {
      const suggestion = {
        type: "DELETE",
        suggestedData: {},
        reason: undefined,
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate suggestion with empty suggestedData object", () => {
      const suggestion = {
        type: "UPDATE",
        suggestedData: {},
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate suggestion with complex suggestedData", () => {
      const suggestion = {
        type: "UPDATE",
        suggestedData: {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1990-01-15",
          email: "john@example.com",
          nested: {
            deep: {
              value: 123,
            },
          },
          array: [1, 2, 3],
        },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should accept reason as optional", () => {
      const suggestion = {
        type: "CREATE",
        suggestedData: { name: "Test" },
        reason: undefined,
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should accept all valid types", () => {
      const types = ["CREATE", "UPDATE", "DELETE", "ADD_RELATIONSHIP"];

      types.forEach((type) => {
        const suggestion = {
          type: type as any,
          suggestedData: { test: "data" },
        };

        const result = suggestionCreateSchema.safeParse(suggestion);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Type validation", () => {
    it("should reject missing type", () => {
      const suggestion = {
        suggestedData: { name: "Test" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should reject null type", () => {
      const suggestion = {
        type: null,
        suggestedData: { name: "Test" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should reject invalid type value", () => {
      const suggestion = {
        type: "INVALID",
        suggestedData: { name: "Test" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should reject lowercase type", () => {
      const suggestion = {
        type: "create",
        suggestedData: { name: "Test" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });
  });

  describe("TargetPersonId validation", () => {
    it("should accept string targetPersonId", () => {
      const suggestion = {
        type: "UPDATE",
        targetPersonId: "person-123",
        suggestedData: { name: "Test" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should accept null targetPersonId", () => {
      const suggestion = {
        type: "CREATE",
        targetPersonId: null,
        suggestedData: { name: "Test" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should accept undefined targetPersonId", () => {
      const suggestion = {
        type: "DELETE",
        targetPersonId: undefined,
        suggestedData: {},
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should reject number targetPersonId", () => {
      const suggestion = {
        type: "UPDATE",
        targetPersonId: 123 as any,
        suggestedData: { name: "Test" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should accept empty string targetPersonId", () => {
      const suggestion = {
        type: "UPDATE",
        targetPersonId: "",
        suggestedData: { name: "Test" },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });
  });

  describe("SuggestedData validation", () => {
    it("should reject missing suggestedData", () => {
      const suggestion = {
        type: "UPDATE",
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should reject null suggestedData", () => {
      const suggestion = {
        type: "UPDATE",
        suggestedData: null,
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should reject non-object suggestedData", () => {
      const suggestion = {
        type: "UPDATE",
        suggestedData: "not-an-object" as any,
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should accept empty object suggestedData", () => {
      const suggestion = {
        type: "DELETE",
        suggestedData: {},
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should accept suggestedData with various value types", () => {
      const suggestion = {
        type: "UPDATE",
        suggestedData: {
          string: "value",
          number: 123,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: true },
        },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should accept suggestedData with numeric keys", () => {
      const suggestion = {
        type: "UPDATE",
        suggestedData: {
          field1: "value1",
          field2: "value2",
        },
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });
  });

  describe("Reason validation", () => {
    it("should accept string reason", () => {
      const suggestion = {
        type: "CREATE",
        suggestedData: { name: "Test" },
        reason: "User requested this change",
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should accept empty string reason", () => {
      const suggestion = {
        type: "CREATE",
        suggestedData: { name: "Test" },
        reason: "",
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should accept undefined reason", () => {
      const suggestion = {
        type: "CREATE",
        suggestedData: { name: "Test" },
        reason: undefined,
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should reject null reason", () => {
      const suggestion = {
        type: "CREATE",
        suggestedData: { name: "Test" },
        reason: null as any,
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should reject number reason", () => {
      const suggestion = {
        type: "CREATE",
        suggestedData: { name: "Test" },
        reason: 123 as any,
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should accept long string reason", () => {
      const suggestion = {
        type: "CREATE",
        suggestedData: { name: "Test" },
        reason: "x".repeat(1000),
      };

      const result = suggestionCreateSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });
  });

  describe("Type inference", () => {
    it("should infer correct suggestion create input type", () => {
      const suggestion: SuggestionCreateInput = {
        type: "CREATE",
        suggestedData: { name: "Test" },
      };

      expect(suggestion.type).toBe("CREATE");
      expect(suggestion.suggestedData.name).toBe("Test");
    });

    it("should handle inferred type with all fields", () => {
      const suggestion: SuggestionCreateInput = {
        type: "UPDATE",
        targetPersonId: "person-123",
        suggestedData: { email: "test@example.com" },
        reason: "Correction",
      };

      expect(suggestion.targetPersonId).toBe("person-123");
      expect(suggestion.reason).toBe("Correction");
    });
  });
});

describe("suggestionReviewSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete review with APPROVED status", () => {
      const review: SuggestionReviewInput = {
        status: "APPROVED",
        reviewNote: "Looks good to approve",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should validate complete review with REJECTED status", () => {
      const review: SuggestionReviewInput = {
        status: "REJECTED",
        reviewNote: "Does not meet requirements",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should validate review with APPROVED status only", () => {
      const review = {
        status: "APPROVED" as const,
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should validate review with REJECTED status only", () => {
      const review = {
        status: "REJECTED" as const,
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should validate review with undefined reviewNote", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: undefined,
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should validate review with empty string reviewNote", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: "",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should accept both valid statuses", () => {
      const statuses = ["APPROVED", "REJECTED"];

      statuses.forEach((status) => {
        const review = {
          status: status as any,
        };

        const result = suggestionReviewSchema.safeParse(review);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Status validation", () => {
    it("should reject missing status", () => {
      const review = {
        reviewNote: "Some note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject null status", () => {
      const review = {
        status: null,
        reviewNote: "Some note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject undefined status", () => {
      const review = {
        status: undefined,
        reviewNote: "Some note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject lowercase status", () => {
      const review = {
        status: "approved",
        reviewNote: "Some note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject invalid status", () => {
      const review = {
        status: "PENDING",
        reviewNote: "Some note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject PENDING status", () => {
      const review = {
        status: "PENDING" as any,
        reviewNote: "Some note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject unknown status value", () => {
      const review = {
        status: "UNKNOWN",
        reviewNote: "Some note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject empty string status", () => {
      const review = {
        status: "",
        reviewNote: "Some note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject number status", () => {
      const review = {
        status: 123 as any,
        reviewNote: "Some note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });
  });

  describe("ReviewNote validation", () => {
    it("should accept string reviewNote", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: "Good to go",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should accept undefined reviewNote", () => {
      const review = {
        status: "REJECTED" as const,
        reviewNote: undefined,
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should accept empty string reviewNote", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: "",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should reject null reviewNote", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: null as any,
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject number reviewNote", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: 123 as any,
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should accept long string reviewNote", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: "x".repeat(5000),
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should accept reviewNote with special characters", () => {
      const review = {
        status: "REJECTED" as const,
        reviewNote: "This needs fixing! @#$%^&*()_+-=[]{}|;:',.<>?/`~",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });
  });

  describe("Type inference", () => {
    it("should infer correct review input type", () => {
      const review: SuggestionReviewInput = {
        status: "APPROVED",
      };

      expect(review.status).toBe("APPROVED");
    });

    it("should handle inferred type with all fields", () => {
      const review: SuggestionReviewInput = {
        status: "REJECTED",
        reviewNote: "Not suitable",
      };

      expect(review.status).toBe("REJECTED");
      expect(review.reviewNote).toBe("Not suitable");
    });
  });

  describe("Edge cases", () => {
    it("should validate review with only status field", () => {
      const review = { status: "APPROVED" as const };
      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should handle extra properties gracefully", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: "Good",
        extraField: "should be ignored",
      } as any;

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it("should reject object as status", () => {
      const review = {
        status: {} as any,
        reviewNote: "Note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject array as status", () => {
      const review = {
        status: [] as any,
        reviewNote: "Note",
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject object as reviewNote", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: {} as any,
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it("should reject array as reviewNote", () => {
      const review = {
        status: "APPROVED" as const,
        reviewNote: [] as any,
      };

      const result = suggestionReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });
  });
});

describe("Type exports", () => {
  it("should have SuggestionType exported", () => {
    const type: SuggestionType = "CREATE";
    expect(type).toBe("CREATE");
  });

  it("should have SuggestionStatus exported", () => {
    const status: SuggestionStatus = "APPROVED";
    expect(status).toBe("APPROVED");
  });

  it("should have SuggestionCreateInput exported", () => {
    const input: SuggestionCreateInput = {
      type: "UPDATE",
      suggestedData: { test: "value" },
    };
    expect(input.type).toBe("UPDATE");
  });

  it("should have SuggestionReviewInput exported", () => {
    const input: SuggestionReviewInput = {
      status: "APPROVED",
    };
    expect(input.status).toBe("APPROVED");
  });
});
