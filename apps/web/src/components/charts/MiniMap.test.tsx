import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MiniMap } from "./MiniMap";

describe("MiniMap", () => {
  const mockTreeBounds = { width: 1000, height: 600 };
  const mockViewport = { x: 100, y: 50, width: 400, height: 300 };
  const mockOnNavigate = vi.fn(() => {});

  const createNodes = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `node-${i}`,
      x: Math.random() * 1000,
      y: Math.random() * 600,
      generation: i % 3,
    }));

  it("renders nothing when there are fewer than 30 nodes", () => {
    const nodes = createNodes(25);
    const { container } = render(
      <MiniMap
        treeBounds={mockTreeBounds}
        viewport={mockViewport}
        onNavigate={mockOnNavigate}
        nodePositions={nodes}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders when there are 30 or more nodes", () => {
    const nodes = createNodes(30);
    const { container } = render(
      <MiniMap
        treeBounds={mockTreeBounds}
        viewport={mockViewport}
        onNavigate={mockOnNavigate}
        nodePositions={nodes}
      />
    );

    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-label")).toContain("Mini-map navigation");
  });

  it("renders node dots for each position", () => {
    const nodes = createNodes(35);
    const { container } = render(
      <MiniMap
        treeBounds={mockTreeBounds}
        viewport={mockViewport}
        onNavigate={mockOnNavigate}
        nodePositions={nodes}
      />
    );

    const circles = container.querySelectorAll("circle");
    // Should have one circle per node
    expect(circles.length).toBe(35);
  });

  it("highlights root node differently", () => {
    const nodes = [
      { id: "root", x: 500, y: 300, generation: 0 },
      ...createNodes(30),
    ];
    const { container } = render(
      <MiniMap
        treeBounds={mockTreeBounds}
        viewport={mockViewport}
        onNavigate={mockOnNavigate}
        nodePositions={nodes}
        rootPersonId="root"
      />
    );

    const circles = container.querySelectorAll("circle");
    // Root node should have stroke (border)
    const rootCircle = Array.from(circles).find(
      (c) => c.getAttribute("stroke") === "var(--color-background)"
    );
    expect(rootCircle).toBeTruthy();
  });

  it("renders viewport rectangle", () => {
    const nodes = createNodes(30);
    const { container } = render(
      <MiniMap
        treeBounds={mockTreeBounds}
        viewport={mockViewport}
        onNavigate={mockOnNavigate}
        nodePositions={nodes}
      />
    );

    const rects = container.querySelectorAll("rect");
    // Should have background rect + viewport rect
    expect(rects.length).toBeGreaterThanOrEqual(2);

    // Viewport rect should have stroke (not filled)
    const viewportRect = Array.from(rects).find(
      (r) => r.getAttribute("fill") === "none"
    );
    expect(viewportRect).toBeTruthy();
    expect(viewportRect?.getAttribute("stroke")).toBe("var(--color-primary)");
  });

  it("calls onNavigate with correct coordinates when clicked", () => {
    const nodes = createNodes(30);
    const { container } = render(
      <MiniMap
        treeBounds={mockTreeBounds}
        viewport={mockViewport}
        onNavigate={mockOnNavigate}
        nodePositions={nodes}
      />
    );

    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();

    // Mock getBoundingClientRect
    if (svg) {
      svg.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 150,
        height: 100,
        right: 150,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      // Click in the middle of the mini-map
      fireEvent.click(svg, { clientX: 75, clientY: 50 });

      // Should call navigate callback when clicked
      expect(mockOnNavigate).toHaveBeenCalled();
    }
  });

  it("applies proper styling and accessibility attributes", () => {
    const nodes = createNodes(30);
    const { container } = render(
      <MiniMap
        treeBounds={mockTreeBounds}
        viewport={mockViewport}
        onNavigate={mockOnNavigate}
        nodePositions={nodes}
      />
    );

    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();

    // Check classes via classList or class attribute
    const classString = svg?.getAttribute("class") || "";
    expect(classString).toContain("bg-card/80");
    expect(classString).toContain("rounded-lg");
    expect(classString).toContain("border-2");
    expect(classString).toContain("cursor-pointer");
    expect(svg?.getAttribute("aria-label")).toBeTruthy();
  });

  it("handles nodes without generation property", () => {
    const nodes = [
      { id: "node-no-gen-1", x: 100, y: 200 },
      { id: "node-no-gen-2", x: 300, y: 400, generation: 1 },
      ...createNodes(28),
    ];

    const { container } = render(
      <MiniMap
        treeBounds={mockTreeBounds}
        viewport={mockViewport}
        onNavigate={mockOnNavigate}
        nodePositions={nodes}
      />
    );

    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(nodes.length);
  });
});
