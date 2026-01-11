"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ChartNode, ChartEdge } from "~/server/charts";

interface HourglassChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  rootPersonId: string;
  onNodeClick?: (nodeId: string) => void;
}

export function HourglassChart({
  nodes,
  edges,
  rootPersonId,
  onNodeClick,
}: HourglassChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.max(800, nodes.length * 60);

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    // Create zoom behavior
    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

    // Layout parameters
    const nodeWidth = 180;
    const nodeHeight = 60;
    const levelHeight = 120;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

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
    const ancestorGens = new Map<number, ChartNode[]>();
    const descendantGens = new Map<number, ChartNode[]>();

    ancestors.forEach((node) => {
      const gen = node.generation ?? 0;
      if (!ancestorGens.has(gen)) ancestorGens.set(gen, []);
      ancestorGens.get(gen)!.push(node);
    });

    descendants.forEach((node) => {
      const gen = Math.abs(node.generation ?? 0);
      if (!descendantGens.has(gen)) descendantGens.set(gen, []);
      descendantGens.get(gen)!.push(node);
    });

    // Calculate positions
    const nodePositions = new Map<string, { x: number; y: number }>();
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
        edgeGroup
          .append("line")
          .attr("x1", source.x)
          .attr("y1", source.y + nodeHeight / 2)
          .attr("x2", target.x)
          .attr("y2", target.y - nodeHeight / 2)
          .attr("stroke", "hsl(var(--border))")
          .attr("stroke-width", 2);
      } else if (edge.type === "spouse") {
        edgeGroup
          .append("line")
          .attr("x1", Math.min(source.x, target.x) + nodeWidth / 2)
          .attr("y1", source.y)
          .attr("x2", Math.max(source.x, target.x) - nodeWidth / 2)
          .attr("y2", target.y)
          .attr("stroke", "hsl(var(--primary))")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5");
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

      // Node background
      nodeG
        .append("rect")
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("rx", 8)
        .attr(
          "fill",
          isRoot
            ? "hsl(var(--primary) / 0.1)"
            : node.isLiving
              ? "hsl(var(--card))"
              : "hsl(var(--muted))"
        )
        .attr(
          "stroke",
          isRoot
            ? "hsl(var(--primary))"
            : node.isLiving
              ? "hsl(var(--primary) / 0.5)"
              : "hsl(var(--border))"
        )
        .attr("stroke-width", isRoot ? 3 : 2)
        .on("mouseenter", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("fill", "hsl(var(--accent))");
        })
        .on("mouseleave", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr(
              "fill",
              isRoot
                ? "hsl(var(--primary) / 0.1)"
                : node.isLiving
                  ? "hsl(var(--card))"
                  : "hsl(var(--muted))"
            );
        });

      // Name text
      nodeG
        .append("text")
        .attr("x", nodeWidth / 2)
        .attr("y", nodeHeight / 2 - 8)
        .attr("text-anchor", "middle")
        .attr("fill", "hsl(var(--foreground))")
        .attr("font-size", "14px")
        .attr("font-weight", isRoot ? "700" : "600")
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
          .attr("x", nodeWidth / 2)
          .attr("y", nodeHeight / 2 + 12)
          .attr("text-anchor", "middle")
          .attr("fill", "hsl(var(--muted-foreground))")
          .attr("font-size", "12px")
          .text(dateText.join(" - "));
      }

      // Living/deceased badge
      const badgeG = nodeG
        .append("g")
        .attr("transform", `translate(${nodeWidth - 35}, 10)`);

      badgeG
        .append("circle")
        .attr("cx", 4)
        .attr("cy", 4)
        .attr("r", 4)
        .attr(
          "fill",
          node.isLiving ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
        );
    });

    // Initial zoom to fit
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const scale = Math.min(
        width / (bounds.width + margin.left + margin.right),
        height / (bounds.height + margin.top + margin.bottom),
        0.9
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
  }, [nodes, edges, rootPersonId, onNodeClick]);

  return (
    <div
      ref={containerRef}
      className="bg-card relative h-full w-full overflow-hidden rounded-lg border"
    >
      <svg ref={svgRef} className="h-full w-full" />
    </div>
  );
}
