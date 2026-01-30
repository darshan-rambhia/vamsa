/**
 * Unit tests for D3 utilities
 *
 * Tests pure utility functions that can be unit tested without DOM:
 * - groupByGeneration: Groups nodes by their generation number
 * - calculateBoundingBox: Calculates min/max bounds of positions
 * - calculateFitScale: Calculates scale to fit content in container
 * - generateGenerationRange: Creates array of generation numbers
 * - getSortedGenerations: Returns sorted generation keys from a Map
 *
 * Note: DOM-dependent functions (renderRectNode, renderCircleNode, createZoomBehavior,
 * fitToContainer, etc.) are tested via E2E tests as they require actual DOM/SVG elements.
 */

import { describe, expect, it } from "bun:test";
import {
  calculateBoundingBox,
  calculateFitScale,
  generateGenerationRange,
  getSortedGenerations,
  groupByGeneration,
} from "./d3-utils";
import type { Position } from "./d3-utils";
import type { ChartNode } from "~/server/charts";

/**
 * Helper: Create a sample chart node
 */
function createSampleNode(overrides: Partial<ChartNode> = {}): ChartNode {
  return {
    id: "person-1",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1980-01-15",
    dateOfPassing: null,
    isLiving: true,
    photoUrl: null,
    gender: "M",
    generation: 0,
    ...overrides,
  };
}

describe("D3 Utilities", () => {
  // ====================================================
  // groupByGeneration
  // ====================================================

  describe("groupByGeneration", () => {
    it("should return Map instance", () => {
      const nodes = [createSampleNode()];
      const result = groupByGeneration(nodes);
      expect(result instanceof Map).toBe(true);
    });

    it("should handle empty input gracefully", () => {
      const result = groupByGeneration([]);
      expect(result.size).toBe(0);
    });

    it("should group nodes by generation number", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 0 }),
        createSampleNode({ id: "2", generation: 0 }),
        createSampleNode({ id: "3", generation: 1 }),
      ];
      const result = groupByGeneration(nodes);

      expect(result.size).toBe(2);
      expect(result.get(0)?.length).toBe(2);
      expect(result.get(1)?.length).toBe(1);
    });

    it("should handle null/undefined generation as 0", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 1 }),
        createSampleNode({ id: "2", generation: null as unknown as number }),
        createSampleNode({
          id: "3",
          generation: undefined as unknown as number,
        }),
      ];
      const result = groupByGeneration(nodes);

      expect(result.has(0)).toBe(true);
      expect(result.get(0)?.length).toBe(2);
    });
  });

  // ====================================================
  // calculateBoundingBox
  // ====================================================

  describe("calculateBoundingBox", () => {
    it("should return zero bounds for empty positions", () => {
      const result = calculateBoundingBox([]);

      expect(result.minX).toBe(0);
      expect(result.minY).toBe(0);
      expect(result.maxX).toBe(0);
      expect(result.maxY).toBe(0);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it("should calculate bounds for single position", () => {
      const positions: Array<Position> = [{ x: 100, y: 200 }];

      const result = calculateBoundingBox(positions);

      expect(result.minX).toBe(100);
      expect(result.maxX).toBe(100);
      expect(result.minY).toBe(200);
      expect(result.maxY).toBe(200);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it("should calculate bounds for multiple positions", () => {
      const positions: Array<Position> = [
        { x: 0, y: 0 },
        { x: 100, y: 200 },
        { x: 50, y: 150 },
      ];

      const result = calculateBoundingBox(positions);

      expect(result.minX).toBe(0);
      expect(result.maxX).toBe(100);
      expect(result.minY).toBe(0);
      expect(result.maxY).toBe(200);
      expect(result.width).toBe(100);
      expect(result.height).toBe(200);
    });

    it("should handle negative coordinates", () => {
      const positions: Array<Position> = [
        { x: -100, y: -50 },
        { x: 100, y: 50 },
      ];

      const result = calculateBoundingBox(positions);

      expect(result.minX).toBe(-100);
      expect(result.maxX).toBe(100);
      expect(result.minY).toBe(-50);
      expect(result.maxY).toBe(50);
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
    });

    it("should handle all positions at same location", () => {
      const positions: Array<Position> = [
        { x: 50, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 50 },
      ];

      const result = calculateBoundingBox(positions);

      expect(result.minX).toBe(50);
      expect(result.maxX).toBe(50);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });
  });

  // ====================================================
  // calculateFitScale
  // ====================================================

  describe("calculateFitScale", () => {
    it("should return 1 for zero content dimensions", () => {
      const result = calculateFitScale(0, 0, 800, 600);

      expect(result).toBe(1);
    });

    it("should return value <= 1 when content fits in container", () => {
      const result = calculateFitScale(400, 300, 800, 600);

      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThan(0);
    });

    it("should scale down when content is larger than container", () => {
      const result = calculateFitScale(1600, 1200, 800, 600);

      expect(result).toBeLessThan(1);
    });

    it("should apply padding factor", () => {
      const resultWith90Percent = calculateFitScale(1000, 1000, 800, 600, 0.9);
      const resultWith100Percent = calculateFitScale(1000, 1000, 800, 600, 1.0);

      expect(resultWith90Percent).toBeLessThan(resultWith100Percent);
    });

    it("should respect maxScale limit", () => {
      const result = calculateFitScale(100, 100, 1000, 1000, 0.9, 2);

      expect(result).toBeLessThanOrEqual(2);
    });

    it("should calculate correct scale when width constrains", () => {
      const result = calculateFitScale(400, 100, 200, 1000);

      // Width is the constraining dimension
      expect(result).toBeLessThan(1);
    });

    it("should calculate correct scale when height constrains", () => {
      const result = calculateFitScale(100, 400, 1000, 200);

      // Height is the constraining dimension
      expect(result).toBeLessThan(1);
    });
  });

  // ====================================================
  // generateGenerationRange
  // ====================================================

  describe("generateGenerationRange", () => {
    it("should generate range from min to max inclusive", () => {
      const result = generateGenerationRange(0, 5);

      expect(result).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it("should handle single generation", () => {
      const result = generateGenerationRange(3, 3);

      expect(result).toEqual([3]);
    });

    it("should handle negative to positive range", () => {
      const result = generateGenerationRange(-2, 2);

      expect(result).toEqual([-2, -1, 0, 1, 2]);
    });

    it("should handle all negative range", () => {
      const result = generateGenerationRange(-5, -1);

      expect(result).toEqual([-5, -4, -3, -2, -1]);
    });

    it("should generate correct length", () => {
      const result = generateGenerationRange(0, 10);

      expect(result).toHaveLength(11);
    });
  });

  // ====================================================
  // getSortedGenerations
  // ====================================================

  describe("getSortedGenerations", () => {
    it("should sort generations in ascending order", () => {
      const generations = new Map<number, Array<ChartNode>>([
        [3, []],
        [1, []],
        [2, []],
      ]);

      const result = getSortedGenerations(generations);

      expect(result).toEqual([1, 2, 3]);
    });

    it("should handle empty map", () => {
      const generations = new Map<number, Array<ChartNode>>();

      const result = getSortedGenerations(generations);

      expect(result).toEqual([]);
    });

    it("should handle negative generations", () => {
      const generations = new Map<number, Array<ChartNode>>([
        [-1, []],
        [1, []],
        [0, []],
        [-3, []],
      ]);

      const result = getSortedGenerations(generations);

      expect(result).toEqual([-3, -1, 0, 1]);
    });

    it("should not modify original map", () => {
      const generations = new Map<number, Array<ChartNode>>([
        [2, []],
        [1, []],
      ]);

      getSortedGenerations(generations);

      // Map order should be preserved (insertion order)
      const keys = Array.from(generations.keys());
      expect(keys[0]).toBe(2);
    });
  });
});
