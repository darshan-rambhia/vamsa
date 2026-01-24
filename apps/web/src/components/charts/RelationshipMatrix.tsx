"use client";

import { useState, memo, useMemo, useCallback, useRef } from "react";
import { Svg, G, Rect, Circle, Text, Line } from "react-native-svg";
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

function RelationshipMatrixComponent({
  people,
  matrix,
  onNodeClick,
  resetSignal,
}: RelationshipMatrixProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [cellSize, setCellSize] = useState(40);

  // Transform state for zoom/pan
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover state
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Layout constants
  const labelWidth = 150;
  const labelHeight = 100;
  const margin = {
    top: labelHeight,
    right: 40,
    bottom: 40,
    left: labelWidth,
  };

  // Calculate dimensions
  const gridSize = people.length * cellSize;
  const width = Math.max(
    dimensions.width,
    margin.left + gridSize + margin.right
  );
  const height = Math.max(
    dimensions.height,
    margin.top + gridSize + margin.bottom
  );

  // Create lookup for matrix cells
  const matrixLookup = useMemo(() => {
    const lookup = new Map<string, MatrixCell>();
    matrix.forEach((cell) => {
      lookup.set(`${cell.personId}-${cell.relatedPersonId}`, cell);
    });
    return lookup;
  }, [matrix]);

  // Calculate initial transform to fit content
  const initialTransform = useMemo(() => {
    const availableWidth = dimensions.width;
    const availableHeight = Math.max(600, dimensions.height);
    const scale = Math.min(
      (availableWidth * 0.9) / (width + 40),
      (availableHeight * 0.9) / (height + 40),
      1
    );
    return {
      x: 20,
      y: 20,
      scale,
    };
  }, [dimensions.width, dimensions.height, width, height]);

  // Reset view when resetSignal changes
  useMemo(() => {
    if (resetSignal !== undefined) {
      setTransform(initialTransform);
    }
  }, [resetSignal, initialTransform]);

  // Responsive cell sizing
  useMemo(() => {
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

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.3, Math.min(3, transform.scale * delta));

      const scaleChange = newScale / transform.scale;
      const newX = mouseX - (mouseX - transform.x) * scaleChange;
      const newY = mouseY - (mouseY - transform.y) * scaleChange;

      setTransform({
        x: newX,
        y: newY,
        scale: newScale,
      });
    },
    [transform]
  );

  // Handle mouse down for pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    },
    [transform]
  );

  // Handle mouse move for pan
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setTransform({
        ...transform,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart, transform]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Update dimensions on resize
  useMemo(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(600, entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize transform
  useMemo(() => {
    setTransform(initialTransform);
  }, [initialTransform]);

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
      ref={containerRef}
      className="bg-card relative h-full min-h-[70vh] w-full overflow-hidden rounded-lg border"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <Svg width={dimensions.width} height={dimensions.height}>
        <G
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {/* Grid cells */}
          {people.map((rowPerson, rowIndex) =>
            people.map((colPerson, colIndex) => {
              const cell = matrixLookup.get(`${rowPerson.id}-${colPerson.id}`);
              const x = margin.left + colIndex * cellSize;
              const y = margin.top + rowIndex * cellSize;
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
                    opacity={isHovered ? 1 : cell?.relationshipType ? 0.7 : 0.3}
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
            const y = margin.top + index * cellSize + cellSize / 2;

            return (
              <G
                key={`row-label-${person.id}`}
                onClick={() => onNodeClick?.(person.id)}
              >
                <Text
                  x={margin.left - 10}
                  y={y}
                  dy="0.35em"
                  textAnchor="end"
                  fill="var(--color-foreground)"
                  fontSize={11}
                  fontWeight="500"
                >
                  {`${person.firstName} ${person.lastName}`.substring(0, 18)}
                </Text>

                {/* Gender indicator */}
                <Circle
                  cx={margin.left - labelWidth + 10}
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
            const x = margin.left + index * cellSize + cellSize / 2;

            return (
              <G
                key={`col-label-${person.id}`}
                onClick={() => onNodeClick?.(person.id)}
              >
                <Text
                  x={x}
                  y={margin.top - 10}
                  textAnchor="start"
                  transform={`rotate(-45, ${x}, ${margin.top - 10})`}
                  fill="var(--color-foreground)"
                  fontSize={11}
                  fontWeight="500"
                >
                  {`${person.firstName} ${person.lastName}`.substring(0, 15)}
                </Text>
              </G>
            );
          })}

          {/* Grid lines */}
          {/* Horizontal lines */}
          {Array.from({ length: people.length + 1 }).map((_, i) => (
            <Line
              key={`h-line-${i}`}
              x1={margin.left}
              x2={margin.left + gridSize}
              y1={margin.top + i * cellSize}
              y2={margin.top + i * cellSize}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
          ))}

          {/* Vertical lines */}
          {Array.from({ length: people.length + 1 }).map((_, i) => (
            <Line
              key={`v-line-${i}`}
              x1={margin.left + i * cellSize}
              x2={margin.left + i * cellSize}
              y1={margin.top}
              y2={margin.top + gridSize}
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
    </div>
  );
}

export const RelationshipMatrix = memo(RelationshipMatrixComponent);
