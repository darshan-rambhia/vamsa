"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { MatrixPerson, MatrixCell } from "~/server/charts";

interface RelationshipMatrixProps {
  people: MatrixPerson[];
  matrix: MatrixCell[];
  onNodeClick?: (nodeId: string) => void;
  resetSignal?: number;
}

// Color mapping for relationship types
const relationshipColors: Record<string, string> = {
  SELF: "var(--color-primary)",
  PARENT: "var(--color-chart-1)",
  CHILD: "var(--color-chart-2)",
  SPOUSE: "var(--color-chart-3)",
  SIBLING: "var(--color-chart-4)",
  PARENT_IN_LAW: "var(--color-chart-5)",
  CHILD_IN_LAW: "var(--color-chart-1)",
  SIBLING_IN_LAW: "var(--color-chart-2)",
  STEP_PARENT: "var(--color-chart-3)",
  STEP_CHILD: "var(--color-chart-4)",
  STEP_SIBLING: "var(--color-chart-5)",
};

// Short labels for relationship types
const relationshipLabels: Record<string, string> = {
  SELF: "-",
  PARENT: "P",
  CHILD: "C",
  SPOUSE: "S",
  SIBLING: "Sb",
  PARENT_IN_LAW: "PIL",
  CHILD_IN_LAW: "CIL",
  SIBLING_IN_LAW: "SIL",
  STEP_PARENT: "SP",
  STEP_CHILD: "SC",
  STEP_SIBLING: "SS",
};

export function RelationshipMatrix({
  people,
  matrix,
  onNodeClick,
  resetSignal,
}: RelationshipMatrixProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const [cellSize, setCellSize] = useState(40);

  // Responsive cell sizing based on container width and people count
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSizes = () => {
      const container = containerRef.current!;
      const available =
        container.clientWidth > 0 ? container.clientWidth : window.innerWidth;
      const base = available / Math.max(people.length + 2, 3);
      // clamp for legibility
      setCellSize(Math.min(Math.max(base, 24), 64));
    };

    updateSizes();
    const ro = new ResizeObserver(updateSizes);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [people.length]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || people.length === 0) return;

    const container = containerRef.current;
    const labelWidth = 150;
    const labelHeight = 100;
    const margin = {
      top: labelHeight,
      right: 40,
      bottom: 40,
      left: labelWidth,
    };
    const gridSize = people.length * cellSize;
    const width = Math.max(
      container.clientWidth,
      margin.left + gridSize + margin.right
    );
    const height = Math.max(
      container.clientHeight,
      margin.top + gridSize + margin.bottom
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
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

    // Create lookup for matrix cells
    const matrixLookup = new Map<string, MatrixCell>();
    matrix.forEach((cell) => {
      matrixLookup.set(`${cell.personId}-${cell.relatedPersonId}`, cell);
    });

    // Draw grid cells
    const gridGroup = g.append("g").attr("class", "grid");

    people.forEach((rowPerson, rowIndex) => {
      people.forEach((colPerson, colIndex) => {
        const cell = matrixLookup.get(`${rowPerson.id}-${colPerson.id}`);
        const x = margin.left + colIndex * cellSize;
        const y = margin.top + rowIndex * cellSize;

        // Cell background
        const cellGroup = gridGroup
          .append("g")
          .attr("class", "cell")
          .attr("transform", `translate(${x}, ${y})`)
          .style("cursor", cell?.relationshipType ? "pointer" : "default");

        // Cell rectangle
        cellGroup
          .append("rect")
          .attr("width", cellSize)
          .attr("height", cellSize)
          .style(
            "fill",
            cell?.relationshipType
              ? relationshipColors[cell.relationshipType] ||
                  "var(--color-muted)"
              : "var(--color-background)"
          )
          .style("stroke", "var(--color-border)")
          .style("stroke-width", "1px")
          .style("opacity", cell?.relationshipType ? 0.7 : 0.3)
          .on("mouseenter", function () {
            if (cell?.relationshipType) {
              d3.select(this).transition().duration(200).style("opacity", 1);
            }
          })
          .on("mouseleave", function () {
            d3.select(this)
              .transition()
              .duration(200)
              .style("opacity", cell?.relationshipType ? 0.7 : 0.3);
          })
          .on("click", () => {
            if (rowPerson.id !== colPerson.id) {
              onNodeClick?.(rowPerson.id);
            }
          });

        // Relationship label
        if (cell?.relationshipType && cell.relationshipType !== "SELF") {
          cellGroup
            .append("text")
            .attr("x", cellSize / 2)
            .attr("y", cellSize / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .style("fill", "var(--color-foreground)")
            .style("font-size", "9px")
            .style("font-weight", "600")
            .style("pointer-events", "none")
            .text(relationshipLabels[cell.relationshipType] || "?");
        }

        if (cell?.relationshipType) {
          cellGroup
            .append("title")
            .text(
              cell.relationshipType === "SELF"
                ? "Self"
                : relationshipLabels[cell.relationshipType]
                  ? `${relationshipLabels[cell.relationshipType]} (${cell.relationshipType.replace(/_/g, " ")})`
                  : cell.relationshipType
            );
        }
      });
    });

    // Draw row labels (left side)
    const rowLabels = g.append("g").attr("class", "row-labels");

    people.forEach((person, index) => {
      const y = margin.top + index * cellSize + cellSize / 2;

      rowLabels
        .append("text")
        .attr("x", margin.left - 10)
        .attr("y", y)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .style("fill", "var(--color-foreground)")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .style("cursor", "pointer")
        .text(`${person.firstName} ${person.lastName}`.substring(0, 18))
        .on("click", () => onNodeClick?.(person.id))
        .append("title")
        .text(`${person.firstName} ${person.lastName}`);

      // Gender indicator
      rowLabels
        .append("circle")
        .attr("cx", margin.left - labelWidth + 10)
        .attr("cy", y)
        .attr("r", 4)
        .style(
          "fill",
          person.gender === "MALE"
            ? "var(--color-chart-1)"
            : person.gender === "FEMALE"
              ? "var(--color-chart-3)"
              : "var(--color-muted-foreground)"
        );
    });

    // Draw column labels (top)
    const colLabels = g.append("g").attr("class", "col-labels");

    people.forEach((person, index) => {
      const x = margin.left + index * cellSize + cellSize / 2;

      colLabels
        .append("text")
        .attr("x", x)
        .attr("y", margin.top - 10)
        .attr("text-anchor", "start")
        .attr("transform", `rotate(-45, ${x}, ${margin.top - 10})`)
        .style("fill", "var(--color-foreground)")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .style("cursor", "pointer")
        .text(`${person.firstName} ${person.lastName}`.substring(0, 15))
        .on("click", () => onNodeClick?.(person.id))
        .append("title")
        .text(`${person.firstName} ${person.lastName}`);
    });

    // Draw grid lines
    const gridLines = g.append("g").attr("class", "grid-lines");

    // Horizontal lines
    for (let i = 0; i <= people.length; i++) {
      gridLines
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", margin.left + gridSize)
        .attr("y1", margin.top + i * cellSize)
        .attr("y2", margin.top + i * cellSize)
        .style("stroke", "var(--color-border)")
        .style("stroke-width", "1px");
    }

    // Vertical lines
    for (let i = 0; i <= people.length; i++) {
      gridLines
        .append("line")
        .attr("x1", margin.left + i * cellSize)
        .attr("x2", margin.left + i * cellSize)
        .attr("y1", margin.top)
        .attr("y2", margin.top + gridSize)
        .style("stroke", "var(--color-border)")
        .style("stroke-width", "1px");
    }

    // Initial zoom to fit (use 90% of available space)
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const availableWidth = container.clientWidth;
      const availableHeight = Math.max(600, container.clientHeight);
      const scale = Math.min(
        (availableWidth * 0.9) / (bounds.width + 40),
        (availableHeight * 0.9) / (bounds.height + 40),
        1
      );
      const transform = d3.zoomIdentity.translate(20, 20).scale(scale);

      svg.transition().duration(750).call(zoom.transform, transform);

      resetViewRef.current = () => {
        svg.transition().duration(300).call(zoom.transform, transform);
      };
    }
  }, [people, matrix, onNodeClick, cellSize]);

  useEffect(() => {
    if (resetSignal !== undefined && resetViewRef.current) {
      resetViewRef.current();
    }
  }, [resetSignal]);

  return (
    <div
      ref={containerRef}
      className="bg-card relative h-full min-h-[70vh] w-full overflow-hidden rounded-lg border"
    >
      <svg ref={svgRef} className="h-full w-full" />
      {/* Legend */}
      <div className="bg-card/90 absolute right-4 bottom-4 rounded-lg border p-3 backdrop-blur-sm">
        <p className="text-foreground mb-2 text-xs font-semibold">
          Relationship Legend
        </p>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="font-mono">P</span>
            <span className="text-muted-foreground">Parent</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono">C</span>
            <span className="text-muted-foreground">Child</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono">S</span>
            <span className="text-muted-foreground">Spouse</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono">Sb</span>
            <span className="text-muted-foreground">Sibling</span>
          </div>
        </div>
      </div>
    </div>
  );
}
