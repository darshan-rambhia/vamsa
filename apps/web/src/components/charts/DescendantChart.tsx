"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ChartNode, ChartEdge } from "~/server/charts";

interface DescendantChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  onNodeClick?: (nodeId: string) => void;
}

export function DescendantChart({
  nodes,
  edges,
  onNodeClick,
}: DescendantChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.max(600, nodes.length * 80);

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

    // Group nodes by generation
    const generations = new Map<number, ChartNode[]>();
    nodes.forEach((node) => {
      const gen = node.generation ?? 0;
      if (!generations.has(gen)) {
        generations.set(gen, []);
      }
      generations.get(gen)!.push(node);
    });

    // Calculate positions
    const nodePositions = new Map<string, { x: number; y: number }>();

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
        // Draw straight line from parent to child
        edgeGroup
          .append("line")
          .attr("x1", source.x)
          .attr("y1", source.y + nodeHeight / 2)
          .attr("x2", target.x)
          .attr("y2", target.y - nodeHeight / 2)
          .style("stroke", "var(--color-border)")
          .style("stroke-width", "2px");
      } else if (edge.type === "spouse") {
        // Draw horizontal line for spouse relationship
        edgeGroup
          .append("line")
          .attr("x1", source.x + nodeWidth / 2)
          .attr("y1", source.y)
          .attr("x2", target.x - nodeWidth / 2)
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
        .style(
          "fill",
          node.isLiving ? "var(--color-card)" : "var(--color-muted)"
        )
        .style(
          "stroke",
          node.isLiving ? "var(--color-primary)" : "var(--color-border)"
        )
        .style("stroke-width", "2px")
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
              node.isLiving ? "var(--color-card)" : "var(--color-muted)"
            );
        });

      // Name text
      nodeG
        .append("text")
        .attr("x", nodeWidth / 2)
        .attr("y", nodeHeight / 2 - 8)
        .attr("text-anchor", "middle")
        .style("fill", "var(--color-foreground)")
        .style("font-size", "14px")
        .style("font-weight", "600")
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
          .style("fill", "var(--color-muted-foreground)")
          .style("font-size", "12px")
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
        .style(
          "fill",
          node.isLiving
            ? "var(--color-primary)"
            : "var(--color-muted-foreground)"
        );
    });

    // Initial zoom to fit
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const scale = Math.min(
        width / (bounds.width + margin.left + margin.right),
        height / (bounds.height + margin.top + margin.bottom),
        1
      );
      const transform = d3.zoomIdentity
        .translate(width / 2, margin.top)
        .scale(scale)
        .translate(-(bounds.x + bounds.width / 2), -bounds.y);

      svg.transition().duration(750).call(zoom.transform, transform);
    }
  }, [nodes, edges, onNodeClick]);

  return (
    <div
      ref={containerRef}
      className="bg-card relative h-full w-full overflow-hidden rounded-lg border"
    >
      <svg ref={svgRef} className="h-full w-full" />
    </div>
  );
}
