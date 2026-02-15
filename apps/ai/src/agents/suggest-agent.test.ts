import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseSuggestions, runSuggestAgent } from "./suggest-agent";

// ============================================
// parseSuggestions — pure function, no mocks
// ============================================

describe("parseSuggestions", () => {
  describe("when model outputs a JSON array", () => {
    it("should extract suggestions from a valid JSON array", () => {
      const text = `Here are my suggestions:
[
  {
    "field": "birthPlace",
    "suggestedValue": "Chennai, India",
    "reasoning": "Father was from Chennai",
    "confidence": "high"
  },
  {
    "field": "profession",
    "suggestedValue": "Teacher",
    "reasoning": "Multiple family members were teachers",
    "confidence": "medium"
  }
]`;
      const result = parseSuggestions(text);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        field: "birthPlace",
        suggestedValue: "Chennai, India",
        reasoning: "Father was from Chennai",
        confidence: "high",
      });
      expect(result[1]).toEqual({
        field: "profession",
        suggestedValue: "Teacher",
        reasoning: "Multiple family members were teachers",
        confidence: "medium",
      });
    });

    it("should skip entries missing required field or suggestedValue", () => {
      const text = `[
  { "field": "birthPlace", "suggestedValue": "Delhi", "confidence": "low" },
  { "field": "profession" },
  { "suggestedValue": "Engineer" }
]`;
      const result = parseSuggestions(text);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("birthPlace");
    });

    it("should default confidence to 'low' when invalid", () => {
      const text = `[{ "field": "birthPlace", "suggestedValue": "Delhi", "confidence": "very-high" }]`;

      const result = parseSuggestions(text);

      expect(result[0].confidence).toBe("low");
    });

    it("should default reasoning to empty string when missing", () => {
      const text = `[{ "field": "birthPlace", "suggestedValue": "Delhi" }]`;

      const result = parseSuggestions(text);

      expect(result[0].reasoning).toBe("");
    });

    it("should coerce values to strings", () => {
      const text = `[{ "field": 123, "suggestedValue": true, "reasoning": "because", "confidence": "high" }]`;

      const result = parseSuggestions(text);

      expect(result[0].field).toBe("123");
      expect(result[0].suggestedValue).toBe("true");
      expect(result[0].reasoning).toBe("because");
    });

    it("should default reasoning to empty string when reasoning is null", () => {
      const text = `[{ "field": "birthPlace", "suggestedValue": "Delhi", "reasoning": null }]`;

      const result = parseSuggestions(text);

      // null ?? "" evaluates to "" (nullish coalescing)
      expect(result[0].reasoning).toBe("");
    });

    it("should return empty array when JSON array is empty", () => {
      expect(parseSuggestions("[]")).toHaveLength(0);
    });

    it("should fall through to markdown when JSON array contains null entries", () => {
      // null.field throws TypeError, caught by try-catch, falls through to text parsing
      const text = `[1, "string", null, { "field": "x", "suggestedValue": "y" }]`;

      const result = parseSuggestions(text);

      // JSON parsing fails on null.field access, text fallback finds nothing
      expect(result).toHaveLength(0);
    });

    it("should handle JSON array with only primitive non-null entries", () => {
      // Numbers and strings have no .field property, so they're skipped
      const text = `[1, "string", { "field": "x", "suggestedValue": "y" }]`;

      const result = parseSuggestions(text);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("x");
    });
  });

  describe("when model outputs markdown bullet points", () => {
    it("should extract suggestions from markdown format", () => {
      const text = `Here are my suggestions:

**field**: birthPlace
**suggestedValue**: "Madurai, Tamil Nadu"
**reasoning**: Father was born in Madurai
**confidence**: high

**field**: profession
**suggestedValue**: "Farmer"
**reasoning**: Common profession in the region at that time
**confidence**: medium`;

      const result = parseSuggestions(text);

      expect(result).toHaveLength(2);
      expect(result[0].field).toBe("birthPlace");
      expect(result[0].suggestedValue).toBe("Madurai, Tamil Nadu");
      expect(result[0].reasoning).toBe("Father was born in Madurai");
      expect(result[0].confidence).toBe("high");
      expect(result[1].field).toBe("profession");
      expect(result[1].suggestedValue).toBe("Farmer");
    });

    it("should handle suggestion with field and value but no reasoning or confidence", () => {
      const text = `**field**: dateOfBirth
**suggestedValue**: "1950"`;

      const result = parseSuggestions(text);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        field: "dateOfBirth",
        suggestedValue: "1950",
        reasoning: "",
        confidence: "low",
      });
    });

    it("should handle backtick-quoted field names", () => {
      const text = `**field**: \`nativePlace\`
**suggestedValue**: \`Thanjavur\`
**reasoning**: All known siblings list Thanjavur
**confidence**: high`;

      const result = parseSuggestions(text);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("nativePlace");
    });
  });

  describe("edge cases", () => {
    it("should return empty array when text has no suggestions", () => {
      expect(parseSuggestions("I couldn't find any suggestions.")).toHaveLength(
        0
      );
    });

    it("should return empty array for empty string", () => {
      expect(parseSuggestions("")).toHaveLength(0);
    });

    it("should handle malformed JSON followed by valid markdown", () => {
      const text = `Here: [{ broken json }]

**field**: birthPlace
**suggestedValue**: "Chennai"
**confidence**: medium`;

      const result = parseSuggestions(text);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("birthPlace");
    });

    it("should prefer JSON array over markdown when both are present", () => {
      const text = `[{ "field": "birthPlace", "suggestedValue": "JSON Value", "confidence": "high" }]

**field**: birthPlace
**suggestedValue**: "Markdown Value"`;

      const result = parseSuggestions(text);

      expect(result).toHaveLength(1);
      expect(result[0].suggestedValue).toBe("JSON Value");
    });

    it("should not match non-array JSON objects", () => {
      const text = `{ "field": "birthPlace", "suggestedValue": "Delhi" }

No valid format found.`;

      const result = parseSuggestions(text);

      expect(result).toHaveLength(0);
    });
  });
});

// ============================================
// runSuggestAgent — needs AI SDK mock
// ============================================

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mockGenerateText,
  stepCountIs: (n: number) => ({ type: "step-count", count: n }),
  tool: (def: any) => def,
}));

vi.mock("../providers/llm", () => ({
  createModel: () => ({ modelId: "test-model" }),
}));

describe("runSuggestAgent", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("should generate suggestions with person name in prompt", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: `[{ "field": "birthPlace", "suggestedValue": "Chennai", "reasoning": "Family pattern", "confidence": "high" }]`,
      steps: [{ toolCalls: [{ name: "get_person_details" }] }],
    });

    const result = await runSuggestAgent({
      personId: "p-123",
      personName: "Hari Prasad",
    });

    expect(result.personId).toBe("p-123");
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].field).toBe("birthPlace");
    expect(result.toolCallCount).toBe(1);

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.prompt).toContain("Hari Prasad");
    expect(callArgs.prompt).toContain("p-123");
  });

  it("should generate suggestions with only person ID in prompt", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "No suggestions available.",
      steps: [],
    });

    const result = await runSuggestAgent({ personId: "p-456" });

    expect(result.personId).toBe("p-456");
    expect(result.suggestions).toHaveLength(0);
    expect(result.toolCallCount).toBe(0);

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.prompt).toContain("person ID p-456");
    expect(callArgs.prompt).not.toContain("personName");
  });

  it("should sanitize raw response text", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "assistant: Here are suggestions.\n\n\n\nNo data.",
      steps: [],
    });

    const result = await runSuggestAgent({ personId: "p-789" });

    expect(result.rawResponse).toBe("Here are suggestions.\n\nNo data.");
  });

  it("should count tool calls across multiple steps", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "[]",
      steps: [
        {
          toolCalls: [
            { name: "get_person_details" },
            { name: "find_ancestors" },
          ],
        },
        { toolCalls: [{ name: "search_people" }] },
        { toolCalls: undefined },
      ],
    });

    const result = await runSuggestAgent({ personId: "p-1" });

    expect(result.toolCallCount).toBe(3);
  });
});
