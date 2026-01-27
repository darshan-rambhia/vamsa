/**
 * Unit tests for chart performance utilities
 *
 * Tests cover:
 * - calculateNodePositions: Node position calculation by generation
 * - calculateChartDimensions: Chart dimension calculation
 * - filterVisibleNodes: Viewport visibility filtering
 * - getLoadingState: Loading state determination
 * - filterValidEdges: Edge validation
 */

import { describe, it, expect } from "bun:test";
import {
  calculateNodePositions,
  calculateChartDimensions,
  filterVisibleNodes,
  getLoadingState,
  filterValidEdges,
  type GenerationNode,
} from "./performance-utils";

describe("Chart Performance Utilities", () => {
  describe("calculateNodePositions", () => {
    it("should calculate positions for nodes in single generation", () => {
      const nodes: GenerationNode[] = [
        { id: "node-1", generation: 0 },
        { id: "node-2", generation: 0 },
      ];

      const positions = calculateNodePositions(nodes, 800, 160, 100, 40);

      expect(positions.size).toBe(2);
      expect(positions.has("node-1")).toBe(true);
      expect(positions.has("node-2")).toBe(true);

      // Both should be at same y position (generation 0)
      expect(positions.get("node-1")!.y).toBe(40); // marginTop
      expect(positions.get("node-2")!.y).toBe(40);
    });

    it("should calculate positions for nodes across multiple generations", () => {
      const nodes: GenerationNode[] = [
        { id: "parent", generation: 0 },
        { id: "child-1", generation: 1 },
        { id: "child-2", generation: 1 },
      ];

      const positions = calculateNodePositions(nodes, 800, 160, 100, 40);

      expect(positions.size).toBe(3);

      // Parent at generation 0
      expect(positions.get("parent")!.y).toBe(40);

      // Children at generation 1
      expect(positions.get("child-1")!.y).toBe(140); // 40 + 1*100
      expect(positions.get("child-2")!.y).toBe(140);
    });

    it("should center nodes horizontally", () => {
      const nodes: GenerationNode[] = [{ id: "single", generation: 0 }];

      const positions = calculateNodePositions(nodes, 800, 160, 100, 40);

      // Single node should be roughly centered
      const pos = positions.get("single")!;
      expect(pos.x).toBeGreaterThan(300);
      expect(pos.x).toBeLessThan(500);
    });

    it("should handle nodes with null generation", () => {
      const nodes: GenerationNode[] = [
        { id: "node-1", generation: null },
        { id: "node-2", generation: undefined },
      ];

      const positions = calculateNodePositions(nodes, 800, 160, 100, 40);

      // Both should default to generation 0
      expect(positions.get("node-1")!.y).toBe(40);
      expect(positions.get("node-2")!.y).toBe(40);
    });

    it("should return empty map for empty nodes array", () => {
      const positions = calculateNodePositions([], 800, 160, 100, 40);

      expect(positions.size).toBe(0);
    });

    it("should space nodes appropriately within generation", () => {
      const nodes: GenerationNode[] = [
        { id: "node-1", generation: 0 },
        { id: "node-2", generation: 0 },
        { id: "node-3", generation: 0 },
      ];

      const positions = calculateNodePositions(nodes, 800, 160, 100, 40);

      const x1 = positions.get("node-1")!.x;
      const x2 = positions.get("node-2")!.x;
      const x3 = positions.get("node-3")!.x;

      // Nodes should be evenly spaced
      const gap1 = x2 - x1;
      const gap2 = x3 - x2;
      expect(Math.abs(gap1 - gap2)).toBeLessThan(1); // Allow floating point tolerance
    });
  });

  describe("calculateChartDimensions", () => {
    it("should use minHeight when node count is low", () => {
      const dims = calculateChartDimensions(800, 5, 600);

      expect(dims.width).toBe(800);
      expect(dims.height).toBe(600);
    });

    it("should scale height based on node count", () => {
      const dims = calculateChartDimensions(800, 100, 600);

      expect(dims.width).toBe(800);
      expect(dims.height).toBe(8000); // 100 * 80
    });

    it("should use default minHeight of 600", () => {
      const dims = calculateChartDimensions(800, 5);

      expect(dims.height).toBe(600);
    });

    it("should handle zero nodes", () => {
      const dims = calculateChartDimensions(800, 0, 600);

      expect(dims.height).toBe(600);
    });
  });

  describe("filterVisibleNodes", () => {
    it("should return all nodes when viewport is null", () => {
      const nodes = [{ id: "node-1" }, { id: "node-2" }, { id: "node-3" }];
      const positions = new Map([
        ["node-1", { x: 100, y: 100 }],
        ["node-2", { x: 500, y: 500 }],
        ["node-3", { x: 1000, y: 1000 }],
      ]);

      const visible = filterVisibleNodes(nodes, positions, null);

      expect(visible).toHaveLength(3);
    });

    it("should filter nodes within viewport", () => {
      const nodes = [{ id: "node-1" }, { id: "node-2" }, { id: "node-3" }];
      const positions = new Map([
        ["node-1", { x: 100, y: 100 }],
        ["node-2", { x: 500, y: 500 }],
        ["node-3", { x: 2000, y: 2000 }],
      ]);

      const visible = filterVisibleNodes(nodes, positions, {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });

      // node-1 and node-2 within viewport, node-3 outside
      expect(visible).toHaveLength(2);
      expect(visible.find((n) => n.id === "node-1")).toBeDefined();
      expect(visible.find((n) => n.id === "node-2")).toBeDefined();
      expect(visible.find((n) => n.id === "node-3")).toBeUndefined();
    });

    it("should include nodes within padding distance", () => {
      const nodes = [{ id: "node-1" }];
      const positions = new Map([["node-1", { x: 900, y: 100 }]]);

      // Viewport ends at x=800, but with 200 padding, x=900 should be included
      const visible = filterVisibleNodes(
        nodes,
        positions,
        { x: 0, y: 0, width: 800, height: 600 },
        200
      );

      expect(visible).toHaveLength(1);
    });

    it("should exclude nodes beyond padding distance", () => {
      const nodes = [{ id: "node-1" }];
      const positions = new Map([["node-1", { x: 1100, y: 100 }]]);

      // Viewport ends at x=800, with 200 padding only x<=1000 is included
      const visible = filterVisibleNodes(
        nodes,
        positions,
        { x: 0, y: 0, width: 800, height: 600 },
        200
      );

      expect(visible).toHaveLength(0);
    });

    it("should exclude nodes without positions", () => {
      const nodes = [{ id: "node-1" }, { id: "node-2" }];
      const positions = new Map([["node-1", { x: 100, y: 100 }]]);

      const visible = filterVisibleNodes(nodes, positions, {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });

      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe("node-1");
    });
  });

  describe("getLoadingState", () => {
    it("should return not loading for zero nodes", () => {
      const state = getLoadingState(0);

      expect(state.isLoading).toBe(false);
      expect(state.message).toBeNull();
    });

    it("should return not loading for small datasets", () => {
      const state = getLoadingState(100);

      expect(state.isLoading).toBe(false);
      expect(state.message).toBeNull();
    });

    it("should return loading for medium datasets (500+)", () => {
      const state = getLoadingState(700);

      expect(state.isLoading).toBe(true);
      expect(state.message).toBe("Loading family tree...");
      expect(state.estimatedTime).toBe("~2-5s");
    });

    it("should return loading for large datasets (2000+)", () => {
      const state = getLoadingState(2500);

      expect(state.isLoading).toBe(true);
      expect(state.message).toBe("Rendering large family tree...");
      expect(state.estimatedTime).toBe("~5-10s");
    });

    it("should return not loading at threshold boundary (500)", () => {
      const state = getLoadingState(500);

      // 500 is not > 500, so should not trigger loading
      expect(state.isLoading).toBe(false);
    });

    it("should return loading just above threshold (501)", () => {
      const state = getLoadingState(501);

      expect(state.isLoading).toBe(true);
    });
  });

  describe("filterValidEdges", () => {
    it("should return edges with both endpoints present", () => {
      const edges = [
        { source: "node-1", target: "node-2" },
        { source: "node-1", target: "node-3" },
      ];
      const positions = new Map([
        ["node-1", { x: 100, y: 100 }],
        ["node-2", { x: 200, y: 100 }],
      ]);

      const valid = filterValidEdges(edges, positions);

      expect(valid).toHaveLength(1);
      expect(valid[0].source).toBe("node-1");
      expect(valid[0].target).toBe("node-2");
    });

    it("should exclude edges with missing source", () => {
      const edges = [{ source: "missing", target: "node-2" }];
      const positions = new Map([["node-2", { x: 200, y: 100 }]]);

      const valid = filterValidEdges(edges, positions);

      expect(valid).toHaveLength(0);
    });

    it("should exclude edges with missing target", () => {
      const edges = [{ source: "node-1", target: "missing" }];
      const positions = new Map([["node-1", { x: 100, y: 100 }]]);

      const valid = filterValidEdges(edges, positions);

      expect(valid).toHaveLength(0);
    });

    it("should return empty array for empty edges", () => {
      const positions = new Map([["node-1", { x: 100, y: 100 }]]);

      const valid = filterValidEdges([], positions);

      expect(valid).toHaveLength(0);
    });

    it("should return empty array for empty positions", () => {
      const edges = [{ source: "node-1", target: "node-2" }];

      const valid = filterValidEdges(edges, new Map());

      expect(valid).toHaveLength(0);
    });
  });
});
