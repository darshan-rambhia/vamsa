"use client";

import { useEffect, useRef, useState, memo, useMemo } from "react";
import type { ChartNode, ChartEdge } from "~/server/charts";
import {
  setupSVGContainer,
  createZoomBehavior,
  groupByGeneration,
  renderRectNode,
  renderParentChildEdge,
  fitToContainer,
  type Position,
} from "~/lib/d3-utils";
import {
  useDebouncedZoom,
  useChartLoadingState,
  usePerformanceMonitor,
} from "~/lib/chart-performance";
import { ChartSkeleton } from "./ChartSkeleton";

interface HourglassChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  rootPersonId: string;
  onNodeClick?: (nodeId: string) => void;
}

function HourglassChartComponent({
  nodes,
  edges,
  rootPersonId,
  onNodeClick,
}: HourglassChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  // Performance monitoring
  usePerformanceMonitor("HourglassChart", false);

  // Loading state
  const loadingState = useChartLoadingState(nodes.length);

  // Debounced zoom handler
  const debouncedZoomHandler = useDebouncedZoom(() => {
    // Optional: Handle zoom events if needed
  }, 16);

  // Memoize layout parameters
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

    const timeoutId = setTimeout(() => {
      const container = containerRef.current;
      if (!container || !svgRef.current) return;

      const width = container.clientWidth;
      const height = Math.max(800, nodes.length * 60);

      // Setup SVG container
      const setup = setupSVGContainer(svgRef, width, height);
      if (!setup) return;

      const { svg, g } = setup;

      // Create zoom behavior with debounced handler
      const zoom = createZoomBehavior(svg, g, [0.1, 4], debouncedZoomHandler);

      // Use memoized layout parameters
      const { nodeWidth, nodeHeight, levelHeight, margin } = layoutParams;

      // Separate ancestors and descendants
      const rootNode = nodes.find((n) => n.id === rootPersonId);
      const ancestors: ChartNode[] = [];
      const descendants: ChartNode[] = [];

      nodes.forEach((node) => {
        if (node.id === rootPersonId) {
          return; // Handle root separately
        }

        // If connected through parent-child relationship going up, it's an ancestor
        if (node.generation && node.generation > 0) {
          ancestors.push(node);
        } else {
          descendants.push(node);
        }
      });

      // Group by generation
      const ancestorGens = groupByGeneration(ancestors);
      const descendantGens = new Map<number, ChartNode[]>();

      descendants.forEach((node) => {
        const gen = Math.abs(node.generation ?? 0);
        if (!descendantGens.has(gen)) descendantGens.set(gen, []);
        descendantGens.get(gen)!.push(node);
      });

      // Calculate positions
      const nodePositions = new Map<string, Position>();
      const centerY = height / 2;

      // Position root node at center
      if (rootNode) {
        nodePositions.set(rootNode.id, { x: width / 2, y: centerY });
      }

      // Position ancestors (going up)
      ancestorGens.forEach((genNodes, gen) => {
        const yPos = centerY - gen * levelHeight;
        const totalWidth = genNodes.length * nodeWidth * 1.5;
        const startX = (width - totalWidth) / 2;

        genNodes.forEach((node, index) => {
          const xPos = startX + index * nodeWidth * 1.5 + nodeWidth / 2;
          nodePositions.set(node.id, { x: xPos, y: yPos });
        });
      });

      // Position descendants (going down)
      descendantGens.forEach((genNodes, gen) => {
        if (gen === 0) return; // Skip root
        const yPos = centerY + gen * levelHeight;
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
          // Special handling for spouse edges in hourglass layout
          edgeGroup
            .append("line")
            .attr("x1", Math.min(source.x, target.x) + nodeWidth / 2)
            .attr("y1", source.y)
            .attr("x2", Math.max(source.x, target.x) - nodeWidth / 2)
            .attr("y2", target.y)
            .style("stroke", "var(--color-primary)")
            .style("stroke-width", "2px")
            .style("stroke-dasharray", "5,5");
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
          .style("cursor", "pointer")
          .on("click", () => onNodeClick?.(node.id));

        renderRectNode(nodeG, node, pos, {
          width: nodeWidth,
          height: nodeHeight,
          borderRadius: 8,
          isRoot,
        });
      });

      // Initial zoom to fit
      fitToContainer(svg, g, zoom, width, height, margin, 0.9);

      // Mark rendering complete
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(
          `[Performance] HourglassChart rendered ${nodes.length} nodes in ${renderTime.toFixed(2)}ms`
        );
      }
      setIsRendering(false);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    nodes,
    edges,
    rootPersonId,
    onNodeClick,
    layoutParams,
    debouncedZoomHandler,
  ]);

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
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const HourglassChart = memo(HourglassChartComponent);
