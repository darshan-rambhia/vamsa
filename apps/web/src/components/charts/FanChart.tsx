"use client";

import { useEffect, useRef, useState, memo, useMemo } from "react";
import * as d3 from "d3";
import type { ChartNode, ChartEdge } from "~/server/charts";
import {
  setupSVGContainer,
  createZoomBehavior,
  groupByGeneration,
  renderCircleNode,
  fitToContainer,
} from "~/lib/d3-utils";
import {
  useDebouncedZoom,
  useChartLoadingState,
  usePerformanceMonitor,
} from "~/lib/chart-performance";
import { ChartTooltip } from "./ChartTooltip";
import { ChartSkeleton } from "./ChartSkeleton";
import { useNavigate } from "@tanstack/react-router";

interface FanChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  onNodeClick?: (nodeId: string) => void;
  rootPersonId?: string;
}

function FanChartComponent({
  nodes,
  edges,
  onNodeClick,
  rootPersonId,
}: FanChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isRendering, setIsRendering] = useState(true);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    node: ChartNode;
    position: { x: number; y: number };
  } | null>(null);

  // Performance monitoring
  usePerformanceMonitor("FanChart", false);

  // Loading state
  const loadingState = useChartLoadingState(nodes.length);

  // Debounced zoom handler
  const debouncedZoomHandler = useDebouncedZoom(() => {
    // Optional: Handle zoom events if needed
  }, 16);

  // Memoize layout parameters
  const layoutParams = useMemo(
    () => ({
      innerRadius: 80,
      radiusStep: 100,
      nodeRadius: 35,
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
      const height = Math.max(600, width);

      // Setup SVG container
      const setup = setupSVGContainer(svgRef, width, height);
      if (!setup) return;

      const { svg, g } = setup;

      // Create zoom behavior with debounced handler
      const zoom = createZoomBehavior(svg, g, [0.1, 4], debouncedZoomHandler);

      // Center point
      const centerX = width / 2;
      const centerY = height / 2;

      // Use memoized layout parameters
      const { innerRadius, radiusStep, nodeRadius, margin } = layoutParams;

      // Group nodes by generation
      const generations = groupByGeneration(nodes);

      const maxGen = Math.max(...Array.from(generations.keys()));

      // Calculate positions in radial layout
      const nodePositions = new Map<
        string,
        { x: number; y: number; angle: number; radius: number }
      >();

      generations.forEach((genNodes, gen) => {
        const radius = gen === 0 ? 0 : innerRadius + gen * radiusStep;
        const angleStep = gen === 0 ? 0 : (2 * Math.PI) / genNodes.length;

        genNodes.forEach((node, index) => {
          if (gen === 0) {
            // Generation 0: Center person and any spouses
            // If multiple people at gen 0 (e.g., person + spouse), offset them
            if (genNodes.length === 1) {
              // Single root node at center
              nodePositions.set(node.id, {
                x: centerX,
                y: centerY,
                angle: 0,
                radius: 0,
              });
            } else {
              // Multiple nodes at gen 0 (root + spouse): position side by side
              const spouseOffset = nodeRadius * 2.5; // Space between nodes
              const totalWidth = (genNodes.length - 1) * spouseOffset;
              const startX = centerX - totalWidth / 2;

              nodePositions.set(node.id, {
                x: startX + index * spouseOffset,
                y: centerY,
                angle: 0,
                radius: 0,
              });
            }
          } else {
            // Calculate angle - start from top and go clockwise
            const angle = -Math.PI / 2 + index * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            nodePositions.set(node.id, { x, y, angle, radius });
          }
        });
      });

      // Draw generation circles (guides)
      const guidesGroup = g
        .append("g")
        .attr("class", "guides")
        .attr("opacity", 0.1);

      for (let gen = 1; gen <= maxGen; gen++) {
        const radius = innerRadius + gen * radiusStep;
        guidesGroup
          .append("circle")
          .attr("cx", centerX)
          .attr("cy", centerY)
          .attr("r", radius)
          .attr("fill", "none")
          .style("stroke", "var(--color-border)")
          .style("stroke-width", "1px")
          .style("stroke-dasharray", "5,5");
      }

      // Draw edges as curved paths
      const edgeGroup = g.append("g").attr("class", "edges");

      edges.forEach((edge) => {
        const source = nodePositions.get(edge.source);
        const target = nodePositions.get(edge.target);

        if (!source || !target) return;

        if (edge.type === "parent-child") {
          // Radial connection from inner to outer
          const path = d3.path();
          path.moveTo(source.x, source.y);
          path.lineTo(target.x, target.y);

          edgeGroup
            .append("path")
            .attr("d", path.toString())
            .style("stroke", "var(--color-border)")
            .style("stroke-width", "2px")
            .style("fill", "none");
        } else if (edge.type === "spouse") {
          // Spouse connection
          if (source.radius === 0 && target.radius === 0) {
            // Both at center (gen 0) - draw straight dashed line between them
            edgeGroup
              .append("line")
              .attr("x1", source.x)
              .attr("y1", source.y)
              .attr("x2", target.x)
              .attr("y2", target.y)
              .style("stroke", "var(--color-primary)")
              .style("stroke-width", "2px")
              .style("stroke-dasharray", "5,5");
          } else if (source.radius === target.radius && source.radius > 0) {
            // Arc connection along the same generation circle
            const radius = source.radius;
            const startAngle = Math.atan2(
              source.y - centerY,
              source.x - centerX
            );
            const endAngle = Math.atan2(target.y - centerY, target.x - centerX);

            const arc = d3
              .arc()
              .innerRadius(radius)
              .outerRadius(radius)
              .startAngle(startAngle)
              .endAngle(endAngle);

            edgeGroup
              .append("path")
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("d", arc({ startAngle, endAngle } as any))
              .attr("transform", `translate(${centerX}, ${centerY})`)
              .style("stroke", "var(--color-primary)")
              .style("stroke-width", "2px")
              .style("stroke-dasharray", "5,5")
              .style("fill", "none");
          }
        }
      });

      // Draw nodes
      const nodeGroup = g.append("g").attr("class", "nodes");

      nodes.forEach((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const isRoot = (node.generation ?? 0) === 0;

        const nodeG = nodeGroup
          .append("g")
          .attr("class", "node")
          .attr("transform", `translate(${pos.x}, ${pos.y})`)
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

        renderCircleNode(nodeG, node, {
          radius: nodeRadius,
          isRoot,
        });
      });

      // Initial zoom to fit
      fitToContainer(svg, g, zoom, width, height, margin);

      // Mark rendering complete
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(
          `[Performance] FanChart rendered ${nodes.length} nodes in ${renderTime.toFixed(2)}ms`
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
export const FanChart = memo(FanChartComponent);
