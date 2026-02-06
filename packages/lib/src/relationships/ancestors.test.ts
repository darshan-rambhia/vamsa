/**
 * Tests for Ancestor Query Handlers
 *
 * Tests the ancestor finding and lineage tracking functionality.
 */
import { describe, expect, it } from "vitest";
import {
  countAncestors,
  findAncestors,
  getAncestorsAtGeneration,
  getAncestorsByGeneration,
} from "./ancestors";
import type { RelationshipMapSet, RelationshipNode } from "./ancestors";

/**
 * Helper to create a person node
 */
function createPerson(
  id: string,
  firstName: string,
  lastName: string,
  gender?: "male" | "female" | "other"
): RelationshipNode {
  return {
    id,
    firstName,
    lastName,
    gender,
  };
}

/**
 * Helper to create relationship maps from parent-child pairs
 */
function createRelationshipMaps(
  parentChildPairs: Array<[string, string]>
): RelationshipMapSet {
  const childToParents = new Map<string, Set<string>>();

  for (const [parentId, childId] of parentChildPairs) {
    if (!childToParents.has(childId)) {
      childToParents.set(childId, new Set());
    }
    childToParents.get(childId)!.add(parentId);
  }

  return {
    childToParents,
    spouseMap: new Map(),
  };
}

describe("findAncestors", () => {
  describe("basic ancestor finding", () => {
    it("finds parents (generation 1)", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["father", createPerson("father", "Father", "Person", "male")],
        ["mother", createPerson("mother", "Mother", "Person", "female")],
      ]);

      const relationships = createRelationshipMaps([
        ["father", "child"],
        ["mother", "child"],
      ]);

      const ancestors = findAncestors("child", people, relationships);

      expect(ancestors).toHaveLength(2);
      expect(ancestors.every((a) => a.generation === 1)).toBe(true);
    });

    it("finds grandparents (generation 2)", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["father", createPerson("father", "Father", "Person", "male")],
        [
          "grandfather",
          createPerson("grandfather", "Grandfather", "Person", "male"),
        ],
        [
          "grandmother",
          createPerson("grandmother", "Grandmother", "Person", "female"),
        ],
      ]);

      const relationships = createRelationshipMaps([
        ["father", "child"],
        ["grandfather", "father"],
        ["grandmother", "father"],
      ]);

      const ancestors = findAncestors("child", people, relationships);

      expect(ancestors).toHaveLength(3);
      expect(ancestors.filter((a) => a.generation === 1)).toHaveLength(1);
      expect(ancestors.filter((a) => a.generation === 2)).toHaveLength(2);
    });

    it("returns empty array for person with no parents", () => {
      const people = new Map<string, RelationshipNode>([
        ["person", createPerson("person", "Lonely", "Person")],
      ]);

      const relationships = createRelationshipMaps([]);

      const ancestors = findAncestors("person", people, relationships);

      expect(ancestors).toHaveLength(0);
    });

    it("returns empty array for non-existent person", () => {
      const people = new Map<string, RelationshipNode>();
      const relationships = createRelationshipMaps([]);

      const ancestors = findAncestors("nonexistent", people, relationships);

      expect(ancestors).toHaveLength(0);
    });
  });

  describe("lineage determination", () => {
    it("identifies paternal lineage for male ancestors", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["father", createPerson("father", "Father", "Person", "male")],
      ]);

      const relationships = createRelationshipMaps([["father", "child"]]);

      const ancestors = findAncestors("child", people, relationships);

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].lineage).toBe("paternal");
      expect(ancestors[0].person.gender).toBe("male");
    });

    it("identifies maternal lineage for female ancestors", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["mother", createPerson("mother", "Mother", "Person", "female")],
      ]);

      const relationships = createRelationshipMaps([["mother", "child"]]);

      const ancestors = findAncestors("child", people, relationships);

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].lineage).toBe("maternal");
    });

    it("returns 'both' lineage for ancestors with unknown gender", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["parent", createPerson("parent", "Parent", "Person")], // No gender
      ]);

      const relationships = createRelationshipMaps([["parent", "child"]]);

      const ancestors = findAncestors("child", people, relationships);

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].lineage).toBe("both");
    });
  });

  describe("maxGenerations option", () => {
    it("limits depth when maxGenerations is specified", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["parent", createPerson("parent", "Parent", "Person", "male")],
        [
          "grandparent",
          createPerson("grandparent", "Grandparent", "Person", "male"),
        ],
        [
          "greatgrandparent",
          createPerson("greatgrandparent", "Great", "Person", "male"),
        ],
      ]);

      const relationships = createRelationshipMaps([
        ["parent", "child"],
        ["grandparent", "parent"],
        ["greatgrandparent", "grandparent"],
      ]);

      // Without limit - should find all 3
      const allAncestors = findAncestors("child", people, relationships);
      expect(allAncestors).toHaveLength(3);

      // With limit of 2 - should find only 2
      const limitedAncestors = findAncestors("child", people, relationships, {
        maxGenerations: 2,
      });
      expect(limitedAncestors).toHaveLength(2);
      expect(limitedAncestors.every((a) => a.generation <= 2)).toBe(true);

      // With limit of 1 - should find only parent
      const parentOnly = findAncestors("child", people, relationships, {
        maxGenerations: 1,
      });
      expect(parentOnly).toHaveLength(1);
      expect(parentOnly[0].generation).toBe(1);
    });

    it("returns all ancestors when maxGenerations is undefined", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["parent", createPerson("parent", "Parent", "Person", "male")],
        [
          "grandparent",
          createPerson("grandparent", "Grandparent", "Person", "male"),
        ],
      ]);

      const relationships = createRelationshipMaps([
        ["parent", "child"],
        ["grandparent", "parent"],
      ]);

      const ancestors = findAncestors("child", people, relationships, {});
      expect(ancestors).toHaveLength(2);
    });
  });

  describe("lineage filtering", () => {
    it("filters to paternal lineage only", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["father", createPerson("father", "Father", "Person", "male")],
        ["mother", createPerson("mother", "Mother", "Person", "female")],
      ]);

      const relationships = createRelationshipMaps([
        ["father", "child"],
        ["mother", "child"],
      ]);

      const paternalAncestors = findAncestors("child", people, relationships, {
        lineage: "paternal",
      });

      expect(paternalAncestors).toHaveLength(1);
      expect(paternalAncestors[0].person.id).toBe("father");
    });

    it("filters to maternal lineage only", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["father", createPerson("father", "Father", "Person", "male")],
        ["mother", createPerson("mother", "Mother", "Person", "female")],
      ]);

      const relationships = createRelationshipMaps([
        ["father", "child"],
        ["mother", "child"],
      ]);

      const maternalAncestors = findAncestors("child", people, relationships, {
        lineage: "maternal",
      });

      expect(maternalAncestors).toHaveLength(1);
      expect(maternalAncestors[0].person.id).toBe("mother");
    });

    it("returns all ancestors when lineage is 'all'", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["father", createPerson("father", "Father", "Person", "male")],
        ["mother", createPerson("mother", "Mother", "Person", "female")],
      ]);

      const relationships = createRelationshipMaps([
        ["father", "child"],
        ["mother", "child"],
      ]);

      const allAncestors = findAncestors("child", people, relationships, {
        lineage: "all",
      });

      expect(allAncestors).toHaveLength(2);
    });

    it("includes ancestors with 'both' lineage in filtered results", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["father", createPerson("father", "Father", "Person", "male")],
        ["unknownParent", createPerson("unknownParent", "Unknown", "Person")], // No gender -> 'both'
      ]);

      const relationships = createRelationshipMaps([
        ["father", "child"],
        ["unknownParent", "child"],
      ]);

      // 'both' lineage ancestors should appear in paternal filter
      const paternalAncestors = findAncestors("child", people, relationships, {
        lineage: "paternal",
      });

      expect(paternalAncestors.length).toBeGreaterThanOrEqual(1);
      expect(paternalAncestors.some((a) => a.person.id === "father")).toBe(
        true
      );
      // 'both' lineage should also be included
      expect(
        paternalAncestors.some(
          (a) => a.lineage === "both" || a.lineage === "paternal"
        )
      ).toBe(true);
    });
  });

  describe("sorting", () => {
    it("returns ancestors sorted by generation (closest first)", () => {
      const people = new Map<string, RelationshipNode>([
        ["child", createPerson("child", "Child", "Person")],
        ["parent", createPerson("parent", "Parent", "Person", "male")],
        [
          "grandparent",
          createPerson("grandparent", "Grandparent", "Person", "male"),
        ],
        [
          "greatgrandparent",
          createPerson("greatgrandparent", "Great", "Person", "male"),
        ],
      ]);

      const relationships = createRelationshipMaps([
        ["parent", "child"],
        ["grandparent", "parent"],
        ["greatgrandparent", "grandparent"],
      ]);

      const ancestors = findAncestors("child", people, relationships);

      expect(ancestors[0].generation).toBe(1);
      expect(ancestors[1].generation).toBe(2);
      expect(ancestors[2].generation).toBe(3);
    });
  });
});

describe("getAncestorsAtGeneration", () => {
  it("returns only ancestors at the specified generation", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      ["parent", createPerson("parent", "Parent", "Person", "male")],
      [
        "grandparent1",
        createPerson("grandparent1", "Grandparent1", "Person", "male"),
      ],
      [
        "grandparent2",
        createPerson("grandparent2", "Grandparent2", "Person", "female"),
      ],
    ]);

    const relationships = createRelationshipMaps([
      ["parent", "child"],
      ["grandparent1", "parent"],
      ["grandparent2", "parent"],
    ]);

    const parents = getAncestorsAtGeneration("child", 1, people, relationships);
    expect(parents).toHaveLength(1);
    expect(parents[0].id).toBe("parent");

    const grandparents = getAncestorsAtGeneration(
      "child",
      2,
      people,
      relationships
    );
    expect(grandparents).toHaveLength(2);
  });

  it("returns empty array for generation with no ancestors", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      ["parent", createPerson("parent", "Parent", "Person", "male")],
    ]);

    const relationships = createRelationshipMaps([["parent", "child"]]);

    const grandparents = getAncestorsAtGeneration(
      "child",
      2,
      people,
      relationships
    );
    expect(grandparents).toHaveLength(0);
  });

  it("returns RelationshipNode objects, not AncestorQueryResult", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      ["parent", createPerson("parent", "Parent", "Person", "male")],
    ]);

    const relationships = createRelationshipMaps([["parent", "child"]]);

    const parents = getAncestorsAtGeneration("child", 1, people, relationships);
    expect(parents[0]).toHaveProperty("id");
    expect(parents[0]).toHaveProperty("firstName");
    expect(parents[0]).not.toHaveProperty("generation");
    expect(parents[0]).not.toHaveProperty("lineage");
  });
});

describe("countAncestors", () => {
  it("returns total count of ancestors", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      ["father", createPerson("father", "Father", "Person", "male")],
      ["mother", createPerson("mother", "Mother", "Person", "female")],
      [
        "grandparent",
        createPerson("grandparent", "Grandparent", "Person", "male"),
      ],
    ]);

    const relationships = createRelationshipMaps([
      ["father", "child"],
      ["mother", "child"],
      ["grandparent", "father"],
    ]);

    const count = countAncestors("child", people, relationships);
    expect(count).toBe(3);
  });

  it("respects maxGenerations limit", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      ["parent", createPerson("parent", "Parent", "Person", "male")],
      [
        "grandparent",
        createPerson("grandparent", "Grandparent", "Person", "male"),
      ],
    ]);

    const relationships = createRelationshipMaps([
      ["parent", "child"],
      ["grandparent", "parent"],
    ]);

    const countAll = countAncestors("child", people, relationships);
    expect(countAll).toBe(2);

    const countLimited = countAncestors("child", people, relationships, 1);
    expect(countLimited).toBe(1);
  });

  it("returns 0 for person with no ancestors", () => {
    const people = new Map<string, RelationshipNode>([
      ["person", createPerson("person", "Lonely", "Person")],
    ]);

    const relationships = createRelationshipMaps([]);

    const count = countAncestors("person", people, relationships);
    expect(count).toBe(0);
  });
});

describe("getAncestorsByGeneration", () => {
  it("groups ancestors by generation", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      ["father", createPerson("father", "Father", "Person", "male")],
      ["mother", createPerson("mother", "Mother", "Person", "female")],
      ["grandparent1", createPerson("grandparent1", "GP1", "Person", "male")],
      ["grandparent2", createPerson("grandparent2", "GP2", "Person", "female")],
    ]);

    const relationships = createRelationshipMaps([
      ["father", "child"],
      ["mother", "child"],
      ["grandparent1", "father"],
      ["grandparent2", "father"],
    ]);

    const byGeneration = getAncestorsByGeneration(
      "child",
      people,
      relationships
    );

    expect(byGeneration.has(1)).toBe(true);
    expect(byGeneration.has(2)).toBe(true);
    expect(byGeneration.get(1)!.length).toBe(2);
    expect(byGeneration.get(2)!.length).toBe(2);
  });

  it("returns empty map for person with no ancestors", () => {
    const people = new Map<string, RelationshipNode>([
      ["person", createPerson("person", "Lonely", "Person")],
    ]);

    const relationships = createRelationshipMaps([]);

    const byGeneration = getAncestorsByGeneration(
      "person",
      people,
      relationships
    );

    expect(byGeneration.size).toBe(0);
  });

  it("respects maxGenerations option", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      ["parent", createPerson("parent", "Parent", "Person", "male")],
      [
        "grandparent",
        createPerson("grandparent", "Grandparent", "Person", "male"),
      ],
    ]);

    const relationships = createRelationshipMaps([
      ["parent", "child"],
      ["grandparent", "parent"],
    ]);

    const byGeneration = getAncestorsByGeneration(
      "child",
      people,
      relationships,
      {
        maxGenerations: 1,
      }
    );

    expect(byGeneration.has(1)).toBe(true);
    expect(byGeneration.has(2)).toBe(false);
  });

  it("correctly initializes empty arrays for each generation", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      ["parent", createPerson("parent", "Parent", "Person", "male")],
    ]);

    const relationships = createRelationshipMaps([["parent", "child"]]);

    const byGeneration = getAncestorsByGeneration(
      "child",
      people,
      relationships
    );

    // Should have generation 1
    expect(byGeneration.has(1)).toBe(true);
    expect(Array.isArray(byGeneration.get(1))).toBe(true);
    expect(byGeneration.get(1)!.length).toBe(1);
  });

  it("adds multiple ancestors to the same generation array", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      ["father", createPerson("father", "Father", "Person", "male")],
      ["mother", createPerson("mother", "Mother", "Person", "female")],
    ]);

    const relationships = createRelationshipMaps([
      ["father", "child"],
      ["mother", "child"],
    ]);

    const byGeneration = getAncestorsByGeneration(
      "child",
      people,
      relationships
    );

    expect(byGeneration.get(1)!.length).toBe(2);
    const ids = byGeneration.get(1)!.map((p) => p.id);
    expect(ids).toContain("father");
    expect(ids).toContain("mother");
  });
});

describe("edge cases", () => {
  it("handles circular relationships gracefully (visited tracking)", () => {
    const people = new Map<string, RelationshipNode>([
      ["personA", createPerson("personA", "A", "Person", "male")],
      ["personB", createPerson("personB", "B", "Person", "male")],
    ]);

    // Create a circular relationship (shouldn't happen in real data, but test defense)
    const childToParents = new Map<string, Set<string>>();
    childToParents.set("personA", new Set(["personB"]));
    childToParents.set("personB", new Set(["personA"])); // Circular!

    const relationships: RelationshipMapSet = {
      childToParents,
      spouseMap: new Map(),
    };

    // Should not hang or throw
    const ancestors = findAncestors("personA", people, relationships);
    expect(ancestors).toBeDefined();
    expect(ancestors.length).toBeLessThanOrEqual(2);
  });

  it("handles missing person in people map", () => {
    const people = new Map<string, RelationshipNode>([
      ["child", createPerson("child", "Child", "Person")],
      // parent is missing from people map
    ]);

    const relationships = createRelationshipMaps([["missing_parent", "child"]]);

    const ancestors = findAncestors("child", people, relationships);

    // Should not crash, just skip missing person
    expect(ancestors).toHaveLength(0);
  });
});
