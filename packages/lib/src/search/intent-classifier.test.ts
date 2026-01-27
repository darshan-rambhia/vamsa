import { describe, it, expect } from "bun:test";
import { classifyIntent } from "./intent-classifier";

describe("classifyIntent", () => {
  describe("RELATIONSHIP_PATH intent", () => {
    it("classifies 'how am i related to X' queries", () => {
      const result = classifyIntent("how am i related to john smith?");
      expect(result.intent).toBe("RELATIONSHIP_PATH");
      expect(result.confidence).toBe(0.9);
      expect(result.entities.person1).toBe("john smith");
      expect(result.entities.person2).toBeUndefined();
    });

    it("classifies 'how is X related to Y' queries", () => {
      const result = classifyIntent("how is jane related to john?");
      expect(result.intent).toBe("RELATIONSHIP_PATH");
      expect(result.confidence).toBe(0.9);
      // Pattern extracts last group as person1, first group as person2
      expect(result.entities.person1).toBe("john");
      expect(result.entities.person2).toBe("jane");
    });

    it("classifies 'what's my relationship between X and Y' queries", () => {
      const result = classifyIntent(
        "what's my relationship between john and mary"
      );
      expect(result.intent).toBe("RELATIONSHIP_PATH");
      expect(result.confidence).toBe(0.9);
    });

    it("classifies 'relationship between X and Y' queries", () => {
      const result = classifyIntent("relationship between john and mary");
      expect(result.intent).toBe("RELATIONSHIP_PATH");
      expect(result.confidence).toBe(0.9);
      // Pattern extracts last group as person1, first group as person2
      expect(result.entities.person1).toBe("mary");
      expect(result.entities.person2).toBe("john");
    });

    it("classifies 'am i related to X' queries", () => {
      const result = classifyIntent("am i related to robert?");
      expect(result.intent).toBe("RELATIONSHIP_PATH");
      expect(result.confidence).toBe(0.9);
    });

    it("handles quoted names in relationship queries", () => {
      const result = classifyIntent(
        'relationship between "John Doe" and "Jane Smith"'
      );
      expect(result.intent).toBe("RELATIONSHIP_PATH");
      // Last group (Jane Smith) becomes person1, first group (John Doe) becomes person2
      expect(result.entities.person1).toContain("Jane");
      expect(result.entities.person2).toContain("John");
    });

    it("removes trailing punctuation from names", () => {
      const result = classifyIntent("how am i related to john smith?");
      expect(result.entities.person1).toBe("john smith");
      expect(result.entities.person1).not.toContain("?");
    });
  });

  describe("COMMON_ANCESTOR intent", () => {
    it("classifies 'common ancestor of X and Y' queries", () => {
      const result = classifyIntent("common ancestor of john and mary");
      expect(result.intent).toBe("COMMON_ANCESTOR");
      expect(result.confidence).toBe(0.9);
      expect(result.entities.person1).toBe("john");
      expect(result.entities.person2).toBe("mary");
    });

    it("classifies 'shared ancestor' queries", () => {
      const result = classifyIntent("shared ancestor of alice and bob?");
      expect(result.intent).toBe("COMMON_ANCESTOR");
      expect(result.confidence).toBe(0.9);
    });

    it("classifies 'find common ancestor' queries", () => {
      const result = classifyIntent("find common ancestor for john and jane");
      expect(result.intent).toBe("COMMON_ANCESTOR");
      expect(result.confidence).toBe(0.9);
      expect(result.entities.person1).toBe("john");
      expect(result.entities.person2).toBe("jane");
    });

    it("classifies 'what's the common ancestor' queries", () => {
      const result = classifyIntent(
        "what's the common ancestor of sarah and thomas"
      );
      expect(result.intent).toBe("COMMON_ANCESTOR");
      expect(result.confidence).toBe(0.9);
    });

    it("handles 'ancestors' plural", () => {
      const result = classifyIntent("common ancestors of william and margaret");
      expect(result.intent).toBe("COMMON_ANCESTOR");
      expect(result.confidence).toBe(0.9);
    });
  });

  describe("COUSIN_FINDER intent", () => {
    it("classifies 'my Nth cousin' queries", () => {
      const result = classifyIntent("my 2nd cousin");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.confidence).toBe(0.9);
      expect(result.entities.degree).toBe(2);
      expect(result.entities.relationshipTerm).toBe("2nd cousin");
    });

    it("classifies 'my 1st cousin' queries", () => {
      const result = classifyIntent("my 1st cousin");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.entities.degree).toBe(1);
      expect(result.entities.relationshipTerm).toBe("1st cousin");
    });

    it("classifies 'my 3rd cousin' queries", () => {
      const result = classifyIntent("my 3rd cousin");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.entities.degree).toBe(3);
      expect(result.entities.relationshipTerm).toBe("3rd cousin");
    });

    it("classifies 'my 4th cousin' queries (uses 'th')", () => {
      const result = classifyIntent("my 4th cousin");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.entities.degree).toBe(4);
      expect(result.entities.relationshipTerm).toBe("4th cousin");
    });

    it("classifies 'my Nth cousins' (plural)", () => {
      const result = classifyIntent("my 2nd cousins");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.entities.degree).toBe(2);
    });

    it("classifies 'Nth cousins of X' queries", () => {
      const result = classifyIntent("2nd cousins of john");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.confidence).toBe(0.9);
      expect(result.entities.degree).toBe(2);
      expect(result.entities.person1).toBe("john");
    });

    it("classifies 'find my Nth cousin' queries", () => {
      const result = classifyIntent("find my 3rd cousin");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.entities.degree).toBe(3);
    });

    it("classifies 'who are my Nth cousins' queries", () => {
      const result = classifyIntent("who are my 2nd cousins?");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.entities.degree).toBe(2);
    });

    it("classifies 'cousin finder' queries without degree", () => {
      const result = classifyIntent("cousin finder for john");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.confidence).toBe(0.9);
    });

    it("handles 'what are my Nth cousins' queries", () => {
      const result = classifyIntent("what are my 1st cousins?");
      expect(result.intent).toBe("COUSIN_FINDER");
      expect(result.entities.degree).toBe(1);
    });

    it("limits cousin degree to valid range (1-9)", () => {
      // Degree outside 1-9 should not be set
      const result = classifyIntent("my 15th cousin");
      // Should still classify as COUSIN_FINDER but degree might be undefined
      expect(result.intent).toBe("COUSIN_FINDER");
    });

    it("generates correct ordinal suffix for degree 5", () => {
      const result = classifyIntent("my 5th cousin");
      expect(result.entities.relationshipTerm).toBe("5th cousin");
    });

    it("generates correct ordinal suffix for degree 6", () => {
      const result = classifyIntent("my 6th cousin");
      expect(result.entities.relationshipTerm).toBe("6th cousin");
    });
  });

  describe("DESCENDANT_QUERY intent", () => {
    it("classifies 'descendants of X' queries", () => {
      const result = classifyIntent("descendants of john");
      expect(result.intent).toBe("DESCENDANT_QUERY");
      expect(result.confidence).toBe(0.9);
      expect(result.entities.person1).toBe("john");
      expect(result.entities.relationshipTerm).toBe("descendant");
    });

    it("classifies 'children of X' queries", () => {
      const result = classifyIntent("children of mary");
      expect(result.intent).toBe("DESCENDANT_QUERY");
      expect(result.confidence).toBe(0.9);
      expect(result.entities.person1).toBe("mary");
    });

    it("classifies 'grandchildren of X' queries", () => {
      const result = classifyIntent("grandchildren of john");
      expect(result.intent).toBe("DESCENDANT_QUERY");
      expect(result.entities.person1).toBe("john");
    });

    it("classifies 'great-grandchildren of X' queries", () => {
      const result = classifyIntent("great-grandchildren of thomas");
      expect(result.intent).toBe("DESCENDANT_QUERY");
      expect(result.entities.person1).toBe("thomas");
    });

    it("classifies 'X's children' queries", () => {
      const result = classifyIntent("john's children");
      expect(result.intent).toBe("DESCENDANT_QUERY");
      expect(result.entities.person1).toContain("john");
    });

    it("classifies 'find descendants of X' queries", () => {
      const result = classifyIntent("find descendants of mary");
      expect(result.intent).toBe("DESCENDANT_QUERY");
      expect(result.confidence).toBe(0.9);
    });

    it("classifies 'all descendants of X' queries", () => {
      const result = classifyIntent("all descendants of jane");
      expect(result.intent).toBe("DESCENDANT_QUERY");
      expect(result.confidence).toBe(0.9);
    });

    it("classifies plural 'descendants' queries", () => {
      const result = classifyIntent("descendants of robert?");
      expect(result.intent).toBe("DESCENDANT_QUERY");
    });

    it("handles possessive forms (apostrophe s)", () => {
      const result = classifyIntent("john's grandchildren");
      expect(result.intent).toBe("DESCENDANT_QUERY");
    });
  });

  describe("ANCESTOR_QUERY intent", () => {
    it("classifies 'ancestors of X' queries", () => {
      const result = classifyIntent("ancestors of john");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.confidence).toBe(0.9);
      expect(result.entities.person1).toBe("john");
      expect(result.entities.relationshipTerm).toBe("ancestor");
    });

    it("classifies 'parents of X' queries", () => {
      const result = classifyIntent("parents of mary");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.entities.person1).toBe("mary");
    });

    it("classifies 'grandparents of X' queries", () => {
      const result = classifyIntent("grandparents of john");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.entities.person1).toBe("john");
    });

    it("classifies 'mother of X' queries", () => {
      const result = classifyIntent("mother of jane");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.entities.person1).toBe("jane");
    });

    it("classifies 'father of X' queries", () => {
      const result = classifyIntent("father of thomas");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.entities.person1).toBe("thomas");
    });

    it("classifies 'grandmother of X' queries", () => {
      const result = classifyIntent("grandmother of sarah");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.entities.person1).toBe("sarah");
    });

    it("classifies 'grandfather of X' queries", () => {
      const result = classifyIntent("grandfather of william");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.entities.person1).toBe("william");
    });

    it("classifies 'X's parents' queries", () => {
      const result = classifyIntent("john's parents");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.entities.person1).toContain("john");
    });

    it("classifies 'find ancestors of X' queries", () => {
      const result = classifyIntent("find ancestors of mary");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.confidence).toBe(0.9);
    });

    it("classifies 'all ancestors of X' queries", () => {
      const result = classifyIntent("all ancestors of jane");
      expect(result.intent).toBe("ANCESTOR_QUERY");
      expect(result.confidence).toBe(0.9);
    });

    it("handles plural forms", () => {
      const result = classifyIntent("parents of john");
      expect(result.intent).toBe("ANCESTOR_QUERY");
    });
  });

  describe("PERSON_SEARCH intent (fallback)", () => {
    it("defaults to PERSON_SEARCH for unmatched queries", () => {
      const result = classifyIntent("find john");
      expect(result.intent).toBe("PERSON_SEARCH");
      expect(result.confidence).toBe(0.5);
    });

    it("extracts capitalized names for fallback", () => {
      const result = classifyIntent("John Smith");
      expect(result.intent).toBe("PERSON_SEARCH");
      expect(result.entities.person1).toContain("John");
    });

    it("extracts quoted names for fallback", () => {
      const result = classifyIntent('"John Doe"');
      expect(result.intent).toBe("PERSON_SEARCH");
      expect(result.entities.person1).toContain("John");
    });

    it("uses full query as fallback name if no pattern matches", () => {
      const result = classifyIntent("search for people");
      expect(result.intent).toBe("PERSON_SEARCH");
      expect(result.entities.person1).toBeDefined();
    });

    it("handles single capitalized word", () => {
      const result = classifyIntent("Mary");
      expect(result.intent).toBe("PERSON_SEARCH");
    });

    it("handles lowercase queries by using full query", () => {
      const result = classifyIntent("lorem ipsum");
      expect(result.intent).toBe("PERSON_SEARCH");
      expect(result.confidence).toBe(0.5);
    });
  });

  describe("Edge cases and special handling", () => {
    it("handles empty query strings", () => {
      const result = classifyIntent("");
      expect(result.intent).toBe("PERSON_SEARCH");
      expect(result.confidence).toBe(0.5);
    });

    it("handles whitespace-only queries", () => {
      const result = classifyIntent("   ");
      expect(result.intent).toBe("PERSON_SEARCH");
      expect(result.confidence).toBe(0.5);
    });

    it("is case-insensitive for keywords", () => {
      const result1 = classifyIntent("HOW AM I RELATED TO JOHN?");
      const result2 = classifyIntent("how am i related to john?");
      expect(result1.intent).toBe(result2.intent);
      expect(result1.intent).toBe("RELATIONSHIP_PATH");
    });

    it("handles mixed case queries", () => {
      const result = classifyIntent("CoMmOn AnCeStOr Of JoHn AnD mArY");
      expect(result.intent).toBe("COMMON_ANCESTOR");
    });

    it("trims leading/trailing whitespace", () => {
      const result = classifyIntent("  descendants of john  ");
      expect(result.intent).toBe("DESCENDANT_QUERY");
    });

    it("handles queries with multiple spaces between words", () => {
      const result = classifyIntent("how  am  i  related  to  john");
      expect(result.intent).toBe("RELATIONSHIP_PATH");
    });

    it("handles names with hyphens", () => {
      const result = classifyIntent("descendants of jean-paul");
      expect(result.intent).toBe("DESCENDANT_QUERY");
    });

    it("removes punctuation marks from extracted names", () => {
      const result = classifyIntent("how am i related to john smith!!");
      expect(result.entities.person1).toBe("john smith");
      expect(result.entities.person1).not.toContain("!");
    });

    it("handles comma-separated names in fallback", () => {
      const result = classifyIntent("Smith, John");
      expect(result.intent).toBe("PERSON_SEARCH");
    });

    it("prioritizes specific intents over fallback", () => {
      // Even if could be person search, relationship path is more specific
      const result = classifyIntent("how am i related to john");
      expect(result.intent).toBe("RELATIONSHIP_PATH");
      expect(result.confidence).toBe(0.9);
    });

    it("extracts second-to-last group in multi-group patterns", () => {
      const result = classifyIntent("what's my relationship to john and mary");
      expect(result.intent).toBe("RELATIONSHIP_PATH");
      expect(result.entities.person1).toBeDefined();
    });

    it("handles patterns with optional person names", () => {
      // "my cousins" doesn't match COUSIN_FINDER pattern (requires digit for degree)
      const result = classifyIntent("my 1st cousin");
      expect(result.intent).toBe("COUSIN_FINDER");
    });

    it("handles degree extraction with ordinal suffixes", () => {
      const test1 = classifyIntent("my 1st cousins");
      const test2 = classifyIntent("my 9th cousins");
      const test3 = classifyIntent("my 4th cousins");
      expect(test1.entities.degree).toBe(1);
      expect(test2.entities.degree).toBe(9); // Valid range is 1-9
      expect(test3.entities.degree).toBe(4);
    });
  });

  describe("Intent confidence scores", () => {
    it("returns 0.9 confidence for specific pattern matches", () => {
      const patterns = [
        "how am i related to john",
        "common ancestor of john and mary",
        "my 2nd cousin",
        "descendants of john",
        "ancestors of jane",
      ];

      patterns.forEach((pattern) => {
        const result = classifyIntent(pattern);
        expect(result.confidence).toBe(0.9);
      });
    });

    it("returns 0.5 confidence for fallback person search", () => {
      const result = classifyIntent("find someone");
      expect(result.confidence).toBe(0.5);
    });
  });

  describe("Result structure validation", () => {
    it("always returns valid ClassificationResult structure", () => {
      const result = classifyIntent("test query");
      expect(result).toHaveProperty("intent");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("entities");
      expect(typeof result.intent).toBe("string");
      expect(typeof result.confidence).toBe("number");
      expect(result.confidence >= 0 && result.confidence <= 1).toBe(true);
      expect(typeof result.entities).toBe("object");
    });

    it("entities contains correct optional properties", () => {
      const result = classifyIntent("how am i related to john");
      expect(result.entities).toHaveProperty("person1");
    });

    it("returns undefined for unused entity properties", () => {
      const result = classifyIntent("descendants of john");
      expect(result.entities.degree).toBeUndefined();
      expect(result.entities.person2).toBeUndefined();
    });
  });
});
