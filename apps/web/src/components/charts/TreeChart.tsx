"use client";

import { useEffect, useRef, useState, memo, useMemo } from "react";
import type { ChartNode, ChartEdge } from "~/server/charts";
import {
  setupSVGContainer,
  createZoomBehavior,
  renderRectNode,
  renderParentChildEdge,
  renderSpouseEdge,
  fitToContainer,
  type Position,
} from "~/lib/d3-utils";
import {
  useDebouncedZoom,
  useChartLoadingState,
  usePerformanceMonitor,
} from "~/lib/chart-performance";
import { ChartTooltip } from "./ChartTooltip";
import { ChartSkeleton } from "./ChartSkeleton";
import { useNavigate } from "@tanstack/react-router";

interface TreeChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  onNodeClick?: (nodeId: string) => void;
  rootPersonId?: string;
  resetSignal?: number;
}

// Layout constants
const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const HORIZONTAL_SPACING = 40;
const SPOUSE_SPACING = 200;
const VERTICAL_SPACING = 120;

/**
 * Groups nodes by generation and sorts siblings by birth date
 */
function groupAndSortByGeneration(nodes: ChartNode[]): Map<number, ChartNode[]> {
  const generations = new Map<number, ChartNode[]>();

  nodes.forEach((node) => {
    const gen = node.generation ?? 0;
    if (!generations.has(gen)) {
      generations.set(gen, []);
    }
    generations.get(gen)!.push(node);
  });

  // Sort each generation by birth date
  generations.forEach((genNodes) => {
    genNodes.sort((a, b) => {
      if (!a.dateOfBirth && !b.dateOfBirth) return 0;
      if (!a.dateOfBirth) return 1;
      if (!b.dateOfBirth) return -1;
      return a.dateOfBirth.localeCompare(b.dateOfBirth);
    });
  });

  return generations;
}

/**
 * Calculates positions for all nodes in a tree layout
 * Generation 0 is centered, negative generations above, positive below
 */
function calculateTreeLayout(
  nodes: ChartNode[],
  edges: ChartEdge[]
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const generations = groupAndSortByGeneration(nodes);

  // Build spouse map for couple positioning
  const spouseEdges = edges.filter((e) => e.type === "spouse");
  const spouseMap = new Map<string, string>();
  spouseEdges.forEach((e) => {
    spouseMap.set(e.source, e.target);
    spouseMap.set(e.target, e.source);
  });

  // Sort generation keys (negative to positive)
  const sortedGens = Array.from(generations.keys()).sort((a, b) => a - b);

  // Find the middle generation (typically 0)
  const midGen = sortedGens.find((g) => g === 0) ?? sortedGens[Math.floor(sortedGens.length / 2)];

  sortedGens.forEach((gen) => {
    const genNodes = generations.get(gen)!;
    const yPos = (gen - midGen) * VERTICAL_SPACING;

    // Group nodes into couples and singles
    const couples: { primary: ChartNode; spouse: ChartNode | null }[] = [];
    const processed = new Set<string>();

    genNodes.forEach((node) => {
      if (processed.has(node.id)) return;
      processed.add(node.id);

      const spouseId = spouseMap.get(node.id);
      const spouseNode = spouseId
        ? genNodes.find((n) => n.id === spouseId)
        : null;

      if (spouseNode && !processed.has(spouseNode.id)) {
        processed.add(spouseNode.id);
        couples.push({ primary: node, spouse: spouseNode });
      } else {
        couples.push({ primary: node, spouse: null });
      }
    });

    // Calculate widths
    const coupleWidths = couples.map((c) =>
      c.spouse ? NODE_WIDTH * 2 + SPOUSE_SPACING : NODE_WIDTH
    );
    const totalWidth =
      coupleWidths.reduce((sum, w) => sum + w, 0) +
      (couples.length - 1) * HORIZONTAL_SPACING;

    // Center the generation
    let x = -totalWidth / 2;

    couples.forEach((couple, i) => {
      const width = coupleWidths[i];
      if (couple.spouse) {
        // Position couple side by side
        positions.set(couple.primary.id, { x: x + NODE_WIDTH / 2, y: yPos });
        positions.set(couple.spouse.id, {
          x: x + NODE_WIDTH / 2 + NODE_WIDTH + SPOUSE_SPACING - NODE_WIDTH,
          y: yPos,
        });
      } else {
        // Single person
        positions.set(couple.primary.id, { x: x + width / 2, y: yPos });
      }
      x += width + HORIZONTAL_SPACING;
    });
  });

  return positions;
}

function TreeChartComponent({
  nodes,
  edges,
  onNodeClick,
  rootPersonId,
  resetSignal,
}: TreeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isRendering, setIsRendering] = useState(true);
  const resetViewRef = useRef<() => void>();

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    node: ChartNode;
    position: { x: number; y: number };
  } | null>(null);

  // Performance monitoring
  usePerformanceMonitor("TreeChart", false);

  // Loading state for large datasets
  const loadingState = useChartLoadingState(nodes.length);

  // Debounced zoom handler
  const debouncedZoomHandler = useDebouncedZoom(() => {
    // Optional: Handle zoom events if needed
  }, 16);

  // Memoize layout parameters
  const layoutParams = useMemo(
    () => ({
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      margin: { top: 60, right: 60, bottom: 60, left: 60 },
    }),
    []
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const startTime = performance.now();
    setIsRendering(true);

    const timeoutId = setTimeout(() => {
      const container = containerRef.current;
      if (!container || !svgRef.current) return;

      const width = container.clientWidth;
      const height = Math.max(600, container.clientHeight);

      // Setup SVG container
      const setup = setupSVGContainer(svgRef, width, height);
      if (!setup) return;

      const { svg, g } = setup;

      // Create zoom behavior with debounced handler
      const zoom = createZoomBehavior(svg, g, [0.1, 4], debouncedZoomHandler);

      const { nodeWidth, nodeHeight, margin } = layoutParams;

      // Calculate tree layout positions
      const nodePositions = calculateTreeLayout(nodes, edges);

      // Draw edges first (so they're behind nodes)
      const edgeGroup = g.append("g").attr("class", "edges");

      edges.forEach((edge) => {
        const source = nodePositions.get(edge.source);
        const target = nodePositions.get(edge.target);

        if (!source || !target) return;

        if (edge.type === "parent-child") {
          renderParentChildEdge(edgeGroup, source, target, nodeHeight);
        } else if (edge.type === "spouse") {
          renderSpouseEdge(edgeGroup, source, target, nodeWidth);
        }
      });

      // Draw nodes
      const nodeGroup = g.append("g").attr("class", "nodes");

      nodes.forEach((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const isRoot = node.id === rootPersonId;
        const nodeG = nodeGroup
          .append("g")
          .attr("class", "node")
          .attr(
            "transform",
            `translate(${pos.x - nodeWidth / 2}, ${pos.y - nodeHeight / 2})`
          )
          .attr("role", "button")
          .attr("tabindex", 0)
          .style("cursor", "pointer")
          .on("click", () => onNodeClick?.(node.id))
          .on("keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onNodeClick?.(node.id);
            }
          })
          .on("mouseover", () => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) {
              setTooltip({
                node,
                position: {
                  x: rect.left + pos.x,
                  y: rect.top + pos.y,
                },
              });
            }
          })
          .on("mouseout", () => {
            setTooltip(null);
          });

        renderRectNode(nodeG, node, pos, {
          width: nodeWidth,
          height: nodeHeight,
          borderRadius: 8,
          isRoot,
        });
      });

      // Fit to container (center view)
      fitToContainer(svg, g, zoom, width, height, margin);

      resetViewRef.current = () => {
        fitToContainer(svg, g, zoom, width, height, margin);
      };

      // Mark rendering complete
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(
          `[Performance] TreeChart rendered ${nodes.length} nodes in ${renderTime.toFixed(2)}ms`
        );
      }
      setIsRendering(false);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, onNodeClick, rootPersonId, layoutParams, debouncedZoomHandler]);

  useEffect(() => {
    if (resetSignal !== undefined && resetViewRef.current) {
      resetViewRef.current();
    }
  }, [resetSignal]);

  const handleViewProfile = (nodeId: string) => {
    navigate({ to: "/people/$personId", params: { personId: nodeId } });
    setTooltip(null);
  };

  const handleSetAsCenter = (nodeId: string) => {
    onNodeClick?.(nodeId);
    setTooltip(null);
  };

  // Use provided root or first node
  const effectiveRootId = rootPersonId || nodes[0]?.id;

  // Show loading skeleton for large datasets
  if (isRendering && loadingState.isLoading) {
    return (
      <ChartSkeleton
        message={loadingState.message || undefined}
        estimatedTime={loadingState.estimatedTime}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-card relative h-full w-full overflow-hidden rounded-lg border"
    >
      <svg ref={svgRef} className="h-full w-full" />

      {/* Tooltip */}
      {tooltip && effectiveRootId && (
        <ChartTooltip
          node={tooltip.node}
          position={tooltip.position}
          rootPersonId={effectiveRootId}
          onSetAsCenter={handleSetAsCenter}
          onViewProfile={handleViewProfile}
          relationshipLabel={
            tooltip.node.generation !== undefined
              ? tooltip.node.generation === 0
                ? "Center"
                : tooltip.node.generation < 0
                  ? `${Math.abs(tooltip.node.generation)} generation${Math.abs(tooltip.node.generation) > 1 ? "s" : ""} up`
                  : `${tooltip.node.generation} generation${tooltip.node.generation > 1 ? "s" : ""} down`
              : undefined
          }
        />
      )}
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const TreeChart = memo(TreeChartComponent);
