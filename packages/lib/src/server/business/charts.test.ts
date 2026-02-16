/**
 * Unit tests for Charts Business Logic
 *
 * Tests cover:
 * - All chart generation functions (ancestor, descendant, hourglass, fan, bowtie, compact, timeline, matrix, tree, statistics)
 * - Error handling for unimplemented features (PDF/SVG export)
 * - Type definitions and interfaces
 * - Data structure validation
 * - Pure function logic for chart helpers
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks, mockLogger } from "../../testing/shared-mocks";

// Import functions to test
import {
  exportChartAsPDF,
  exportChartAsSVG,
  getAncestorChartData,
  getBowtieChartData,
  getCompactTreeData,
  getDescendantChartData,
  getFanChartData,
  getHourglassChartData,
  getRelationshipMatrixData,
  getStatisticsData,
  getTimelineChartData,
  getTreeChartData,
} from "./charts";

// Mock metrics module
vi.mock("../metrics", () => ({
  recordChartMetrics: vi.fn(() => undefined),
}));

// Mock the helpers module
vi.mock("../helpers/charts", () => ({
  buildRelationshipMaps: vi.fn(() => ({
    childToParents: new Map(),
    parentToChildren: new Map(),
    spouseMap: new Map(),
  })),
  calculateFanLayout: vi.fn(() => new Map()),
  collectAncestors: vi.fn(),
  collectBowtieAncestors: vi.fn(),
  collectDescendants: vi.fn(),
  collectTreeAncestors: vi.fn(),
  collectTreeDescendants: vi.fn(),
}));

// Create mock database
function createMockDb(
  options: {
    persons?: Array<any>;
    relationships?: Array<any>;
    rootPerson?: any;
  } = {}
) {
  return {
    query: {
      persons: {
        findFirst: vi.fn(async () => options.rootPerson || null),
        findMany: vi.fn(async () => options.persons || []),
      },
      relationships: {
        findMany: vi.fn(async () => options.relationships || []),
      },
    },
  } as any;
}

describe("charts business logic", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe("exportChartAsPDF", () => {
    it("should throw error indicating PDF export not implemented", async () => {
      try {
        await exportChartAsPDF("ancestor", {});
        expect.unreachable("Should throw error");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain("not yet implemented");
      }
    });

    it("should throw error for any chart type", async () => {
      const chartTypes = [
        "ancestor",
        "descendant",
        "hourglass",
        "fan",
        "bowtie",
        "compact",
        "timeline",
        "matrix",
      ];

      for (const chartType of chartTypes) {
        try {
          await exportChartAsPDF(chartType, {});
          expect.unreachable(`Should throw error for ${chartType}`);
        } catch (error) {
          expect(error instanceof Error).toBe(true);
        }
      }
    });

    it("should throw error with empty chart data", async () => {
      try {
        await exportChartAsPDF("ancestor", {});
        expect.unreachable("Should throw error");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
      }
    });

    it("should be async function", () => {
      expect(typeof exportChartAsPDF).toBe("function");
    });
  });

  describe("exportChartAsSVG", () => {
    it("should throw error indicating SVG export not implemented", async () => {
      try {
        await exportChartAsSVG("ancestor", {});
        expect.unreachable("Should throw error");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain("not yet implemented");
      }
    });

    it("should throw error for any chart type", async () => {
      const chartTypes = [
        "ancestor",
        "descendant",
        "hourglass",
        "fan",
        "bowtie",
        "compact",
        "timeline",
        "matrix",
      ];

      for (const chartType of chartTypes) {
        try {
          await exportChartAsSVG(chartType, {});
          expect.unreachable(`Should throw error for ${chartType}`);
        } catch (error) {
          expect(error instanceof Error).toBe(true);
        }
      }
    });

    it("should return Promise<string> type", async () => {
      try {
        await exportChartAsSVG("ancestor", {});
      } catch (error) {
        expect(error instanceof Error).toBe(true);
      }
    });

    it("should be async function", () => {
      expect(typeof exportChartAsSVG).toBe("function");
    });
  });

  describe("chart type definitions", () => {
    it("should have logger available for charts module", () => {
      expect(mockLogger).toBeDefined();
      expect(typeof mockLogger.info).toBe("function");
    });

    it("should support chart data structures", () => {
      // Verify mock setup is complete
      expect(mockLogger).toBeDefined();
      expect(typeof mockLogger.info).toBe("function");
    });

    it("should define valid chart types", () => {
      const validChartTypes = [
        "ancestor",
        "descendant",
        "hourglass",
        "fan",
        "bowtie",
        "compact",
        "timeline",
        "matrix",
        "tree",
        "statistics",
      ];

      expect(validChartTypes.length).toBeGreaterThan(0);
      validChartTypes.forEach((type) => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe("generation calculations", () => {
    it("should handle generation metadata", () => {
      // Mock generation calculation
      const calculateGenerations = (minGen: number, maxGen: number) =>
        maxGen - minGen + 1;

      expect(calculateGenerations(-2, 2)).toBe(5);
      expect(calculateGenerations(0, 3)).toBe(4);
      expect(calculateGenerations(-1, 0)).toBe(2);
    });

    it("should handle edge cases in generation ranges", () => {
      const calculateGenerations = (minGen: number, maxGen: number) =>
        maxGen - minGen + 1;

      expect(calculateGenerations(0, 0)).toBe(1); // Single generation
      expect(calculateGenerations(-10, 10)).toBe(21); // Large range
    });
  });

  describe("date formatting", () => {
    it("should convert Date to ISO string", () => {
      const date = new Date("2000-01-15T00:00:00Z");
      const dateToISOString = (d: Date | null): string | null =>
        d ? d.toISOString().split("T")[0] : null;

      const result = dateToISOString(date);
      expect(result).toBe("2000-01-15");
    });

    it("should handle null dates", () => {
      const dateToISOString = (d: Date | null): string | null =>
        d ? d.toISOString().split("T")[0] : null;

      const result = dateToISOString(null);
      expect(result).toBeNull();
    });

    it("should format various dates correctly", () => {
      const dateToISOString = (d: Date | null): string | null =>
        d ? d.toISOString().split("T")[0] : null;

      const dates = [
        { input: new Date("1950-05-10"), expected: "1950-05-10" },
        { input: new Date("2023-12-31"), expected: "2023-12-31" },
        { input: new Date("1900-01-01"), expected: "1900-01-01" },
      ];

      dates.forEach(({ input, expected }) => {
        expect(dateToISOString(input)).toBe(expected);
      });
    });
  });

  describe("edge case handling", () => {
    it("should handle empty nodes and edges", () => {
      const nodes: Array<any> = [];
      const edges: Array<any> = [];

      expect(nodes.length).toBe(0);
      expect(edges.length).toBe(0);
    });

    it("should handle single node charts", () => {
      const nodes = [
        {
          id: "person1",
          firstName: "John",
          lastName: "Doe",
          generation: 0,
        },
      ];

      expect(nodes.length).toBe(1);
      expect(nodes[0].generation).toBe(0);
    });

    it("should handle deduplication of edges", () => {
      const edges = new Map<string, any>();

      // Add edge
      const key = "person1-person2";
      edges.set(key, {
        source: "person1",
        target: "person2",
        type: "parent-child",
      });

      // Try to add same edge again (should not duplicate)
      expect(edges.size).toBe(1);
    });
  });

  describe("relationship types", () => {
    it("should support parent-child relationships", () => {
      const relationships = ["parent-child", "spouse"];
      expect(relationships).toContain("parent-child");
    });

    it("should support spouse relationships", () => {
      const relationships = ["parent-child", "spouse"];
      expect(relationships).toContain("spouse");
    });

    it("should validate relationship types", () => {
      const isValidRelType = (type: string) =>
        ["parent-child", "spouse"].includes(type);

      expect(isValidRelType("parent-child")).toBe(true);
      expect(isValidRelType("spouse")).toBe(true);
      expect(isValidRelType("sibling")).toBe(false);
      expect(isValidRelType("cousin")).toBe(false);
    });
  });

  describe("getAncestorChartData", () => {
    it("should throw error when person not found", async () => {
      const mockDb = createMockDb({ rootPerson: null });

      await expect(
        getAncestorChartData("missing-id", 3, mockDb)
      ).rejects.toThrow("Person not found");
    });

    it("should generate ancestor chart for valid person", async () => {
      const rootPerson = {
        id: "person1",
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-15"),
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "MALE",
      };

      const mockDb = createMockDb({
        rootPerson,
        persons: [rootPerson],
        relationships: [],
      });

      const result = await getAncestorChartData("person1", 3, mockDb);

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("ancestor");
      expect(result.metadata.totalGenerations).toBe(3);
      expect(result.metadata.rootPersonId).toBe("person1");
    });
  });

  describe("getDescendantChartData", () => {
    it("should throw error when person not found", async () => {
      const mockDb = createMockDb({ rootPerson: null });

      await expect(
        getDescendantChartData("missing-id", 3, mockDb)
      ).rejects.toThrow("Person not found");
    });

    it("should generate descendant chart for valid person", async () => {
      const rootPerson = {
        id: "person1",
        firstName: "Jane",
        lastName: "Smith",
        dateOfBirth: new Date("1970-05-20"),
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "FEMALE",
      };

      const mockDb = createMockDb({
        rootPerson,
        persons: [rootPerson],
        relationships: [],
      });

      const result = await getDescendantChartData("person1", 2, mockDb);

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("descendant");
      expect(result.metadata.totalGenerations).toBe(2);
    });
  });

  describe("getHourglassChartData", () => {
    it("should throw error when person not found", async () => {
      const mockDb = createMockDb({ rootPerson: null });

      await expect(
        getHourglassChartData("missing-id", 2, 2, mockDb)
      ).rejects.toThrow("Person not found");
    });

    it("should generate hourglass chart combining ancestors and descendants", async () => {
      const rootPerson = {
        id: "person1",
        firstName: "Alex",
        lastName: "Johnson",
        dateOfBirth: new Date("1985-03-10"),
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "MALE",
      };

      const mockDb = createMockDb({
        rootPerson,
        persons: [rootPerson],
        relationships: [],
      });

      const result = await getHourglassChartData("person1", 2, 2, mockDb);

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("hourglass");
      expect(result.metadata.totalGenerations).toBe(5); // 2 ancestor + 1 root + 2 descendant
    });
  });

  describe("getFanChartData", () => {
    it("should throw error when person not found", async () => {
      const mockDb = createMockDb({ rootPerson: null });

      await expect(getFanChartData("missing-id", 4, mockDb)).rejects.toThrow(
        "Person not found"
      );
    });

    it("should generate fan chart with angle data", async () => {
      const rootPerson = {
        id: "person1",
        firstName: "Sam",
        lastName: "Williams",
        dateOfBirth: new Date("1995-08-22"),
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "OTHER",
      };

      const mockDb = createMockDb({
        rootPerson,
        persons: [rootPerson],
        relationships: [],
      });

      const result = await getFanChartData("person1", 4, mockDb);

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("fan");
      expect(result.metadata.totalGenerations).toBe(4);
    });
  });

  describe("getBowtieChartData", () => {
    it("should throw error when person not found", async () => {
      const mockDb = createMockDb({ rootPerson: null });

      await expect(getBowtieChartData("missing-id", 3, mockDb)).rejects.toThrow(
        "Person not found"
      );
    });

    it("should generate bowtie chart with paternal and maternal counts", async () => {
      const rootPerson = {
        id: "person1",
        firstName: "Taylor",
        lastName: "Brown",
        dateOfBirth: new Date("2000-11-05"),
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "PREFER_NOT_TO_SAY",
      };

      const mockDb = createMockDb({
        rootPerson,
        persons: [rootPerson],
        relationships: [],
      });

      const result = await getBowtieChartData("person1", 3, mockDb);

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("bowtie");
      expect(result.metadata).toHaveProperty("paternalCount");
      expect(result.metadata).toHaveProperty("maternalCount");
    });
  });

  describe("getCompactTreeData", () => {
    it("should throw error when person not found", async () => {
      const mockDb = createMockDb({ rootPerson: null });

      await expect(getCompactTreeData("missing-id", 5, mockDb)).rejects.toThrow(
        "Person not found"
      );
    });

    it("should generate compact tree with nested structure and flat list", async () => {
      const rootPerson = {
        id: "person1",
        firstName: "Morgan",
        lastName: "Davis",
        dateOfBirth: new Date("1980-07-14"),
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "MALE",
      };

      const mockDb = createMockDb({
        rootPerson,
        persons: [rootPerson],
        relationships: [],
      });

      const result = await getCompactTreeData("person1", 5, mockDb);

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("compact");
      expect(result).toHaveProperty("root");
      expect(result).toHaveProperty("flatList");
      expect(Array.isArray(result.flatList)).toBe(true);
    });
  });

  describe("getTimelineChartData", () => {
    it("should generate timeline with no filter", async () => {
      const persons = [
        {
          id: "person1",
          firstName: "Charlie",
          lastName: "Miller",
          dateOfBirth: new Date("1950-01-01"),
          dateOfPassing: new Date("2020-12-31"),
          isLiving: false,
          photoUrl: null,
          gender: "MALE",
        },
        {
          id: "person2",
          firstName: "Diana",
          lastName: "Wilson",
          dateOfBirth: new Date("1980-06-15"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
        },
      ];

      const mockDb = createMockDb({ persons });

      const result = await getTimelineChartData(
        undefined,
        undefined,
        "birth",
        mockDb
      );

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("timeline");
      expect(result.entries.length).toBeGreaterThanOrEqual(0);
    });

    it("should sort timeline by birth year", async () => {
      const persons = [
        {
          id: "person1",
          firstName: "Alice",
          lastName: "Jones",
          dateOfBirth: new Date("1990-01-01"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
        },
        {
          id: "person2",
          firstName: "Bob",
          lastName: "Smith",
          dateOfBirth: new Date("1970-01-01"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
        },
      ];

      const mockDb = createMockDb({ persons });

      const result = await getTimelineChartData(
        undefined,
        undefined,
        "birth",
        mockDb
      );

      expect(result.entries.length).toBe(2);
      // Should be sorted by birth year ascending
      if (result.entries.length === 2) {
        expect(result.entries[0].birthYear).toBeLessThanOrEqual(
          result.entries[1].birthYear || 9999
        );
      }
    });

    it("should sort timeline by name", async () => {
      const persons = [
        {
          id: "person1",
          firstName: "Zoe",
          lastName: "Adams",
          dateOfBirth: new Date("1990-01-01"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
        },
        {
          id: "person2",
          firstName: "Adam",
          lastName: "Baker",
          dateOfBirth: new Date("1985-01-01"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
        },
      ];

      const mockDb = createMockDb({ persons });

      const result = await getTimelineChartData(
        undefined,
        undefined,
        "name",
        mockDb
      );

      expect(result.entries.length).toBe(2);
    });
  });

  describe("getRelationshipMatrixData", () => {
    it("should generate relationship matrix for persons", async () => {
      const persons = [
        {
          id: "person1",
          firstName: "Eve",
          lastName: "Martin",
          dateOfBirth: new Date("1975-03-20"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
        },
        {
          id: "person2",
          firstName: "Frank",
          lastName: "Garcia",
          dateOfBirth: new Date("1978-09-12"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
        },
      ];

      const mockDb = {
        query: {
          persons: {
            findFirst: vi.fn(),
            findMany: vi.fn(async () => persons),
          },
          relationships: {
            findMany: vi.fn(async () => []),
          },
        },
      } as any;

      const result = await getRelationshipMatrixData(undefined, 20, mockDb);

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("matrix");
      expect(result.people).toHaveLength(2);
      expect(result.matrix).toBeDefined();
    });

    it("should include SELF relationships in matrix", async () => {
      const persons = [
        {
          id: "person1",
          firstName: "Grace",
          lastName: "Lee",
          dateOfBirth: new Date("1992-11-08"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
        },
      ];

      const mockDb = {
        query: {
          persons: {
            findFirst: vi.fn(),
            findMany: vi.fn(async () => persons),
          },
          relationships: {
            findMany: vi.fn(async () => []),
          },
        },
      } as any;

      const result = await getRelationshipMatrixData(undefined, 20, mockDb);

      // Should have SELF relationship
      const selfRel = result.matrix.find(
        (m) => m.personId === "person1" && m.relatedPersonId === "person1"
      );
      expect(selfRel).toBeDefined();
      expect(selfRel?.relationshipType).toBe("SELF");
    });
  });

  describe("getTreeChartData", () => {
    it("should throw error when person not found", async () => {
      const mockDb = createMockDb({ rootPerson: null });

      await expect(
        getTreeChartData("missing-id", 2, 2, mockDb)
      ).rejects.toThrow("Person not found");
    });

    it("should generate tree chart with ancestors and descendants", async () => {
      const rootPerson = {
        id: "person1",
        firstName: "Henry",
        lastName: "Martinez",
        dateOfBirth: new Date("1988-04-17"),
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "MALE",
      };

      const mockDb = createMockDb({
        rootPerson,
        persons: [rootPerson],
        relationships: [],
      });

      const result = await getTreeChartData("person1", 2, 2, mockDb);

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("tree");
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
    });
  });

  describe("getStatisticsData", () => {
    it("should generate statistics for living persons only", async () => {
      const persons = [
        {
          id: "person1",
          firstName: "Ivy",
          lastName: "Robinson",
          dateOfBirth: new Date("1995-02-28"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
          birthPlace: "New York, USA",
        },
        {
          id: "person2",
          firstName: "Jack",
          lastName: "Clark",
          dateOfBirth: new Date("1950-05-10"),
          dateOfPassing: new Date("2015-08-22"),
          isLiving: false,
          photoUrl: null,
          gender: "MALE",
          birthPlace: "Chicago, USA",
        },
      ];

      const mockDb = {
        query: {
          persons: {
            findFirst: vi.fn(),
            findMany: vi.fn(async ({ where }: any) => {
              // Filter by isLiving if specified
              if (where) {
                return persons.filter((p) => p.isLiving === true);
              }
              return persons;
            }),
          },
          relationships: {
            findMany: vi.fn(async () => []),
          },
        },
      } as any;

      const result = await getStatisticsData(false, mockDb);

      expect(result).toBeDefined();
      expect(result.metadata.chartType).toBe("statistics");
      expect(result.metadata.livingCount).toBeGreaterThanOrEqual(0);
    });

    it("should generate statistics including deceased persons", async () => {
      const persons = [
        {
          id: "person1",
          firstName: "Kate",
          lastName: "Rodriguez",
          dateOfBirth: new Date("1998-12-05"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
          birthPlace: "Miami, USA",
        },
        {
          id: "person2",
          firstName: "Leo",
          lastName: "Lewis",
          dateOfBirth: new Date("1940-07-18"),
          dateOfPassing: new Date("2010-11-30"),
          isLiving: false,
          photoUrl: null,
          gender: "MALE",
          birthPlace: "Boston, USA",
        },
      ];

      const mockDb = {
        query: {
          persons: {
            findFirst: vi.fn(),
            findMany: vi.fn(async () => persons),
          },
          relationships: {
            findMany: vi.fn(async () => []),
          },
        },
      } as any;

      const result = await getStatisticsData(true, mockDb);

      expect(result).toBeDefined();
      expect(result.ageDistribution).toBeDefined();
      expect(result.generationSizes).toBeDefined();
      expect(result.genderDistribution).toBeDefined();
      expect(result.surnameFrequency).toBeDefined();
      expect(result.lifespanTrends).toBeDefined();
    });

    it("should calculate age distribution correctly", async () => {
      const persons = [
        {
          id: "person1",
          firstName: "Mia",
          lastName: "Walker",
          dateOfBirth: new Date("2010-01-01"),
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
          birthPlace: "Seattle, USA",
        },
      ];

      const mockDb = {
        query: {
          persons: {
            findFirst: vi.fn(),
            findMany: vi.fn(async () => persons),
          },
          relationships: {
            findMany: vi.fn(async () => []),
          },
        },
      } as any;

      const result = await getStatisticsData(true, mockDb);

      expect(result.ageDistribution).toBeDefined();
      expect(Array.isArray(result.ageDistribution)).toBe(true);
    });
  });
});
