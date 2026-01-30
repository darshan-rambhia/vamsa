/**
 * Unit tests for chart helper functions
 *
 * Tests cover pure functions for chart data collection and layout:
 * - buildRelationshipMaps: extracting parent/child/spouse maps
 * - collectAncestors: recursive ancestor collection with generation tracking
 * - collectDescendants: recursive descendant collection with generation tracking
 * - calculateFanLayout: radial angle position calculation
 * - collectBowtieAncestors: dual-sided ancestor collection
 * - collectTreeAncestors: negative generation ancestor collection
 * - collectTreeDescendants: positive generation descendant collection
 *
 * All functions are pure with no side effects, making them fully testable.
 */

import { describe, expect, it } from "bun:test";
import {
  buildRelationshipMaps,
  calculateFanLayout,
  collectAncestors,
  collectBowtieAncestors,
  collectDescendants,
  collectTreeAncestors,
  collectTreeDescendants,
} from "./charts";
import type { CollectionState, PersonData, RelationshipData } from "./charts";

/**
 * Helper to create a person data object
 */
function createPerson(
  id: string,
  firstName = "John",
  lastName = "Doe"
): PersonData {
  return {
    id,
    firstName,
    lastName,
    dateOfBirth: new Date("1990-01-01"),
    dateOfPassing: null,
    isLiving: true,
    photoUrl: null,
    gender: "M",
  };
}

/**
 * Helper to create an initial collection state
 */
function createCollectionState(withSides = false): CollectionState {
  return {
    nodeIds: new Set(),
    edges: new Map(),
    generations: new Map(),
    sides: withSides ? new Map() : undefined,
  };
}

describe("chart helpers", () => {
  describe("buildRelationshipMaps", () => {
    it("should build empty maps from empty relationships", () => {
      const maps = buildRelationshipMaps([]);

      expect(maps.childToParents.size).toBe(0);
      expect(maps.parentToChildren.size).toBe(0);
      expect(maps.spouseMap.size).toBe(0);
      expect(maps.spouseRels.length).toBe(0);
      expect(maps.parentRels.length).toBe(0);
    });

    it("should build childToParents map from PARENT relationships", () => {
      const relationships: Array<RelationshipData> = [
        { type: "PARENT", personId: "child1", relatedPersonId: "parent1" },
        { type: "PARENT", personId: "child1", relatedPersonId: "parent2" },
      ];

      const maps = buildRelationshipMaps(relationships);

      expect(maps.childToParents.get("child1")).toEqual(
        new Set(["parent1", "parent2"])
      );
      expect(maps.parentRels.length).toBe(2);
    });

    it("should build parentToChildren map from PARENT relationships", () => {
      const relationships: Array<RelationshipData> = [
        { type: "PARENT", personId: "child1", relatedPersonId: "parent1" },
        { type: "PARENT", personId: "child2", relatedPersonId: "parent1" },
      ];

      const maps = buildRelationshipMaps(relationships);

      expect(maps.parentToChildren.get("parent1")).toEqual(
        new Set(["child1", "child2"])
      );
    });

    it("should build spouseMap from SPOUSE relationships", () => {
      const relationships: Array<RelationshipData> = [
        { type: "SPOUSE", personId: "person1", relatedPersonId: "person2" },
      ];

      const maps = buildRelationshipMaps(relationships);

      expect(maps.spouseMap.get("person1")).toEqual(new Set(["person2"]));
      expect(maps.spouseMap.get("person2")).toEqual(new Set(["person1"]));
      expect(maps.spouseRels.length).toBe(1);
    });

    it("should handle multiple relationships simultaneously", () => {
      const relationships: Array<RelationshipData> = [
        { type: "PARENT", personId: "child1", relatedPersonId: "parent1" },
        { type: "PARENT", personId: "child1", relatedPersonId: "parent2" },
        { type: "SPOUSE", personId: "parent1", relatedPersonId: "parent2" },
        { type: "PARENT", personId: "child2", relatedPersonId: "parent1" },
      ];

      const maps = buildRelationshipMaps(relationships);

      expect(maps.childToParents.get("child1")).toEqual(
        new Set(["parent1", "parent2"])
      );
      expect(maps.parentToChildren.get("parent1")).toEqual(
        new Set(["child1", "child2"])
      );
      expect(maps.spouseMap.get("parent1")).toEqual(new Set(["parent2"]));
      expect(maps.parentRels.length).toBe(3);
      expect(maps.spouseRels.length).toBe(1);
    });

    it("should ignore non-PARENT and non-SPOUSE relationships", () => {
      const relationships: Array<RelationshipData> = [
        { type: "PARENT", personId: "child1", relatedPersonId: "parent1" },
        { type: "SIBLING", personId: "sibling1", relatedPersonId: "sibling2" },
        { type: "SPOUSE", personId: "person1", relatedPersonId: "person2" },
      ];

      const maps = buildRelationshipMaps(relationships);

      expect(maps.childToParents.size).toBe(1);
      expect(maps.spouseMap.size).toBe(2);
      expect(maps.parentRels.length).toBe(1);
      expect(maps.spouseRels.length).toBe(1);
    });
  });

  describe("collectAncestors", () => {
    it("should collect single person at generation 0", () => {
      const collected = createCollectionState();
      const childToParents = new Map<string, Set<string>>();
      const personMap = new Map([["person1", createPerson("person1")]]);
      const spouseMap = new Map<string, Set<string>>();

      collectAncestors(
        "person1",
        0,
        3,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["person1"]));
      expect(collected.generations.get("person1")).toBe(0);
    });

    it("should not exceed max generation", () => {
      const collected = createCollectionState();
      const childToParents = new Map([
        ["child1", new Set(["parent1"])],
        ["parent1", new Set(["grandparent1"])],
      ]);
      const personMap = new Map([
        ["child1", createPerson("child1")],
        ["parent1", createPerson("parent1")],
        ["grandparent1", createPerson("grandparent1")],
      ]);
      const spouseMap = new Map<string, Set<string>>();

      collectAncestors(
        "child1",
        0,
        1,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["child1", "parent1"]));
      expect(collected.generations.get("parent1")).toBe(1);
      expect(collected.generations.has("grandparent1")).toBe(false);
    });

    it("should collect spouses at same generation", () => {
      const collected = createCollectionState();
      const childToParents = new Map<string, Set<string>>();
      const personMap = new Map([
        ["person1", createPerson("person1")],
        ["spouse1", createPerson("spouse1", "Jane", "Doe")],
      ]);
      const spouseMap = new Map([
        ["person1", new Set(["spouse1"])],
        ["spouse1", new Set(["person1"])],
      ]);

      collectAncestors(
        "person1",
        0,
        3,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["person1", "spouse1"]));
      expect(collected.generations.get("person1")).toBe(0);
      expect(collected.generations.get("spouse1")).toBe(0);
      expect(collected.edges.size).toBe(1);
    });

    it("should add parent-child edges", () => {
      const collected = createCollectionState();
      const childToParents = new Map([["child1", new Set(["parent1"])]]);
      const personMap = new Map([
        ["child1", createPerson("child1")],
        ["parent1", createPerson("parent1")],
      ]);
      const spouseMap = new Map<string, Set<string>>();

      collectAncestors(
        "child1",
        0,
        3,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.edges.size).toBe(1);
      const edges = Array.from(collected.edges.values());
      expect(edges[0]?.type).toBe("parent-child");
      expect(edges[0]?.source).toBe("parent1");
      expect(edges[0]?.target).toBe("child1");
    });

    it("should skip non-existent parents", () => {
      const collected = createCollectionState();
      const childToParents = new Map([
        ["child1", new Set(["parent1", "parent2"])],
      ]);
      const personMap = new Map([
        ["child1", createPerson("child1")],
        ["parent1", createPerson("parent1")],
        // parent2 not in map - should be skipped
      ]);
      const spouseMap = new Map<string, Set<string>>();

      collectAncestors(
        "child1",
        0,
        3,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["child1", "parent1"]));
    });

    it("should stop recursion when currentGen > maxGen", () => {
      const collected = createCollectionState();
      const childToParents = new Map();
      const personMap = new Map([["person1", createPerson("person1")]]);
      const spouseMap = new Map<string, Set<string>>();

      collectAncestors(
        "person1",
        5,
        3,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds.size).toBe(0);
    });

    it("should handle empty personId", () => {
      const collected = createCollectionState();
      const childToParents = new Map<string, Set<string>>();
      const personMap = new Map<string, PersonData>();
      const spouseMap = new Map<string, Set<string>>();

      collectAncestors(
        "",
        0,
        3,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds.size).toBe(0);
    });
  });

  describe("collectDescendants", () => {
    it("should collect single person at generation 0", () => {
      const collected = createCollectionState();
      const parentToChildren = new Map<string, Set<string>>();
      const personMap = new Map([["person1", createPerson("person1")]]);
      const spouseMap = new Map<string, Set<string>>();

      collectDescendants(
        "person1",
        0,
        3,
        parentToChildren,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["person1"]));
      expect(collected.generations.get("person1")).toBe(0);
    });

    it("should collect descendants down generations", () => {
      const collected = createCollectionState();
      const parentToChildren = new Map([
        ["parent1", new Set(["child1", "child2"])],
        ["child1", new Set(["grandchild1"])],
      ]);
      const personMap = new Map([
        ["parent1", createPerson("parent1")],
        ["child1", createPerson("child1")],
        ["child2", createPerson("child2")],
        ["grandchild1", createPerson("grandchild1")],
      ]);
      const spouseMap = new Map<string, Set<string>>();

      collectDescendants(
        "parent1",
        0,
        2,
        parentToChildren,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(
        new Set(["parent1", "child1", "child2", "grandchild1"])
      );
      expect(collected.generations.get("child1")).toBe(1);
      expect(collected.generations.get("grandchild1")).toBe(2);
    });

    it("should not exceed max generation", () => {
      const collected = createCollectionState();
      const parentToChildren = new Map([
        ["parent1", new Set(["child1"])],
        ["child1", new Set(["grandchild1"])],
      ]);
      const personMap = new Map([
        ["parent1", createPerson("parent1")],
        ["child1", createPerson("child1")],
        ["grandchild1", createPerson("grandchild1")],
      ]);
      const spouseMap = new Map<string, Set<string>>();

      collectDescendants(
        "parent1",
        0,
        1,
        parentToChildren,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["parent1", "child1"]));
      expect(collected.generations.has("grandchild1")).toBe(false);
    });

    it("should collect spouses at same generation", () => {
      const collected = createCollectionState();
      const parentToChildren = new Map<string, Set<string>>();
      const personMap = new Map([
        ["person1", createPerson("person1")],
        ["spouse1", createPerson("spouse1", "Jane", "Doe")],
      ]);
      const spouseMap = new Map([
        ["person1", new Set(["spouse1"])],
        ["spouse1", new Set(["person1"])],
      ]);

      collectDescendants(
        "person1",
        0,
        3,
        parentToChildren,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["person1", "spouse1"]));
      expect(collected.edges.size).toBe(1);
    });
  });

  describe("calculateFanLayout", () => {
    it("should position single node at 0 degrees", () => {
      const nodeIds = new Set(["person1"]);
      const generations = new Map([["person1", 0]]);

      const angles = calculateFanLayout(nodeIds, generations);

      expect(angles.get("person1")).toBe(0);
    });

    it("should distribute nodes evenly by generation", () => {
      const nodeIds = new Set(["gen0", "gen1a", "gen1b"]);
      const generations = new Map([
        ["gen0", 0],
        ["gen1a", 1],
        ["gen1b", 1],
      ]);

      const angles = calculateFanLayout(nodeIds, generations);

      expect(angles.get("gen0")).toBe(0);
      expect(angles.get("gen1a")).toBe(0);
      expect(angles.get("gen1b")).toBe(180);
    });

    it("should divide angles equally within generation", () => {
      const nodeIds = new Set(["g1a", "g1b", "g1c"]);
      const generations = new Map([
        ["g1a", 1],
        ["g1b", 1],
        ["g1c", 1],
      ]);

      const angles = calculateFanLayout(nodeIds, generations);

      const anglePerNode = 360 / 3;
      expect(angles.get("g1a")).toBe(0);
      expect(angles.get("g1b")).toBe(anglePerNode);
      expect(angles.get("g1c")).toBe(anglePerNode * 2);
    });

    it("should wrap angles at 360 degrees", () => {
      const nodeIds = new Set(["a", "b", "c", "d"]);
      const generations = new Map([
        ["a", 1],
        ["b", 1],
        ["c", 1],
        ["d", 1],
      ]);

      const angles = calculateFanLayout(nodeIds, generations);

      for (let i = 0; i < 4; i++) {
        const angle = Array.from(angles.values())[i];
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThan(360);
      }
    });

    it("should handle empty nodeIds", () => {
      const nodeIds = new Set<string>();
      const generations = new Map<string, number>();

      const angles = calculateFanLayout(nodeIds, generations);

      expect(angles.size).toBe(0);
    });

    it("should handle missing generation data", () => {
      const nodeIds = new Set(["person1", "person2"]);
      const generations = new Map([["person1", 0]]); // person2 not in map

      const angles = calculateFanLayout(nodeIds, generations);

      expect(angles.has("person1")).toBe(true);
      expect(angles.has("person2")).toBe(true);
    });
  });

  describe("collectBowtieAncestors", () => {
    it("should mark ancestors with paternal side", () => {
      const collected = createCollectionState(true);
      const childToParents = new Map([["child1", new Set(["parent1"])]]);
      const personMap = new Map([
        ["child1", createPerson("child1")],
        ["parent1", createPerson("parent1")],
      ]);

      collectBowtieAncestors(
        "child1",
        0,
        3,
        childToParents,
        personMap,
        "paternal",
        collected
      );

      expect(collected.sides?.get("child1")).toBe("paternal");
      expect(collected.sides?.get("parent1")).toBe("paternal");
    });

    it("should mark ancestors with maternal side", () => {
      const collected = createCollectionState(true);
      const childToParents = new Map([["child1", new Set(["parent1"])]]);
      const personMap = new Map([
        ["child1", createPerson("child1")],
        ["parent1", createPerson("parent1")],
      ]);

      collectBowtieAncestors(
        "child1",
        0,
        3,
        childToParents,
        personMap,
        "maternal",
        collected
      );

      expect(collected.sides?.get("child1")).toBe("maternal");
      expect(collected.sides?.get("parent1")).toBe("maternal");
    });

    it("should respect max generation limit", () => {
      const collected = createCollectionState(true);
      const childToParents = new Map([
        ["child1", new Set(["parent1"])],
        ["parent1", new Set(["grandparent1"])],
      ]);
      const personMap = new Map([
        ["child1", createPerson("child1")],
        ["parent1", createPerson("parent1")],
        ["grandparent1", createPerson("grandparent1")],
      ]);

      collectBowtieAncestors(
        "child1",
        0,
        1,
        childToParents,
        personMap,
        "paternal",
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["child1", "parent1"]));
      expect(collected.sides?.has("grandparent1")).toBe(false);
    });
  });

  describe("collectTreeAncestors", () => {
    it("should use negative generation numbers", () => {
      const collected = createCollectionState();
      const childToParents = new Map([["person1", new Set(["parent1"])]]);
      const personMap = new Map([
        ["person1", createPerson("person1")],
        ["parent1", createPerson("parent1")],
      ]);
      const spouseMap = new Map<string, Set<string>>();

      collectTreeAncestors(
        "person1",
        0,
        -3,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.generations.get("person1")).toBe(0);
      expect(collected.generations.get("parent1")).toBe(-1);
    });

    it("should stop when currentGen < maxGen (more negative)", () => {
      const collected = createCollectionState();
      const childToParents = new Map([
        ["person1", new Set(["parent1"])],
        ["parent1", new Set(["grandparent1"])],
      ]);
      const personMap = new Map([
        ["person1", createPerson("person1")],
        ["parent1", createPerson("parent1")],
        ["grandparent1", createPerson("grandparent1")],
      ]);
      const spouseMap = new Map<string, Set<string>>();

      collectTreeAncestors(
        "person1",
        -1,
        -2,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["person1", "parent1"]));
      expect(collected.generations.has("grandparent1")).toBe(false);
    });

    it("should add spouses at same negative generation", () => {
      const collected = createCollectionState();
      const childToParents = new Map<string, Set<string>>();
      const personMap = new Map([
        ["person1", createPerson("person1")],
        ["spouse1", createPerson("spouse1", "Jane", "Doe")],
      ]);
      const spouseMap = new Map([
        ["person1", new Set(["spouse1"])],
        ["spouse1", new Set(["person1"])],
      ]);

      collectTreeAncestors(
        "person1",
        0,
        -3,
        childToParents,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["person1", "spouse1"]));
      expect(collected.generations.get("spouse1")).toBe(0);
    });
  });

  describe("collectTreeDescendants", () => {
    it("should use positive generation numbers", () => {
      const collected = createCollectionState();
      const parentToChildren = new Map([["parent1", new Set(["child1"])]]);
      const personMap = new Map([
        ["parent1", createPerson("parent1")],
        ["child1", createPerson("child1")],
      ]);
      const spouseMap = new Map<string, Set<string>>();

      collectTreeDescendants(
        "parent1",
        0,
        3,
        parentToChildren,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.generations.get("child1")).toBe(1);
    });

    it("should stop when currentGen > maxGen", () => {
      const collected = createCollectionState();
      const parentToChildren = new Map([
        ["parent1", new Set(["child1"])],
        ["child1", new Set(["grandchild1"])],
      ]);
      const personMap = new Map([
        ["parent1", createPerson("parent1")],
        ["child1", createPerson("child1")],
        ["grandchild1", createPerson("grandchild1")],
      ]);
      const spouseMap = new Map<string, Set<string>>();

      collectTreeDescendants(
        "parent1",
        1,
        2,
        parentToChildren,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["parent1", "child1"]));
      expect(collected.generations.has("grandchild1")).toBe(false);
    });

    it("should add spouses at same positive generation", () => {
      const collected = createCollectionState();
      const parentToChildren = new Map<string, Set<string>>();
      const personMap = new Map([
        ["person1", createPerson("person1")],
        ["spouse1", createPerson("spouse1", "Jane", "Doe")],
      ]);
      const spouseMap = new Map([
        ["person1", new Set(["spouse1"])],
        ["spouse1", new Set(["person1"])],
      ]);

      collectTreeDescendants(
        "person1",
        0,
        3,
        parentToChildren,
        personMap,
        spouseMap,
        collected
      );

      expect(collected.nodeIds).toEqual(new Set(["person1", "spouse1"]));
      expect(collected.generations.get("spouse1")).toBe(0);
    });
  });
});
