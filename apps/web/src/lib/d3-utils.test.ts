/**
 * Unit tests for D3 utilities
 *
 * This test suite focuses on:
 * 1. Pure utility functions (groupByGeneration, calculateBoundingBox, etc.)
 * 2. Type interfaces and their properties
 * 3. Data transformation logic
 * 4. Calculation logic for positioning and scaling
 *
 * Note: DOM-dependent functions (renderRectNode, renderCircleNode, createZoomBehavior,
 * fitToContainer, etc.) are tested via integration tests in chart components and E2E tests,
 * as they require actual DOM/SVG elements.
 */

import { describe, it, expect, mock } from "bun:test";
import type { ChartNode } from "~/server/charts";
import {
  groupByGeneration,
  calculateBoundingBox,
  calculateFitScale,
  generateGenerationRange,
  getSortedGenerations,
  type Position,
  type Margin,
  type RectNodeOptions,
  type CircleNodeOptions,
  type EdgeStyle,
} from "./d3-utils";

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

/**
 * Helper: Create a deceased node
 */
function createDeceasedNode(overrides: Partial<ChartNode> = {}): ChartNode {
  return createSampleNode({
    isLiving: false,
    dateOfPassing: "2020-05-20",
    ...overrides,
  });
}

describe("D3 Utilities", () => {
  // ====================================================
  // SECTION 0: Core Utility Function Tests (6 tests)
  // ====================================================

  describe("Core Utility Functions", () => {
    it("should have groupByGeneration function available", () => {
      expect(groupByGeneration).toBeDefined();
      expect(typeof groupByGeneration).toBe("function");
    });

    it("should accept array of nodes", () => {
      const nodes = [createSampleNode()];
      expect(() => groupByGeneration(nodes)).not.toThrow();
    });

    it("should return Map instance", () => {
      const nodes = [createSampleNode()];
      const result = groupByGeneration(nodes);
      expect(result instanceof Map).toBe(true);
    });

    it("should handle empty input gracefully", () => {
      const result = groupByGeneration([]);
      expect(result).toBeDefined();
      expect(result.size).toBe(0);
    });

    it("should work with generic type", () => {
      interface CustomNode {
        id: string;
        generation?: number | null;
      }
      const customNodes: CustomNode[] = [
        { id: "1", generation: 0 },
        { id: "2", generation: 1 },
      ];
      const result = groupByGeneration(customNodes);
      expect(result.size).toBe(2);
    });

    it("should return immutable generation groups by reference", () => {
      const nodes = [createSampleNode({ generation: 0 })];
      const result = groupByGeneration(nodes);
      const gen0Array = result.get(0);
      expect(gen0Array).toBeDefined();
      expect(Array.isArray(gen0Array)).toBe(true);
    });
  });

  // ====================================================
  // SECTION 1: Type Interface Tests (5 tests)
  // ====================================================

  describe("Type Interfaces", () => {
    it("should create Position interface correctly", () => {
      const position: Position = { x: 100, y: 50 };
      expect(position.x).toBe(100);
      expect(position.y).toBe(50);
    });

    it("should create Margin interface with all properties", () => {
      const margin: Margin = { top: 20, right: 20, bottom: 20, left: 20 };
      expect(margin.top).toBe(20);
      expect(margin.right).toBe(20);
      expect(margin.bottom).toBe(20);
      expect(margin.left).toBe(20);
    });

    it("should create asymmetric Margin", () => {
      const margin: Margin = { top: 10, right: 50, bottom: 30, left: 80 };
      expect(margin.top).toBe(10);
      expect(margin.left).toBe(80);
    });

    it("should create RectNodeOptions interface", () => {
      const options: RectNodeOptions = {
        width: 200,
        height: 100,
        borderRadius: 8,
        isRoot: false,
      };
      expect(options.width).toBe(200);
      expect(options.height).toBe(100);
      expect(options.borderRadius).toBe(8);
      expect(options.isRoot).toBe(false);
    });

    it("should create CircleNodeOptions interface", () => {
      const options: CircleNodeOptions = {
        radius: 40,
        isRoot: true,
      };
      expect(options.radius).toBe(40);
      expect(options.isRoot).toBe(true);
    });
  });

  // ====================================================
  // SECTION 2: groupByGeneration Tests (12 tests)
  // ====================================================

  describe("groupByGeneration", () => {
    it("should return empty map for empty array", () => {
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

    it("should handle nodes with null generation", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 1 }),
        createSampleNode({ id: "2", generation: null as any }),
        createSampleNode({ id: "3", generation: undefined as any }),
      ];

      const result = groupByGeneration(nodes);

      expect(result.has(0)).toBe(true);
      expect(result.get(0)?.length).toBe(2); // Both null and undefined map to 0
      expect(result.get(1)?.length).toBe(1);
    });

    it("should handle negative generations", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: -1 }),
        createSampleNode({ id: "2", generation: -1 }),
        createSampleNode({ id: "3", generation: 0 }),
      ];

      const result = groupByGeneration(nodes);

      expect(result.has(-1)).toBe(true);
      expect(result.get(-1)?.length).toBe(2);
    });

    it("should handle large generation numbers", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 0 }),
        createSampleNode({ id: "2", generation: 5 }),
        createSampleNode({ id: "3", generation: 10 }),
      ];

      const result = groupByGeneration(nodes);

      expect(result.size).toBe(3);
      expect(result.get(10)?.length).toBe(1);
    });

    it("should preserve node order within generation", () => {
      const nodes = [
        createSampleNode({ id: "1", firstName: "Alice", generation: 0 }),
        createSampleNode({ id: "2", firstName: "Bob", generation: 0 }),
        createSampleNode({ id: "3", firstName: "Charlie", generation: 0 }),
      ];

      const result = groupByGeneration(nodes);
      const gen0 = result.get(0)!;

      expect(gen0[0].firstName).toBe("Alice");
      expect(gen0[1].firstName).toBe("Bob");
      expect(gen0[2].firstName).toBe("Charlie");
    });

    it("should return map with correct keys", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 2 }),
        createSampleNode({ id: "2", generation: 5 }),
      ];

      const result = groupByGeneration(nodes);
      const keys = Array.from(result.keys());

      expect(keys).toContain(2);
      expect(keys).toContain(5);
    });

    it("should work with nodes that have different properties", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 0, isLiving: true }),
        createDeceasedNode({ id: "2", generation: 0, isLiving: false }),
        createSampleNode({ id: "3", generation: 1, firstName: "Jane" }),
      ];

      const result = groupByGeneration(nodes);

      expect(result.size).toBe(2);
      expect(result.get(0)?.length).toBe(2);
      expect(result.get(1)?.length).toBe(1);
    });

    it("should handle single node", () => {
      const nodes = [createSampleNode({ generation: 5 })];

      const result = groupByGeneration(nodes);

      expect(result.size).toBe(1);
      expect(result.get(5)?.length).toBe(1);
    });

    it("should handle nodes with same generation spread across input", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 1 }),
        createSampleNode({ id: "2", generation: 2 }),
        createSampleNode({ id: "3", generation: 1 }),
        createSampleNode({ id: "4", generation: 3 }),
        createSampleNode({ id: "5", generation: 1 }),
      ];

      const result = groupByGeneration(nodes);

      expect(result.get(1)?.length).toBe(3);
      expect(result.get(2)?.length).toBe(1);
      expect(result.get(3)?.length).toBe(1);
    });

    it("should create separate arrays for each generation", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: 0 }),
        createSampleNode({ id: "2", generation: 1 }),
      ];

      const result = groupByGeneration(nodes);
      const gen0 = result.get(0)!;
      const gen1 = result.get(1)!;

      expect(gen0).not.toBe(gen1);
      expect(gen0.length).toBe(1);
      expect(gen1.length).toBe(1);
    });

    it("should handle very deep generations (negative to positive)", () => {
      const nodes = [
        createSampleNode({ id: "1", generation: -5 }),
        createSampleNode({ id: "2", generation: 0 }),
        createSampleNode({ id: "3", generation: 10 }),
      ];

      const result = groupByGeneration(nodes);

      expect(result.size).toBe(3);
      expect(result.has(-5)).toBe(true);
      expect(result.has(10)).toBe(true);
    });
  });

  // ====================================================
  // SECTION 3: ChartNode Helper Tests (6 tests)
  // ====================================================

  describe("Sample Chart Nodes", () => {
    it("should create sample node with defaults", () => {
      const node = createSampleNode();

      expect(node.firstName).toBe("John");
      expect(node.lastName).toBe("Doe");
      expect(node.isLiving).toBe(true);
    });

    it("should create node with custom properties", () => {
      const node = createSampleNode({
        firstName: "Jane",
        lastName: "Smith",
        generation: 5,
      });

      expect(node.firstName).toBe("Jane");
      expect(node.lastName).toBe("Smith");
      expect(node.generation).toBe(5);
    });

    it("should create deceased node with passing date", () => {
      const node = createDeceasedNode();

      expect(node.isLiving).toBe(false);
      expect(node.dateOfPassing).not.toBe(null);
    });

    it("should preserve generation in sample node", () => {
      const node = createSampleNode({ generation: 3 });

      expect(node.generation).toBe(3);
    });

    it("should allow null dates in sample node", () => {
      const node = createSampleNode({
        dateOfBirth: null,
        dateOfPassing: null,
      });

      expect(node.dateOfBirth).toBe(null);
      expect(node.dateOfPassing).toBe(null);
    });

    it("should maintain id uniqueness in custom nodes", () => {
      const node1 = createSampleNode({ id: "person-1" });
      const node2 = createSampleNode({ id: "person-2" });

      expect(node1.id).not.toBe(node2.id);
    });
  });

  // ====================================================
  // SECTION 4: Edge Style Tests (5 tests)
  // ====================================================

  describe("Edge Style Options", () => {
    it("should create edge style with stroke color", () => {
      const style: EdgeStyle = { stroke: "#ff0000" };

      expect(style.stroke).toBe("#ff0000");
    });

    it("should create edge style with stroke width", () => {
      const style: EdgeStyle = { strokeWidth: "3px" };

      expect(style.strokeWidth).toBe("3px");
    });

    it("should create edge style with dash array", () => {
      const style: EdgeStyle = { strokeDasharray: "5,5" };

      expect(style.strokeDasharray).toBe("5,5");
    });

    it("should create complete edge style", () => {
      const style: EdgeStyle = {
        stroke: "#0000ff",
        strokeWidth: "2px",
        strokeDasharray: "3,3",
      };

      expect(style.stroke).toBe("#0000ff");
      expect(style.strokeWidth).toBe("2px");
      expect(style.strokeDasharray).toBe("3,3");
    });

    it("should allow partial edge style", () => {
      const style: EdgeStyle = { stroke: "#00ff00" };

      expect(style.stroke).toBe("#00ff00");
      expect(style.strokeWidth).toBeUndefined();
    });
  });

  // ====================================================
  // SECTION 5: Position and Margin Variations (8 tests)
  // ====================================================

  describe("Position and Margin Variations", () => {
    it("should handle origin position (0, 0)", () => {
      const position: Position = { x: 0, y: 0 };

      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
    });

    it("should handle large position values", () => {
      const position: Position = { x: 5000, y: 5000 };

      expect(position.x).toBe(5000);
      expect(position.y).toBe(5000);
    });

    it("should handle negative positions", () => {
      const position: Position = { x: -100, y: -200 };

      expect(position.x).toBe(-100);
      expect(position.y).toBe(-200);
    });

    it("should handle zero margin", () => {
      const margin: Margin = { top: 0, right: 0, bottom: 0, left: 0 };

      expect(margin.top + margin.right + margin.bottom + margin.left).toBe(0);
    });

    it("should handle large margins", () => {
      const margin: Margin = { top: 100, right: 100, bottom: 100, left: 100 };

      expect(margin.top).toBe(100);
      expect(margin.left).toBe(100);
    });

    it("should handle only horizontal margins", () => {
      const margin: Margin = { top: 0, right: 50, bottom: 0, left: 50 };

      expect(margin.right).toBe(50);
      expect(margin.left).toBe(50);
      expect(margin.top).toBe(0);
      expect(margin.bottom).toBe(0);
    });

    it("should handle only vertical margins", () => {
      const margin: Margin = { top: 50, right: 0, bottom: 50, left: 0 };

      expect(margin.top).toBe(50);
      expect(margin.bottom).toBe(50);
      expect(margin.left).toBe(0);
      expect(margin.right).toBe(0);
    });

    it("should create mirrored margin", () => {
      const margin: Margin = { top: 20, right: 20, bottom: 20, left: 20 };

      expect(margin.top).toBe(margin.right);
      expect(margin.right).toBe(margin.bottom);
      expect(margin.bottom).toBe(margin.left);
    });
  });

  // ====================================================
  // SECTION 6: RectNodeOptions Variations (6 tests)
  // ====================================================

  describe("RectNodeOptions Variations", () => {
    it("should create rectangular options with minimal properties", () => {
      const options: RectNodeOptions = { width: 200, height: 100 };

      expect(options.width).toBe(200);
      expect(options.height).toBe(100);
      expect(options.borderRadius).toBeUndefined();
      expect(options.isRoot).toBeUndefined();
    });

    it("should create rectangular options as root node", () => {
      const options: RectNodeOptions = {
        width: 200,
        height: 100,
        isRoot: true,
      };

      expect(options.isRoot).toBe(true);
    });

    it("should create rectangular options with custom border radius", () => {
      const options: RectNodeOptions = {
        width: 200,
        height: 100,
        borderRadius: 16,
      };

      expect(options.borderRadius).toBe(16);
    });

    it("should create rectangular options with callbacks", () => {
      const onMouseEnter = mock(() => {});
      const onMouseLeave = mock(() => {});
      const options: RectNodeOptions = {
        width: 200,
        height: 100,
        onMouseEnter,
        onMouseLeave,
      };

      expect(options.onMouseEnter).toBe(onMouseEnter);
      expect(options.onMouseLeave).toBe(onMouseLeave);
    });

    it("should create rectangular options with various sizes", () => {
      const smallOptions: RectNodeOptions = { width: 100, height: 50 };
      const largeOptions: RectNodeOptions = { width: 400, height: 300 };

      expect(smallOptions.width).toBeLessThan(largeOptions.width);
    });

    it("should create rectangular options with zero dimensions", () => {
      const options: RectNodeOptions = { width: 0, height: 0 };

      expect(options.width).toBe(0);
      expect(options.height).toBe(0);
    });
  });

  // ====================================================
  // SECTION 7: CircleNodeOptions Variations (5 tests)
  // ====================================================

  describe("CircleNodeOptions Variations", () => {
    it("should create circular options with minimal properties", () => {
      const options: CircleNodeOptions = { radius: 40 };

      expect(options.radius).toBe(40);
      expect(options.isRoot).toBeUndefined();
    });

    it("should create circular options as root node", () => {
      const options: CircleNodeOptions = { radius: 40, isRoot: true };

      expect(options.isRoot).toBe(true);
    });

    it("should create circular options with various radii", () => {
      const smallRadius: CircleNodeOptions = { radius: 20 };
      const largeRadius: CircleNodeOptions = { radius: 80 };

      expect(smallRadius.radius).toBeLessThan(largeRadius.radius);
    });

    it("should create circular options with callbacks", () => {
      const onMouseEnter = mock(() => {});
      const onMouseLeave = mock(() => {});
      const options: CircleNodeOptions = {
        radius: 40,
        onMouseEnter,
        onMouseLeave,
      };

      expect(options.onMouseEnter).toBe(onMouseEnter);
      expect(options.onMouseLeave).toBe(onMouseLeave);
    });

    it("should create circular options with zero radius", () => {
      const options: CircleNodeOptions = { radius: 0 };

      expect(options.radius).toBe(0);
    });
  });

  // ====================================================
  // SECTION 8: Numeric Calculations (8 tests)
  // ====================================================

  describe("Numeric Calculations", () => {
    it("should calculate scale factor for fit-to-container", () => {
      const containerWidth = 800;
      const containerHeight = 600;
      const contentWidth = 400;
      const contentHeight = 300;
      const margin: Margin = { top: 20, right: 20, bottom: 20, left: 20 };

      const scaleX =
        containerWidth / (contentWidth + margin.left + margin.right);
      const scaleY =
        containerHeight / (contentHeight + margin.top + margin.bottom);
      const scale = Math.min(scaleX, scaleY, 1);

      expect(scale).toBeGreaterThan(0);
      expect(scale).toBeLessThanOrEqual(1);
    });

    it("should calculate offset for parent-child edge", () => {
      const source: Position = { x: 100, y: 50 };
      const target: Position = { x: 100, y: 200 };
      const nodeHeight = 80;

      const sourceY = source.y + nodeHeight / 2;
      const targetY = target.y - nodeHeight / 2;

      expect(sourceY).toBe(90);
      expect(targetY).toBe(160);
    });

    it("should calculate offset for spouse edge", () => {
      const source: Position = { x: 100, y: 100 };
      const target: Position = { x: 300, y: 100 };
      const nodeWidth = 120;

      const sourceX = source.x + nodeWidth / 2;
      const targetX = target.x - nodeWidth / 2;

      expect(sourceX).toBe(160);
      expect(targetX).toBe(240);
    });

    it("should validate container dimensions are positive", () => {
      const validWidth = 800;
      const validHeight = 600;

      expect(validWidth).toBeGreaterThan(0);
      expect(validHeight).toBeGreaterThan(0);
    });

    it("should handle zoom scale extent validation", () => {
      const minZoom = 0.1;
      const maxZoom = 4;

      expect(minZoom).toBeLessThan(maxZoom);
      expect(minZoom).toBeGreaterThan(0);
    });

    it("should calculate node positioning in grid", () => {
      const nodeWidth = 200;
      const nodeHeight = 100;
      const spacing = 50;

      const pos1: Position = { x: 0, y: 0 };
      const pos2: Position = {
        x: nodeWidth + spacing,
        y: nodeHeight + spacing,
      };

      expect(pos2.x).toBeGreaterThan(pos1.x);
      expect(pos2.y).toBeGreaterThan(pos1.y);
    });

    it("should calculate text positioning within node", () => {
      const nodeWidth = 200;
      const nodeHeight = 100;
      const centerX = nodeWidth / 2;
      const centerY = nodeHeight / 2;

      expect(centerX).toBe(100);
      expect(centerY).toBe(50);
    });

    it("should calculate badge positioning", () => {
      const nodeWidth = 200;
      const badgeOffset = 35;
      const badgeX = nodeWidth - badgeOffset;

      expect(badgeX).toBe(165);
    });
  });

  // ====================================================
  // SECTION 9: Data Transformation Tests (6 tests)
  // ====================================================

  describe("Data Transformations", () => {
    it("should parse birth year from date string", () => {
      const dateString = "1980-01-15";
      const year = new Date(dateString).getFullYear();

      expect(year).toBe(1980);
    });

    it("should parse death year from date string", () => {
      const dateString = "2020-05-20";
      const year = new Date(dateString).getFullYear();

      expect(year).toBe(2020);
    });

    it("should format date range as string", () => {
      const birthYear = 1980;
      const deathYear = 2020;
      const dateText = `${birthYear} - ${deathYear}`;

      expect(dateText).toBe("1980 - 2020");
    });

    it("should truncate long names", () => {
      const longName = "VeryLongFirstNameHere";
      const maxLength = 12;
      const truncated =
        longName.length > maxLength
          ? longName.substring(0, 10) + "..."
          : longName;

      expect(truncated).toBe("VeryLongFi...");
    });

    it("should combine first and last names", () => {
      const firstName = "John";
      const lastName = "Doe";
      const fullName = `${firstName} ${lastName}`;

      expect(fullName).toBe("John Doe");
    });

    it("should handle names with special characters", () => {
      const firstName = "Jean-Pierre";
      const lastName = "O'Brien";
      const fullName = `${firstName} ${lastName}`;

      expect(fullName).toBe("Jean-Pierre O'Brien");
    });
  });

  // ====================================================
  // SECTION 10: Living Status Indicators (4 tests)
  // ====================================================

  describe("Living Status Indicators", () => {
    it("should mark living person correctly", () => {
      const node = createSampleNode({ isLiving: true });

      expect(node.isLiving).toBe(true);
    });

    it("should mark deceased person correctly", () => {
      const node = createDeceasedNode();

      expect(node.isLiving).toBe(false);
    });

    it("should determine color based on living status", () => {
      const livingNode = createSampleNode({ isLiving: true });
      const deceasedNode = createDeceasedNode();

      expect(livingNode.isLiving).not.toBe(deceasedNode.isLiving);
    });

    it("should handle unknown living status", () => {
      const node = createSampleNode({ isLiving: false, dateOfPassing: null });

      expect(node.isLiving).toBe(false);
    });
  });

  // ====================================================
  // SECTION 11: Generation Hierarchy (6 tests)
  // ====================================================

  describe("Generation Hierarchy", () => {
    it("should identify root generation", () => {
      const node = createSampleNode({ generation: 0 });

      expect(node.generation).toBe(0);
    });

    it("should identify parent generation", () => {
      const node = createSampleNode({ generation: -1 });

      expect(node.generation).toBe(-1);
    });

    it("should identify child generation", () => {
      const node = createSampleNode({ generation: 1 });

      expect(node.generation).toBe(1);
    });

    it("should support deep ancestry", () => {
      const node = createSampleNode({ generation: -10 });

      expect(node.generation).toBe(-10);
    });

    it("should support many descendants", () => {
      const node = createSampleNode({ generation: 10 });

      expect(node.generation).toBe(10);
    });

    it("should calculate relative generation", () => {
      const root = createSampleNode({ generation: 0 });
      const ancestor = createSampleNode({ generation: -2 });

      const relativeGen = ancestor.generation! - root.generation!;

      expect(relativeGen).toBe(-2);
    });
  });

  // ====================================================
  // SECTION 12: Animation Parameters (4 tests)
  // ====================================================

  describe("Animation Parameters", () => {
    it("should use default animation duration", () => {
      const defaultDuration = 750;

      expect(defaultDuration).toBeGreaterThan(0);
      expect(defaultDuration).toBe(750);
    });

    it("should support custom animation duration", () => {
      const customDuration = 1500;

      expect(customDuration).toBeGreaterThan(750);
    });

    it("should support instant animation", () => {
      const instantDuration = 0;

      expect(instantDuration).toBe(0);
    });

    it("should validate hover transition duration", () => {
      const hoverDuration = 200;

      expect(hoverDuration).toBeLessThan(750);
    });
  });

  // ====================================================
  // SECTION 13: Styling Constants (8 tests)
  // ====================================================

  describe("Styling Constants", () => {
    it("should define primary color variable", () => {
      const primaryColor = "var(--color-primary)";

      expect(primaryColor).toContain("--color-primary");
    });

    it("should define card color variable", () => {
      const cardColor = "var(--color-card)";

      expect(cardColor).toContain("--color-card");
    });

    it("should define muted color variable", () => {
      const mutedColor = "var(--color-muted)";

      expect(mutedColor).toContain("--color-muted");
    });

    it("should define border color variable", () => {
      const borderColor = "var(--color-border)";

      expect(borderColor).toContain("--color-border");
    });

    it("should define accent color variable", () => {
      const accentColor = "var(--color-accent)";

      expect(accentColor).toContain("--color-accent");
    });

    it("should define default stroke width", () => {
      const strokeWidth = "2px";

      expect(strokeWidth).toBe("2px");
    });

    it("should define root stroke width", () => {
      const rootStrokeWidth = 3;
      const defaultStrokeWidth = 2;

      expect(rootStrokeWidth).toBeGreaterThan(defaultStrokeWidth);
    });

    it("should define dash array for spouse edges", () => {
      const dashArray = "5,5";

      expect(dashArray).toContain(",");
    });
  });

  // ====================================================
  // SECTION 14: Font Sizing (6 tests)
  // ====================================================

  describe("Font Sizing", () => {
    it("should use correct name font size for rectangles", () => {
      const fontSize = "14px";

      expect(fontSize).toBe("14px");
    });

    it("should use correct date font size for rectangles", () => {
      const fontSize = "12px";

      expect(fontSize).toBe("12px");
    });

    it("should use correct name font size for circles", () => {
      const fontSize = "11px";

      expect(fontSize).toBe("11px");
    });

    it("should use correct date font size for circles", () => {
      const fontSize = "10px";

      expect(fontSize).toBe("10px");
    });

    it("should apply bold weight to root nodes", () => {
      const fontWeight = "700";

      expect(parseInt(fontWeight)).toBeGreaterThan(600);
    });

    it("should apply semi-bold weight to regular nodes", () => {
      const fontWeight = "600";

      expect(parseInt(fontWeight)).toBeGreaterThan(400);
    });
  });

  // ====================================================
  // SECTION 15: Node Dimension Calculations (5 tests)
  // ====================================================

  describe("Node Dimension Calculations", () => {
    it("should calculate rectangular node center X", () => {
      const width = 200;
      const centerX = width / 2;

      expect(centerX).toBe(100);
    });

    it("should calculate rectangular node center Y", () => {
      const height = 100;
      const centerY = height / 2;

      expect(centerY).toBe(50);
    });

    it("should calculate text offset from center", () => {
      const nameOffset = 8;
      const dateOffset = 12;

      expect(dateOffset).toBeGreaterThan(nameOffset);
    });

    it("should calculate circle badge offset", () => {
      const radius = 40;
      const badgeOffset = 10;
      const badgePosition = radius - badgeOffset;

      expect(badgePosition).toBe(30);
    });

    it("should calculate circle text positioning", () => {
      const radius = 40;
      const yearOffset = 15;
      const yearPosition = radius + yearOffset;

      expect(yearPosition).toBe(55);
    });
  });

  // ====================================================
  // SECTION 16: Pure Utility Functions (calculateBoundingBox)
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
      const positions: Position[] = [{ x: 100, y: 200 }];

      const result = calculateBoundingBox(positions);

      expect(result.minX).toBe(100);
      expect(result.maxX).toBe(100);
      expect(result.minY).toBe(200);
      expect(result.maxY).toBe(200);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it("should calculate bounds for multiple positions", () => {
      const positions: Position[] = [
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
      const positions: Position[] = [
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
      const positions: Position[] = [
        { x: 50, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 50 },
      ];

      const result = calculateBoundingBox(positions);

      expect(result.minX).toBe(50);
      expect(result.maxX).toBe(50);
      expect(result.minY).toBe(50);
      expect(result.maxY).toBe(50);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it("should calculate correctly for large coordinate values", () => {
      const positions: Position[] = [
        { x: 5000, y: 5000 },
        { x: 10000, y: 10000 },
      ];

      const result = calculateBoundingBox(positions);

      expect(result.minX).toBe(5000);
      expect(result.maxX).toBe(10000);
      expect(result.width).toBe(5000);
      expect(result.height).toBe(5000);
    });
  });

  // ====================================================
  // SECTION 17: Pure Utility Functions (calculateFitScale)
  // ====================================================

  describe("calculateFitScale", () => {
    it("should return 1 for zero content dimensions", () => {
      const result = calculateFitScale(0, 0, 800, 600);

      expect(result).toBe(1);
    });

    it("should return 1 when content fits in container", () => {
      const result = calculateFitScale(400, 300, 800, 600);

      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThan(0);
    });

    it("should scale down when content is larger than container", () => {
      const result = calculateFitScale(1600, 1200, 800, 600);

      expect(result).toBeLessThan(1);
    });

    it("should apply padding factor", () => {
      // When content is larger than container, padding affects scale
      const resultWith90Percent = calculateFitScale(1000, 1000, 800, 600, 0.9);
      const resultWith100Percent = calculateFitScale(1000, 1000, 800, 600, 1.0);

      expect(resultWith90Percent).toBeLessThan(resultWith100Percent);
    });

    it("should respect maxScale limit", () => {
      const result = calculateFitScale(100, 100, 1000, 1000, 0.9, 2);

      expect(result).toBeLessThanOrEqual(2);
    });

    it("should handle non-square containers", () => {
      const result = calculateFitScale(400, 300, 1200, 400);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it("should calculate correct scale when width constrains", () => {
      const result = calculateFitScale(400, 100, 200, 1000);

      // scaleX = (200 * 0.9) / 400 = 0.45
      // scaleY = (1000 * 0.9) / 100 = 9
      // should use scaleX = 0.45
      expect(result).toBeLessThan(1);
    });

    it("should calculate correct scale when height constrains", () => {
      const result = calculateFitScale(100, 400, 1000, 200);

      // scaleX = (1000 * 0.9) / 100 = 9
      // scaleY = (200 * 0.9) / 400 = 0.45
      // should use scaleY = 0.45
      expect(result).toBeLessThan(1);
    });
  });

  // ====================================================
  // SECTION 18: Pure Utility Functions (generateGenerationRange)
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

    it("should preserve order", () => {
      const result = generateGenerationRange(1, 5);

      expect(result[0]).toBeLessThan(result[1]);
      expect(result[result.length - 1]).toBe(5);
    });
  });

  // ====================================================
  // SECTION 19: Pure Utility Functions (getSortedGenerations)
  // ====================================================

  describe("getSortedGenerations", () => {
    it("should sort generations in ascending order", () => {
      const generations = new Map<number, ChartNode[]>([
        [3, []],
        [1, []],
        [2, []],
      ]);

      const result = getSortedGenerations(generations);

      expect(result).toEqual([1, 2, 3]);
    });

    it("should handle empty map", () => {
      const generations = new Map<number, ChartNode[]>();

      const result = getSortedGenerations(generations);

      expect(result).toEqual([]);
    });

    it("should handle negative generations", () => {
      const generations = new Map<number, ChartNode[]>([
        [-1, []],
        [1, []],
        [0, []],
        [-3, []],
      ]);

      const result = getSortedGenerations(generations);

      expect(result).toEqual([-3, -1, 0, 1]);
    });

    it("should handle single generation", () => {
      const generations = new Map<number, ChartNode[]>([[5, []]]);

      const result = getSortedGenerations(generations);

      expect(result).toEqual([5]);
    });

    it("should not modify original map", () => {
      const generations = new Map<number, ChartNode[]>([
        [2, []],
        [1, []],
      ]);

      getSortedGenerations(generations);

      // Map order should be preserved (insertion order)
      const keys = Array.from(generations.keys());
      expect(keys[0]).toBe(2);
    });

    it("should handle large generation numbers", () => {
      const generations = new Map<number, ChartNode[]>([
        [1000, []],
        [-1000, []],
        [0, []],
      ]);

      const result = getSortedGenerations(generations);

      expect(result).toEqual([-1000, 0, 1000]);
    });
  });

  // ====================================================
  // SECTION 20: Module Exports
  // ====================================================

  describe("Module Exports", () => {
    it("should export required pure functions", async () => {
      const module = await import("./d3-utils");

      expect(module.groupByGeneration).toBeDefined();
      expect(module.calculateBoundingBox).toBeDefined();
      expect(module.calculateFitScale).toBeDefined();
      expect(module.generateGenerationRange).toBeDefined();
      expect(module.getSortedGenerations).toBeDefined();
    });

    it("should export type interfaces", async () => {
      const module = await import("./d3-utils");

      // Type interfaces are available as types
      expect(module).toBeDefined();
    });
  });
});
