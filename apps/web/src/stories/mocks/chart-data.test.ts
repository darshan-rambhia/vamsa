import { describe, it, expect, beforeEach } from "bun:test";
import {
  resetIdCounter,
  createMockPerson,
  createMockNodes,
  createMockEdges,
  createBowtieNodes,
  createTimelineEntries,
  createMatrixData,
  createCompactTreeData,
  createStatisticsData,
  EMPTY_DATA,
  SINGLE_PERSON,
  SMALL_FAMILY,
  LARGE_FAMILY,
  DEEP_ANCESTRY,
  LONG_NAMES,
} from "./chart-data";

describe("Mock Data Factories", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe("resetIdCounter", () => {
    it("should reset ID counter to generate IDs from 1", () => {
      const person1 = createMockPerson();
      expect(person1.id).toBe("person-1");

      resetIdCounter();

      const person2 = createMockPerson();
      expect(person2.id).toBe("person-1");
    });
  });

  describe("createMockPerson", () => {
    it("should create a person with default values", () => {
      const person = createMockPerson();

      expect(person.id).toBe("person-1");
      expect(person.firstName).toBe("John");
      expect(person.lastName).toBe("Doe");
      expect(person.gender).toBe("MALE");
      expect(person.isLiving).toBe(true);
      expect(person.generation).toBe(0);
      expect(person.dateOfBirth).toBe("1980-01-01");
      expect(person.dateOfPassing).toBeNull();
      expect(person.photoUrl).toBeNull();
    });

    it("should create a person with custom values", () => {
      const person = createMockPerson({
        id: "custom-id",
        firstName: "Jane",
        lastName: "Smith",
        gender: "FEMALE",
        isLiving: false,
        generation: 2,
        dateOfBirth: "1950-05-15",
        dateOfPassing: "2020-10-20",
      });

      expect(person.id).toBe("custom-id");
      expect(person.firstName).toBe("Jane");
      expect(person.lastName).toBe("Smith");
      expect(person.gender).toBe("FEMALE");
      expect(person.isLiving).toBe(false);
      expect(person.generation).toBe(2);
      expect(person.dateOfBirth).toBe("1950-05-15");
      expect(person.dateOfPassing).toBe("2020-10-20");
    });

    it("should use default gender when null is passed (nullish coalescing)", () => {
      // Note: ?? treats null as nullish, so default is used
      const person = createMockPerson({ gender: null });
      expect(person.gender).toBe("MALE");
    });

    it("should use default dateOfBirth when null is passed (nullish coalescing)", () => {
      // Note: ?? treats null as nullish, so default is used
      const person = createMockPerson({ dateOfBirth: null });
      expect(person.dateOfBirth).toBe("1980-01-01");
    });
  });

  describe("createMockNodes", () => {
    it("should create the specified number of nodes", () => {
      const nodes = createMockNodes(10);
      expect(nodes.length).toBe(10);
    });

    it("should distribute nodes across generations", () => {
      const nodes = createMockNodes(9, { generations: 3 });

      const gen0 = nodes.filter((n) => n.generation === 0);
      const gen1 = nodes.filter((n) => n.generation === 1);
      const gen2 = nodes.filter((n) => n.generation === 2);

      expect(gen0.length).toBe(3);
      expect(gen1.length).toBe(3);
      expect(gen2.length).toBe(3);
    });

    it("should use long names when specified", () => {
      const nodes = createMockNodes(5, { longNames: true });

      const hasLongName = nodes.some(
        (n) => n.firstName!.length > 10 || n.lastName!.includes("-")
      );
      expect(hasLongName).toBe(true);
    });

    it("should alternate genders", () => {
      const nodes = createMockNodes(4, { generations: 1 });

      expect(nodes[0].gender).toBe("MALE");
      expect(nodes[1].gender).toBe("FEMALE");
      expect(nodes[2].gender).toBe("MALE");
      expect(nodes[3].gender).toBe("FEMALE");
    });

    it("should set isLiving based on generation", () => {
      const nodes = createMockNodes(6, { generations: 3 });

      const gen0 = nodes.filter((n) => n.generation === 0);
      const gen1 = nodes.filter((n) => n.generation === 1);
      const gen2 = nodes.filter((n) => n.generation === 2);

      // Generations 0 and 1 should be living
      expect(gen0.every((n) => n.isLiving)).toBe(true);
      expect(gen1.every((n) => n.isLiving)).toBe(true);
      // Generation 2+ should be deceased
      expect(gen2.every((n) => !n.isLiving)).toBe(true);
    });

    it("should generate unique IDs for each node", () => {
      const nodes = createMockNodes(10);
      const ids = nodes.map((n) => n.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(10);
    });
  });

  describe("createMockEdges", () => {
    it("should create parent-child edges between generations", () => {
      const nodes = createMockNodes(6, { generations: 2 });
      const edges = createMockEdges(nodes);

      const parentChildEdges = edges.filter((e) => e.type === "parent-child");
      expect(parentChildEdges.length).toBeGreaterThan(0);
    });

    it("should create spouse edges within generations", () => {
      const nodes = createMockNodes(4, { generations: 1 });
      const edges = createMockEdges(nodes);

      const spouseEdges = edges.filter((e) => e.type === "spouse");
      expect(spouseEdges.length).toBeGreaterThan(0);
    });

    it("should return empty array for empty nodes", () => {
      const edges = createMockEdges([]);
      expect(edges).toEqual([]);
    });

    it("should generate unique edge IDs", () => {
      const nodes = createMockNodes(10, { generations: 3 });
      const edges = createMockEdges(nodes);

      const ids = edges.map((e) => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(edges.length);
    });

    it("should have valid source and target references", () => {
      const nodes = createMockNodes(10, { generations: 3 });
      const edges = createMockEdges(nodes);
      const nodeIds = new Set(nodes.map((n) => n.id));

      edges.forEach((edge) => {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      });
    });
  });

  describe("createBowtieNodes", () => {
    it("should create root node with center side", () => {
      const root = createMockPerson({ id: "root", firstName: "Root" });
      const { nodes } = createBowtieNodes(root, 2, 2);

      const centerNode = nodes.find((n) => n.side === "center");
      expect(centerNode).toBeDefined();
      expect(centerNode!.id).toBe("root");
    });

    it("should create paternal side nodes", () => {
      const root = createMockPerson({ id: "root" });
      const { nodes } = createBowtieNodes(root, 4, 0);

      const paternalNodes = nodes.filter((n) => n.side === "paternal");
      expect(paternalNodes.length).toBe(4);
    });

    it("should create maternal side nodes", () => {
      const root = createMockPerson({ id: "root" });
      const { nodes } = createBowtieNodes(root, 0, 4);

      const maternalNodes = nodes.filter((n) => n.side === "maternal");
      expect(maternalNodes.length).toBe(4);
    });

    it("should create edges connecting to root", () => {
      const root = createMockPerson({ id: "root" });
      const { edges } = createBowtieNodes(root, 2, 2);

      const edgesToRoot = edges.filter((e) => e.target === "root");
      expect(edgesToRoot.length).toBeGreaterThan(0);
    });

    it("should set deceased status for ancestors", () => {
      const root = createMockPerson({ id: "root" });
      const { nodes } = createBowtieNodes(root, 4, 4);

      const ancestorNodes = nodes.filter((n) => n.side !== "center");
      expect(ancestorNodes.every((n) => !n.isLiving)).toBe(true);
    });
  });

  describe("createTimelineEntries", () => {
    it("should create the specified number of entries", () => {
      const entries = createTimelineEntries(10);
      expect(entries.length).toBe(10);
    });

    it("should have valid birth years", () => {
      const entries = createTimelineEntries(5);

      entries.forEach((entry) => {
        expect(entry.birthYear).toBeGreaterThanOrEqual(1900);
      });
    });

    it("should set death year only for deceased", () => {
      const entries = createTimelineEntries(10);

      entries.forEach((entry) => {
        if (entry.isLiving) {
          expect(entry.deathYear).toBeNull();
        } else {
          expect(entry.deathYear).not.toBeNull();
        }
      });
    });

    it("should generate unique IDs", () => {
      const entries = createTimelineEntries(10);
      const ids = entries.map((e) => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(10);
    });

    it("should alternate genders", () => {
      const entries = createTimelineEntries(4);

      expect(entries[0].gender).toBe("MALE");
      expect(entries[1].gender).toBe("FEMALE");
      expect(entries[2].gender).toBe("MALE");
      expect(entries[3].gender).toBe("FEMALE");
    });
  });

  describe("createMatrixData", () => {
    it("should create the specified number of people", () => {
      const { people } = createMatrixData(10);
      expect(people.length).toBe(10);
    });

    it("should create matrix cells for all person pairs", () => {
      const { matrix } = createMatrixData(5);
      // 5x5 = 25 cells
      expect(matrix.length).toBe(25);
    });

    it("should have SELF relationships on diagonal", () => {
      const { people, matrix } = createMatrixData(5);

      people.forEach((person) => {
        const selfCell = matrix.find(
          (c) => c.personId === person.id && c.relatedPersonId === person.id
        );
        expect(selfCell).toBeDefined();
        expect(selfCell!.relationshipType).toBe("SELF");
        expect(selfCell!.strength).toBe(1);
      });
    });

    it("should generate unique person IDs", () => {
      const { people } = createMatrixData(10);
      const ids = people.map((p) => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(10);
    });
  });

  describe("createCompactTreeData", () => {
    it("should create correct number of nodes", () => {
      const result = createCompactTreeData(3, 4);
      expect(result.flatList.length).toBe(12);
    });

    it("should have valid root node", () => {
      const result = createCompactTreeData(3, 4);

      expect(result.root).toBeDefined();
      expect(result.root!.generation).toBe(0);
    });

    it("should have correct metadata", () => {
      const result = createCompactTreeData(5, 3);

      expect(result.metadata.chartType).toBe("compact");
      expect(result.metadata.totalPeople).toBe(15);
      expect(result.metadata.totalGenerations).toBe(5);
    });

    it("should set parent references correctly", () => {
      const result = createCompactTreeData(3, 4);

      // First node should have no parent
      expect(result.flatList[0].parentId).toBeNull();

      // Other nodes should have parent references
      const nodesWithParents = result.flatList.slice(1);
      nodesWithParents.forEach((node) => {
        expect(node.parentId).not.toBeNull();
      });
    });
  });

  describe("createStatisticsData", () => {
    it("should create full statistics by default", () => {
      const stats = createStatisticsData();

      expect(stats.ageDistribution.length).toBe(8);
      expect(stats.generationSizes.length).toBe(4);
      expect(stats.genderDistribution.length).toBe(4);
      expect(stats.geographicDistribution.length).toBe(4);
      expect(stats.lifespanTrends.length).toBe(4);
    });

    it("should create partial statistics when specified", () => {
      const stats = createStatisticsData(true);

      expect(stats.ageDistribution.length).toBe(2);
      expect(stats.generationSizes.length).toBe(2);
      expect(stats.genderDistribution.length).toBe(2);
      expect(stats.geographicDistribution.length).toBe(0);
      expect(stats.lifespanTrends.length).toBe(0);
    });

    it("should have valid metadata", () => {
      const stats = createStatisticsData();

      expect(stats.metadata.chartType).toBe("statistics");
      expect(stats.metadata.totalPeople).toBe(50);
      expect(stats.metadata.livingCount).toBe(30);
      expect(stats.metadata.deceasedCount).toBe(20);
    });

    it("should have oldest and youngest person info", () => {
      const stats = createStatisticsData();

      expect(stats.metadata.oldestPerson).toBeDefined();
      expect(stats.metadata.oldestPerson?.age).toBe(95);
      expect(stats.metadata.youngestPerson).toBeDefined();
      expect(stats.metadata.youngestPerson?.age).toBe(2);
    });

    it("should have surname frequency data", () => {
      const stats = createStatisticsData();

      expect(stats.surnameFrequency.length).toBeGreaterThan(0);
      stats.surnameFrequency.forEach((item) => {
        expect(item.surname).toBeDefined();
        expect(item.count).toBeGreaterThan(0);
        expect(item.percentage).toBeGreaterThan(0);
      });
    });
  });

  describe("Presets", () => {
    describe("EMPTY_DATA", () => {
      it("should have empty nodes and edges", () => {
        expect(EMPTY_DATA.nodes).toEqual([]);
        expect(EMPTY_DATA.edges).toEqual([]);
      });
    });

    describe("SINGLE_PERSON", () => {
      it("should have exactly one person", () => {
        expect(SINGLE_PERSON.nodes.length).toBe(1);
      });

      it("should have no edges", () => {
        expect(SINGLE_PERSON.edges.length).toBe(0);
      });

      it("should have correct name", () => {
        expect(SINGLE_PERSON.nodes[0].firstName).toBe("Solo");
        expect(SINGLE_PERSON.nodes[0].lastName).toBe("Person");
      });
    });

    describe("SMALL_FAMILY", () => {
      it("should have 5 nodes", () => {
        expect(SMALL_FAMILY.nodes.length).toBe(5);
      });

      it("should have edges", () => {
        expect(SMALL_FAMILY.edges.length).toBeGreaterThan(0);
      });
    });

    describe("LARGE_FAMILY", () => {
      it("should have 50 nodes", () => {
        expect(LARGE_FAMILY.nodes.length).toBe(50);
      });

      it("should span 5 generations", () => {
        const generations = new Set(
          LARGE_FAMILY.nodes.map((n) => n.generation)
        );
        expect(generations.size).toBe(5);
      });
    });

    describe("DEEP_ANCESTRY", () => {
      it("should have 30 nodes", () => {
        expect(DEEP_ANCESTRY.nodes.length).toBe(30);
      });

      it("should span 10 generations", () => {
        const generations = new Set(
          DEEP_ANCESTRY.nodes.map((n) => n.generation)
        );
        expect(generations.size).toBe(10);
      });
    });

    describe("LONG_NAMES", () => {
      it("should have 10 nodes", () => {
        expect(LONG_NAMES.nodes.length).toBe(10);
      });

      it("should have long names", () => {
        const hasLongName = LONG_NAMES.nodes.some(
          (n) => n.firstName!.length > 10 || n.lastName!.includes("-")
        );
        expect(hasLongName).toBe(true);
      });
    });
  });
});
