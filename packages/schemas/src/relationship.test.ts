import { describe, expect, test } from "bun:test";
import {
  relationshipCreateSchema,
  relationshipTypeEnum,
  relationshipUpdateSchema,
} from "./relationship";

describe("relationshipTypeEnum", () => {
  test("accepts PARENT relationship type", () => {
    const result = relationshipTypeEnum.safeParse("PARENT");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("PARENT");
    }
  });

  test("accepts CHILD relationship type", () => {
    const result = relationshipTypeEnum.safeParse("CHILD");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("CHILD");
    }
  });

  test("accepts SPOUSE relationship type", () => {
    const result = relationshipTypeEnum.safeParse("SPOUSE");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("SPOUSE");
    }
  });

  test("accepts SIBLING relationship type", () => {
    const result = relationshipTypeEnum.safeParse("SIBLING");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("SIBLING");
    }
  });

  test("rejects invalid relationship type", () => {
    const result = relationshipTypeEnum.safeParse("COUSIN");
    expect(result.success).toBe(false);
  });

  test("rejects lowercase relationship type", () => {
    const result = relationshipTypeEnum.safeParse("parent");
    expect(result.success).toBe(false);
  });

  test("rejects empty string", () => {
    const result = relationshipTypeEnum.safeParse("");
    expect(result.success).toBe(false);
  });

  test("rejects null", () => {
    const result = relationshipTypeEnum.safeParse(null);
    expect(result.success).toBe(false);
  });

  test("rejects undefined", () => {
    const result = relationshipTypeEnum.safeParse(undefined);
    expect(result.success).toBe(false);
  });
});

describe("relationshipCreateSchema", () => {
  describe("required fields", () => {
    test("validates with all required fields", () => {
      const validRelationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(validRelationship);
      expect(result.success).toBe(true);
    });

    test("requires personId", () => {
      const invalidRelationship = {
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
    });

    test("requires relatedPersonId", () => {
      const invalidRelationship = {
        personId: "person-1",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
    });

    test("requires type", () => {
      const invalidRelationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
      };

      const result = relationshipCreateSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
    });

    test("rejects empty personId", () => {
      const invalidRelationship = {
        personId: "",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
    });

    test("rejects empty relatedPersonId", () => {
      const invalidRelationship = {
        personId: "person-1",
        relatedPersonId: "",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
    });

    test("accepts whitespace-only personId (not trimmed)", () => {
      const relationship = {
        personId: "   ",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
    });

    test("accepts whitespace-only relatedPersonId (not trimmed)", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "   ",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
    });
  });

  describe("type validation", () => {
    test("accepts PARENT type", () => {
      const validRelationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "PARENT",
      };

      const result = relationshipCreateSchema.safeParse(validRelationship);
      expect(result.success).toBe(true);
    });

    test("accepts CHILD type", () => {
      const validRelationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "CHILD",
      };

      const result = relationshipCreateSchema.safeParse(validRelationship);
      expect(result.success).toBe(true);
    });

    test("accepts SPOUSE type", () => {
      const validRelationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(validRelationship);
      expect(result.success).toBe(true);
    });

    test("accepts SIBLING type", () => {
      const validRelationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SIBLING",
      };

      const result = relationshipCreateSchema.safeParse(validRelationship);
      expect(result.success).toBe(true);
    });

    test("rejects invalid type", () => {
      const invalidRelationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "GRANDPARENT",
      };

      const result = relationshipCreateSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields", () => {
    test("isActive defaults to true", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
      }
    });

    test("isActive can be set to false", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: false,
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(false);
      }
    });

    test("isActive can be set to true", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
      }
    });

    test("marriageDate is optional and transforms to null when omitted", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.marriageDate).toBeNull();
      }
    });

    test("divorceDate is optional and transforms to null when omitted", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.divorceDate).toBeNull();
      }
    });
  });

  describe("date field transformations", () => {
    test("transforms marriageDate string to Date", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: "2020-06-15",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.marriageDate).toBeInstanceOf(Date);
      }
    });

    test("transforms divorceDate string to Date", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        divorceDate: "2023-01-10",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.divorceDate).toBeInstanceOf(Date);
      }
    });

    test("accepts Date object for marriageDate", () => {
      const dateObj = new Date("2020-06-15");
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: dateObj,
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.marriageDate).toBeInstanceOf(Date);
      }
    });

    test("accepts Date object for divorceDate", () => {
      const dateObj = new Date("2023-01-10");
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        divorceDate: dateObj,
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.divorceDate).toBeInstanceOf(Date);
      }
    });

    test("converts null marriageDate to null", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: null,
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.marriageDate).toBeNull();
      }
    });

    test("converts null divorceDate to null", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        divorceDate: null,
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.divorceDate).toBeNull();
      }
    });

    test("converts undefined marriageDate to null", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: undefined,
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.marriageDate).toBeNull();
      }
    });

    test("converts undefined divorceDate to null", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        divorceDate: undefined,
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.divorceDate).toBeNull();
      }
    });

    test("handles invalid marriageDate gracefully", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: "invalid-date",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should transform to null if invalid
        expect(result.data.marriageDate).toBeNull();
      }
    });

    test("handles invalid divorceDate gracefully", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        divorceDate: "not-a-date",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.divorceDate).toBeNull();
      }
    });

    test("handles ISO date format with time", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: "2020-06-15T10:30:00Z",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.marriageDate).toBeInstanceOf(Date);
      }
    });
  });

  describe("complex scenarios", () => {
    test("validates complete relationship with all fields", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: "2020-06-15",
        divorceDate: null,
        isActive: true,
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.personId).toBe("person-1");
        expect(result.data.relatedPersonId).toBe("person-2");
        expect(result.data.type).toBe("SPOUSE");
        expect(result.data.marriageDate).toBeInstanceOf(Date);
        expect(result.data.divorceDate).toBeNull();
        expect(result.data.isActive).toBe(true);
      }
    });

    test("validates parent-child relationship", () => {
      const relationship = {
        personId: "child-id",
        relatedPersonId: "parent-id",
        type: "PARENT",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
    });

    test("validates sibling relationship", () => {
      const relationship = {
        personId: "sibling-1",
        relatedPersonId: "sibling-2",
        type: "SIBLING",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(true);
    });

    test("rejects non-string personId", () => {
      const relationship = {
        personId: 123,
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(false);
    });

    test("rejects non-string relatedPersonId", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: 456,
        type: "SPOUSE",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(false);
    });

    test("rejects non-boolean isActive", () => {
      const relationship = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: "true",
      };

      const result = relationshipCreateSchema.safeParse(relationship);
      expect(result.success).toBe(false);
    });
  });
});

describe("relationshipUpdateSchema", () => {
  test("is a partial schema - allows empty object", () => {
    const result = relationshipUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("allows partial personId update", () => {
    const result = relationshipUpdateSchema.safeParse({
      personId: "updated-person",
    });
    expect(result.success).toBe(true);
  });

  test("allows partial relatedPersonId update", () => {
    const result = relationshipUpdateSchema.safeParse({
      relatedPersonId: "updated-related",
    });
    expect(result.success).toBe(true);
  });

  test("allows partial type update", () => {
    const result = relationshipUpdateSchema.safeParse({
      type: "SIBLING",
    });
    expect(result.success).toBe(true);
  });

  test("allows partial marriageDate update", () => {
    const result = relationshipUpdateSchema.safeParse({
      marriageDate: "2021-01-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.marriageDate).toBeInstanceOf(Date);
    }
  });

  test("allows partial divorceDate update", () => {
    const result = relationshipUpdateSchema.safeParse({
      divorceDate: "2023-01-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.divorceDate).toBeInstanceOf(Date);
    }
  });

  test("allows partial isActive update", () => {
    const result = relationshipUpdateSchema.safeParse({
      isActive: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });

  test("allows updating multiple fields", () => {
    const result = relationshipUpdateSchema.safeParse({
      type: "PARENT",
      marriageDate: null,
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  test("still validates type constraints on partial updates", () => {
    const result = relationshipUpdateSchema.safeParse({
      type: "INVALID_TYPE",
    });
    expect(result.success).toBe(false);
  });

  test("still validates personId minimum length on partial updates", () => {
    const result = relationshipUpdateSchema.safeParse({
      personId: "",
    });
    expect(result.success).toBe(false);
  });

  test("still validates relatedPersonId minimum length on partial updates", () => {
    const result = relationshipUpdateSchema.safeParse({
      relatedPersonId: "",
    });
    expect(result.success).toBe(false);
  });

  test("allows null for optional date fields in update", () => {
    const result = relationshipUpdateSchema.safeParse({
      marriageDate: null,
      divorceDate: null,
    });
    expect(result.success).toBe(true);
  });

  test("transforms dates in update schema", () => {
    const result = relationshipUpdateSchema.safeParse({
      marriageDate: "2022-03-15",
      divorceDate: "2024-02-20",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.marriageDate).toBeInstanceOf(Date);
      expect(result.data.divorceDate).toBeInstanceOf(Date);
    }
  });
});

describe("PersonId and RelatedPersonId Format", () => {
  test("accepts alphanumeric personId", () => {
    const relationship = {
      personId: "person123",
      relatedPersonId: "person-456",
      type: "SPOUSE",
    };

    const result = relationshipCreateSchema.safeParse(relationship);
    expect(result.success).toBe(true);
  });

  test("accepts UUID-style personId", () => {
    const relationship = {
      personId: "550e8400-e29b-41d4-a716-446655440000",
      relatedPersonId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      type: "SPOUSE",
    };

    const result = relationshipCreateSchema.safeParse(relationship);
    expect(result.success).toBe(true);
  });

  test("accepts personId with special characters", () => {
    const relationship = {
      personId: "person-id_123",
      relatedPersonId: "related_id-456",
      type: "SPOUSE",
    };

    const result = relationshipCreateSchema.safeParse(relationship);
    expect(result.success).toBe(true);
  });
});
