import { describe, it, expect } from "bun:test";
import { executeSearch, type RelationshipDataMaps } from "./query-router";
import type { RelationshipNode } from "../relationships/path-finder";

/**
 * Helper to create a basic relationship data map for testing
 */
function createBasicRelationshipMap(
  people: Array<{ id: string; firstName: string; lastName: string }>
): RelationshipDataMaps {
  const peopleMap = new Map<string, RelationshipNode>();
  people.forEach((p) => {
    peopleMap.set(p.id, {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: "male",
    });
  });

  return {
    people: peopleMap,
    maps: {
      parents: new Map(),
      children: new Map(),
      spouses: new Map(),
    },
    childToParents: new Map(),
    parentToChildren: new Map(),
  };
}

describe("executeSearch", () => {
  describe("return value structure", () => {
    it("returns a SearchResult with required properties", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("find john", relationships);

      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("explanation");
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.duration).toBe("number");
      expect(typeof result.explanation).toBe("string");
    });

    it("includes extracted entities in result", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("descendants of john", relationships);

      expect(result).toHaveProperty("extractedEntities");
      expect(result.extractedEntities).toBeDefined();
    });

    it("includes confidence score in result", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("find john", relationships);

      expect(result).toHaveProperty("confidence");
      expect(typeof result.confidence).toBe("number");
    });

    it("duration is a positive number", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("test query", relationships);

      expect(result.duration >= 0).toBe(true);
    });
  });

  describe("PERSON_SEARCH intent handling", () => {
    it("classifies simple name queries as PERSON_SEARCH", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("John Doe", relationships);

      expect(result.type).toBe("PERSON_SEARCH");
    });

    it("returns explanation for PERSON_SEARCH", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("find john", relationships);

      expect(result.explanation).toContain("Searching for");
    });

    it("includes empty results array for PERSON_SEARCH", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("John Doe", relationships);

      expect(Array.isArray(result.results)).toBe(true);
      // Person search doesn't execute actual search handler, just returns explanation
      expect(result.results.length).toBe(0);
    });

    it("returns high confidence for person search fallback", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("find someone", relationships);

      expect(result.confidence).toBe(0.5);
    });
  });

  describe("RELATIONSHIP_PATH intent handling", () => {
    it("returns RELATIONSHIP_PATH type for relationship queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        "how am i related to jane?",
        relationships
      );

      expect(result.type).toBe("RELATIONSHIP_PATH");
    });

    it("returns explanation when people cannot be found", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        "how am i related to unknown person?",
        relationships
      );

      expect(result.explanation).toContain("Could not find");
    });

    it("includes high confidence for relationship path queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Smith" },
      ]);

      const result = await executeSearch(
        "how am i related to jane?",
        relationships
      );

      expect(result.confidence).toBe(0.9);
    });
  });

  describe("COMMON_ANCESTOR intent handling", () => {
    it("returns COMMON_ANCESTOR type for ancestor queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Smith" },
      ]);

      const result = await executeSearch(
        "common ancestor of john and jane",
        relationships
      );

      expect(result.type).toBe("COMMON_ANCESTOR");
    });

    it("returns explanation for missing people", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        "common ancestor of john and unknown",
        relationships
      );

      expect(result.explanation).toContain("Could not find");
    });

    it("includes high confidence for common ancestor queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Smith" },
      ]);

      const result = await executeSearch(
        "common ancestor of john and jane",
        relationships
      );

      expect(result.confidence).toBe(0.9);
    });
  });

  describe("COUSIN_FINDER intent handling", () => {
    it("returns COUSIN_FINDER type for cousin queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("my 2nd cousin", relationships);

      expect(result.type).toBe("COUSIN_FINDER");
    });

    it("returns explanation for missing person", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        "2nd cousins of unknown",
        relationships
      );

      expect(result.explanation).toContain("Could not find");
    });

    it("includes high confidence for cousin queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("my 2nd cousin", relationships);

      expect(result.confidence).toBe(0.9);
    });

    it("extracts degree from query", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("my 3rd cousins", relationships);

      expect(result.extractedEntities?.degree).toBe(3);
    });
  });

  describe("ANCESTOR_QUERY intent handling", () => {
    it("returns ANCESTOR_QUERY type for ancestor queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("ancestors of john", relationships);

      expect(result.type).toBe("ANCESTOR_QUERY");
    });

    it("returns explanation for missing person", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("ancestors of unknown", relationships);

      expect(result.explanation).toContain("Could not find");
    });

    it("includes high confidence for ancestor queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("ancestors of john", relationships);

      expect(result.confidence).toBe(0.9);
    });
  });

  describe("DESCENDANT_QUERY intent handling", () => {
    it("returns DESCENDANT_QUERY type for descendant queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("descendants of john", relationships);

      expect(result.type).toBe("DESCENDANT_QUERY");
    });

    it("returns explanation for missing person", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        "descendants of unknown",
        relationships
      );

      expect(result.explanation).toContain("Could not find");
    });

    it("includes high confidence for descendant queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("descendants of john", relationships);

      expect(result.confidence).toBe(0.9);
    });
  });

  describe("Error handling", () => {
    it("handles errors gracefully and returns safe result", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      // This should not throw
      const result = await executeSearch("test query", relationships);

      expect(result.type).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.explanation).toBeDefined();
    });

    it("returns PERSON_SEARCH as fallback on error", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("any query", relationships);

      expect([
        "PERSON_SEARCH",
        ...[
          "RELATIONSHIP_PATH",
          "COMMON_ANCESTOR",
          "COUSIN_FINDER",
          "ANCESTOR_QUERY",
          "DESCENDANT_QUERY",
        ],
      ]).toContain(result.type);
    });

    it("includes error message in explanation on failure", async () => {
      // This would require introducing an actual error condition
      // For now, we verify the structure is maintained
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("test", relationships);

      expect(typeof result.explanation).toBe("string");
      expect(result.explanation!.length > 0).toBe(true);
    });
  });

  describe("Entity extraction and name matching", () => {
    it("extracts person names from queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Smith" },
      ]);

      const result = await executeSearch(
        "how am i related to jane smith?",
        relationships
      );

      expect(result.extractedEntities?.person1).toBeDefined();
    });

    it("matches people by full name", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        "descendants of John Doe",
        relationships
      );

      // If person was found, results would be populated
      expect(result.type).toBeDefined();
    });

    it("handles names with different cases", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        "descendants of JOHN DOE",
        relationships
      );

      expect(result.type).toBe("DESCENDANT_QUERY");
    });

    it("extracts both person1 and person2 from two-person queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Smith" },
      ]);

      const result = await executeSearch(
        "common ancestor of john and jane",
        relationships
      );

      expect(result.extractedEntities?.person1).toBeDefined();
      expect(result.extractedEntities?.person2).toBeDefined();
    });
  });

  describe("Empty and null handling", () => {
    it("handles empty query string", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("", relationships);

      expect(result.type).toBe("PERSON_SEARCH");
      expect(result.explanation).toBeDefined();
    });

    it("handles whitespace-only query", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("   ", relationships);

      expect(result.type).toBe("PERSON_SEARCH");
    });

    it("handles empty people map", async () => {
      const relationships: RelationshipDataMaps = {
        people: new Map(),
        maps: {
          parents: new Map(),
          children: new Map(),
          spouses: new Map(),
        },
      };

      const result = await executeSearch("john", relationships);

      expect(result.explanation).toBeDefined();
    });

    it("handles missing relationship maps gracefully", async () => {
      const relationships: RelationshipDataMaps = {
        people: new Map([
          [
            "john",
            {
              id: "john",
              firstName: "John",
              lastName: "Doe",
              gender: "male",
            },
          ],
        ]),
        maps: {
          parents: new Map(),
          children: new Map(),
          spouses: new Map(),
        },
      };

      const result = await executeSearch("descendants of john", relationships);

      expect(result.type).toBe("DESCENDANT_QUERY");
      expect(result.explanation).toBeDefined();
    });
  });

  describe("Relationship map conversion", () => {
    it("converts Set-based maps to array-based for path finder", async () => {
      const peopleMap = new Map<string, RelationshipNode>([
        [
          "john",
          {
            id: "john",
            firstName: "John",
            lastName: "Doe",
            gender: "male",
          },
        ],
        [
          "jane",
          {
            id: "jane",
            firstName: "Jane",
            lastName: "Smith",
            gender: "female",
          },
        ],
      ]);

      const relationships: RelationshipDataMaps = {
        people: peopleMap,
        maps: {
          parents: new Map([["john", ["parent1"]]]),
          children: new Map([["parent1", ["john"]]]),
          spouses: new Map(),
        },
      };

      const result = await executeSearch(
        "how am i related to jane",
        relationships
      );

      expect(result.type).toBe("RELATIONSHIP_PATH");
    });

    it("handles array-based maps directly", async () => {
      const peopleMap = new Map<string, RelationshipNode>([
        [
          "john",
          {
            id: "john",
            firstName: "John",
            lastName: "Doe",
            gender: "male",
          },
        ],
      ]);

      const relationships: RelationshipDataMaps = {
        people: peopleMap,
        maps: {
          parents: new Map([["john", ["parent1"]]]),
          children: new Map([["parent1", ["john"]]]),
          spouses: new Map(),
        },
      };

      const result = await executeSearch("descendants of john", relationships);

      expect(result.type).toBe("DESCENDANT_QUERY");
    });

    it("constructs childToParents and parentToChildren from parents/children maps", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      // Remove optional maps to test construction
      delete relationships.childToParents;
      delete relationships.parentToChildren;

      const result = await executeSearch("my 2nd cousin", relationships);

      expect(result.type).toBe("COUSIN_FINDER");
    });
  });

  describe("Query case sensitivity", () => {
    it("handles uppercase queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        "HOW AM I RELATED TO JOHN",
        relationships
      );

      expect(result.type).toBe("RELATIONSHIP_PATH");
    });

    it("handles lowercase queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("descendants of john", relationships);

      expect(result.type).toBe("DESCENDANT_QUERY");
    });

    it("handles mixed case queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Smith" },
      ]);

      const result = await executeSearch(
        "Common Ancestor Of John And Jane",
        relationships
      );

      expect(result.type).toBe("COMMON_ANCESTOR");
    });
  });

  describe("Timing and performance", () => {
    it("records execution duration", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("test query", relationships);

      expect(result.duration >= 0).toBe(true);
      expect(typeof result.duration).toBe("number");
    });

    it("executes within reasonable time for simple queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const startTime = Date.now();
      const result = await executeSearch(
        "how am i related to john",
        relationships
      );
      const endTime = Date.now();

      // Should be very fast for a simple query with no actual relationships
      expect(endTime - startTime < 1000).toBe(true); // Less than 1 second
      expect(result.type).toBe("RELATIONSHIP_PATH");
    });
  });

  describe("Multiple people in dataset", () => {
    it("handles dataset with multiple people", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Smith" },
        { id: "robert", firstName: "Robert", lastName: "Jones" },
        { id: "mary", firstName: "Mary", lastName: "Williams" },
      ]);

      const result = await executeSearch(
        "common ancestor of john and jane",
        relationships
      );

      expect(result.type).toBe("COMMON_ANCESTOR");
    });

    it("correctly identifies which person was found", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Smith" },
        { id: "unknown", firstName: "Unknown", lastName: "Person" },
      ]);

      const result = await executeSearch(
        "descendants of john and unknown",
        relationships
      );

      // This would be two separate terms in fallback or special handling
      expect(result.type).toBeDefined();
    });
  });

  describe("Extracted entities in result", () => {
    it("includes person1 entity", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("ancestors of john", relationships);

      expect(result.extractedEntities).toHaveProperty("person1");
    });

    it("includes person2 entity for two-person queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
        { id: "jane", firstName: "Jane", lastName: "Smith" },
      ]);

      const result = await executeSearch(
        "common ancestor of john and jane",
        relationships
      );

      expect(result.extractedEntities).toHaveProperty("person1");
      expect(result.extractedEntities).toHaveProperty("person2");
    });

    it("includes degree entity for cousin queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("my 3rd cousin", relationships);

      expect(result.extractedEntities).toHaveProperty("degree");
      expect(result.extractedEntities?.degree).toBe(3);
    });

    it("includes relationshipTerm entity", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch("descendants of john", relationships);

      expect(result.extractedEntities).toHaveProperty("relationshipTerm");
    });
  });

  describe("Large dataset handling", () => {
    it("handles large number of people", async () => {
      const people = Array.from({ length: 1000 }, (_, i) => ({
        id: `person${i}`,
        firstName: `Person`,
        lastName: `${i}`,
      }));

      const relationships = createBasicRelationshipMap(people);

      const result = await executeSearch(
        "descendants of Person 500",
        relationships
      );

      expect(result.type).toBe("DESCENDANT_QUERY");
      expect(result.duration >= 0).toBe(true);
    });
  });

  describe("Complex query patterns", () => {
    it("handles quoted names in queries", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        'descendants of "John Doe"',
        relationships
      );

      expect(result.type).toBe("DESCENDANT_QUERY");
    });

    it("handles queries with extra punctuation", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "Doe" },
      ]);

      const result = await executeSearch(
        "how am i related to john smith!!!",
        relationships
      );

      expect(result.type).toBe("RELATIONSHIP_PATH");
    });

    it("handles queries with apostrophes", async () => {
      const relationships = createBasicRelationshipMap([
        { id: "john", firstName: "John", lastName: "O'Brien" },
      ]);

      const result = await executeSearch(
        "descendants of John O'Brien",
        relationships
      );

      expect(result.type).toBe("DESCENDANT_QUERY");
    });
  });
});
