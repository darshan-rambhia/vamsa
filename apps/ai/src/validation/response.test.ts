import { describe, expect, it } from "vitest";
import {
  sanitizeOutput,
  storyResponseSchema,
  suggestResponseSchema,
  suggestionSchema,
} from "./response";

describe("sanitizeOutput", () => {
  it("should remove 'system:' prefix from text", () => {
    expect(sanitizeOutput("system: This is a response")).toBe(
      "This is a response"
    );
  });

  it("should remove 'assistant:' prefix from text", () => {
    expect(sanitizeOutput("assistant: Here is the answer")).toBe(
      "Here is the answer"
    );
  });

  it("should remove 'user:' prefix from text", () => {
    expect(sanitizeOutput("user: Some leaked prompt")).toBe(
      "Some leaked prompt"
    );
  });

  it("should handle case-insensitive role prefixes", () => {
    expect(sanitizeOutput("SYSTEM: uppercase prefix")).toBe("uppercase prefix");
    expect(sanitizeOutput("Assistant: mixed case")).toBe("mixed case");
  });

  it("should remove role prefixes appearing on multiple lines", () => {
    const input = "system: leaked\nassistant: more leaked\nActual content";
    expect(sanitizeOutput(input)).toBe("leaked\nmore leaked\nActual content");
  });

  it("should collapse triple+ newlines into double newlines", () => {
    expect(sanitizeOutput("Paragraph 1\n\n\n\nParagraph 2")).toBe(
      "Paragraph 1\n\nParagraph 2"
    );
  });

  it("should collapse many newlines into double newlines", () => {
    expect(sanitizeOutput("A\n\n\n\n\n\nB")).toBe("A\n\nB");
  });

  it("should preserve double newlines", () => {
    expect(sanitizeOutput("Paragraph 1\n\nParagraph 2")).toBe(
      "Paragraph 1\n\nParagraph 2"
    );
  });

  it("should trim leading and trailing whitespace", () => {
    expect(sanitizeOutput("  Hello world  ")).toBe("Hello world");
  });

  it("should handle combined sanitization", () => {
    const input =
      "system: leaked prompt\n\n\n\nassistant: Here is the story.\n\n\n\nThe end.  ";
    const result = sanitizeOutput(input);

    expect(result).toBe("leaked prompt\n\nHere is the story.\n\nThe end.");
  });

  it("should handle empty string", () => {
    expect(sanitizeOutput("")).toBe("");
  });

  it("should pass through clean text unchanged", () => {
    const clean = "Hari Prasad was born in 1945 in a small village.";
    expect(sanitizeOutput(clean)).toBe(clean);
  });
});

describe("storyResponseSchema", () => {
  it("should validate a complete story response", () => {
    const valid = {
      narrative: "A".repeat(50),
      personName: "Hari Prasad",
      factsUsed: ["born in 1945", "married in 1970"],
      dataSources: ["person-123"],
    };

    const result = storyResponseSchema.safeParse(valid);

    expect(result.success).toBe(true);
  });

  it("should reject narrative shorter than 50 characters", () => {
    const invalid = {
      narrative: "Too short",
      personName: "Test",
      factsUsed: [],
      dataSources: [],
    };

    const result = storyResponseSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("should reject missing required fields", () => {
    const result = storyResponseSchema.safeParse({
      narrative: "A".repeat(50),
    });

    expect(result.success).toBe(false);
  });
});

describe("suggestionSchema", () => {
  it("should validate a complete suggestion", () => {
    const valid = {
      field: "birthPlace",
      suggestedValue: "Chennai, India",
      reasoning: "Parents were from Chennai",
      confidence: "medium",
    };

    const result = suggestionSchema.safeParse(valid);

    expect(result.success).toBe(true);
  });

  it("should accept all valid confidence levels", () => {
    for (const confidence of ["low", "medium", "high"]) {
      const result = suggestionSchema.safeParse({
        field: "profession",
        suggestedValue: "Engineer",
        reasoning: "Family pattern",
        confidence,
      });

      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid confidence level", () => {
    const result = suggestionSchema.safeParse({
      field: "birthPlace",
      suggestedValue: "Delhi",
      reasoning: "Guess",
      confidence: "very-high",
    });

    expect(result.success).toBe(false);
  });
});

describe("suggestResponseSchema", () => {
  it("should validate a complete suggest response", () => {
    const valid = {
      personId: "person-123",
      personName: "Lakshmi",
      suggestions: [
        {
          field: "birthPlace",
          suggestedValue: "Madurai",
          reasoning: "Father born in Madurai",
          confidence: "high",
        },
      ],
    };

    const result = suggestResponseSchema.safeParse(valid);

    expect(result.success).toBe(true);
  });

  it("should validate response with empty suggestions array", () => {
    const valid = {
      personId: "person-456",
      personName: "Ravi",
      suggestions: [],
    };

    const result = suggestResponseSchema.safeParse(valid);

    expect(result.success).toBe(true);
  });

  it("should reject missing personId", () => {
    const result = suggestResponseSchema.safeParse({
      personName: "Test",
      suggestions: [],
    });

    expect(result.success).toBe(false);
  });
});
