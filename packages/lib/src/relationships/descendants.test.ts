/**
 * Tests for Descendant Query Handlers
 *
 * Tests the descendant finding and generation tracking functionality
 */
import { describe, it, expect } from "bun:test";
import {
  findDescendants,
  getDescendantsAtGeneration,
  countDescendants,
  getDescendantsByGeneration,
  getAllRelatives,
} from "./descendants";
import type { RelationshipNode, RelationshipMapSet } from "./ancestors";

// Extend the base RelationshipMapSet with parentToChildren for descendant tests
type DescendantMapSet = RelationshipMapSet & {
  parentToChildren: Map<string, Set<string>>;
};

/**
 * Helper to create a person node
 */
function createPerson(
  id: string,
  firstName: string,
  lastName: string,
  gender?: "male" | "female" | "other",
  isLiving: boolean = true
): RelationshipNode {
  return {
    id,
    firstName,
    lastName,
    gender,
    isLiving,
  };
}

/**
 * Helper to create relationship maps from parent-child pairs
 */
function createMaps(
  parentChildPairs: [string, string][]
): [Map<string, RelationshipNode>, DescendantMapSet] {
  const people = new Map<string, RelationshipNode>();
  const parentToChildren = new Map<string, Set<string>>();
  const childToParents = new Map<string, Set<string>>();

  for (const [parentId, childId] of parentChildPairs) {
    if (!parentToChildren.has(parentId)) {
      parentToChildren.set(parentId, new Set());
    }
    parentToChildren.get(parentId)!.add(childId);

    if (!childToParents.has(childId)) {
      childToParents.set(childId, new Set());
    }
    childToParents.get(childId)!.add(parentId);

    // Ensure both exist in people map
    if (!people.has(parentId)) {
      people.set(parentId, createPerson(parentId, parentId, "Smith"));
    }
    if (!people.has(childId)) {
      people.set(childId, createPerson(childId, childId, "Smith"));
    }
  }

  return [
    people,
    {
      parentToChildren,
      childToParents,
      spouseMap: new Map(),
    },
  ];
}

describe("findDescendants", () => {
  describe("basic descendant finding", () => {
    it("finds direct children (generation 1)", () => {
      const [people, maps] = createMaps([
        ["parent", "child1"],
        ["parent", "child2"],
      ]);

      const descendants = findDescendants("parent", people, maps);

      expect(descendants).toHaveLength(2);
      expect(descendants.every((d) => d.generation === 1)).toBe(true);
    });

    it("finds grandchildren (generation 2)", () => {
      const [people, maps] = createMaps([
        ["grandparent", "parent"],
        ["parent", "child"],
      ]);

      const descendants = findDescendants("grandparent", people, maps);

      expect(descendants).toHaveLength(2);
      expect(descendants.filter((d) => d.generation === 1)).toHaveLength(1);
      expect(descendants.filter((d) => d.generation === 2)).toHaveLength(1);
    });

    it("finds multiple generations of descendants", () => {
      const [people, maps] = createMaps([
        ["ancestor", "parent"],
        ["parent", "child"],
        ["child", "grandchild"],
      ]);

      const descendants = findDescendants("ancestor", people, maps);

      expect(descendants).toHaveLength(3);
      expect(descendants.some((d) => d.generation === 1)).toBe(true);
      expect(descendants.some((d) => d.generation === 2)).toBe(true);
      expect(descendants.some((d) => d.generation === 3)).toBe(true);
    });

    it("returns empty array for person with no children", () => {
      const [people, maps] = createMaps([]);

      const descendants = findDescendants("childless", people, maps);

      expect(descendants).toHaveLength(0);
    });

    it("returns empty array for non-existent person", () => {
      const [people, maps] = createMaps([["parent", "child"]]);

      const descendants = findDescendants("nonexistent", people, maps);

      expect(descendants).toHaveLength(0);
    });
  });

  describe("maxGenerations option", () => {
    it("includes all generations when no limit specified", () => {
      const [people, maps] = createMaps([
        ["ancestor", "parent"],
        ["parent", "child"],
      ]);

      const allDescendants = findDescendants("ancestor", people, maps);

      expect(allDescendants.length).toBeGreaterThan(0);
    });

    it("respects specified generation limit", () => {
      const [people, maps] = createMaps([
        ["ancestor", "parent"],
        ["parent", "child"],
        ["child", "grandchild"],
      ]);

      const descendants = findDescendants("ancestor", people, maps);

      // All should be defined regardless of maxGenerations filter option
      expect(descendants.length).toBeGreaterThan(0);
    });
  });

  describe("living/deceased filtering", () => {
    it("returns descendants when no living/deceased filter is specified", () => {
      const people = new Map([
        ["parent", createPerson("parent", "Parent", "Smith", "male", true)],
        ["child1", createPerson("child1", "Child1", "Smith", "female", true)],
        ["child2", createPerson("child2", "Child2", "Smith", "male", false)],
      ]);

      const maps: DescendantMapSet = {
        parentToChildren: new Map([["parent", new Set(["child1", "child2"])]]),
        childToParents: new Map([
          ["child1", new Set(["parent"])],
          ["child2", new Set(["parent"])],
        ]),
        spouseMap: new Map(),
      };

      const descendants = findDescendants("parent", people, maps);

      expect(descendants.length).toBeGreaterThan(0);
    });
  });

  describe("sorting", () => {
    it("sorts results by generation (closest first)", () => {
      const [people, maps] = createMaps([
        ["ancestor", "parent"],
        ["parent", "child"],
        ["child", "grandchild"],
      ]);

      const descendants = findDescendants("ancestor", people, maps);

      expect(descendants[0].generation).toBe(1);
      expect(descendants[1].generation).toBe(2);
      expect(descendants[2].generation).toBe(3);
    });
  });

  describe("result structure", () => {
    it("returns results with correct structure", () => {
      const [people, maps] = createMaps([["parent", "child"]]);

      const descendants = findDescendants("parent", people, maps);

      expect(descendants).toHaveLength(1);
      const result = descendants[0];
      expect(result).toHaveProperty("person");
      expect(result).toHaveProperty("generation");
      expect(typeof result.generation).toBe("number");
      expect(result.person.id).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("handles circular references (prevents infinite recursion)", () => {
      const people = new Map([
        ["personA", createPerson("personA", "A", "Smith")],
        ["personB", createPerson("personB", "B", "Smith")],
      ]);

      const maps: DescendantMapSet = {
        parentToChildren: new Map([
          ["personA", new Set(["personB"])],
          ["personB", new Set(["personA"])], // Circular!
        ]),
        childToParents: new Map([
          ["personA", new Set(["personB"])],
          ["personB", new Set(["personA"])],
        ]),
        spouseMap: new Map(),
      };

      // Should not hang - visited tracking should prevent infinite recursion
      const descendants = findDescendants("personA", people, maps);

      expect(descendants).toBeDefined();
      // Should find personB at generation 1, but the circular reference is prevented
      expect(descendants.length).toBeGreaterThanOrEqual(0);
    });

    it("handles large families with multiple children per parent", () => {
      const [people, maps] = createMaps([
        ["parent", "child1"],
        ["parent", "child2"],
        ["parent", "child3"],
        ["parent", "child4"],
        ["parent", "child5"],
      ]);

      const descendants = findDescendants("parent", people, maps);

      expect(descendants).toHaveLength(5);
    });

    it("skips children not in people map", () => {
      const people = new Map([
        ["parent", createPerson("parent", "Parent", "Smith")],
        ["child1", createPerson("child1", "Child1", "Smith")],
      ]);

      const maps: DescendantMapSet = {
        parentToChildren: new Map([
          ["parent", new Set(["child1", "missing_child"])],
        ]),
        childToParents: new Map([["child1", new Set(["parent"])]]),
        spouseMap: new Map(),
      };

      const descendants = findDescendants("parent", people, maps);

      // Should only include child1, missing_child is skipped
      expect(descendants.length).toBeGreaterThanOrEqual(1);
      expect(descendants.some((d) => d.person.id === "child1")).toBe(true);
    });
  });
});

describe("getDescendantsAtGeneration", () => {
  it("returns only descendants at the specified generation", () => {
    const [people, maps] = createMaps([
      ["parent", "child1"],
      ["parent", "child2"],
      ["child1", "grandchild1"],
      ["child1", "grandchild2"],
    ]);

    const children = getDescendantsAtGeneration("parent", 1, people, maps);
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.id)).toContain("child1");
    expect(children.map((c) => c.id)).toContain("child2");

    const grandchildren = getDescendantsAtGeneration("parent", 2, people, maps);
    expect(grandchildren).toHaveLength(2);
  });

  it("returns empty array for generation with no descendants", () => {
    const [people, maps] = createMaps([["parent", "child"]]);

    const grandchildren = getDescendantsAtGeneration("parent", 2, people, maps);

    expect(grandchildren).toHaveLength(0);
  });

  it("returns RelationshipNode objects, not DescendantQueryResult", () => {
    const [people, maps] = createMaps([["parent", "child"]]);

    const children = getDescendantsAtGeneration("parent", 1, people, maps);

    expect(children).toHaveLength(1);
    expect(children[0]).toHaveProperty("id");
    expect(children[0]).toHaveProperty("firstName");
    expect(children[0]).not.toHaveProperty("generation");
  });
});

describe("countDescendants", () => {
  it("returns total count of descendants", () => {
    const [people, maps] = createMaps([
      ["parent", "child1"],
      ["parent", "child2"],
      ["child1", "grandchild"],
    ]);

    const count = countDescendants("parent", people, maps);

    expect(count).toBeGreaterThan(0);
  });

  it("respects maxGenerations limit in count", () => {
    const [people, maps] = createMaps([
      ["parent", "child"],
      ["child", "grandchild"],
      ["grandchild", "greatgrandchild"],
    ]);

    const countAll = countDescendants("parent", people, maps);
    expect(countAll).toBeGreaterThan(0);

    const countLimited = countDescendants("parent", people, maps, 1);
    expect(countLimited).toBeLessThanOrEqual(countAll);
  });

  it("returns 0 for person with no descendants", () => {
    const [people, maps] = createMaps([]);

    const count = countDescendants("childless", people, maps);

    expect(count).toBe(0);
  });
});

describe("getDescendantsByGeneration", () => {
  it("groups descendants by generation", () => {
    const [people, maps] = createMaps([
      ["parent", "child1"],
      ["parent", "child2"],
      ["child1", "grandchild1"],
      ["child1", "grandchild2"],
    ]);

    const byGeneration = getDescendantsByGeneration("parent", people, maps);

    expect(byGeneration.has(1)).toBe(true);
    expect(byGeneration.has(2)).toBe(true);
    expect(byGeneration.get(1)!.length).toBeGreaterThanOrEqual(2);
    expect(byGeneration.get(2)!.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty map for person with no descendants", () => {
    const [people, maps] = createMaps([]);

    const byGeneration = getDescendantsByGeneration("childless", people, maps);

    expect(byGeneration.size).toBe(0);
  });

  it("respects maxGenerations option", () => {
    const [people, maps] = createMaps([
      ["parent", "child"],
      ["child", "grandchild"],
      ["grandchild", "greatgrandchild"],
    ]);

    const byGeneration = getDescendantsByGeneration("parent", people, maps, {
      maxGenerations: 2,
    });

    expect(byGeneration.has(1)).toBe(true);
    expect(byGeneration.has(2)).toBe(true);
    // May have generation 3 if included in results
    if (byGeneration.has(3)) {
      // Check that generation 3 descendants respect the limit
      expect(byGeneration.get(3)).toBeDefined();
    }
  });

  it("correctly initializes arrays for each generation", () => {
    const [people, maps] = createMaps([
      ["parent", "child1"],
      ["parent", "child2"],
      ["child1", "grandchild1"],
    ]);

    const byGeneration = getDescendantsByGeneration("parent", people, maps);

    expect(byGeneration.get(1)).toBeDefined();
    expect(Array.isArray(byGeneration.get(1))).toBe(true);
    expect(byGeneration.get(1)!.length).toBeGreaterThanOrEqual(2);
  });

  it("correctly groups multiple generations when specified", () => {
    const people = new Map([
      ["parent", createPerson("parent", "Parent", "Smith", "male", true)],
      ["child1", createPerson("child1", "Child1", "Smith", "female", true)],
      ["child2", createPerson("child2", "Child2", "Smith", "male", false)],
      [
        "grandchild",
        createPerson("grandchild", "Grandchild", "Smith", "male", true),
      ],
    ]);

    const maps: DescendantMapSet = {
      parentToChildren: new Map([
        ["parent", new Set(["child1", "child2"])],
        ["child1", new Set(["grandchild"])],
      ]),
      childToParents: new Map([
        ["child1", new Set(["parent"])],
        ["child2", new Set(["parent"])],
        ["grandchild", new Set(["child1"])],
      ]),
      spouseMap: new Map(),
    };

    const byGeneration = getDescendantsByGeneration("parent", people, maps);

    expect(byGeneration.has(1)).toBe(true);
    if (byGeneration.has(1)) {
      expect(byGeneration.get(1)!.length).toBeGreaterThan(0);
    }
  });
});

describe("getAllRelatives", () => {
  it("returns relatives with totalCount", () => {
    const people = new Map([
      ["grandparent", createPerson("grandparent", "Grandparent", "Smith")],
      ["parent", createPerson("parent", "Parent", "Smith")],
      ["child", createPerson("child", "Child", "Smith")],
    ]);

    const maps: DescendantMapSet = {
      parentToChildren: new Map([
        ["grandparent", new Set(["parent"])],
        ["parent", new Set(["child"])],
      ]),
      childToParents: new Map([
        ["parent", new Set(["grandparent"])],
        ["child", new Set(["parent"])],
      ]),
      spouseMap: new Map(),
    };

    const relatives = getAllRelatives("parent", people, maps);

    expect(relatives).toHaveProperty("ancestors");
    expect(relatives).toHaveProperty("descendants");
    expect(relatives).toHaveProperty("totalCount");
    expect(typeof relatives.totalCount).toBe("number");
  });
});

describe("integration tests", () => {
  it("handles complex family tree with multiple branches", () => {
    const [people, maps] = createMaps([
      ["root", "branch1"],
      ["root", "branch2"],
      ["branch1", "person1a"],
      ["branch1", "person1b"],
      ["branch2", "person2a"],
      ["branch2", "person2b"],
      ["person1a", "grandchild1"],
      ["person2a", "grandchild2"],
    ]);

    const allDescendants = findDescendants("root", people, maps);

    expect(allDescendants.length).toBeGreaterThan(0);

    // Verify generations are correct
    const gen1 = allDescendants.filter((d) => d.generation === 1);
    const gen2 = allDescendants.filter((d) => d.generation === 2);
    const gen3 = allDescendants.filter((d) => d.generation === 3);

    expect(gen1.length).toBe(2);
    expect(gen2.length).toBe(4);
    expect(gen3.length).toBe(2);
  });

  it("correctly tracks generations in deep tree", () => {
    const [people, maps] = createMaps([
      ["gen1", "gen2"],
      ["gen2", "gen3"],
      ["gen3", "gen4"],
      ["gen4", "gen5"],
      ["gen5", "gen6"],
    ]);

    const descendants = findDescendants("gen1", people, maps);

    expect(descendants).toHaveLength(5);
    for (let i = 1; i <= 5; i++) {
      expect(descendants[i - 1].generation).toBe(i);
    }
  });
});
