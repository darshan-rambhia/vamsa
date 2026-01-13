import * as d3 from "d3";
import type { ChartNode } from "~/server/charts";

/**
 * Common D3 utility functions for chart components
 * Extracted to reduce code duplication across chart visualizations
 */

// Type definitions
export interface Position {
  x: number;
  y: number;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface RectNodeOptions {
  width: number;
  height: number;
  borderRadius?: number;
  isRoot?: boolean;
  onMouseEnter?: (node: ChartNode) => void;
  onMouseLeave?: (node: ChartNode) => void;
}

export interface CircleNodeOptions {
  radius: number;
  isRoot?: boolean;
  onMouseEnter?: (node: ChartNode) => void;
  onMouseLeave?: (node: ChartNode) => void;
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: string;
  strokeDasharray?: string;
}

/**
 * Creates a zoom behavior for SVG elements with standard scale extent
 * @param svg - D3 selection of SVG element
 * @param g - D3 selection of transform group
 * @param scaleExtent - Min and max zoom levels [min, max]
 * @param onZoom - Optional callback for zoom events (for debouncing)
 * @returns D3 zoom behavior
 */
export function createZoomBehavior<T extends Element>(
  svg: d3.Selection<T, unknown, null, undefined>,
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  scaleExtent: [number, number] = [0.1, 4],
  onZoom?: (event: d3.D3ZoomEvent<T, unknown>) => void
): d3.ZoomBehavior<T, unknown> {
  const zoom = d3
    .zoom<T, unknown>()
    .scaleExtent(scaleExtent)
    .on("zoom", (event) => {
      g.attr("transform", event.transform.toString());
      onZoom?.(event);
    });

  svg.call(zoom);
  return zoom;
}

/**
 * Fits the chart content to the container with padding
 * @param svg - D3 selection of SVG element
 * @param g - D3 selection of transform group
 * @param zoom - D3 zoom behavior
 * @param containerWidth - Width of the container
 * @param containerHeight - Height of the container
 * @param margin - Margin around the content
 * @param maxScale - Maximum scale factor (default 1)
 * @param duration - Animation duration in ms (default 750)
 */
export function fitToContainer<T extends Element>(
  svg: d3.Selection<T, unknown, null, undefined>,
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  zoom: d3.ZoomBehavior<T, unknown>,
  containerWidth: number,
  containerHeight: number,
  margin: Margin,
  maxScale = 1,
  duration = 750
): void {
  const bounds = g.node()?.getBBox();
  if (!bounds) return;

  const scale = Math.min(
    containerWidth / (bounds.width + margin.left + margin.right),
    containerHeight / (bounds.height + margin.top + margin.bottom),
    maxScale
  );

  const transform = d3.zoomIdentity
    .translate(containerWidth / 2, containerHeight / 2)
    .scale(scale)
    .translate(-(bounds.x + bounds.width / 2), -(bounds.y + bounds.height / 2));

  svg.transition().duration(duration).call(zoom.transform, transform);
}

/**
 * Alternative fit function that aligns to top instead of center
 * Used by AncestorChart and DescendantChart
 */
export function fitToContainerTop<T extends Element>(
  svg: d3.Selection<T, unknown, null, undefined>,
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  zoom: d3.ZoomBehavior<T, unknown>,
  containerWidth: number,
  containerHeight: number,
  margin: Margin,
  maxScale = 1,
  duration = 750
): void {
  const bounds = g.node()?.getBBox();
  if (!bounds) return;

  const scale = Math.min(
    containerWidth / (bounds.width + margin.left + margin.right),
    containerHeight / (bounds.height + margin.top + margin.bottom),
    maxScale
  );

  const transform = d3.zoomIdentity
    .translate(containerWidth / 2, margin.top)
    .scale(scale)
    .translate(-(bounds.x + bounds.width / 2), -bounds.y);

  svg.transition().duration(duration).call(zoom.transform, transform);
}

/**
 * Groups nodes by generation
 * @param nodes - Array of chart nodes
 * @returns Map of generation number to array of nodes
 */
export function groupByGeneration<T extends { generation?: number | null }>(
  nodes: T[]
): Map<number, T[]> {
  const generations = new Map<number, T[]>();

  nodes.forEach((node) => {
    const gen = node.generation ?? 0;
    if (!generations.has(gen)) {
      generations.set(gen, []);
    }
    generations.get(gen)!.push(node);
  });

  return generations;
}

/**
 * Renders a rectangular node with standard styling
 * @param nodeG - D3 selection of node group
 * @param node - Chart node data
 * @param position - Node position {x, y}
 * @param options - Rendering options
 */
export function renderRectNode(
  nodeG: d3.Selection<SVGGElement, unknown, null, undefined>,
  node: ChartNode,
  position: Position,
  options: RectNodeOptions
): void {
  const { width, height, borderRadius = 8, isRoot = false } = options;

  // Node background
  const rect = nodeG
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", borderRadius)
    .style(
      "fill",
      isRoot
        ? "color-mix(in oklch, var(--color-primary) 10%, transparent)"
        : node.isLiving
          ? "var(--color-card)"
          : "var(--color-muted)"
    )
    .style(
      "stroke",
      isRoot
        ? "var(--color-primary)"
        : node.isLiving
          ? "var(--color-primary)"
          : "var(--color-border)"
    )
    .style("stroke-width", isRoot ? "3px" : "2px");

  // Add hover effects
  rect
    .on("mouseenter", function () {
      d3.select(this)
        .transition()
        .duration(200)
        .style("fill", "var(--color-accent)");
      options.onMouseEnter?.(node);
    })
    .on("mouseleave", function () {
      d3.select(this)
        .transition()
        .duration(200)
        .style(
          "fill",
          isRoot
            ? "color-mix(in oklch, var(--color-primary) 10%, transparent)"
            : node.isLiving
              ? "var(--color-card)"
              : "var(--color-muted)"
        );
      options.onMouseLeave?.(node);
    });

  // Name text
  nodeG
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2 - 8)
    .attr("text-anchor", "middle")
    .style("fill", "var(--color-foreground)")
    .style("font-size", "14px")
    .style("font-weight", isRoot ? "700" : "600")
    .text(`${node.firstName} ${node.lastName}`);

  // Birth/death dates
  const dateText = [];
  if (node.dateOfBirth) {
    dateText.push(new Date(node.dateOfBirth).getFullYear());
  }
  if (node.dateOfPassing) {
    dateText.push(new Date(node.dateOfPassing).getFullYear());
  }

  if (dateText.length > 0) {
    nodeG
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2 + 12)
      .attr("text-anchor", "middle")
      .style("fill", "var(--color-muted-foreground)")
      .style("font-size", "12px")
      .text(dateText.join(" - "));
  }

  // Living/deceased badge
  const badgeG = nodeG
    .append("g")
    .attr("transform", `translate(${width - 35}, 10)`);

  badgeG
    .append("circle")
    .attr("cx", 4)
    .attr("cy", 4)
    .attr("r", 4)
    .style(
      "fill",
      node.isLiving ? "var(--color-primary)" : "var(--color-muted-foreground)"
    );
}

/**
 * Renders a circular node with standard styling
 * @param nodeG - D3 selection of node group
 * @param node - Chart node data
 * @param options - Rendering options
 */
export function renderCircleNode(
  nodeG: d3.Selection<SVGGElement, unknown, null, undefined>,
  node: ChartNode,
  options: CircleNodeOptions
): void {
  const { radius, isRoot = false } = options;

  // Node circle
  const circle = nodeG
    .append("circle")
    .attr("r", radius)
    .style(
      "fill",
      isRoot
        ? "color-mix(in oklch, var(--color-primary) 20%, transparent)"
        : node.isLiving
          ? "var(--color-card)"
          : "var(--color-muted)"
    )
    .style(
      "stroke",
      isRoot
        ? "var(--color-primary)"
        : node.isLiving
          ? "var(--color-primary)"
          : "var(--color-border)"
    )
    .style("stroke-width", isRoot ? "3px" : "2px");

  // Add hover effects
  circle
    .on("mouseenter", function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", radius + 5)
        .style("fill", "var(--color-accent)");
      options.onMouseEnter?.(node);
    })
    .on("mouseleave", function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", radius)
        .style(
          "fill",
          isRoot
            ? "color-mix(in oklch, var(--color-primary) 20%, transparent)"
            : node.isLiving
              ? "var(--color-card)"
              : "var(--color-muted)"
        );
      options.onMouseLeave?.(node);
    });

  // Name text - split into two lines for better fit
  const firstName =
    node.firstName.length > 12
      ? node.firstName.substring(0, 10) + "..."
      : node.firstName;
  const lastName =
    node.lastName.length > 12
      ? node.lastName.substring(0, 10) + "..."
      : node.lastName;

  nodeG
    .append("text")
    .attr("x", 0)
    .attr("y", -4)
    .attr("text-anchor", "middle")
    .style("fill", "var(--color-foreground)")
    .style("font-size", "11px")
    .style("font-weight", isRoot ? "700" : "600")
    .text(firstName);

  nodeG
    .append("text")
    .attr("x", 0)
    .attr("y", 8)
    .attr("text-anchor", "middle")
    .style("fill", "var(--color-foreground)")
    .style("font-size", "11px")
    .style("font-weight", isRoot ? "700" : "600")
    .text(lastName);

  // Birth year (outside the circle)
  if (node.dateOfBirth) {
    const year = new Date(node.dateOfBirth).getFullYear();
    nodeG
      .append("text")
      .attr("x", 0)
      .attr("y", radius + 15)
      .attr("text-anchor", "middle")
      .style("fill", "var(--color-muted-foreground)")
      .style("font-size", "10px")
      .text(year.toString());
  }

  // Living indicator
  nodeG
    .append("circle")
    .attr("cx", radius - 10)
    .attr("cy", -radius + 10)
    .attr("r", 4)
    .style(
      "fill",
      node.isLiving ? "var(--color-primary)" : "var(--color-muted-foreground)"
    );
}

/**
 * Renders a parent-child edge
 * @param edgeGroup - D3 selection of edge group
 * @param source - Source position
 * @param target - Target position
 * @param nodeHeight - Height of nodes (for offset calculation)
 * @param style - Optional edge styling
 */
export function renderParentChildEdge(
  edgeGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  source: Position,
  target: Position,
  nodeHeight: number,
  style?: EdgeStyle
): void {
  edgeGroup
    .append("line")
    .attr("x1", source.x)
    .attr("y1", source.y + nodeHeight / 2)
    .attr("x2", target.x)
    .attr("y2", target.y - nodeHeight / 2)
    .style("stroke", style?.stroke ?? "var(--color-border)")
    .style("stroke-width", style?.strokeWidth ?? "2px")
    .style("fill", "none");
}

/**
 * Renders a spouse edge (horizontal dashed line)
 * @param edgeGroup - D3 selection of edge group
 * @param source - Source position
 * @param target - Target position
 * @param nodeWidth - Width of nodes (for offset calculation)
 * @param style - Optional edge styling
 */
export function renderSpouseEdge(
  edgeGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  source: Position,
  target: Position,
  nodeWidth: number,
  style?: EdgeStyle
): void {
  edgeGroup
    .append("line")
    .attr("x1", source.x + nodeWidth / 2)
    .attr("y1", source.y)
    .attr("x2", target.x - nodeWidth / 2)
    .attr("y2", target.y)
    .style("stroke", style?.stroke ?? "var(--color-primary)")
    .style("stroke-width", style?.strokeWidth ?? "2px")
    .style("stroke-dasharray", style?.strokeDasharray ?? "5,5");
}

/**
 * Sets up SVG container with standard attributes
 * @param svgRef - React ref to SVG element
 * @param width - Container width
 * @param height - Container height
 * @returns D3 selection of SVG and main group
 */
export function setupSVGContainer(
  svgRef: React.RefObject<SVGSVGElement | null>,
  width: number,
  height: number
): {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
} | null {
  if (!svgRef.current) return null;

  // Clear previous chart
  d3.select(svgRef.current).selectAll("*").remove();

  const svg = d3
    .select(svgRef.current)
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  const g = svg.append("g");

  return { svg, g };
}
