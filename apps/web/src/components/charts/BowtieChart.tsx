"use client";

import { useEffect, useRef, useState, memo, useMemo } from "react";
import * as d3 from "d3";
import type { BowtieNode, ChartEdge } from "~/server/charts";
import {
  useDebouncedZoom,
  useChartLoadingState,
  usePerformanceMonitor,
} from "~/lib/chart-performance";
import { ChartSkeleton } from "./ChartSkeleton";

interface BowtieChartProps {
  nodes: BowtieNode[];
  edges: ChartEdge[];
  rootPersonId: string;
  onNodeClick?: (nodeId: string) => void;
}

function BowtieChartComponent({
  nodes,
  edges,
  rootPersonId,
  onNodeClick,
}: BowtieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  // Performance monitoring
  usePerformanceMonitor("BowtieChart", false);

  // Loading state
  const loadingState = useChartLoadingState(nodes.length);

  // Debounced zoom handler
  const debouncedZoomHandler = useDebouncedZoom(() => {
    // Optional: Handle zoom events if needed
  }, 16);

  // Memoize layout parameters
  const layoutParams = useMemo(
    () => ({
      nodeWidth: 160,
      nodeHeight: 50,
      levelHeight: 100,
      horizontalGap: 80,
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
      const height = Math.max(600, nodes.length * 80);

      // Clear previous chart
      d3.select(svgRef.current).selectAll("*").remove();

      const svg = d3
        .select(svgRef.current)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

      // Create zoom behavior with debouncing
      const g = svg.append("g");

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform.toString());
          debouncedZoomHandler();
        });

      svg.call(zoom);

      // Use memoized layout parameters
      const { nodeWidth, nodeHeight, levelHeight, horizontalGap } =
        layoutParams;
      const centerX = width / 2;
      const centerY = height / 2;

      // Separate nodes by side
      const paternalNodes = nodes.filter((n) => n.side === "paternal");
      const maternalNodes = nodes.filter((n) => n.side === "maternal");
      const centerNode = nodes.find((n) => n.id === rootPersonId);

      // Group by generation
      const paternalGens = new Map<number, BowtieNode[]>();
      const maternalGens = new Map<number, BowtieNode[]>();

      paternalNodes.forEach((node) => {
        const gen = node.generation ?? 0;
        if (!paternalGens.has(gen)) paternalGens.set(gen, []);
        paternalGens.get(gen)!.push(node);
      });

      maternalNodes.forEach((node) => {
        const gen = node.generation ?? 0;
        if (!maternalGens.has(gen)) maternalGens.set(gen, []);
        maternalGens.get(gen)!.push(node);
      });

      // Calculate positions
      const nodePositions = new Map<string, { x: number; y: number }>();

      // Position center node
      if (centerNode) {
        nodePositions.set(centerNode.id, { x: centerX, y: centerY });
      }

      // Position paternal nodes (left side)
      paternalGens.forEach((genNodes, gen) => {
        const yPos = centerY - gen * levelHeight;
        const leftWidth =
          (paternalGens.get(gen)?.length || 1) *
          (nodeWidth + horizontalGap / 2);
        const startX = centerX - horizontalGap - leftWidth;

        genNodes.forEach((node, index) => {
          const xPos =
            startX + index * (nodeWidth + horizontalGap / 2) + nodeWidth / 2;
          nodePositions.set(node.id, { x: xPos, y: yPos });
        });
      });

      // Position maternal nodes (right side)
      maternalGens.forEach((genNodes, gen) => {
        const yPos = centerY - gen * levelHeight;
        const startX = centerX + horizontalGap;

        genNodes.forEach((node, index) => {
          const xPos =
            startX + index * (nodeWidth + horizontalGap / 2) + nodeWidth / 2;
          nodePositions.set(node.id, { x: xPos, y: yPos });
        });
      });

      // Draw side labels
      const labelsGroup = g.append("g").attr("class", "labels");

      // Paternal label
      labelsGroup
        .append("text")
        .attr("x", centerX - horizontalGap * 2)
        .attr("y", centerY - levelHeight * 0.5)
        .attr("text-anchor", "middle")
        .style("fill", "var(--color-chart-1)")
        .style("font-size", "14px")
        .style("font-weight", "700")
        .style("letter-spacing", "2px")
        .text("PATERNAL");

      // Maternal label
      labelsGroup
        .append("text")
        .attr("x", centerX + horizontalGap * 2)
        .attr("y", centerY - levelHeight * 0.5)
        .attr("text-anchor", "middle")
        .style("fill", "var(--color-chart-3)")
        .style("font-size", "14px")
        .style("font-weight", "700")
        .style("letter-spacing", "2px")
        .text("MATERNAL");

      // Draw center divider line
      g.append("line")
        .attr("x1", centerX)
        .attr("x2", centerX)
        .attr(
          "y1",
          centerY -
            (Math.max(paternalGens.size, maternalGens.size) + 1) * levelHeight
        )
        .attr("y2", centerY + levelHeight / 2)
        .style("stroke", "var(--color-border)")
        .style("stroke-width", "2px")
        .style("stroke-dasharray", "8,4")
        .style("opacity", 0.5);

      // Draw edges
      const edgeGroup = g.append("g").attr("class", "edges");

      edges.forEach((edge) => {
        const source = nodePositions.get(edge.source);
        const target = nodePositions.get(edge.target);

        if (!source || !target) return;

        // Draw curved path
        const midY = (source.y + target.y) / 2;

        const path = d3.path();
        path.moveTo(source.x, source.y + nodeHeight / 2);
        path.bezierCurveTo(
          source.x,
          midY,
          target.x,
          midY,
          target.x,
          target.y - nodeHeight / 2
        );

        edgeGroup
          .append("path")
          .attr("d", path.toString())
          .style("stroke", "var(--color-border)")
          .style("stroke-width", "2px")
          .style("fill", "none");
      });

      // Draw nodes
      const nodeGroup = g.append("g").attr("class", "nodes");

      nodes.forEach((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const isRoot = node.id === rootPersonId;
        const sideColor =
          node.side === "paternal"
            ? "var(--color-chart-1)"
            : node.side === "maternal"
              ? "var(--color-chart-3)"
              : "var(--color-primary)";

        const nodeG = nodeGroup
          .append("g")
          .attr("class", "node")
          .attr(
            "transform",
            `translate(${pos.x - nodeWidth / 2}, ${pos.y - nodeHeight / 2})`
          )
          .style("cursor", "pointer")
          .on("click", () => onNodeClick?.(node.id));

        // Node background
        nodeG
          .append("rect")
          .attr("width", nodeWidth)
          .attr("height", nodeHeight)
          .attr("rx", isRoot ? 12 : 8)
          .style(
            "fill",
            isRoot
              ? "color-mix(in oklch, var(--color-primary) 15%, transparent)"
              : node.isLiving
                ? "var(--color-card)"
                : "var(--color-muted)"
          )
          .style("stroke", isRoot ? "var(--color-primary)" : sideColor)
          .style("stroke-width", isRoot ? "3px" : "2px")
          .on("mouseenter", function () {
            d3.select(this)
              .transition()
              .duration(200)
              .style("fill", "var(--color-accent)");
          })
          .on("mouseleave", function () {
            d3.select(this)
              .transition()
              .duration(200)
              .style(
                "fill",
                isRoot
                  ? "color-mix(in oklch, var(--color-primary) 15%, transparent)"
                  : node.isLiving
                    ? "var(--color-card)"
                    : "var(--color-muted)"
              );
          });

        // Side indicator stripe
        if (!isRoot) {
          nodeG
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 4)
            .attr("height", nodeHeight)
            .attr("rx", 2)
            .style("fill", sideColor);
        }

        // Name text
        const displayName = `${node.firstName} ${node.lastName}`;
        const truncatedName =
          displayName.length > 20
            ? displayName.substring(0, 18) + "..."
            : displayName;

        nodeG
          .append("text")
          .attr("x", nodeWidth / 2)
          .attr("y", nodeHeight / 2 - 6)
          .attr("text-anchor", "middle")
          .style("fill", "var(--color-foreground)")
          .style("font-size", "12px")
          .style("font-weight", isRoot ? "700" : "600")
          .text(truncatedName);

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
            .attr("x", nodeWidth / 2)
            .attr("y", nodeHeight / 2 + 10)
            .attr("text-anchor", "middle")
            .style("fill", "var(--color-muted-foreground)")
            .style("font-size", "10px")
            .text(dateText.join(" - "));
        }

        // Living indicator
        nodeG
          .append("circle")
          .attr("cx", nodeWidth - 12)
          .attr("cy", 12)
          .attr("r", 4)
          .style(
            "fill",
            node.isLiving
              ? "var(--color-primary)"
              : "var(--color-muted-foreground)"
          );

        // Gender indicator
        if (node.gender) {
          nodeG
            .append("text")
            .attr("x", nodeWidth - 24)
            .attr("y", 15)
            .style("fill", "var(--color-muted-foreground)")
            .style("font-size", "10px")
            .text(
              node.gender === "MALE" ? "M" : node.gender === "FEMALE" ? "F" : ""
            );
        }
      });

      // Initial zoom to fit (use 90% of available space with padding)
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const padding = 60;
        const scale = Math.min(
          (width * 0.9) / (bounds.width + padding * 2),
          (height * 0.9) / (bounds.height + padding * 2),
          0.95
        );
        const transform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(scale)
          .translate(
            -(bounds.x + bounds.width / 2),
            -(bounds.y + bounds.height / 2)
          );

        svg.transition().duration(750).call(zoom.transform, transform);
      }

      // Mark rendering complete
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(
          `[Performance] BowtieChart rendered ${nodes.length} nodes in ${renderTime.toFixed(2)}ms`
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
export const BowtieChart = memo(BowtieChartComponent);
