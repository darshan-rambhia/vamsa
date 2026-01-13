"use client";

import { useEffect, useRef, useState, memo, useMemo } from "react";
import type { ChartNode, ChartEdge } from "~/server/charts";
import {
  setupSVGContainer,
  createZoomBehavior,
  groupByGeneration,
  renderRectNode,
  renderParentChildEdge,
  renderSpouseEdge,
  fitToContainerTop,
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

interface AncestorChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  onNodeClick?: (nodeId: string) => void;
  rootPersonId?: string;
}

function AncestorChartComponent({
  nodes,
  edges,
  onNodeClick,
  rootPersonId,
}: AncestorChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isRendering, setIsRendering] = useState(true);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    node: ChartNode;
    position: { x: number; y: number };
  } | null>(null);

  // Performance monitoring (disabled by default)
  usePerformanceMonitor("AncestorChart", false);

  // Loading state for large datasets
  const loadingState = useChartLoadingState(nodes.length);

  // Debounced zoom handler for smooth 60fps interactions
  const debouncedZoomHandler = useDebouncedZoom(() => {
    // Optional: Handle zoom events if needed
  }, 16);

  // Memoize layout parameters to prevent recalculation
  const layoutParams = useMemo(
    () => ({
      nodeWidth: 180,
      nodeHeight: 60,
      levelHeight: 120,
      margin: { top: 40, right: 40, bottom: 40, left: 40 },
    }),
    []
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const startTime = performance.now();
    setIsRendering(true);

    // Use setTimeout to allow loading state to render first
    const timeoutId = setTimeout(() => {
      const container = containerRef.current;
      if (!container || !svgRef.current) return;

      const width = container.clientWidth;
      const height = Math.max(600, nodes.length * 80);

      // Setup SVG container
      const setup = setupSVGContainer(svgRef, width, height);
      if (!setup) return;

      const { svg, g } = setup;

      // Create zoom behavior with debounced handler
      const zoom = createZoomBehavior(svg, g, [0.1, 4], debouncedZoomHandler);

      // Use memoized layout parameters
      const { nodeWidth, nodeHeight, levelHeight, margin } = layoutParams;

      // Group nodes by generation
      const generations = groupByGeneration(nodes);

      // Calculate positions
      const nodePositions = new Map<string, Position>();

      generations.forEach((genNodes, gen) => {
        const yPos = margin.top + gen * levelHeight;
        const totalWidth = genNodes.length * nodeWidth * 1.5;
        const startX = (width - totalWidth) / 2;

        genNodes.forEach((node, index) => {
          const xPos = startX + index * nodeWidth * 1.5 + nodeWidth / 2;
          nodePositions.set(node.id, { x: xPos, y: yPos });
        });
      });

      // Draw edges
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

        const nodeG = nodeGroup
          .append("g")
          .attr("class", "node")
          .attr(
            "transform",
            `translate(${pos.x - nodeWidth / 2}, ${pos.y - nodeHeight / 2})`
          )
          .style("cursor", "pointer")
          .on("click", () => onNodeClick?.(node.id))
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
        });
      });

      // Initial zoom to fit
      fitToContainerTop(svg, g, zoom, width, height, margin);

      // Mark rendering complete
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(
          `[Performance] AncestorChart rendered ${nodes.length} nodes in ${renderTime.toFixed(2)}ms`
        );
      }
      setIsRendering(false);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, onNodeClick, layoutParams, debouncedZoomHandler]);

  const handleViewProfile = (nodeId: string) => {
    navigate({ to: "/people/$personId", params: { personId: nodeId } });
    setTooltip(null);
  };

  const handleSetAsCenter = (nodeId: string) => {
    onNodeClick?.(nodeId);
    setTooltip(null);
  };

  // Use first node as root if not provided
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
            tooltip.node.generation
              ? `Generation ${tooltip.node.generation}`
              : undefined
          }
        />
      )}
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const AncestorChart = memo(AncestorChartComponent);
