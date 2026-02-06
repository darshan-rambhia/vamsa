import { beforeEach, describe, expect, it } from "vitest";
import {
  DEEP_ANCESTRY,
  EMPTY_DATA,
  LARGE_FAMILY,
  LONG_NAMES,
  SINGLE_PERSON,
  SMALL_FAMILY,
  createBowtieNodes,
  createCompactTreeData,
  createMatrixData,
  createMockEdges,
  createMockNodes,
  createMockPerson,
  createStatisticsData,
  createTimelineEntries,
  resetIdCounter,
} from "./chart-data";

describe("createMockPerson", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("creates a person with default values", () => {
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

  it("creates a person with custom values", () => {
    const person = createMockPerson({
      id: "custom-id",
      firstName: "Jane",
      lastName: "Smith",
      gender: "FEMALE",
      isLiving: false,
      generation: 2,
      dateOfBirth: "1950-05-15",
      dateOfPassing: "2020-03-10",
    });

    expect(person.id).toBe("custom-id");
    expect(person.firstName).toBe("Jane");
    expect(person.lastName).toBe("Smith");
    expect(person.gender).toBe("FEMALE");
    expect(person.isLiving).toBe(false);
    expect(person.generation).toBe(2);
    expect(person.dateOfBirth).toBe("1950-05-15");
    expect(person.dateOfPassing).toBe("2020-03-10");
  });

  it("generates unique IDs", () => {
    const person1 = createMockPerson();
    const person2 = createMockPerson();

    expect(person1.id).toBe("person-1");
    expect(person2.id).toBe("person-2");
  });
});

describe("createMockNodes", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("creates specified number of nodes", () => {
    const nodes = createMockNodes(10);
    expect(nodes.length).toBe(10);
  });

  it("distributes nodes across generations", () => {
    const nodes = createMockNodes(9, { generations: 3 });

    const gen0 = nodes.filter((n) => n.generation === 0);
    const gen1 = nodes.filter((n) => n.generation === 1);
    const gen2 = nodes.filter((n) => n.generation === 2);

    expect(gen0.length).toBe(3);
    expect(gen1.length).toBe(3);
    expect(gen2.length).toBe(3);
  });

  it("uses long names when specified", () => {
    const nodes = createMockNodes(3, { longNames: true });

    const longFirstNames = [
      "Alexander",
      "Bartholomew",
      "Christopher",
      "Maximilian",
      "Nathaniel",
    ];
    const longLastNames = [
      "Vanderbilt-Rothschild",
      "Montgomery-Wellington",
      "Fitzgerald-Kennedy",
    ];

    expect(longFirstNames).toContain(nodes[0].firstName);
    expect(longLastNames).toContain(nodes[0].lastName);
  });

  it("sets isLiving based on generation", () => {
    const nodes = createMockNodes(6, { generations: 3 });

    // Generations 0 and 1 should be living
    const gen0 = nodes.filter((n) => n.generation === 0);
    const gen1 = nodes.filter((n) => n.generation === 1);
    const gen2 = nodes.filter((n) => n.generation === 2);

    expect(gen0.every((n) => n.isLiving)).toBe(true);
    expect(gen1.every((n) => n.isLiving)).toBe(true);
    expect(gen2.every((n) => !n.isLiving)).toBe(true);
  });
});

describe("createMockEdges", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("creates parent-child edges between generations", () => {
    const nodes = createMockNodes(4, { generations: 2 });
    const edges = createMockEdges(nodes);

    const parentChildEdges = edges.filter((e) => e.type === "parent-child");
    expect(parentChildEdges.length).toBeGreaterThan(0);
  });

  it("creates spouse edges within generations", () => {
    const nodes = createMockNodes(4, { generations: 2 });
    const edges = createMockEdges(nodes);

    const spouseEdges = edges.filter((e) => e.type === "spouse");
    expect(spouseEdges.length).toBeGreaterThan(0);
  });

  it("creates edges with proper structure", () => {
    const nodes = createMockNodes(4, { generations: 2 });
    const edges = createMockEdges(nodes);

    edges.forEach((edge) => {
      expect(edge.id).toBeDefined();
      expect(edge.source).toBeDefined();
      expect(edge.target).toBeDefined();
      expect(["parent-child", "spouse"]).toContain(edge.type);
    });
  });
});

describe("createBowtieNodes", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("creates nodes with correct sides", () => {
    const root = createMockPerson({ firstName: "Root", lastName: "Person" });
    const { nodes } = createBowtieNodes(root, 2, 2);

    const centerNodes = nodes.filter((n) => n.side === "center");
    const paternalNodes = nodes.filter((n) => n.side === "paternal");
    const maternalNodes = nodes.filter((n) => n.side === "maternal");

    expect(centerNodes.length).toBe(1);
    expect(paternalNodes.length).toBe(2);
    expect(maternalNodes.length).toBe(2);
  });

  it("creates edges connecting to root", () => {
    const root = createMockPerson({ id: "root", firstName: "Root" });
    const { edges } = createBowtieNodes(root, 2, 2);

    const rootEdges = edges.filter((e) => e.target === "root");
    expect(rootEdges.length).toBe(4); // 2 paternal + 2 maternal parents
  });
});

describe("createTimelineEntries", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("creates specified number of entries", () => {
    const entries = createTimelineEntries(5);
    expect(entries.length).toBe(5);
  });

  it("creates entries with proper timeline structure", () => {
    const entries = createTimelineEntries(3);

    entries.forEach((entry) => {
      expect(entry.id).toBeDefined();
      expect(entry.firstName).toBeDefined();
      expect(entry.lastName).toBeDefined();
      expect(typeof entry.birthYear).toBe("number");
      expect(entry.gender).toBeDefined();
    });
  });

  it("sets death year for non-living entries", () => {
    const entries = createTimelineEntries(10);

    // Earlier entries (older) should have death years
    const entriesWithDeath = entries.filter((e) => e.deathYear !== null);
    expect(entriesWithDeath.length).toBeGreaterThan(0);
  });
});

describe("createMatrixData", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("creates specified number of people", () => {
    const { people } = createMatrixData(5);
    expect(people.length).toBe(5);
  });

  it("creates matrix with all person combinations", () => {
    const { people: _people, matrix } = createMatrixData(3);
    // 3x3 matrix = 9 cells
    expect(matrix.length).toBe(9);
  });

  it("creates SELF relationships on diagonal", () => {
    const { people: _people, matrix } = createMatrixData(3);

    const selfRelationships = matrix.filter(
      (cell) =>
        cell.personId === cell.relatedPersonId &&
        cell.relationshipType === "SELF"
    );
    expect(selfRelationships.length).toBe(3);
  });

  it("is deterministic (produces same results)", () => {
    resetIdCounter();
    const result1 = createMatrixData(3);

    resetIdCounter();
    const result2 = createMatrixData(3);

    expect(result1.people).toEqual(result2.people);
    expect(result1.matrix).toEqual(result2.matrix);
  });
});

describe("createCompactTreeData", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("creates tree with correct structure", () => {
    const result = createCompactTreeData(3, 2);

    expect(result.root).toBeDefined();
    expect(result.flatList.length).toBe(6); // 3 generations * 2 per gen
    expect(result.metadata.chartType).toBe("compact");
    expect(result.metadata.totalPeople).toBe(6);
    expect(result.metadata.totalGenerations).toBe(3);
  });

  it("sets root person ID correctly", () => {
    const result = createCompactTreeData(2, 2);
    expect(result.metadata.rootPersonId).toBe(result.flatList[0]?.id);
  });
});

describe("createStatisticsData", () => {
  it("creates full statistics data by default", () => {
    const result = createStatisticsData();

    expect(result.ageDistribution.length).toBe(8);
    expect(result.generationSizes.length).toBe(4);
    expect(result.genderDistribution.length).toBe(4);
    expect(result.geographicDistribution.length).toBe(4);
    expect(result.surnameFrequency.length).toBe(4);
    expect(result.lifespanTrends.length).toBe(4);
  });

  it("creates partial statistics when specified", () => {
    const result = createStatisticsData(true);

    expect(result.ageDistribution.length).toBe(2);
    expect(result.generationSizes.length).toBe(2);
    expect(result.genderDistribution.length).toBe(2);
    expect(result.geographicDistribution.length).toBe(0);
    expect(result.lifespanTrends.length).toBe(0);
  });

  it("includes metadata", () => {
    const result = createStatisticsData();

    expect(result.metadata.chartType).toBe("statistics");
    expect(result.metadata.totalPeople).toBe(50);
    expect(result.metadata.livingCount).toBe(30);
    expect(result.metadata.deceasedCount).toBe(20);
    expect(result.metadata.oldestPerson).toBeDefined();
    expect(result.metadata.youngestPerson).toBeDefined();
  });
});

describe("Presets", () => {
  it("EMPTY_DATA has empty arrays", () => {
    expect(EMPTY_DATA.nodes.length).toBe(0);
    expect(EMPTY_DATA.edges.length).toBe(0);
  });

  it("SINGLE_PERSON has one node", () => {
    expect(SINGLE_PERSON.nodes.length).toBe(1);
    expect(SINGLE_PERSON.edges.length).toBe(0);
    expect(SINGLE_PERSON.nodes[0].firstName).toBe("Solo");
  });

  it("SMALL_FAMILY has 5 nodes", () => {
    expect(SMALL_FAMILY.nodes.length).toBe(5);
    expect(SMALL_FAMILY.edges.length).toBeGreaterThan(0);
  });

  it("LARGE_FAMILY has 50 nodes", () => {
    expect(LARGE_FAMILY.nodes.length).toBe(50);
    expect(LARGE_FAMILY.edges.length).toBeGreaterThan(0);
  });

  it("DEEP_ANCESTRY has nodes across many generations", () => {
    expect(DEEP_ANCESTRY.nodes.length).toBe(30);
    const generations = new Set(DEEP_ANCESTRY.nodes.map((n) => n.generation));
    expect(generations.size).toBe(10);
  });

  it("LONG_NAMES uses long names", () => {
    const hasLongName = LONG_NAMES.nodes.some(
      (n) => n.firstName.length > 8 || n.lastName.length > 10
    );
    expect(hasLongName).toBe(true);
  });
});
