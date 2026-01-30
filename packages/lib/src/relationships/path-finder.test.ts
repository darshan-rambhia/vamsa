/**
 * Tests for Relationship Path Finder
 *
 * Tests the path finding and relationship name calculation functionality
 */
import { describe, expect, it } from "bun:test";
import { calculateRelationshipName, findRelationshipPath } from "./path-finder";
import type { RelationshipMaps, RelationshipNode } from "./path-finder";

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
 * Helper to create relationship maps
 */
function createMaps(
  parentChildPairs: Array<[string, string]>,
  spousePairs: Array<[string, string]> = []
): [Map<string, RelationshipNode>, RelationshipMaps] {
  const people = new Map<string, RelationshipNode>();
  const parents = new Map<string, Array<string>>();
  const children = new Map<string, Array<string>>();
  const spouses = new Map<string, Array<string>>();

  // Set up parent-child relationships
  for (const [parentId, childId] of parentChildPairs) {
    if (!parents.has(childId)) {
      parents.set(childId, []);
    }
    parents.get(childId)!.push(parentId);

    if (!children.has(parentId)) {
      children.set(parentId, []);
    }
    children.get(parentId)!.push(childId);

    if (!people.has(parentId)) {
      people.set(parentId, createPerson(parentId, parentId, "Smith"));
    }
    if (!people.has(childId)) {
      people.set(childId, createPerson(childId, childId, "Smith"));
    }
  }

  // Set up spouse relationships
  for (const [person1Id, person2Id] of spousePairs) {
    if (!spouses.has(person1Id)) {
      spouses.set(person1Id, []);
    }
    spouses.get(person1Id)!.push(person2Id);

    if (!spouses.has(person2Id)) {
      spouses.set(person2Id, []);
    }
    spouses.get(person2Id)!.push(person1Id);

    if (!people.has(person1Id)) {
      people.set(person1Id, createPerson(person1Id, person1Id, "Smith"));
    }
    if (!people.has(person2Id)) {
      people.set(person2Id, createPerson(person2Id, person2Id, "Smith"));
    }
  }

  return [
    people,
    {
      parents,
      children,
      spouses,
    },
  ];
}

describe("findRelationshipPath", () => {
  describe("self-relationship", () => {
    it("returns self-relationship with distance 0", () => {
      const [people, maps] = createMaps([]);

      people.set("person1", createPerson("person1", "John", "Doe"));

      const path = findRelationshipPath("person1", "person1", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("self");
      expect(path!.distance).toBe(0);
      expect(path!.path).toHaveLength(1);
      expect(path!.path[0].id).toBe("person1");
    });

    it("returns null for non-existent person self-comparison", () => {
      const [people, maps] = createMaps([]);

      const path = findRelationshipPath(
        "nonexistent",
        "nonexistent",
        people,
        maps
      );

      expect(path).toBeNull();
    });
  });

  describe("parent-child relationships", () => {
    it("finds father correctly", () => {
      const [people, maps] = createMaps([["father", "child"]]);

      people.set("father", createPerson("father", "John", "Doe", "male"));
      people.set("child", createPerson("child", "Jane", "Doe", "female"));

      const path = findRelationshipPath("child", "father", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("father");
      expect(path!.distance).toBe(1);
    });

    it("finds mother correctly", () => {
      const [people, maps] = createMaps([["mother", "child"]]);

      people.set("mother", createPerson("mother", "Mary", "Doe", "female"));
      people.set("child", createPerson("child", "Jane", "Doe", "female"));

      const path = findRelationshipPath("child", "mother", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("mother");
      expect(path!.distance).toBe(1);
    });

    it("finds son correctly", () => {
      const [people, maps] = createMaps([["parent", "son"]]);

      people.set("parent", createPerson("parent", "John", "Doe", "male"));
      people.set("son", createPerson("son", "Jack", "Doe", "male"));

      const path = findRelationshipPath("parent", "son", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("son");
      expect(path!.distance).toBe(1);
    });

    it("finds daughter correctly", () => {
      const [people, maps] = createMaps([["parent", "daughter"]]);

      people.set("parent", createPerson("parent", "John", "Doe", "male"));
      people.set("daughter", createPerson("daughter", "Jane", "Doe", "female"));

      const path = findRelationshipPath("parent", "daughter", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("daughter");
      expect(path!.distance).toBe(1);
    });
  });

  describe("sibling relationships", () => {
    it("finds brother correctly", () => {
      const [people, maps] = createMaps([
        ["parent", "sibling1"],
        ["parent", "sibling2"],
      ]);

      people.set("parent", createPerson("parent", "John", "Doe", "male"));
      people.set("sibling1", createPerson("sibling1", "Jane", "Doe", "female"));
      people.set("sibling2", createPerson("sibling2", "Jack", "Doe", "male"));

      const path = findRelationshipPath("sibling1", "sibling2", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("brother");
      expect(path!.distance).toBe(2);
    });

    it("finds sister correctly", () => {
      const [people, maps] = createMaps([
        ["parent", "sibling1"],
        ["parent", "sibling2"],
      ]);

      people.set("parent", createPerson("parent", "John", "Doe", "male"));
      people.set("sibling1", createPerson("sibling1", "Jack", "Doe", "male"));
      people.set("sibling2", createPerson("sibling2", "Jane", "Doe", "female"));

      const path = findRelationshipPath("sibling1", "sibling2", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("sister");
      expect(path!.distance).toBe(2);
    });
  });

  describe("grandparent-grandchild relationships", () => {
    it("finds grandfather correctly", () => {
      const [people, maps] = createMaps([
        ["grandfather", "parent"],
        ["parent", "child"],
      ]);

      people.set(
        "grandfather",
        createPerson("grandfather", "John", "Doe", "male")
      );

      const path = findRelationshipPath("child", "grandfather", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("grandfather");
      expect(path!.distance).toBe(2);
    });

    it("finds grandmother correctly", () => {
      const [people, maps] = createMaps([
        ["grandmother", "parent"],
        ["parent", "child"],
      ]);

      people.set(
        "grandmother",
        createPerson("grandmother", "Mary", "Doe", "female")
      );

      const path = findRelationshipPath("child", "grandmother", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("grandmother");
      expect(path!.distance).toBe(2);
    });

    it("finds grandson correctly", () => {
      const [people, maps] = createMaps([
        ["grandparent", "parent"],
        ["parent", "grandson"],
      ]);

      people.set(
        "grandparent",
        createPerson("grandparent", "John", "Doe", "male")
      );
      people.set("grandson", createPerson("grandson", "Jack", "Doe", "male"));

      const path = findRelationshipPath(
        "grandparent",
        "grandson",
        people,
        maps
      );

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("grandson");
      expect(path!.distance).toBe(2);
    });

    it("finds granddaughter correctly", () => {
      const [people, maps] = createMaps([
        ["grandparent", "parent"],
        ["parent", "granddaughter"],
      ]);

      people.set(
        "grandparent",
        createPerson("grandparent", "John", "Doe", "male")
      );
      people.set(
        "granddaughter",
        createPerson("granddaughter", "Jane", "Doe", "female")
      );

      const path = findRelationshipPath(
        "grandparent",
        "granddaughter",
        people,
        maps
      );

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("granddaughter");
      expect(path!.distance).toBe(2);
    });
  });

  describe("great-grandparent-great-grandchild relationships", () => {
    it("finds great-grandfather correctly", () => {
      const [people, maps] = createMaps([
        ["ggrandparent", "grandparent"],
        ["grandparent", "parent"],
        ["parent", "child"],
      ]);

      people.set(
        "ggrandparent",
        createPerson("ggrandparent", "John", "Doe", "male")
      );

      const path = findRelationshipPath("child", "ggrandparent", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("great-grandfather");
      expect(path!.distance).toBe(3);
    });

    it("finds great-grandmother correctly", () => {
      const [people, maps] = createMaps([
        ["ggrandparent", "grandparent"],
        ["grandparent", "parent"],
        ["parent", "child"],
      ]);

      people.set(
        "ggrandparent",
        createPerson("ggrandparent", "Mary", "Doe", "female")
      );

      const path = findRelationshipPath("child", "ggrandparent", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("great-grandmother");
    });

    it("finds great-grandson correctly", () => {
      const [people, maps] = createMaps([
        ["ggrandparent", "grandparent"],
        ["grandparent", "parent"],
        ["parent", "ggrandchild"],
      ]);

      people.set(
        "ggrandparent",
        createPerson("ggrandparent", "John", "Doe", "male")
      );
      people.set(
        "ggrandchild",
        createPerson("ggrandchild", "Jack", "Doe", "male")
      );

      const path = findRelationshipPath(
        "ggrandparent",
        "ggrandchild",
        people,
        maps
      );

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("great-grandson");
    });

    it("finds great-granddaughter correctly", () => {
      const [people, maps] = createMaps([
        ["ggrandparent", "grandparent"],
        ["grandparent", "parent"],
        ["parent", "ggrandchild"],
      ]);

      people.set(
        "ggrandparent",
        createPerson("ggrandparent", "John", "Doe", "male")
      );
      people.set(
        "ggrandchild",
        createPerson("ggrandchild", "Jane", "Doe", "female")
      );

      const path = findRelationshipPath(
        "ggrandparent",
        "ggrandchild",
        people,
        maps
      );

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("great-granddaughter");
    });
  });

  describe("aunt-uncle relationships", () => {
    it("finds relationship between child and uncle through sibling relationship", () => {
      const [people, maps] = createMaps([
        ["grandparent", "parent"],
        ["grandparent", "uncle"],
        ["parent", "child"],
      ]);

      people.set(
        "grandparent",
        createPerson("grandparent", "John", "Doe", "male")
      );
      people.set("uncle", createPerson("uncle", "Jack", "Doe", "male"));
      people.set("parent", createPerson("parent", "Jane", "Doe", "female"));
      people.set("child", createPerson("child", "Mary", "Doe", "female"));

      const path = findRelationshipPath("child", "uncle", people, maps);

      expect(path).not.toBeNull();
      // Path should exist through parent
      expect(path!.distance).toBeGreaterThan(0);
    });

    it("finds relationship between child and aunt through sibling relationship", () => {
      const [people, maps] = createMaps([
        ["grandparent", "parent"],
        ["grandparent", "aunt"],
        ["parent", "child"],
      ]);

      people.set(
        "grandparent",
        createPerson("grandparent", "John", "Doe", "male")
      );
      people.set("aunt", createPerson("aunt", "Mary", "Doe", "female"));
      people.set("parent", createPerson("parent", "Jane", "Doe", "female"));
      people.set("child", createPerson("child", "Jack", "Doe", "male"));

      const path = findRelationshipPath("child", "aunt", people, maps);

      expect(path).not.toBeNull();
      // Path should exist through parent
      expect(path!.distance).toBeGreaterThan(0);
    });
  });

  describe("niece-nephew relationships", () => {
    it("handles niece relationship", () => {
      const [people, maps] = createMaps([
        ["parent", "sibling"],
        ["parent", "another_parent"],
        ["another_parent", "niece"],
      ]);

      people.set("parent", createPerson("parent", "John", "Doe", "male"));
      people.set("sibling", createPerson("sibling", "Jane", "Doe", "female"));
      people.set(
        "another_parent",
        createPerson("another_parent", "Jack", "Doe", "male")
      );
      people.set("niece", createPerson("niece", "Mary", "Doe", "female"));

      const path = findRelationshipPath("sibling", "niece", people, maps);

      expect(path).not.toBeNull();
      // The relationship depends on the family structure
      expect(path!.path.length).toBeGreaterThan(0);
    });
  });

  describe("spouse relationships", () => {
    it("finds husband correctly", () => {
      const [people, maps] = createMaps([], [["person1", "husband"]]);

      people.set("person1", createPerson("person1", "Jane", "Doe", "female"));
      people.set("husband", createPerson("husband", "John", "Doe", "male"));

      const path = findRelationshipPath("person1", "husband", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("husband");
      expect(path!.distance).toBe(1);
    });

    it("finds wife correctly", () => {
      const [people, maps] = createMaps([], [["person1", "wife"]]);

      people.set("person1", createPerson("person1", "John", "Doe", "male"));
      people.set("wife", createPerson("wife", "Jane", "Doe", "female"));

      const path = findRelationshipPath("person1", "wife", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("wife");
      expect(path!.distance).toBe(1);
    });
  });

  describe("cousin relationships", () => {
    it("finds first cousin relationship", () => {
      const [people, maps] = createMaps([
        ["grandparent", "parent1"],
        ["grandparent", "parent2"],
        ["parent1", "cousin1"],
        ["parent2", "cousin2"],
      ]);

      const path = findRelationshipPath("cousin1", "cousin2", people, maps);

      expect(path).not.toBeNull();
      expect(path!.relationship).toBe("cousin");
      expect(path!.distance).toBeGreaterThan(0);
    });
  });

  describe("error cases", () => {
    it("returns null for unrelated people", () => {
      const [people, maps] = createMaps([
        ["parentA", "childA"],
        ["parentB", "childB"],
      ]);

      const path = findRelationshipPath("childA", "childB", people, maps);

      expect(path).toBeNull();
    });

    it("returns null when first person does not exist", () => {
      const [people, maps] = createMaps([["parent", "child"]]);

      const path = findRelationshipPath("nonexistent", "child", people, maps);

      expect(path).toBeNull();
    });

    it("returns null when second person does not exist", () => {
      const [people, maps] = createMaps([["parent", "child"]]);

      const path = findRelationshipPath("child", "nonexistent", people, maps);

      expect(path).toBeNull();
    });

    it("returns null when both people do not exist", () => {
      const [people, maps] = createMaps([]);

      const path = findRelationshipPath(
        "nonexistent1",
        "nonexistent2",
        people,
        maps
      );

      expect(path).toBeNull();
    });
  });

  describe("path structure", () => {
    it("returns correct path structure", () => {
      const [people, maps] = createMaps([
        ["grandparent", "parent"],
        ["parent", "child"],
      ]);

      const path = findRelationshipPath("child", "grandparent", people, maps);

      expect(path).not.toBeNull();
      expect(path!).toHaveProperty("path");
      expect(path!).toHaveProperty("relationship");
      expect(path!).toHaveProperty("distance");
      expect(Array.isArray(path!.path)).toBe(true);
      expect(typeof path!.relationship).toBe("string");
      expect(typeof path!.distance).toBe("number");
    });

    it("path array contains correct persons in order", () => {
      const [people, maps] = createMaps([["parent", "child"]]);

      const path = findRelationshipPath("child", "parent", people, maps);

      expect(path).not.toBeNull();
      expect(path!.path.length).toBeGreaterThanOrEqual(2);
      expect(path!.path[0].id).toBe("child");
      expect(path!.path[1].id).toBe("parent");
    });
  });
});

describe("calculateRelationshipName", () => {
  describe("basic relationships", () => {
    it("returns 'self' for single person path", () => {
      const node = createPerson("person1", "John", "Doe");
      const name = calculateRelationshipName([node], new Map(), {
        parents: new Map(),
        children: new Map(),
        spouses: new Map(),
      });

      expect(name).toBe("self");
    });

    it("returns 'unknown' for empty path", () => {
      const name = calculateRelationshipName([], new Map(), {
        parents: new Map(),
        children: new Map(),
        spouses: new Map(),
      });

      expect(name).toBe("unknown");
    });

    it("handles path without edges", () => {
      const person = createPerson("person1", "John", "Doe");
      const name = calculateRelationshipName([person, person], new Map(), {
        parents: new Map(),
        children: new Map(),
        spouses: new Map(),
      });

      expect(name).toBe("relative");
    });
  });

  describe("distance-based naming", () => {
    it("correctly names distant relative for longer paths", () => {
      const person1 = createPerson("person1", "John", "Doe");
      const person2 = createPerson("person2", "Jane", "Doe");
      const person3 = createPerson("person3", "Jack", "Doe");
      const person4 = createPerson("person4", "Mary", "Doe");

      const name = calculateRelationshipName(
        [person1, person2, person3, person4],
        new Map(),
        { parents: new Map(), children: new Map(), spouses: new Map() }
      );

      expect(name).toBe("distant relative");
    });
  });
});

describe("integration tests", () => {
  it("handles complex family tree with multiple branches", () => {
    const [people, maps] = createMaps([
      ["ancestor", "parent1"],
      ["ancestor", "parent2"],
      ["parent1", "child1"],
      ["parent1", "child2"],
      ["parent2", "child3"],
      ["child1", "grandchild1"],
    ]);

    // Find various relationships
    const path1 = findRelationshipPath("child1", "ancestor", people, maps);
    expect(path1).not.toBeNull();

    const path2 = findRelationshipPath("child1", "child2", people, maps);
    expect(path2).not.toBeNull();

    const path3 = findRelationshipPath("grandchild1", "parent2", people, maps);
    expect(path3).not.toBeNull();
  });

  it("correctly identifies relationships through spouse connections", () => {
    const [people, maps] = createMaps(
      [["parent", "child"]],
      [["parent", "spouse"]]
    );

    people.set("parent", createPerson("parent", "John", "Doe", "male"));
    people.set("spouse", createPerson("spouse", "Jane", "Doe", "female"));
    people.set("child", createPerson("child", "Jack", "Doe", "male"));

    const path = findRelationshipPath("child", "spouse", people, maps);

    expect(path).not.toBeNull();
    // Spouse is connected through parent relationship
    expect(path!.distance).toBeGreaterThan(0);
  });
});
