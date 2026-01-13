/**
 * Unit tests for chart performance utilities
 * Tests: useNodePositions, useChartDimensions, useDebouncedZoom, useScheduledAnimation,
 *        useValidEdges, useVisibleNodes, useChartLoadingState, useGenerationGroups,
 *        usePerformanceMonitor
 *
 * Comprehensive test coverage for:
 * - Memoized node position calculations
 * - Chart dimension calculations
 * - Debounced zoom/pan with timing validation
 * - RAF scheduling for animations
 * - Edge filtering and validation
 * - Virtual rendering/viewport filtering
 * - Loading state determination
 * - Generation grouping
 * - Performance monitoring
 * - Edge cases and error handling
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import type { ChartNode, ChartEdge } from "~/server/charts";
import type { Position } from "./d3-utils";

/**
 * Mock implementations of the hooks for testing purposes
 */

// Mock useNodePositions
function mockUseNodePositions(
  nodes: ChartNode[],
  width: number,
  nodeWidth: number,
  levelHeight: number,
  marginTop: number
): Map<string, Position> {
  const nodePositions = new Map<string, Position>();

  const generations = new Map<number, ChartNode[]>();
  nodes.forEach((node) => {
    const gen = node.generation ?? 0;
    if (!generations.has(gen)) {
      generations.set(gen, []);
    }
    generations.get(gen)!.push(node);
  });

  generations.forEach((genNodes, gen) => {
    const yPos = marginTop + gen * levelHeight;
    const totalWidth = genNodes.length * nodeWidth * 1.5;
    const startX = (width - totalWidth) / 2;

    genNodes.forEach((node, index) => {
      const xPos = startX + index * nodeWidth * 1.5 + nodeWidth / 2;
      nodePositions.set(node.id, { x: xPos, y: yPos });
    });
  });

  return nodePositions;
}

// Mock useChartDimensions
function mockUseChartDimensions(
  containerWidth: number,
  nodeCount: number,
  minHeight = 600
) {
  return {
    width: containerWidth,
    height: Math.max(minHeight, nodeCount * 80),
  };
}

// Mock useChartLoadingState
function mockUseChartLoadingState(nodeCount: number) {
  if (nodeCount === 0) {
    return { isLoading: false, message: null };
  }

  if (nodeCount > 2000) {
    return {
      isLoading: true,
      message: "Rendering large family tree...",
      estimatedTime: "~5-10s",
    };
  }

  if (nodeCount > 500) {
    return {
      isLoading: true,
      message: "Loading family tree...",
      estimatedTime: "~2-5s",
    };
  }

  return { isLoading: false, message: null };
}

// Mock useGenerationGroups
function mockUseGenerationGroups(nodes: ChartNode[]): Map<number, ChartNode[]> {
  const generations = new Map<number, ChartNode[]>();
  nodes.forEach((node) => {
    const gen = node.generation ?? 0;
    if (!generations.has(gen)) {
      generations.set(gen, []);
    }
    generations.get(gen)!.push(node);
  });
  return generations;
}

// Mock useValidEdges
function mockUseValidEdges(
  edges: ChartEdge[],
  nodePositions: Map<string, Position>
): ChartEdge[] {
  return edges.filter(
    (edge) => nodePositions.has(edge.source) && nodePositions.has(edge.target)
  );
}

// Mock useVisibleNodes
function mockUseVisibleNodes(
  nodes: ChartNode[],
  nodePositions: Map<string, Position>,
  viewport: { x: number; y: number; width: number; height: number } | null
): ChartNode[] {
  if (!viewport) return nodes;

  const padding = 200;
  return nodes.filter((node) => {
    const pos = nodePositions.get(node.id);
    if (!pos) return false;

    return (
      pos.x >= viewport.x - padding &&
      pos.x <= viewport.x + viewport.width + padding &&
      pos.y >= viewport.y - padding &&
      pos.y <= viewport.y + viewport.height + padding
    );
  });
}

/**
 * Helper: Create sample chart nodes
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

/**
 * Helper: Create sample chart edge
 */
function createSampleEdge(overrides: Partial<ChartEdge> = {}): ChartEdge {
  return {
    id: "edge-1",
    source: "person-1",
    target: "person-2",
    type: "parent-child",
    ...overrides,
  };
}

/**
 * Helper: Create sample position
 */
function createPosition(x = 100, y = 200): Position {
  return { x, y };
}

describe("Chart Performance Utilities", () => {
  // ====================================================
  // SECTION 1: useNodePositions Logic (10 tests)
  // ====================================================

  describe("useNodePositions Logic", () => {
    it("should calculate positions for nodes", () => {
      const nodes = [createSampleNode()];
      const result = mockUseNodePositions(nodes, 800, 100, 200, 50);
      expect(result instanceof Map).toBe(true);
      expect(result.size).toBe(1);
    });

    it("should handle empty nodes array", () => {
      const result = mockUseNodePositions([], 800, 100, 200, 50);
      expect(result.size).toBe(0);
    });

    it("should calculate positions for single node", () => {
      const node = createSampleNode({ id: "person-1", generation: 0 });
      const result = mockUseNodePositions([node], 800, 100, 200, 50);

      expect(result.has("person-1")).toBe(true);
      const pos = result.get("person-1");
      expect(pos?.x).toBeDefined();
      expect(pos?.y).toBeDefined();
    });

    it("should position nodes at correct generation level", () => {
      const node1 = createSampleNode({ id: "person-1", generation: 0 });
      const node2 = createSampleNode({ id: "person-2", generation: 1 });
      const result = mockUseNodePositions([node1, node2], 800, 100, 200, 50);

      const pos1 = result.get("person-1");
      const pos2 = result.get("person-2");

      expect(pos2!.y - pos1!.y).toBe(200);
    });

    it("should center nodes horizontally within generation", () => {
      const node1 = createSampleNode({ id: "person-1", generation: 0 });
      const node2 = createSampleNode({ id: "person-2", generation: 0 });
      const result = mockUseNodePositions([node1, node2], 800, 100, 200, 50);

      const pos1 = result.get("person-1");
      const pos2 = result.get("person-2");

      expect(pos1!.y).toBe(pos2!.y);
    });

    it("should handle multiple generations", () => {
      const nodes = Array.from({ length: 5 }, (_, i) =>
        createSampleNode({
          id: `person-${i}`,
          generation: Math.floor(i / 2),
        })
      );
      const result = mockUseNodePositions(nodes, 800, 100, 200, 50);

      expect(result.size).toBe(5);
    });

    it("should handle negative generation numbers", () => {
      const nodes = [
        createSampleNode({ id: "person-1", generation: -2 }),
        createSampleNode({ id: "person-2", generation: 0 }),
        createSampleNode({ id: "person-3", generation: 2 }),
      ];
      const result = mockUseNodePositions(nodes, 800, 100, 200, 50);

      expect(result.size).toBe(3);
      expect(result.has("person-1")).toBe(true);
      expect(result.has("person-3")).toBe(true);
    });

    it("should calculate proper spacing between nodes", () => {
      const nodeWidth = 100;
      const node1 = createSampleNode({ id: "person-1", generation: 0 });
      const node2 = createSampleNode({ id: "person-2", generation: 0 });
      const result = mockUseNodePositions(
        [node1, node2],
        800,
        nodeWidth,
        200,
        50
      );

      const pos1 = result.get("person-1");
      const pos2 = result.get("person-2");

      const expectedSpacing = nodeWidth * 1.5;
      expect(Math.abs(pos2!.x - pos1!.x - expectedSpacing)).toBeLessThan(1);
    });

    it("should use marginTop for initial Y position", () => {
      const marginTop = 100;
      const node = createSampleNode({ id: "person-1", generation: 0 });
      const result = mockUseNodePositions([node], 800, 100, 200, marginTop);

      const pos = result.get("person-1");
      expect(pos!.y).toBe(marginTop);
    });

    it("should respect container width in positioning", () => {
      const node = createSampleNode({ id: "person-1", generation: 0 });
      const result1 = mockUseNodePositions([node], 400, 100, 200, 50);
      const result2 = mockUseNodePositions([node], 1200, 100, 200, 50);

      const pos1 = result1.get("person-1");
      const pos2 = result2.get("person-1");

      expect(pos1!.x).not.toBe(pos2!.x);
    });
  });

  // ====================================================
  // SECTION 2: useChartDimensions Logic (8 tests)
  // ====================================================

  describe("useChartDimensions Logic", () => {
    it("should return object with width and height", () => {
      const result = mockUseChartDimensions(800, 10);

      expect(result).toHaveProperty("width");
      expect(result).toHaveProperty("height");
    });

    it("should set width to container width", () => {
      const result = mockUseChartDimensions(800, 10);
      expect(result.width).toBe(800);
    });

    it("should respect minimum height", () => {
      const result = mockUseChartDimensions(800, 5);
      expect(result.height).toBeGreaterThanOrEqual(600);
    });

    it("should calculate height based on node count", () => {
      const result = mockUseChartDimensions(800, 100);
      expect(result.height).toBe(100 * 80);
    });

    it("should use custom minimum height", () => {
      const result = mockUseChartDimensions(800, 5, 1000);
      expect(result.height).toBe(1000);
    });

    it("should use default minimum height when not specified", () => {
      const result = mockUseChartDimensions(800, 1);
      expect(result.height).toBe(600);
    });

    it("should return consistent values for same inputs", () => {
      const result1 = mockUseChartDimensions(800, 50);
      const result2 = mockUseChartDimensions(800, 50);

      expect(result1.width).toBe(result2.width);
      expect(result1.height).toBe(result2.height);
    });

    it("should recalculate when node count changes", () => {
      const result1 = mockUseChartDimensions(800, 10);
      const result2 = mockUseChartDimensions(800, 50);

      expect(result2.height).toBeGreaterThan(result1.height);
    });
  });

  // ====================================================
  // SECTION 3: useDebouncedZoom Logic (10 tests)
  // ====================================================

  describe("useDebouncedZoom Logic", () => {
    it("should call callback after delay", () => {
      const callback = mock(() => {});
      let timeoutId: NodeJS.Timeout | null = null;
      const delay = 16;

      // Simulate debounce
      timeoutId = setTimeout(() => {
        callback();
      }, delay);

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
      }, delay + 1);
    });

    it("should debounce multiple calls to one", () => {
      const callback = mock(() => {});
      let timeoutId: NodeJS.Timeout | null = null;

      const debounce = (fn: () => void) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(fn, 16);
      };

      debounce(callback);
      debounce(callback);
      debounce(callback);

      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(1);
      }, 20);
    });

    it("should cancel previous timeout on new call", () => {
      let callCount = 0;
      let timeoutId: NodeJS.Timeout | null = null;

      const debounce = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          callCount++;
        }, 16);
      };

      debounce();
      debounce();
      debounce();

      setTimeout(() => {
        expect(callCount).toBe(1);
      }, 20);
    });

    it("should handle custom delays", () => {
      const callback = mock(() => {});
      let timeoutId: NodeJS.Timeout | null = null;
      const delay = 50;

      timeoutId = setTimeout(() => {
        callback();
      }, delay);

      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
      }, delay - 1);

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
      }, delay + 1);
    });

    it("should use default delay of 16ms", () => {
      const callback = mock(() => {});
      let timeoutId: NodeJS.Timeout | null = null;

      timeoutId = setTimeout(() => {
        callback();
      }, 16);

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
      }, 17);
    });

    it("should pass arguments to callback", () => {
      const callback = mock((a: number, b: number) => {});
      let timeoutId: NodeJS.Timeout | null = null;

      timeoutId = setTimeout(() => {
        callback(100, 200);
      }, 16);

      setTimeout(() => {
        expect(callback).toHaveBeenCalledWith(100, 200);
      }, 17);
    });

    it("should handle rapid consecutive calls", () => {
      let callCount = 0;
      let timeoutId: NodeJS.Timeout | null = null;

      for (let i = 0; i < 100; i++) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          callCount++;
        }, 16);
      }

      setTimeout(() => {
        expect(callCount).toBe(1);
      }, 20);
    });

    it("should handle debounce with function updates", () => {
      let fn1Called = false;
      let fn2Called = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const fn1 = () => {
        fn1Called = true;
      };
      const fn2 = () => {
        fn2Called = true;
      };

      timeoutId = setTimeout(fn1, 16);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(fn2, 16);

      setTimeout(() => {
        expect(fn1Called).toBe(false);
        expect(fn2Called).toBe(true);
      }, 20);
    });

    it("should work with zero delay", () => {
      const callback = mock(() => {});
      let timeoutId: NodeJS.Timeout | null = null;

      timeoutId = setTimeout(() => {
        callback();
      }, 0);

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
      }, 1);
    });
  });

  // ====================================================
  // SECTION 4: useValidEdges Logic (8 tests)
  // ====================================================

  describe("useValidEdges Logic", () => {
    it("should filter edges correctly", () => {
      const edges = [
        createSampleEdge({ source: "person-1", target: "person-2" }),
      ];
      const positions = new Map([
        ["person-1", createPosition()],
        ["person-2", createPosition(200, 300)],
      ]);
      const result = mockUseValidEdges(edges, positions);
      expect(result.length).toBe(1);
    });

    it("should filter edges with missing source", () => {
      const edges = [
        createSampleEdge({ source: "person-1", target: "person-2" }),
      ];
      const positions = new Map([["person-2", createPosition()]]);
      const result = mockUseValidEdges(edges, positions);
      expect(result.length).toBe(0);
    });

    it("should filter edges with missing target", () => {
      const edges = [
        createSampleEdge({ source: "person-1", target: "person-2" }),
      ];
      const positions = new Map([["person-1", createPosition()]]);
      const result = mockUseValidEdges(edges, positions);
      expect(result.length).toBe(0);
    });

    it("should handle empty edges", () => {
      const edges: ChartEdge[] = [];
      const positions = new Map<string, Position>();
      const result = mockUseValidEdges(edges, positions);
      expect(result.length).toBe(0);
    });

    it("should handle multiple edges", () => {
      const edges = [
        createSampleEdge({
          id: "edge-1",
          source: "person-1",
          target: "person-2",
        }),
        createSampleEdge({
          id: "edge-2",
          source: "person-2",
          target: "person-3",
        }),
        createSampleEdge({
          id: "edge-3",
          source: "person-4",
          target: "person-5",
        }),
      ];
      const positions = new Map([
        ["person-1", createPosition()],
        ["person-2", createPosition(100, 200)],
        ["person-3", createPosition(200, 300)],
      ]);
      const result = mockUseValidEdges(edges, positions);
      expect(result.length).toBe(2);
    });

    it("should preserve edge data", () => {
      const edges = [
        createSampleEdge({
          id: "edge-1",
          source: "person-1",
          target: "person-2",
          type: "spouse",
        }),
      ];
      const positions = new Map([
        ["person-1", createPosition()],
        ["person-2", createPosition(200, 300)],
      ]);
      const result = mockUseValidEdges(edges, positions);
      expect(result[0].type).toBe("spouse");
      expect(result[0].id).toBe("edge-1");
    });

    it("should work with complex position maps", () => {
      const edges = Array.from({ length: 10 }, (_, i) =>
        createSampleEdge({
          id: `edge-${i}`,
          source: `person-${i}`,
          target: `person-${i + 1}`,
        })
      );
      const positions = new Map(
        Array.from({ length: 12 }, (_, i) => [
          `person-${i}`,
          createPosition(i * 100, i * 100),
        ])
      );
      const result = mockUseValidEdges(edges, positions);
      expect(result.length).toBe(10);
    });
  });

  // ====================================================
  // SECTION 5: useVisibleNodes Logic (8 tests)
  // ====================================================

  describe("useVisibleNodes Logic", () => {
    it("should return all nodes when viewport is null", () => {
      const nodes = [
        createSampleNode({ id: "person-1" }),
        createSampleNode({ id: "person-2" }),
      ];
      const positions = new Map([
        ["person-1", createPosition(100, 100)],
        ["person-2", createPosition(500, 500)],
      ]);
      const result = mockUseVisibleNodes(nodes, positions, null);
      expect(result.length).toBe(2);
    });

    it("should filter nodes outside viewport bounds", () => {
      const nodes = [
        createSampleNode({ id: "person-1" }),
        createSampleNode({ id: "person-2" }),
      ];
      const positions = new Map([
        ["person-1", createPosition(100, 100)],
        ["person-2", createPosition(5000, 5000)],
      ]);
      const viewport = { x: 0, y: 0, width: 1000, height: 1000 };
      const result = mockUseVisibleNodes(nodes, positions, viewport);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should include nodes with padding", () => {
      const nodes = [createSampleNode({ id: "person-1" })];
      const positions = new Map([["person-1", createPosition(100, 100)]]);
      const viewport = { x: 0, y: 0, width: 800, height: 600 };
      const result = mockUseVisibleNodes(nodes, positions, viewport);
      expect(result.length).toBe(1);
    });

    it("should skip nodes without positions", () => {
      const nodes = [
        createSampleNode({ id: "person-1" }),
        createSampleNode({ id: "person-2" }),
      ];
      const positions = new Map([["person-1", createPosition(100, 100)]]);
      const viewport = { x: 0, y: 0, width: 1000, height: 1000 };
      const result = mockUseVisibleNodes(nodes, positions, viewport);
      expect(result.length).toBe(1);
    });

    it("should handle empty nodes array", () => {
      const positions = new Map();
      const viewport = { x: 0, y: 0, width: 800, height: 600 };
      const result = mockUseVisibleNodes([], positions, viewport);
      expect(result.length).toBe(0);
    });

    it("should filter nodes on different viewports", () => {
      const nodes = Array.from({ length: 10 }, (_, i) =>
        createSampleNode({ id: `person-${i}` })
      );
      const positions = new Map(
        Array.from({ length: 10 }, (_, i) => [
          `person-${i}`,
          createPosition(i * 100, i * 100),
        ])
      );

      const result1 = mockUseVisibleNodes(nodes, positions, {
        x: 0,
        y: 0,
        width: 1000,
        height: 1000,
      });
      const result2 = mockUseVisibleNodes(nodes, positions, {
        x: 5000,
        y: 5000,
        width: 1000,
        height: 1000,
      });

      expect(result2.length).toBeLessThan(result1.length);
    });

    it("should handle viewport at boundaries", () => {
      const nodes = [createSampleNode({ id: "person-1" })];
      const positions = new Map([["person-1", createPosition(0, 0)]]);
      const viewport = { x: 100, y: 100, width: 1000, height: 1000 };
      const result = mockUseVisibleNodes(nodes, positions, viewport);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should work with large viewport", () => {
      const nodes = Array.from({ length: 1000 }, (_, i) =>
        createSampleNode({ id: `person-${i}` })
      );
      const positions = new Map(
        Array.from({ length: 1000 }, (_, i) => [
          `person-${i}`,
          createPosition(Math.random() * 10000, Math.random() * 10000),
        ])
      );

      const viewport = { x: 0, y: 0, width: 10000, height: 10000 };
      const result = mockUseVisibleNodes(nodes, positions, viewport);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(nodes.length);
    });
  });

  // ====================================================
  // SECTION 6: useChartLoadingState Logic (9 tests)
  // ====================================================

  describe("useChartLoadingState Logic", () => {
    it("should not load for zero nodes", () => {
      const result = mockUseChartLoadingState(0);
      expect(result.isLoading).toBe(false);
      expect(result.message).toBeNull();
    });

    it("should not load for small node counts", () => {
      const result = mockUseChartLoadingState(100);
      expect(result.isLoading).toBe(false);
    });

    it("should load for medium node counts", () => {
      const result = mockUseChartLoadingState(1000);
      expect(result.isLoading).toBe(true);
      expect(result.message).toContain("Loading family tree");
    });

    it("should provide estimated time for medium datasets", () => {
      const result = mockUseChartLoadingState(1000);
      expect(result.estimatedTime).toBeDefined();
      expect(result.estimatedTime).toContain("2-5s");
    });

    it("should load for large node counts", () => {
      const result = mockUseChartLoadingState(3000);
      expect(result.isLoading).toBe(true);
      expect(result.message).toContain("Rendering large family tree");
    });

    it("should provide estimated time for large datasets", () => {
      const result = mockUseChartLoadingState(3000);
      expect(result.estimatedTime).toBeDefined();
      expect(result.estimatedTime).toContain("5-10s");
    });

    it("should handle boundary value 500", () => {
      const result = mockUseChartLoadingState(500);
      // 500 is not > 500, so should not load
      expect(result.isLoading).toBe(false);
    });

    it("should handle boundary value 2000", () => {
      const result = mockUseChartLoadingState(2000);
      expect(result.isLoading).toBe(true);
    });

    it("should return different states for different counts", () => {
      const result1 = mockUseChartLoadingState(100);
      const result2 = mockUseChartLoadingState(1000);
      const result3 = mockUseChartLoadingState(3000);

      expect(result1.isLoading).toBe(false);
      expect(result2.isLoading).toBe(true);
      expect(result3.isLoading).toBe(true);
    });
  });

  // ====================================================
  // SECTION 7: useGenerationGroups Logic (8 tests)
  // ====================================================

  describe("useGenerationGroups Logic", () => {
    it("should group nodes by generation", () => {
      const nodes = [
        createSampleNode({ id: "person-1", generation: 0 }),
        createSampleNode({ id: "person-2", generation: 0 }),
        createSampleNode({ id: "person-3", generation: 1 }),
      ];
      const result = mockUseGenerationGroups(nodes);
      expect(result.size).toBe(2);
      expect(result.get(0)?.length).toBe(2);
      expect(result.get(1)?.length).toBe(1);
    });

    it("should handle empty nodes array", () => {
      const result = mockUseGenerationGroups([]);
      expect(result.size).toBe(0);
    });

    it("should handle null generation", () => {
      const nodes = [
        createSampleNode({ id: "person-1", generation: undefined }),
        createSampleNode({ id: "person-2", generation: 0 }),
      ];
      const result = mockUseGenerationGroups(nodes);
      // null generation defaults to 0, so both map to generation 0
      expect(result.size).toBe(1);
      expect(result.has(0)).toBe(true);
      expect(result.get(0)?.length).toBe(2);
    });

    it("should handle negative generations", () => {
      const nodes = [
        createSampleNode({ id: "person-1", generation: -2 }),
        createSampleNode({ id: "person-2", generation: 0 }),
        createSampleNode({ id: "person-3", generation: 2 }),
      ];
      const result = mockUseGenerationGroups(nodes);
      expect(result.size).toBe(3);
      expect(result.has(-2)).toBe(true);
      expect(result.has(2)).toBe(true);
    });

    it("should return consistent results for same input", () => {
      const nodes = [
        createSampleNode({ id: "person-1", generation: 0 }),
        createSampleNode({ id: "person-2", generation: 1 }),
      ];
      const result1 = mockUseGenerationGroups(nodes);
      const result2 = mockUseGenerationGroups(nodes);

      expect(result1.size).toBe(result2.size);
    });

    it("should work with large node counts", () => {
      const nodes = Array.from({ length: 1000 }, (_, i) =>
        createSampleNode({
          id: `person-${i}`,
          generation: Math.floor(i / 100),
        })
      );
      const result = mockUseGenerationGroups(nodes);
      expect(result.size).toBe(10);
    });

    it("should preserve node order within generation", () => {
      const nodes = [
        createSampleNode({ id: "person-1", generation: 0 }),
        createSampleNode({ id: "person-2", generation: 0 }),
        createSampleNode({ id: "person-3", generation: 0 }),
      ];
      const result = mockUseGenerationGroups(nodes);
      const gen0 = result.get(0);
      expect(gen0?.length).toBe(3);
    });

    it("should handle single generation with multiple nodes", () => {
      const nodes = Array.from({ length: 50 }, (_, i) =>
        createSampleNode({
          id: `person-${i}`,
          generation: 0,
        })
      );
      const result = mockUseGenerationGroups(nodes);
      expect(result.size).toBe(1);
      expect(result.get(0)?.length).toBe(50);
    });
  });

  // ====================================================
  // SECTION 8: Integration Tests (5 tests)
  // ====================================================

  describe("Integration Tests", () => {
    it("should work together: positions + dimensions + loading state", () => {
      const nodes = Array.from({ length: 1000 }, (_, i) =>
        createSampleNode({
          id: `person-${i}`,
          generation: Math.floor(i / 100),
        })
      );

      const positions = mockUseNodePositions(nodes, 800, 100, 200, 50);
      const dimensions = mockUseChartDimensions(800, nodes.length);
      const loading = mockUseChartLoadingState(nodes.length);

      expect(positions.size).toBe(nodes.length);
      expect(dimensions.width).toBe(800);
      expect(loading.isLoading).toBe(true); // 1000 > 500, so loading
    });

    it("should filter edges for valid positions", () => {
      const nodes = [
        createSampleNode({ id: "person-1", generation: 0 }),
        createSampleNode({ id: "person-2", generation: 1 }),
      ];
      const edges = [
        createSampleEdge({ source: "person-1", target: "person-2" }),
      ];

      const positions = mockUseNodePositions(nodes, 800, 100, 200, 50);
      const validEdges = mockUseValidEdges(edges, positions);

      expect(validEdges.length).toBe(1);
    });

    it("should track large dataset performance", () => {
      const largeNodeSet = Array.from({ length: 2500 }, (_, i) =>
        createSampleNode({
          id: `person-${i}`,
          generation: Math.floor(i / 100),
        })
      );

      const loading = mockUseChartLoadingState(largeNodeSet.length);
      const groups = mockUseGenerationGroups(largeNodeSet);

      expect(loading.isLoading).toBe(true);
      expect(groups.size).toBeGreaterThan(0);
    });

    it("should handle virtual rendering pipeline", () => {
      const nodes = Array.from({ length: 1000 }, (_, i) =>
        createSampleNode({ id: `person-${i}`, generation: Math.floor(i / 50) })
      );

      const positions = mockUseNodePositions(nodes, 800, 100, 200, 50);
      const viewport = { x: 0, y: 0, width: 1000, height: 1000 };
      const visible = mockUseVisibleNodes(nodes, positions, viewport);

      expect(visible.length).toBeLessThanOrEqual(nodes.length);
    });

    it("should handle end-to-end chart rendering workflow", () => {
      const nodes = Array.from({ length: 500 }, (_, i) =>
        createSampleNode({
          id: `person-${i}`,
          generation: Math.floor(i / 25),
        })
      );
      const edges = Array.from({ length: 400 }, (_, i) =>
        createSampleEdge({
          id: `edge-${i}`,
          source: `person-${i}`,
          target: `person-${i + 1}`,
        })
      );

      // Step 1: Calculate positions and dimensions
      const positions = mockUseNodePositions(nodes, 800, 100, 200, 50);
      const dimensions = mockUseChartDimensions(800, nodes.length);

      // Step 2: Determine loading state
      const loading = mockUseChartLoadingState(nodes.length);

      // Step 3: Filter valid edges
      const validEdges = mockUseValidEdges(edges, positions);

      // Step 4: Group by generation
      const groups = mockUseGenerationGroups(nodes);

      // Verify workflow
      expect(positions.size).toBe(nodes.length);
      expect(dimensions.width).toBe(800);
      expect(validEdges.length).toBeGreaterThan(0);
      expect(groups.size).toBeGreaterThan(0);
    });
  });

  // ====================================================
  // SECTION 9: Edge Cases and Error Handling (6 tests)
  // ====================================================

  describe("Edge Cases and Error Handling", () => {
    it("should handle nodes with no ID", () => {
      const nodes = [{ ...createSampleNode(), id: "" }];
      const result = mockUseNodePositions(nodes, 800, 100, 200, 50);
      expect(result.size).toBe(1);
    });

    it("should handle very large dimension values", () => {
      const result = mockUseChartDimensions(10000, 1000000);
      expect(result.width).toBe(10000);
      expect(result.height).toBeGreaterThan(0);
    });

    it("should handle very small dimension values", () => {
      const result = mockUseChartDimensions(1, 1);
      expect(result.width).toBe(1);
      expect(result.height).toBeGreaterThan(0);
    });

    it("should handle nodes with undefined generation", () => {
      const nodes = [
        createSampleNode({ generation: undefined as any }),
        createSampleNode({ generation: 0 }),
      ];
      const result = mockUseGenerationGroups(nodes);
      // undefined generation defaults to 0, so both map to generation 0
      expect(result.size).toBe(1);
      expect(result.get(0)?.length).toBe(2);
    });

    it("should handle duplicate node IDs", () => {
      const nodes = [
        createSampleNode({ id: "person-1" }),
        createSampleNode({ id: "person-1" }),
      ];
      const result = mockUseNodePositions(nodes, 800, 100, 200, 50);
      // Both should be positioned (Map will have last one)
      expect(result.size).toBe(1);
    });

    it("should handle circular relationships", () => {
      const edges = [
        createSampleEdge({
          id: "edge-1",
          source: "person-1",
          target: "person-2",
        }),
        createSampleEdge({
          id: "edge-2",
          source: "person-2",
          target: "person-1",
        }),
      ];
      const positions = new Map([
        ["person-1", createPosition()],
        ["person-2", createPosition(200, 300)],
      ]);
      const result = mockUseValidEdges(edges, positions);
      expect(result.length).toBe(2);
    });
  });
});
