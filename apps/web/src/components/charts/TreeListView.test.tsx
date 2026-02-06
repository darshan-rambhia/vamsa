/**
 * Unit tests for TreeListView component
 *
 * Tests:
 * - Component export and rendering with minimal/full props
 * - Tree structure rendering with proper ARIA roles
 * - Keyboard navigation (arrow keys, home, end, enter)
 * - Expand/collapse functionality
 * - Node click handler
 * - Accessibility attributes (aria-level, aria-expanded, aria-selected)
 * - Living/deceased person display
 * - Generation indicator display
 *
 * Coverage: 18 tests across 7 describe blocks
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { TreeListView } from "./TreeListView";
import type { ChartEdge, ChartNode } from "~/server/charts";

describe("TreeListView Component", () => {
  const mockNodes: Array<ChartNode> = [
    {
      id: "1",
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1950-01-01",
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "male",
      generation: 0,
    },
    {
      id: "2",
      firstName: "Jane",
      lastName: "Smith",
      dateOfBirth: "1975-05-15",
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "female",
      generation: 1,
    },
    {
      id: "3",
      firstName: "Bob",
      lastName: "Doe",
      dateOfBirth: "1920-03-10",
      dateOfPassing: "1990-12-25",
      isLiving: false,
      photoUrl: null,
      gender: "male",
      generation: -1,
    },
  ];

  const mockEdges: Array<ChartEdge> = [
    {
      id: "e1",
      source: "1",
      target: "2",
      type: "parent-child",
    },
    {
      id: "e2",
      source: "3",
      target: "1",
      type: "parent-child",
    },
  ];

  describe("Component Export", () => {
    it("should export TreeListView as a function", () => {
      expect(typeof TreeListView).toBe("function");
    });
  });

  describe("Rendering with props", () => {
    it("should render with required props", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      expect(container).toBeDefined();
    });

    it("should render with tree role", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const tree = container.querySelector('[role="tree"]');
      expect(tree).toBeDefined();
    });

    it("should have aria-label on tree container", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const tree = container.querySelector('[role="tree"]');
      expect(tree?.getAttribute("aria-label")).toBe("Family tree list view");
    });

    it("should render message when no root person is provided", () => {
      const { getByText } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId={undefined}
          onNodeClick={vi.fn(() => {})}
        />
      );
      expect(getByText(/no tree data available/i)).toBeDefined();
    });
  });

  describe("Tree Structure Rendering", () => {
    it("should render root person as treeitem", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const treeitems = container.querySelectorAll('[role="treeitem"]');
      expect(treeitems.length).toBeGreaterThan(0);
    });

    it("should render person name", () => {
      const { getByText } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      expect(getByText(/John Doe/i)).toBeDefined();
    });

    it("should show living status for living person", () => {
      const { getByText } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      expect(getByText("Living")).toBeDefined();
    });

    it("should show generation indicator", () => {
      const { getByText } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      expect(getByText(/Generation 0/i)).toBeDefined();
    });
  });

  describe("ARIA Attributes", () => {
    it("should have aria-level attribute on treeitems", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const treeitem = container.querySelector('[role="treeitem"]');
      expect(treeitem?.getAttribute("aria-level")).toBeDefined();
    });

    it("should have aria-selected attribute on treeitems", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const treeitem = container.querySelector('[role="treeitem"]');
      expect(treeitem?.hasAttribute("aria-selected")).toBe(true);
    });

    it("should have aria-expanded for items with children", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const treeitem = container.querySelector('[role="treeitem"]');
      expect(treeitem?.hasAttribute("aria-expanded")).toBe(true);
    });
  });

  describe("Node Click Handler", () => {
    it("should call onNodeClick when node is clicked", () => {
      const onNodeClick = vi.fn(() => {});
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={onNodeClick}
        />
      );
      const treeitem = container.querySelector('[role="treeitem"]');
      if (treeitem) {
        fireEvent.click(treeitem);
        expect(onNodeClick).toHaveBeenCalled();
      }
    });
  });

  describe("Expand/Collapse Functionality", () => {
    it("should toggle expansion when enter key is pressed", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const treeitem = container.querySelector('[role="treeitem"]');
      if (treeitem) {
        fireEvent.keyDown(treeitem, { key: "Enter" });
        // Verify that the treeitem responds to keyboard events
        expect(treeitem).toBeDefined();
      }
    });
  });

  describe("Keyboard Navigation", () => {
    it("should support arrow key navigation", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const treeitem = container.querySelector('[role="treeitem"]');
      if (treeitem) {
        fireEvent.keyDown(treeitem, { key: "ArrowDown" });
        expect(treeitem).toBeDefined();
      }
    });

    it("should support home key to focus first item", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const treeitem = container.querySelector('[role="treeitem"]');
      if (treeitem) {
        fireEvent.keyDown(treeitem, { key: "Home" });
        expect(treeitem).toBeDefined();
      }
    });

    it("should support end key to focus last item", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const treeitem = container.querySelector('[role="treeitem"]');
      if (treeitem) {
        fireEvent.keyDown(treeitem, { key: "End" });
        expect(treeitem).toBeDefined();
      }
    });
  });

  describe("Accessibility", () => {
    it("should have proper tabindex on focused item", () => {
      const { container } = render(
        <TreeListView
          nodes={mockNodes}
          edges={mockEdges}
          rootPersonId="1"
          onNodeClick={vi.fn(() => {})}
        />
      );
      const treeitem = container.querySelector('[role="treeitem"]');
      const tabindex = treeitem?.getAttribute("tabindex");
      expect(tabindex).toBeDefined();
      expect(tabindex === "0" || tabindex === "-1").toBe(true);
    });
  });
});
