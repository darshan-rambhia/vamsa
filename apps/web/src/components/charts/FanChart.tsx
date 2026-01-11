"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ChartNode, ChartEdge } from "~/server/charts";

interface FanChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  onNodeClick?: (nodeId: string) => void;
}

export function FanChart({ nodes, edges, onNodeClick }: FanChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.max(600, width);

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

    // Center point
    const centerX = width / 2;
    const centerY = height / 2;

    // Radial layout parameters
    const innerRadius = 80;
    const radiusStep = 100;
    const nodeRadius = 35;

    // Group nodes by generation
    const generations = new Map<number, ChartNode[]>();
    nodes.forEach((node) => {
      const gen = node.generation ?? 0;
      if (!generations.has(gen)) {
        generations.set(gen, []);
      }
      generations.get(gen)!.push(node);
    });

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
          // Root node at center
          nodePositions.set(node.id, {
            x: centerX,
            y: centerY,
            angle: 0,
            radius: 0,
          });
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
        // Arc connection along the same generation circle
        if (source.radius === target.radius && source.radius > 0) {
          const radius = source.radius;
          const startAngle = Math.atan2(source.y - centerY, source.x - centerX);
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
        .on("click", () => onNodeClick?.(node.id));

      // Node circle
      nodeG
        .append("circle")
        .attr("r", nodeRadius)
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
        .style("stroke-width", isRoot ? "3px" : "2px")
        .on("mouseenter", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", nodeRadius + 5)
            .style("fill", "var(--color-accent)");
        })
        .on("mouseleave", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", nodeRadius)
            .style(
              "fill",
              isRoot
                ? "color-mix(in oklch, var(--color-primary) 20%, transparent)"
                : node.isLiving
                  ? "var(--color-card)"
                  : "var(--color-muted)"
            );
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
          .attr("y", nodeRadius + 15)
          .attr("text-anchor", "middle")
          .style("fill", "var(--color-muted-foreground)")
          .style("font-size", "10px")
          .text(year.toString());
      }

      // Living indicator
      nodeG
        .append("circle")
        .attr("cx", nodeRadius - 10)
        .attr("cy", -nodeRadius + 10)
        .attr("r", 4)
        .style(
          "fill",
          node.isLiving ? "var(--color-primary)" : "var(--color-muted-foreground)"
        );
    });

    // Initial zoom to fit
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const padding = 40;
      const scale = Math.min(
        width / (bounds.width + padding * 2),
        height / (bounds.height + padding * 2),
        1
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
