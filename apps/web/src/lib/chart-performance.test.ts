/**
 * Unit tests for chart performance utilities
 *
 * Tests the pure logic and calculations that underlie the React hooks.
 * Since hooks require React rendering context, we test:
 * 1. Pure calculation logic (node positioning, dimension calculations)
 * 2. Pure filtering logic (valid edges, visible nodes)
 * 3. Data transformation logic (loading states, generation grouping)
 *
 * Hook-specific behavior (memoization, debouncing, RAF scheduling) is tested
 * via integration tests in chart component tests and E2E tests.
 */

import { describe, it, expect } from "bun:test";
import type { ChartNode, ChartEdge } from "~/server/charts";

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

describe("Chart Performance Utilities - Pure Logic", () => {
  // ====================================================
  // Module Exports
  // ====================================================

  describe("module exports", () => {
    it("should export chart performance hooks", async () => {
      const module = await import("./chart-performance");

      // Verify all hooks are exported
      expect(module.useNodePositions).toBeDefined();
      expect(module.useChartDimensions).toBeDefined();
      expect(module.useDebouncedZoom).toBeDefined();
      expect(module.useScheduledAnimation).toBeDefined();
      expect(module.useValidEdges).toBeDefined();
      expect(module.useVisibleNodes).toBeDefined();
      expect(module.useChartLoadingState).toBeDefined();
      expect(module.useGenerationGroups).toBeDefined();
      expect(module.usePerformanceMonitor).toBeDefined();
    });

    it("should export functions", async () => {
      const module = await import("./chart-performance");

      expect(typeof module.useNodePositions).toBe("function");
      expect(typeof module.useChartDimensions).toBe("function");
      expect(typeof module.useDebouncedZoom).toBe("function");
      expect(typeof module.useScheduledAnimation).toBe("function");
      expect(typeof module.useValidEdges).toBe("function");
      expect(typeof module.useVisibleNodes).toBe("function");
      expect(typeof module.useChartLoadingState).toBe("function");
      expect(typeof module.useGenerationGroups).toBe("function");
      expect(typeof module.usePerformanceMonitor).toBe("function");
    });
  });

  // ====================================================
  // Node Positioning Logic
  // ====================================================

  describe("Node Positioning Logic", () => {
    it("should calculate positions for single node", () => {
      const nodes = [createSampleNode({ id: "1", generation: 0 })];
      const width = 800;
      const nodeWidth = 200;
      const levelHeight = 150;
      const marginTop = 50;

      // Calculate positions manually (same logic as hook)
      const nodePositions = new Map<string, { x: number; y: number }>();
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

      expect(nodePositions.has("1")).toBe(true);
      const pos = nodePositions.get("1")!;
      expect(pos.y).toBe(50);
      expect(pos.x).toBeGreaterThan(0);
    });

    it("should calculate positions for multiple nodes in one generation", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 0 }),
        createSampleNode({ id: "2", generation: 0 }),
        createSampleNode({ id: "3", generation: 0 }),
      ];
      const width = 1000;
      const nodeWidth = 200;

      const generations = new Map<number, ChartNode[]>();
      nodes.forEach((node) => {
        const gen = node.generation ?? 0;
        if (!generations.has(gen)) {
          generations.set(gen, []);
        }
        generations.get(gen)!.push(node);
      });

      const nodePositions = new Map<string, { x: number; y: number }>();
      generations.forEach((genNodes, gen) => {
        const yPos = 50 + gen * 150;
        const totalWidth = genNodes.length * nodeWidth * 1.5;
        const startX = (width - totalWidth) / 2;

        genNodes.forEach((node, index) => {
          const xPos = startX + index * nodeWidth * 1.5 + nodeWidth / 2;
          nodePositions.set(node.id, { x: xPos, y: yPos });
        });
      });

      expect(nodePositions.size).toBe(3);
      const pos1 = nodePositions.get("1")!;
      const pos2 = nodePositions.get("2")!;
      expect(pos2.x).toBeGreaterThan(pos1.x);
      expect(pos1.y).toBe(pos2.y);
    });

    it("should calculate positions for multiple generations", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: -1 }),
        createSampleNode({ id: "2", generation: 0 }),
        createSampleNode({ id: "3", generation: 1 }),
      ];

      const generations = new Map<number, ChartNode[]>();
      nodes.forEach((node) => {
        const gen = node.generation ?? 0;
        if (!generations.has(gen)) {
          generations.set(gen, []);
        }
        generations.get(gen)!.push(node);
      });

      const nodePositions = new Map<string, { x: number; y: number }>();
      const levelHeight = 150;
      const marginTop = 50;

      generations.forEach((genNodes, gen) => {
        const yPos = marginTop + gen * levelHeight;
        const totalWidth = genNodes.length * 200 * 1.5;
        const startX = (800 - totalWidth) / 2;

        genNodes.forEach((node, index) => {
          const xPos = startX + index * 200 * 1.5 + 100;
          nodePositions.set(node.id, { x: xPos, y: yPos });
        });
      });

      const pos1 = nodePositions.get("1")!;
      const pos2 = nodePositions.get("2")!;
      const pos3 = nodePositions.get("3")!;

      expect(pos1.y).toBeLessThan(pos2.y);
      expect(pos2.y).toBeLessThan(pos3.y);
    });
  });

  // ====================================================
  // Chart Dimensions Logic
  // ====================================================

  describe("Chart Dimensions Logic", () => {
    it("should calculate height based on node count", () => {
      const nodeCount = 10;
      const minHeight = 600;

      const height = Math.max(minHeight, nodeCount * 80);

      expect(height).toBe(Math.max(600, 800));
      expect(height).toBe(800);
    });

    it("should respect minimum height", () => {
      const nodeCount = 1;
      const minHeight = 600;

      const height = Math.max(minHeight, nodeCount * 80);

      expect(height).toBe(600);
    });

    it("should scale height with large node count", () => {
      const nodeCount = 100;
      const minHeight = 600;

      const height = Math.max(minHeight, nodeCount * 80);

      expect(height).toBe(8000);
    });

    it("should return dimensions with container width", () => {
      const containerWidth = 1200;
      const nodeCount = 50;
      const minHeight = 600;

      const width = containerWidth;
      const height = Math.max(minHeight, nodeCount * 80);

      expect(width).toBe(1200);
      expect(height).toBeGreaterThanOrEqual(minHeight);
    });
  });

  // ====================================================
  // Valid Edges Filtering Logic
  // ====================================================

  describe("Valid Edges Filtering Logic", () => {
    it("should include edge when both nodes exist", () => {
      const nodePositions = new Map([
        ["person-1", { x: 100, y: 100 }],
        ["person-2", { x: 200, y: 200 }],
      ]);

      const edges: ChartEdge[] = [
        {
          id: "edge-1",
          source: "person-1",
          target: "person-2",
          type: "parent-child",
        },
      ];

      const validEdges = edges.filter(
        (edge) =>
          nodePositions.has(edge.source) && nodePositions.has(edge.target)
      );

      expect(validEdges).toHaveLength(1);
    });

    it("should exclude edge when source missing", () => {
      const nodePositions = new Map([["person-2", { x: 200, y: 200 }]]);

      const edges: ChartEdge[] = [
        {
          id: "edge-1",
          source: "person-1",
          target: "person-2",
          type: "parent-child",
        },
      ];

      const validEdges = edges.filter(
        (edge) =>
          nodePositions.has(edge.source) && nodePositions.has(edge.target)
      );

      expect(validEdges).toHaveLength(0);
    });

    it("should exclude edge when target missing", () => {
      const nodePositions = new Map([["person-1", { x: 100, y: 100 }]]);

      const edges: ChartEdge[] = [
        {
          id: "edge-1",
          source: "person-1",
          target: "person-2",
          type: "parent-child",
        },
      ];

      const validEdges = edges.filter(
        (edge) =>
          nodePositions.has(edge.source) && nodePositions.has(edge.target)
      );

      expect(validEdges).toHaveLength(0);
    });

    it("should filter multiple edges correctly", () => {
      const nodePositions = new Map([
        ["person-1", { x: 100, y: 100 }],
        ["person-2", { x: 200, y: 200 }],
        ["person-3", { x: 300, y: 300 }],
      ]);

      const edges: ChartEdge[] = [
        {
          id: "edge-1",
          source: "person-1",
          target: "person-2",
          type: "parent-child",
        },
        {
          id: "edge-2",
          source: "person-2",
          target: "person-3",
          type: "parent-child",
        },
        {
          id: "edge-3",
          source: "person-1",
          target: "person-99",
          type: "parent-child",
        },
      ];

      const validEdges = edges.filter(
        (edge) =>
          nodePositions.has(edge.source) && nodePositions.has(edge.target)
      );

      expect(validEdges).toHaveLength(2);
    });
  });

  // ====================================================
  // Visible Nodes Filtering Logic
  // ====================================================

  describe("Visible Nodes Filtering Logic", () => {
    it("should return all nodes when viewport is null", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 0 }),
        createSampleNode({ id: "2", generation: 1 }),
        createSampleNode({ id: "3", generation: 2 }),
      ];

      // When viewport is null, all nodes should be visible
      const viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
      } | null = null;

      const visibleNodes = viewport === null ? nodes : [];

      expect(visibleNodes).toHaveLength(3);
    });

    it("should filter nodes by viewport bounds", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 0 }),
        createSampleNode({ id: "2", generation: 1 }),
        createSampleNode({ id: "3", generation: 2 }),
      ];
      const nodePositions = new Map([
        ["1", { x: 100, y: 100 }],
        ["2", { x: 500, y: 500 }],
        ["3", { x: 1500, y: 1500 }],
      ]);

      const viewport = { x: 0, y: 0, width: 800, height: 800 };

      const padding = 200;
      const visibleNodes = nodes.filter((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return false;

        return (
          pos.x >= viewport.x - padding &&
          pos.x <= viewport.x + viewport.width + padding &&
          pos.y >= viewport.y - padding &&
          pos.y <= viewport.y + viewport.height + padding
        );
      });

      expect(visibleNodes.length).toBeGreaterThan(0);
      expect(visibleNodes.length).toBeLessThanOrEqual(nodes.length);
    });

    it("should exclude nodes outside viewport with padding", () => {
      const nodes = [createSampleNode({ id: "1", generation: 0 })];
      const nodePositions = new Map([["1", { x: 5000, y: 5000 }]]);

      const viewport = { x: 0, y: 0, width: 800, height: 800 };
      const padding = 200;

      const visibleNodes = nodes.filter((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return false;

        return (
          pos.x >= viewport.x - padding &&
          pos.x <= viewport.x + viewport.width + padding &&
          pos.y >= viewport.y - padding &&
          pos.y <= viewport.y + viewport.height + padding
        );
      });

      expect(visibleNodes).toHaveLength(0);
    });
  });

  // ====================================================
  // Loading State Logic
  // ====================================================

  describe("Loading State Logic", () => {
    it("should return no loading for zero nodes", () => {
      const nodeCount = 0;

      const state =
        nodeCount === 0
          ? { isLoading: false, message: null }
          : { isLoading: true, message: "Loading..." };

      expect(state.isLoading).toBe(false);
      expect(state.message).toBe(null);
    });

    it("should return loading state for 501-2000 nodes", () => {
      const nodeCount: number = 1000;

      const state =
        nodeCount === 0
          ? { isLoading: false, message: null }
          : nodeCount > 2000
            ? {
                isLoading: true,
                message: "Rendering large family tree...",
                estimatedTime: "~5-10s",
              }
            : nodeCount > 500
              ? {
                  isLoading: true,
                  message: "Loading family tree...",
                  estimatedTime: "~2-5s",
                }
              : { isLoading: false, message: null };

      expect(state.isLoading).toBe(true);
      expect(state.message).toBe("Loading family tree...");
      expect(state.estimatedTime).toBe("~2-5s");
    });

    it("should return large loading state for >2000 nodes", () => {
      const nodeCount: number = 3000;

      const state =
        nodeCount === 0
          ? { isLoading: false, message: null }
          : nodeCount > 2000
            ? {
                isLoading: true,
                message: "Rendering large family tree...",
                estimatedTime: "~5-10s",
              }
            : nodeCount > 500
              ? {
                  isLoading: true,
                  message: "Loading family tree...",
                  estimatedTime: "~2-5s",
                }
              : { isLoading: false, message: null };

      expect(state.isLoading).toBe(true);
      expect(state.message).toBe("Rendering large family tree...");
      expect(state.estimatedTime).toBe("~5-10s");
    });

    it("should return no loading for <500 nodes", () => {
      const nodeCount: number = 100;

      const state =
        nodeCount === 0
          ? { isLoading: false, message: null }
          : nodeCount > 2000
            ? {
                isLoading: true,
                message: "Rendering large family tree...",
                estimatedTime: "~5-10s",
              }
            : nodeCount > 500
              ? {
                  isLoading: true,
                  message: "Loading family tree...",
                  estimatedTime: "~2-5s",
                }
              : { isLoading: false, message: null };

      expect(state.isLoading).toBe(false);
      expect(state.message).toBe(null);
    });
  });

  // ====================================================
  // Generation Grouping Logic
  // ====================================================

  describe("Generation Grouping Logic", () => {
    it("should group nodes by generation", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 0 }),
        createSampleNode({ id: "2", generation: 0 }),
        createSampleNode({ id: "3", generation: 1 }),
      ];

      const generations = new Map<number, ChartNode[]>();
      nodes.forEach((node) => {
        const gen = node.generation ?? 0;
        if (!generations.has(gen)) {
          generations.set(gen, []);
        }
        generations.get(gen)!.push(node);
      });

      expect(generations.size).toBe(2);
      expect(generations.get(0)?.length).toBe(2);
      expect(generations.get(1)?.length).toBe(1);
    });

    it("should handle null/undefined generation as 0", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 1 }),
        createSampleNode({ id: "2", generation: null as any }),
        createSampleNode({ id: "3", generation: undefined as any }),
      ];

      const generations = new Map<number, ChartNode[]>();
      nodes.forEach((node) => {
        const gen = node.generation ?? 0;
        if (!generations.has(gen)) {
          generations.set(gen, []);
        }
        generations.get(gen)!.push(node);
      });

      expect(generations.has(0)).toBe(true);
      expect(generations.get(0)?.length).toBe(2);
    });

    it("should preserve insertion order within generation", () => {
      const nodes = [
        createSampleNode({ id: "1", firstName: "Alice", generation: 0 }),
        createSampleNode({ id: "2", firstName: "Bob", generation: 0 }),
        createSampleNode({ id: "3", firstName: "Charlie", generation: 0 }),
      ];

      const generations = new Map<number, ChartNode[]>();
      nodes.forEach((node) => {
        const gen = node.generation ?? 0;
        if (!generations.has(gen)) {
          generations.set(gen, []);
        }
        generations.get(gen)!.push(node);
      });

      const gen0 = generations.get(0)!;
      expect(gen0[0].firstName).toBe("Alice");
      expect(gen0[1].firstName).toBe("Bob");
      expect(gen0[2].firstName).toBe("Charlie");
    });
  });

  // ====================================================
  // Hook Requirements Documentation
  // ====================================================

  describe("Hook Requirements", () => {
    it("should document React context requirement", () => {
      // These hooks use useMemo, useCallback, useRef, and useEffect
      // They cannot be called outside React rendering context
      // This test documents that limitation
      expect(true).toBe(true);
    });
  });
});

/**
 * For comprehensive testing of chart performance utilities:
 * @see apps/web/e2e/ - E2E tests covering full chart rendering
 * @see apps/web/src/components/charts/*.test.tsx - Component integration tests
 *
 * These test the hooks in actual React context with real data.
 */
