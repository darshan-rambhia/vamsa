"use client";

import { useState, memo, useMemo, useEffect } from "react";
import { Svg, G, Rect, Circle, Text, Line } from "react-native-svg";
import type { MatrixPerson, MatrixCell } from "~/server/charts";
import { ZoomControls } from "./ZoomControls";
import { useChartViewport, calculateLinearBounds } from "./useChartViewport";

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

// Layout constants
const LABEL_WIDTH = 150;
const LABEL_HEIGHT = 100;
const MARGIN = {
  top: LABEL_HEIGHT,
  right: 40,
  bottom: 40,
  left: LABEL_WIDTH,
};

function RelationshipMatrixComponent({
  people,
  matrix,
  onNodeClick,
  resetSignal,
}: RelationshipMatrixProps) {
  // Use the standardized chart viewport hook
  const viewport = useChartViewport({
    margin: MARGIN,
    minScale: 0.5,
    resetSignal,
  });

  // Responsive cell sizing
  const [cellSize, setCellSize] = useState(40);

  // Hover state
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Calculate dimensions
  const gridSize = people.length * cellSize;
  const width = Math.max(
    viewport.dimensions.width,
    MARGIN.left + gridSize + MARGIN.right
  );
  const height = Math.max(
    viewport.dimensions.height,
    MARGIN.top + gridSize + MARGIN.bottom
  );

  // Create lookup for matrix cells
  const matrixLookup = useMemo(() => {
    const lookup = new Map<string, MatrixCell>();
    matrix.forEach((cell) => {
      lookup.set(`${cell.personId}-${cell.relatedPersonId}`, cell);
    });
    return lookup;
  }, [matrix]);

  // Responsive cell sizing based on container
  useEffect(() => {
    if (!viewport.containerRef.current) return;

    const updateSizes = () => {
      const container = viewport.containerRef.current!;
      const available =
        container.clientWidth > 0 ? container.clientWidth : window.innerWidth;
      const base = available / Math.max(people.length + 2, 3);
      // clamp for legibility
      setCellSize(Math.min(Math.max(base, 24), 64));
    };

    updateSizes();
    const ro = new ResizeObserver(updateSizes);
    ro.observe(viewport.containerRef.current);
    return () => ro.disconnect();
  }, [people.length, viewport.containerRef]);

  // Fit content to viewport when dimensions change
  useEffect(() => {
    if (width > 0 && height > 0) {
      const bounds = calculateLinearBounds(width, height);
      viewport.fitContent(bounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  if (people.length === 0) {
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
      className="bg-card relative h-full min-h-[70vh] w-full overflow-hidden rounded-lg border"
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
              {/* Grid cells */}
              {people.map((rowPerson, rowIndex) =>
                people.map((colPerson, colIndex) => {
                  const cell = matrixLookup.get(
                    `${rowPerson.id}-${colPerson.id}`
                  );
                  const x = MARGIN.left + colIndex * cellSize;
                  const y = MARGIN.top + rowIndex * cellSize;
                  const cellKey = `${rowPerson.id}-${colPerson.id}`;
                  const isHovered = hoveredCell === cellKey;

                  return (
                    <G
                      key={cellKey}
                      transform={`translate(${x}, ${y})`}
                      onMouseEnter={() =>
                        cell?.relationshipType && setHoveredCell(cellKey)
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => {
                        if (rowPerson.id !== colPerson.id) {
                          onNodeClick?.(rowPerson.id);
                        }
                      }}
                    >
                      {/* Cell background */}
                      <Rect
                        width={cellSize}
                        height={cellSize}
                        fill={
                          cell?.relationshipType
                            ? relationshipColors[cell.relationshipType] ||
                              "var(--color-muted)"
                            : "var(--color-background)"
                        }
                        stroke="var(--color-border)"
                        strokeWidth={1}
                        opacity={
                          isHovered ? 1 : cell?.relationshipType ? 0.7 : 0.3
                        }
                      />

                      {/* Relationship label */}
                      {cell?.relationshipType &&
                        cell.relationshipType !== "SELF" && (
                          <Text
                            x={cellSize / 2}
                            y={cellSize / 2}
                            dy="0.35em"
                            textAnchor="middle"
                            fill="var(--color-foreground)"
                            fontSize={9}
                            fontWeight="600"
                            pointerEvents="none"
                          >
                            {relationshipLabels[cell.relationshipType] || "?"}
                          </Text>
                        )}
                    </G>
                  );
                })
              )}

              {/* Row labels (left side) */}
              {people.map((person, index) => {
                const y = MARGIN.top + index * cellSize + cellSize / 2;

                return (
                  <G
                    key={`row-label-${person.id}`}
                    onClick={() => onNodeClick?.(person.id)}
                  >
                    <Text
                      x={MARGIN.left - 10}
                      y={y}
                      dy="0.35em"
                      textAnchor="end"
                      fill="var(--color-foreground)"
                      fontSize={11}
                      fontWeight="500"
                    >
                      {`${person.firstName} ${person.lastName}`.substring(
                        0,
                        18
                      )}
                    </Text>

                    {/* Gender indicator */}
                    <Circle
                      cx={MARGIN.left - LABEL_WIDTH + 10}
                      cy={y}
                      r={4}
                      fill={
                        person.gender === "MALE"
                          ? "var(--color-chart-1)"
                          : person.gender === "FEMALE"
                            ? "var(--color-chart-3)"
                            : "var(--color-muted-foreground)"
                      }
                    />
                  </G>
                );
              })}

              {/* Column labels (top) */}
              {people.map((person, index) => {
                const x = MARGIN.left + index * cellSize + cellSize / 2;

                return (
                  <G
                    key={`col-label-${person.id}`}
                    onClick={() => onNodeClick?.(person.id)}
                  >
                    <Text
                      x={x}
                      y={MARGIN.top - 10}
                      textAnchor="start"
                      transform={`rotate(-45, ${x}, ${MARGIN.top - 10})`}
                      fill="var(--color-foreground)"
                      fontSize={11}
                      fontWeight="500"
                    >
                      {`${person.firstName} ${person.lastName}`.substring(
                        0,
                        15
                      )}
                    </Text>
                  </G>
                );
              })}

              {/* Grid lines */}
              {/* Horizontal lines */}
              {Array.from({ length: people.length + 1 }).map((_, i) => (
                <Line
                  key={`h-line-${i}`}
                  x1={MARGIN.left}
                  x2={MARGIN.left + gridSize}
                  y1={MARGIN.top + i * cellSize}
                  y2={MARGIN.top + i * cellSize}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
              ))}

              {/* Vertical lines */}
              {Array.from({ length: people.length + 1 }).map((_, i) => (
                <Line
                  key={`v-line-${i}`}
                  x1={MARGIN.left + i * cellSize}
                  x2={MARGIN.left + i * cellSize}
                  y1={MARGIN.top}
                  y2={MARGIN.top + gridSize}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
              ))}
            </G>
          </Svg>

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

export const RelationshipMatrix = memo(RelationshipMatrixComponent);
