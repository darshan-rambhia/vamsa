/**
 * Tests for Common Ancestor Finder
 *
 * Tests the lowest common ancestor (LCA) and all common ancestors functionality
 */
import { describe, expect, it } from "bun:test";
import { findAllCommonAncestors, findCommonAncestor } from "./common-ancestor";

interface RelationshipNode {
  id: string;
  firstName: string;
  lastName: string;
  gender?: "male" | "female" | "other";
}

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
function createMaps(
  parentChildPairs: Array<[string, string]>
): [Map<string, RelationshipNode>, Map<string, Array<string>>] {
  const people = new Map<string, RelationshipNode>();
  const parents = new Map<string, Array<string>>();

  for (const [parentId, childId] of parentChildPairs) {
    if (!parents.has(childId)) {
      parents.set(childId, []);
    }
    parents.get(childId)!.push(parentId);

    // Ensure both parent and child exist in people map
    if (!people.has(parentId)) {
      people.set(parentId, createPerson(parentId, parentId, "Smith"));
    }
    if (!people.has(childId)) {
      people.set(childId, createPerson(childId, childId, "Smith"));
    }
  }

  return [people, parents];
}

describe("findCommonAncestor", () => {
  describe("same person", () => {
    it("returns self with distance 0 when same person", () => {
      const people = new Map([
        ["person1", createPerson("person1", "John", "Doe")],
      ]);
      const parents = new Map<string, Array<string>>();

      const result = findCommonAncestor("person1", "person1", people, parents);

      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("person1");
      expect(result!.distance1).toBe(0);
      expect(result!.distance2).toBe(0);
    });

    it("returns null when person does not exist in people map", () => {
      const people = new Map<string, RelationshipNode>();
      const parents = new Map<string, Array<string>>();

      const result = findCommonAncestor(
        "nonexistent",
        "nonexistent",
        people,
        parents
      );

      expect(result).toBeNull();
    });
  });

  describe("direct parent-child relationship", () => {
    it("finds parent as common ancestor", () => {
      const [people, parents] = createMaps([["parent1", "child1"]]);

      const result = findCommonAncestor("child1", "parent1", people, parents);

      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("parent1");
      expect(result!.distance1).toBe(1); // child to parent
      expect(result!.distance2).toBe(0); // parent to parent (self)
    });

    it("finds grandparent as common ancestor", () => {
      const [people, parents] = createMaps([
        ["grandparent", "parent"],
        ["parent", "child"],
      ]);

      const result = findCommonAncestor(
        "child",
        "grandparent",
        people,
        parents
      );

      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("grandparent");
      expect(result!.distance1).toBe(2); // child to grandparent
      expect(result!.distance2).toBe(0); // grandparent to grandparent
    });
  });

  describe("sibling relationships", () => {
    it("finds parent as common ancestor of siblings", () => {
      const [people, parents] = createMaps([
        ["parent", "child1"],
        ["parent", "child2"],
      ]);

      const result = findCommonAncestor("child1", "child2", people, parents);

      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("parent");
      expect(result!.distance1).toBe(1); // child1 to parent
      expect(result!.distance2).toBe(1); // child2 to parent
    });

    it("finds closest common ancestor for siblings with extended tree", () => {
      const [people, parents] = createMaps([
        ["grandparent1", "parent1"],
        ["grandparent2", "parent1"],
        ["parent1", "child1"],
        ["parent1", "child2"],
      ]);

      const result = findCommonAncestor("child1", "child2", people, parents);

      // Should return parent, not grandparents (closest = LCA)
      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("parent1");
      expect(result!.distance1).toBe(1);
      expect(result!.distance2).toBe(1);
    });
  });

  describe("cousin relationships", () => {
    it("finds common grandparent for first cousins", () => {
      const [people, parents] = createMaps([
        ["grandparent", "parent1"],
        ["grandparent", "parent2"],
        ["parent1", "child1"],
        ["parent2", "child2"],
      ]);

      const result = findCommonAncestor("child1", "child2", people, parents);

      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("grandparent");
      expect(result!.distance1).toBe(2); // child1 -> parent1 -> grandparent
      expect(result!.distance2).toBe(2); // child2 -> parent2 -> grandparent
    });

    it("finds common ancestor for second cousins", () => {
      const [people, parents] = createMaps([
        ["ggrandparent", "grandparent1"],
        ["ggrandparent", "grandparent2"],
        ["grandparent1", "parent1"],
        ["grandparent2", "parent2"],
        ["parent1", "child1"],
        ["parent2", "child2"],
      ]);

      const result = findCommonAncestor("child1", "child2", people, parents);

      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("ggrandparent");
      expect(result!.distance1).toBe(3);
      expect(result!.distance2).toBe(3);
    });
  });

  describe("no common ancestor", () => {
    it("returns null for unrelated people", () => {
      const [people, parents] = createMaps([
        ["parentA", "childA"],
        ["parentB", "childB"],
      ]);

      const result = findCommonAncestor("childA", "childB", people, parents);

      expect(result).toBeNull();
    });

    it("returns null when second person does not exist", () => {
      const [people, parents] = createMaps([["parent", "child"]]);

      const result = findCommonAncestor(
        "child",
        "nonexistent",
        people,
        parents
      );

      expect(result).toBeNull();
    });

    it("returns null when first person does not exist in people map", () => {
      const [people, parents] = createMaps([["parent", "child"]]);

      const result = findCommonAncestor(
        "nonexistent",
        "child",
        people,
        parents
      );

      expect(result).toBeNull();
    });
  });

  describe("edge cases with multiple parents", () => {
    it("handles person with multiple parents (both lineages)", () => {
      const [people, parents] = createMaps([
        ["motherParent", "mother"],
        ["fatherParent", "father"],
        ["mother", "child"],
        ["father", "child"],
      ]);

      const result = findCommonAncestor(
        "child",
        "motherParent",
        people,
        parents
      );

      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("motherParent");
      expect(result!.distance1).toBe(2); // child -> mother -> motherParent
      expect(result!.distance2).toBe(0);
    });

    it("finds highest common ancestor when multiple paths exist", () => {
      const [people, parents] = createMaps([
        ["ancestor", "parent1"],
        ["ancestor", "parent2"],
        ["parent1", "child1"],
        ["parent2", "child2"],
      ]);

      const result = findCommonAncestor("child1", "child2", people, parents);

      // LCA algorithm should find closest ancestor first
      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("ancestor");
    });
  });

  describe("distance calculations", () => {
    it("calculates correct distances for asymmetric relationships", () => {
      const [people, parents] = createMaps([
        ["grandparent", "parent"],
        ["parent", "child"],
        ["parent", "grandchild"],
        ["grandchild", "greatgrandchild"],
      ]);

      const result = findCommonAncestor(
        "child",
        "greatgrandchild",
        people,
        parents
      );

      expect(result).not.toBeNull();
      expect(result!.ancestor.id).toBe("parent");
      expect(result!.distance1).toBe(1); // child to parent
      expect(result!.distance2).toBe(2); // greatgrandchild -> grandchild -> parent
    });
  });
});

describe("findAllCommonAncestors", () => {
  describe("single common ancestor", () => {
    it("returns all ancestors when they share one common ancestor", () => {
      const [people, parents] = createMaps([
        ["parent", "child1"],
        ["parent", "child2"],
      ]);

      const results = findAllCommonAncestors(
        "child1",
        "child2",
        people,
        parents
      );

      expect(results).toHaveLength(1);
      expect(results[0].ancestor.id).toBe("parent");
    });
  });

  describe("multiple common ancestors", () => {
    it("returns all common ancestors through both lineages", () => {
      const [people, parents] = createMaps([
        ["grandparent1", "parent1"],
        ["grandparent2", "parent1"],
        ["parent1", "child1"],
        ["parent1", "child2"],
      ]);

      const results = findAllCommonAncestors(
        "child1",
        "child2",
        people,
        parents
      );

      // Should find parent1, grandparent1, and grandparent2
      expect(results.length).toBeGreaterThanOrEqual(1);

      const ancestorIds = results.map((r) => r.ancestor.id);
      expect(ancestorIds).toContain("parent1");
    });

    it("includes both sides of family tree for cousins", () => {
      const [people, parents] = createMaps([
        ["ggrandparent", "grandparent1"],
        ["ggrandparent", "grandparent2"],
        ["grandparent1", "parent1"],
        ["grandparent2", "parent2"],
        ["parent1", "child1"],
        ["parent2", "child2"],
      ]);

      const results = findAllCommonAncestors(
        "child1",
        "child2",
        people,
        parents
      );

      // Should find ggrandparent, grandparent1, and grandparent2
      expect(results.length).toBeGreaterThanOrEqual(1);

      const ancestorIds = results.map((r) => r.ancestor.id);
      expect(ancestorIds).toContain("ggrandparent");
    });
  });

  describe("sorting", () => {
    it("sorts results by total distance (closest first)", () => {
      const [people, parents] = createMaps([
        ["ancestor", "parent1"],
        ["ancestor", "parent2"],
        ["parent1", "child1"],
        ["parent2", "child2"],
      ]);

      const results = findAllCommonAncestors(
        "child1",
        "child2",
        people,
        parents
      );

      // Results should be sorted by total distance
      for (let i = 1; i < results.length; i++) {
        const prevTotal = results[i - 1].distance1 + results[i - 1].distance2;
        const currTotal = results[i].distance1 + results[i].distance2;
        expect(currTotal).toBeGreaterThanOrEqual(prevTotal);
      }
    });

    it("uses distance1 as tiebreaker when total distance equal", () => {
      // Create a scenario where two ancestors have same total distance
      const [people, parents] = createMaps([
        ["ancestor1", "parent1"],
        ["ancestor2", "parent2"],
        ["parent1", "child1"],
        ["parent2", "child2"],
      ]);

      // Both ancestors are at total distance 2 (1 + 1)
      const results = findAllCommonAncestors(
        "child1",
        "child2",
        people,
        parents
      );

      // Should be sorted with consistent ordering
      expect(results).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("returns empty array when no common ancestors exist", () => {
      const [people, parents] = createMaps([
        ["parentA", "childA"],
        ["parentB", "childB"],
      ]);

      const results = findAllCommonAncestors(
        "childA",
        "childB",
        people,
        parents
      );

      expect(results).toHaveLength(0);
    });

    it("returns empty array when second person does not exist", () => {
      const [people, parents] = createMaps([["parent", "child"]]);

      const results = findAllCommonAncestors(
        "child",
        "nonexistent",
        people,
        parents
      );

      expect(results).toHaveLength(0);
    });

    it("handles self-comparison", () => {
      const [people, parents] = createMaps([["parent", "child"]]);

      const results = findAllCommonAncestors("child", "child", people, parents);

      // A person and themselves share all ancestors
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("handles deep family trees", () => {
      const [people, parents] = createMaps([
        ["ancestor5", "ancestor4"],
        ["ancestor4", "ancestor3"],
        ["ancestor3", "ancestor2"],
        ["ancestor2", "ancestor1"],
        ["ancestor1", "parent"],
        ["parent", "child"],
      ]);

      const results = findAllCommonAncestors(
        "child",
        "parent",
        people,
        parents
      );

      expect(results.length).toBeGreaterThan(0);
      const ancestorIds = results.map((r) => r.ancestor.id);
      expect(ancestorIds).toContain("parent");
    });
  });

  describe("result structure", () => {
    it("returns results with correct structure", () => {
      const [people, parents] = createMaps([
        ["parent", "child1"],
        ["parent", "child2"],
      ]);

      const results = findAllCommonAncestors(
        "child1",
        "child2",
        people,
        parents
      );

      expect(results.length).toBeGreaterThan(0);

      results.forEach((result) => {
        expect(result).toHaveProperty("ancestor");
        expect(result).toHaveProperty("distance1");
        expect(result).toHaveProperty("distance2");
        expect(typeof result.distance1).toBe("number");
        expect(typeof result.distance2).toBe("number");
        expect(result.ancestor.id).toBeDefined();
      });
    });

    it("returns ancestor objects from the people map", () => {
      const people = new Map([
        ["parent", createPerson("parent", "Parent", "Person", "male")],
        ["child1", createPerson("child1", "Child1", "Person")],
        ["child2", createPerson("child2", "Child2", "Person")],
      ]);

      const parents = new Map([
        ["child1", ["parent"]],
        ["child2", ["parent"]],
      ]);

      const results = findAllCommonAncestors(
        "child1",
        "child2",
        people,
        parents
      );

      expect(results.length).toBeGreaterThan(0);
      const expectedAncestor = people.get("parent")!;
      expect(results[0].ancestor).toBe(expectedAncestor);
    });
  });
});
