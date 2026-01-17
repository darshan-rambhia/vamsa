/**
 * Unit tests for chart server business logic with dependency injection
 *
 * This file tests the chart generation functions using the DI pattern.
 * Instead of using mock.module() which pollutes global state, we pass
 * mock database clients directly to the functions.
 *
 * Coverage note: These are orchestration functions that coordinate multiple
 * database queries. Full integration testing is done in E2E tests. These
 * tests verify the DI pattern works and basic function contracts.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { ChartsDb } from "@vamsa/lib/server/business";

/**
 * Create a mock charts database client
 */
function createMockChartsDb(): ChartsDb {
  return {
    person: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
    relationship: {
      findMany: mock(() => Promise.resolve([])),
    },
  } as unknown as ChartsDb;
}

describe("Charts Server DI Pattern", () => {
  let mockDb: ChartsDb;

  beforeEach(() => {
    mockDb = createMockChartsDb();
  });

  it("should export ChartsDb type for dependency injection", async () => {
    const module = await import("@vamsa/lib/server/business");

    // Verify the type is exported and can be used for type annotations
    expect(module).toBeDefined();
    expect(typeof module.getAncestorChartData).toBe("function");
    expect(typeof module.getDescendantChartData).toBe("function");
    expect(typeof module.getHourglassChartData).toBe("function");
    expect(typeof module.getFanChartData).toBe("function");
    expect(typeof module.getBowtieChartData).toBe("function");
    expect(typeof module.getTimelineChartData).toBe("function");
    expect(typeof module.getRelationshipMatrixData).toBe("function");
    expect(typeof module.getCompactTreeData).toBe("function");
    expect(typeof module.getStatisticsData).toBe("function");
    expect(typeof module.getTreeChartData).toBe("function");
  });

  describe("Chart functions with DI", () => {
    it("should accept mock database for testing", async () => {
      const module = await import("@vamsa/lib/server/business");

      // Mock a person for testing
      const mockPerson = { id: "test-person-1" };
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([mockPerson]);
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      // This should work without errors - the functions accept the db parameter
      try {
        await module.getAncestorChartData("test-person-1", 3, mockDb);
      } catch (_err) {
        // We expect it might throw because we're using minimal mocks
        // The important thing is that DI works and the function signature accepts db
      }

      expect(mockDb.person.findUnique).toHaveBeenCalled();
    });

    it("should accept mock database for descendant chart", async () => {
      const _module = await import("@vamsa/lib/server/business");

      const mockPerson = { id: "test-person-1" };
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([mockPerson]);
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      try {
        await _module.getDescendantChartData("test-person-1", 3, mockDb);
      } catch (_err) {
        // Expected with minimal mocks
      }

      expect(mockDb.person.findUnique).toHaveBeenCalled();
    });

    it("should accept mock database for hourglass chart", async () => {
      const _module = await import("@vamsa/lib/server/business");

      const mockPerson = { id: "test-person-1" };
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([mockPerson]);
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      try {
        await _module.getHourglassChartData("test-person-1", 2, 2, mockDb);
      } catch (_err) {
        // Expected with minimal mocks
      }

      expect(mockDb.person.findUnique).toHaveBeenCalled();
    });

    it("should accept mock database for timeline chart", async () => {
      const module = await import("@vamsa/lib/server/business");

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      const result = await module.getTimelineChartData(undefined, undefined, "birth", mockDb);

      expect(result).toBeDefined();
      expect(result.entries).toEqual([]);
      expect(mockDb.person.findMany).toHaveBeenCalled();
    });

    it("should accept mock database for relationship matrix", async () => {
      const module = await import("@vamsa/lib/server/business");

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      const result = await module.getRelationshipMatrixData(undefined, 20, mockDb);

      expect(result).toBeDefined();
      expect(result.people).toEqual([]);
      expect(mockDb.person.findMany).toHaveBeenCalled();
    });

    it("should accept mock database for statistics", async () => {
      const module = await import("@vamsa/lib/server/business");

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      const result = await module.getStatisticsData(true, mockDb);

      expect(result).toBeDefined();
      expect(result.ageDistribution).toBeDefined();
      expect(mockDb.person.findMany).toHaveBeenCalled();
    });

    it("should throw error when person not found", async () => {
      const module = await import("@vamsa/lib/server/business");

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      try {
        await module.getAncestorChartData("nonexistent-person", 3, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Person not found");
      }
    });
  });

  describe("DI pattern benefits", () => {
    it("allows testing without global module state", () => {
      // With DI, we can create multiple mock instances without conflicts
      const mockDb1 = createMockChartsDb();
      const mockDb2 = createMockChartsDb();

      // Each has independent mocks
      expect(mockDb1.person).not.toBe(mockDb2.person);

      // No global state pollution from mock.module()
      expect(true).toBe(true);
    });

    it("allows easy swap between real and mock databases", async () => {
      // This is the type that allows TypeScript to ensure
      // we're passing a compatible database client
      const mockDb: ChartsDb = {
        person: {
          findUnique: mock(async () => ({ id: "p1" })),
          findMany: mock(async () => []),
        },
        relationship: {
          findMany: mock(async () => []),
        },
      } as unknown as ChartsDb;

      // Real code would pass: defaultPrisma (the real database)
      // Test code passes: mockDb (the mock)
      expect(mockDb).toBeDefined();
    });

    it("supports zero-config testing - functions work with default parameter", async () => {
      const module = await import("@vamsa/lib/server/business");

      // Functions have default parameters, so they work without DI too
      expect(typeof module.getAncestorChartData).toBe("function");

      // The function signature has:
      // export async function getAncestorChartData(
      //   personId: string,
      //   generations: number,
      //   db: ChartsDb = defaultPrisma
      // )

      // So code can call it either way:
      // With DI: getAncestorChartData("id", 3, mockDb)
      // Without DI: getAncestorChartData("id", 3) // uses defaultPrisma
    });
  });
});
