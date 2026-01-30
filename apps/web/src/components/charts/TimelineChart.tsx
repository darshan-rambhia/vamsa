"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Circle, G, Line, Rect, Svg, Text } from "react-native-svg";
import * as d3 from "d3";
import { ZoomControls } from "./ZoomControls";
import { calculateLinearBounds, useChartViewport } from "./useChartViewport";
import type { TimelineEntry } from "~/server/charts";

interface TimelineChartProps {
  entries: Array<TimelineEntry>;
  minYear: number;
  maxYear: number;
  onNodeClick?: (nodeId: string) => void;
  resetSignal?: number;
}

function TimelineChartComponent({
  entries,
  minYear,
  maxYear,
  onNodeClick,
  resetSignal,
}: TimelineChartProps) {
  // Use the standardized chart viewport hook
  const viewport = useChartViewport({
    margin: { top: 60, right: 40, bottom: 40, left: 200 },
    minScale: 0.5,
    resetSignal,
  });

  // Hover state
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);

  // Layout constants
  const rowHeight = 40;
  const margin = { top: 60, right: 40, bottom: 40, left: 200 };
  const height = Math.max(
    400,
    margin.top + entries.length * rowHeight + margin.bottom
  );

  // Current year for living people
  const currentYear = new Date().getFullYear();
  const effectiveMaxYear = Math.max(maxYear, currentYear);

  // Scales
  const xScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([minYear - 5, effectiveMaxYear + 5])
        .range([margin.left, viewport.dimensions.width - margin.right]),
    [
      minYear,
      effectiveMaxYear,
      viewport.dimensions.width,
      margin.left,
      margin.right,
    ]
  );

  const yScale = useMemo(
    () =>
      d3
        .scaleBand()
        .domain(entries.map((e) => e.id))
        .range([margin.top, height - margin.bottom])
        .padding(0.2),
    [entries, margin.top, margin.bottom, height]
  );

  // Fit content to viewport when dimensions or height changes
  useEffect(() => {
    if (viewport.dimensions.width > 0 && height > 0) {
      viewport.fitContent(
        calculateLinearBounds(viewport.dimensions.width, height)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.dimensions.width, height]);

  // Generate decade marks for grid lines
  const decades = useMemo(() => {
    return d3.range(Math.ceil(minYear / 10) * 10, effectiveMaxYear + 1, 10);
  }, [minYear, effectiveMaxYear]);

  // Generate year ticks for axis
  const yearTicks = useMemo(() => {
    return d3
      .scaleLinear()
      .domain([minYear - 5, effectiveMaxYear + 5])
      .ticks(Math.min(20, effectiveMaxYear - minYear));
  }, [minYear, effectiveMaxYear]);

  if (entries.length === 0) {
    return (
      <div className="bg-card flex h-full w-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={viewport.containerRef}
      className="bg-card relative h-full w-full overflow-hidden rounded-lg border"
      onWheel={viewport.handlers.onWheel}
      onMouseDown={viewport.handlers.onMouseDown}
      onMouseMove={viewport.handlers.onMouseMove}
      onMouseUp={viewport.handlers.onMouseUp}
      onMouseLeave={viewport.handlers.onMouseLeave}
      style={{ cursor: viewport.isDragging ? "grabbing" : "grab" }}
    >
      {!viewport.isReady ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="bg-primary/20 h-12 w-12 animate-pulse rounded-full" />
        </div>
      ) : (
        <>
          <Svg
            width={viewport.dimensions.width}
            height={viewport.dimensions.height}
            data-chart-svg="true"
          >
            <G
              transform={`translate(${viewport.transform.x}, ${viewport.transform.y}) scale(${viewport.transform.scale})`}
            >
              {/* Year axis at top */}
              <G transform={`translate(0, ${margin.top})`}>
                <Line
                  x1={margin.left}
                  x2={viewport.dimensions.width - margin.right}
                  y1={0}
                  y2={0}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
                {yearTicks.map((year) => (
                  <G key={year} transform={`translate(${xScale(year)}, 0)`}>
                    <Line
                      y1={0}
                      y2={-6}
                      stroke="var(--color-border)"
                      strokeWidth={1}
                    />
                    <Text
                      y={-10}
                      textAnchor="middle"
                      fill="var(--color-foreground)"
                      fontSize={11}
                    >
                      {year.toString()}
                    </Text>
                  </G>
                ))}
              </G>

              {/* Vertical grid lines for decades */}
              {decades.map((decade) => (
                <Line
                  key={`decade-${decade}`}
                  x1={xScale(decade)}
                  x2={xScale(decade)}
                  y1={margin.top}
                  y2={height - margin.bottom}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                  opacity={0.5}
                />
              ))}

              {/* Current year line */}
              <Line
                x1={xScale(currentYear)}
                x2={xScale(currentYear)}
                y1={margin.top}
                y2={height - margin.bottom}
                stroke="var(--color-primary)"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
              <Text
                x={xScale(currentYear)}
                y={margin.top - 25}
                textAnchor="middle"
                fill="var(--color-primary)"
                fontSize={10}
                fontWeight="600"
              >
                Today
              </Text>

              {/* Timeline bars for each person */}
              {entries.map((entry) => {
                const y = yScale(entry.id);
                if (y === undefined) return null;

                const barHeight = yScale.bandwidth();
                const startYear = entry.birthYear ?? minYear;
                const endYear = entry.isLiving
                  ? currentYear
                  : (entry.deathYear ?? startYear + 1);

                const isHovered = hoveredEntryId === entry.id;

                // Only draw bar if we have valid year data
                if (entry.birthYear !== null) {
                  const barWidth = Math.max(
                    4,
                    xScale(endYear) - xScale(startYear)
                  );

                  return (
                    <G key={entry.id}>
                      {/* Timeline bar - wrapped in G for events */}
                      <G
                        onMouseEnter={() => setHoveredEntryId(entry.id)}
                        onMouseLeave={() => setHoveredEntryId(null)}
                        onClick={() => onNodeClick?.(entry.id)}
                      >
                        <Rect
                          x={xScale(startYear)}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={4}
                          fill={
                            isHovered
                              ? "var(--color-accent)"
                              : entry.isLiving
                                ? "color-mix(in oklch, var(--color-primary) 60%, transparent)"
                                : "var(--color-muted)"
                          }
                          stroke={
                            entry.isLiving
                              ? "var(--color-primary)"
                              : "var(--color-border)"
                          }
                          strokeWidth={1}
                        />
                      </G>

                      {/* Birth year marker */}
                      <Circle
                        cx={xScale(startYear)}
                        cy={y + barHeight / 2}
                        r={4}
                        fill="var(--color-primary)"
                        stroke="var(--color-background)"
                        strokeWidth={2}
                      />

                      {/* Death year marker */}
                      {!entry.isLiving && entry.deathYear && (
                        <Circle
                          cx={xScale(entry.deathYear)}
                          cy={y + barHeight / 2}
                          r={4}
                          fill="var(--color-muted-foreground)"
                          stroke="var(--color-background)"
                          strokeWidth={2}
                        />
                      )}

                      {/* Person name on the left - wrapped in G for events */}
                      <G onClick={() => onNodeClick?.(entry.id)}>
                        <Text
                          x={margin.left - 10}
                          y={y + barHeight / 2}
                          dy="0.35em"
                          textAnchor="end"
                          fill="var(--color-foreground)"
                          fontSize={12}
                          fontWeight="500"
                        >
                          {`${entry.firstName} ${entry.lastName}`}
                        </Text>
                      </G>

                      {/* Year range on the bar */}
                      {barWidth > 80 && (
                        <Text
                          x={xScale(startYear) + barWidth / 2}
                          y={y + barHeight / 2}
                          dy="0.35em"
                          textAnchor="middle"
                          fill="var(--color-foreground)"
                          fontSize={10}
                          fontWeight="600"
                          pointerEvents="none"
                        >
                          {entry.isLiving
                            ? `${entry.birthYear} - present`
                            : entry.deathYear
                              ? `${entry.birthYear} - ${entry.deathYear}`
                              : `b. ${entry.birthYear}`}
                        </Text>
                      )}

                      {/* Living indicator */}
                      <Circle
                        cx={margin.left - 180}
                        cy={y + barHeight / 2}
                        r={4}
                        fill={
                          entry.isLiving
                            ? "var(--color-primary)"
                            : "var(--color-muted-foreground)"
                        }
                      />

                      {/* Gender indicator */}
                      {entry.gender && (
                        <Text
                          x={margin.left - 160}
                          y={y + barHeight / 2}
                          dy="0.35em"
                          fill="var(--color-muted-foreground)"
                          fontSize={10}
                        >
                          {entry.gender === "MALE"
                            ? "M"
                            : entry.gender === "FEMALE"
                              ? "F"
                              : "-"}
                        </Text>
                      )}
                    </G>
                  );
                }

                return null;
              })}
            </G>
          </Svg>

          {/* Zoom controls */}
          <ZoomControls
            scale={viewport.transform.scale}
            onZoomIn={viewport.controls.zoomIn}
            onZoomOut={viewport.controls.zoomOut}
            onReset={viewport.controls.reset}
          />
        </>
      )}
    </div>
  );
}

export const TimelineChart = memo(TimelineChartComponent);
