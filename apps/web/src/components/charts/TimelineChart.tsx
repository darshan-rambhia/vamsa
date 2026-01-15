"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { TimelineEntry } from "~/server/charts";

interface TimelineChartProps {
  entries: TimelineEntry[];
  minYear: number;
  maxYear: number;
  onNodeClick?: (nodeId: string) => void;
  resetSignal?: number;
}

export function TimelineChart({
  entries,
  minYear,
  maxYear,
  onNodeClick,
  resetSignal,
}: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<() => void>();

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || entries.length === 0)
      return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const rowHeight = 40;
    const margin = { top: 60, right: 40, bottom: 40, left: 200 };
    const height = Math.max(
      400,
      margin.top + entries.length * rowHeight + margin.bottom
    );

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
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

    // Current year for living people
    const currentYear = new Date().getFullYear();
    const effectiveMaxYear = Math.max(maxYear, currentYear);

    // X scale for years
    const xScale = d3
      .scaleLinear()
      .domain([minYear - 5, effectiveMaxYear + 5])
      .range([margin.left, width - margin.right]);

    // Y scale for people
    const yScale = d3
      .scaleBand()
      .domain(entries.map((e) => e.id))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    // Draw year axis at top
    const xAxis = d3
      .axisTop(xScale)
      .tickFormat((d) => d.toString())
      .ticks(Math.min(20, effectiveMaxYear - minYear));

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${margin.top})`)
      .call(xAxis)
      .selectAll("text")
      .style("fill", "var(--color-foreground)")
      .style("font-size", "11px");

    g.selectAll(".x-axis path, .x-axis line").style(
      "stroke",
      "var(--color-border)"
    );

    // Draw vertical grid lines for decades
    const decades = d3.range(
      Math.ceil(minYear / 10) * 10,
      effectiveMaxYear + 1,
      10
    );
    g.append("g")
      .attr("class", "grid-lines")
      .selectAll("line")
      .data(decades)
      .enter()
      .append("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .style("stroke", "var(--color-border)")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.5);

    // Draw current year line
    g.append("line")
      .attr("x1", xScale(currentYear))
      .attr("x2", xScale(currentYear))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .style("stroke", "var(--color-primary)")
      .style("stroke-width", "2px")
      .style("stroke-dasharray", "5,5");

    g.append("text")
      .attr("x", xScale(currentYear))
      .attr("y", margin.top - 25)
      .attr("text-anchor", "middle")
      .style("fill", "var(--color-primary)")
      .style("font-size", "10px")
      .style("font-weight", "600")
      .text("Today");

    // Draw timeline bars for each person
    entries.forEach((entry) => {
      const y = yScale(entry.id);
      if (y === undefined) return;

      const barHeight = yScale.bandwidth();
      const startYear = entry.birthYear ?? minYear;
      const endYear = entry.isLiving
        ? currentYear
        : (entry.deathYear ?? startYear + 1);

      // Only draw bar if we have valid year data
      if (entry.birthYear !== null) {
        const barWidth = Math.max(4, xScale(endYear) - xScale(startYear));

        // Timeline bar
        g.append("rect")
          .attr("x", xScale(startYear))
          .attr("y", y)
          .attr("width", barWidth)
          .attr("height", barHeight)
          .attr("rx", 4)
          .style(
            "fill",
            entry.isLiving
              ? "color-mix(in oklch, var(--color-primary) 60%, transparent)"
              : "var(--color-muted)"
          )
          .style(
            "stroke",
            entry.isLiving ? "var(--color-primary)" : "var(--color-border)"
          )
          .style("stroke-width", "1px")
          .style("cursor", "pointer")
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
                entry.isLiving
                  ? "color-mix(in oklch, var(--color-primary) 60%, transparent)"
                  : "var(--color-muted)"
              );
          })
          .on("click", () => onNodeClick?.(entry.id));

        // Birth year marker
        g.append("circle")
          .attr("cx", xScale(startYear))
          .attr("cy", y + barHeight / 2)
          .attr("r", 4)
          .style("fill", "var(--color-primary)")
          .style("stroke", "var(--color-background)")
          .style("stroke-width", "2px");

        // Death year marker (if applicable)
        if (!entry.isLiving && entry.deathYear) {
          g.append("circle")
            .attr("cx", xScale(entry.deathYear))
            .attr("cy", y + barHeight / 2)
            .attr("r", 4)
            .style("fill", "var(--color-muted-foreground)")
            .style("stroke", "var(--color-background)")
            .style("stroke-width", "2px");
        }
      }

      // Person name on the left
      g.append("text")
        .attr("x", margin.left - 10)
        .attr("y", y + barHeight / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .style("fill", "var(--color-foreground)")
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("cursor", "pointer")
        .text(`${entry.firstName} ${entry.lastName}`)
        .on("click", () => onNodeClick?.(entry.id));

      // Year range on the bar
      if (entry.birthYear !== null) {
        const yearText = entry.isLiving
          ? `${entry.birthYear} - present`
          : entry.deathYear
            ? `${entry.birthYear} - ${entry.deathYear}`
            : `b. ${entry.birthYear}`;

        const barWidth = Math.max(
          4,
          xScale(
            entry.isLiving
              ? currentYear
              : (entry.deathYear ?? entry.birthYear + 1)
          ) - xScale(entry.birthYear)
        );

        // Only show year text if bar is wide enough
        if (barWidth > 80) {
          g.append("text")
            .attr("x", xScale(entry.birthYear) + barWidth / 2)
            .attr("y", y + barHeight / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .style("fill", "var(--color-foreground)")
            .style("font-size", "10px")
            .style("font-weight", "600")
            .style("pointer-events", "none")
            .text(yearText);
        }
      }

      // Living indicator
      g.append("circle")
        .attr("cx", margin.left - 180)
        .attr("cy", y + barHeight / 2)
        .attr("r", 4)
        .style(
          "fill",
          entry.isLiving
            ? "var(--color-primary)"
            : "var(--color-muted-foreground)"
        );

      // Gender indicator
      if (entry.gender) {
        g.append("text")
          .attr("x", margin.left - 160)
          .attr("y", y + barHeight / 2)
          .attr("dy", "0.35em")
          .style("fill", "var(--color-muted-foreground)")
          .style("font-size", "10px")
          .text(
            entry.gender === "MALE"
              ? "M"
              : entry.gender === "FEMALE"
                ? "F"
                : "-"
          );
      }
    });

    // Initial zoom to fit
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const scale = Math.min(
        width / (bounds.width + 40),
        height / (bounds.height + 40),
        1
      );
      const transform = d3.zoomIdentity.translate(20, 20).scale(scale);

      svg.transition().duration(750).call(zoom.transform, transform);

      resetViewRef.current = () => {
        svg.transition().duration(300).call(zoom.transform, transform);
      };
    }
  }, [entries, minYear, maxYear, onNodeClick]);

  useEffect(() => {
    if (resetSignal !== undefined && resetViewRef.current) {
      resetViewRef.current();
    }
  }, [resetSignal]);

  return (
    <div
      ref={containerRef}
      className="bg-card relative h-full w-full overflow-hidden rounded-lg border"
    >
      <svg ref={svgRef} className="h-full w-full" />
    </div>
  );
}
