import { describe, expect, it } from "vitest";
import {
  calculateBoundingBox,
  calculateFitScale,
  generateGenerationRange,
  getSortedGenerations,
  groupByGeneration,
} from "./utils";

describe("groupByGeneration", () => {
  it("groups nodes by generation number", () => {
    const nodes = [
      { id: "1", generation: 0 },
      { id: "2", generation: 0 },
      { id: "3", generation: 1 },
      { id: "4", generation: 1 },
      { id: "5", generation: 2 },
    ];

    const result = groupByGeneration(nodes);

    expect(result.size).toBe(3);
    expect(result.get(0)?.length).toBe(2);
    expect(result.get(1)?.length).toBe(2);
    expect(result.get(2)?.length).toBe(1);
  });

  it("treats null/undefined generation as 0", () => {
    const nodes = [
      { id: "1", generation: null },
      { id: "2", generation: undefined },
      { id: "3" }, // no generation property
      { id: "4", generation: 1 },
    ];

    const result = groupByGeneration(nodes);

    expect(result.size).toBe(2);
    expect(result.get(0)?.length).toBe(3);
    expect(result.get(1)?.length).toBe(1);
  });

  it("handles empty array", () => {
    const result = groupByGeneration([]);
    expect(result.size).toBe(0);
  });

  it("handles negative generation numbers", () => {
    const nodes = [
      { id: "1", generation: -2 },
      { id: "2", generation: -1 },
      { id: "3", generation: 0 },
    ];

    const result = groupByGeneration(nodes);

    expect(result.size).toBe(3);
    expect(result.get(-2)?.length).toBe(1);
    expect(result.get(-1)?.length).toBe(1);
    expect(result.get(0)?.length).toBe(1);
  });

  it("preserves node data in groups", () => {
    const nodes = [
      { id: "1", generation: 0, name: "John" },
      { id: "2", generation: 0, name: "Jane" },
    ];

    const result = groupByGeneration(nodes);
    const gen0 = result.get(0);

    expect(gen0?.[0]).toEqual({ id: "1", generation: 0, name: "John" });
    expect(gen0?.[1]).toEqual({ id: "2", generation: 0, name: "Jane" });
  });
});

describe("calculateBoundingBox", () => {
  it("calculates bounding box for multiple positions", () => {
    const positions = [
      { x: 10, y: 20 },
      { x: 50, y: 30 },
      { x: 30, y: 60 },
    ];

    const result = calculateBoundingBox(positions);

    expect(result.minX).toBe(10);
    expect(result.minY).toBe(20);
    expect(result.maxX).toBe(50);
    expect(result.maxY).toBe(60);
    expect(result.width).toBe(40);
    expect(result.height).toBe(40);
  });

  it("returns zeros for empty array", () => {
    const result = calculateBoundingBox([]);

    expect(result.minX).toBe(0);
    expect(result.minY).toBe(0);
    expect(result.maxX).toBe(0);
    expect(result.maxY).toBe(0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it("handles single position", () => {
    const positions = [{ x: 100, y: 200 }];

    const result = calculateBoundingBox(positions);

    expect(result.minX).toBe(100);
    expect(result.minY).toBe(200);
    expect(result.maxX).toBe(100);
    expect(result.maxY).toBe(200);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it("handles negative coordinates", () => {
    const positions = [
      { x: -50, y: -30 },
      { x: 50, y: 30 },
    ];

    const result = calculateBoundingBox(positions);

    expect(result.minX).toBe(-50);
    expect(result.minY).toBe(-30);
    expect(result.maxX).toBe(50);
    expect(result.maxY).toBe(30);
    expect(result.width).toBe(100);
    expect(result.height).toBe(60);
  });
});

describe("calculateFitScale", () => {
  it("calculates scale to fit content in container", () => {
    const scale = calculateFitScale(200, 100, 1000, 500, 1.0, 1);

    // Content 200x100 in container 1000x500 with no padding
    // scaleX = 1000 / 200 = 5
    // scaleY = 500 / 100 = 5
    // min(5, 5, 1) = 1
    expect(scale).toBe(1);
  });

  it("respects maxScale", () => {
    const scale = calculateFitScale(100, 50, 1000, 500, 1.0, 0.5);
    expect(scale).toBe(0.5);
  });

  it("applies padding factor", () => {
    // Content 100x100 in container 100x100 with 90% padding
    const scale = calculateFitScale(100, 100, 100, 100, 0.9, 10);
    expect(scale).toBe(0.9);
  });

  it("returns 1 for zero content dimensions", () => {
    expect(calculateFitScale(0, 100, 500, 500)).toBe(1);
    expect(calculateFitScale(100, 0, 500, 500)).toBe(1);
    expect(calculateFitScale(0, 0, 500, 500)).toBe(1);
  });

  it("scales based on limiting dimension", () => {
    // Wide content in tall container
    const scale1 = calculateFitScale(200, 50, 100, 200, 1.0, 10);
    expect(scale1).toBe(0.5); // limited by width

    // Tall content in wide container
    const scale2 = calculateFitScale(50, 200, 200, 100, 1.0, 10);
    expect(scale2).toBe(0.5); // limited by height
  });
});

describe("generateGenerationRange", () => {
  it("generates range from min to max", () => {
    const result = generateGenerationRange(0, 3);
    expect(result).toEqual([0, 1, 2, 3]);
  });

  it("handles single generation", () => {
    const result = generateGenerationRange(2, 2);
    expect(result).toEqual([2]);
  });

  it("handles negative generations", () => {
    const result = generateGenerationRange(-2, 1);
    expect(result).toEqual([-2, -1, 0, 1]);
  });

  it("returns empty array when min > max", () => {
    const result = generateGenerationRange(5, 3);
    expect(result).toEqual([]);
  });
});

describe("getSortedGenerations", () => {
  it("returns sorted generation keys", () => {
    const map = new Map([
      [2, ["a"]],
      [0, ["b"]],
      [1, ["c"]],
    ]);

    const result = getSortedGenerations(map);
    expect(result).toEqual([0, 1, 2]);
  });

  it("handles negative generations", () => {
    const map = new Map([
      [1, ["a"]],
      [-2, ["b"]],
      [0, ["c"]],
      [-1, ["d"]],
    ]);

    const result = getSortedGenerations(map);
    expect(result).toEqual([-2, -1, 0, 1]);
  });

  it("handles empty map", () => {
    const map = new Map<number, Array<string>>();
    const result = getSortedGenerations(map);
    expect(result).toEqual([]);
  });

  it("handles single entry", () => {
    const map = new Map([[5, ["a"]]]);
    const result = getSortedGenerations(map);
    expect(result).toEqual([5]);
  });
});
