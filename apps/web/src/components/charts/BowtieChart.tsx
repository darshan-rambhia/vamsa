"use client";

import { useState, memo, useMemo, useCallback, useRef } from "react";
import { Svg, G, Rect, Text, Line, Path } from "react-native-svg";
import * as d3 from "d3";
import type { BowtieNode, ChartEdge } from "~/server/charts";
import {
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

// Layout constants
const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;
const LEVEL_HEIGHT = 100;
const HORIZONTAL_GAP = 80;

interface NodePosition {
  x: number;
  y: number;
}

interface BowtieNodeProps {
  node: BowtieNode;
  x: number;
  y: number;
  width: number;
  height: number;
  isRoot: boolean;
  onClick?: (node: BowtieNode) => void;
}

/**
 * Bowtie node component with side-specific styling
 */
function BowtieNodeComponent({
  node,
  x,
  y,
  width,
  height,
  isRoot,
  onClick,
}: BowtieNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sideColor =
    node.side === "paternal"
      ? "var(--color-chart-1)"
      : node.side === "maternal"
        ? "var(--color-chart-3)"
        : "var(--color-primary)";

  const fillColor = isHovered
    ? "var(--color-accent)"
    : isRoot
      ? "color-mix(in oklch, var(--color-primary) 15%, transparent)"
      : node.isLiving
        ? "var(--color-card)"
        : "var(--color-muted)";

  const strokeColor = isRoot ? "var(--color-primary)" : sideColor;
  const strokeWidth = isRoot ? 3 : 2;
  const borderRadius = isRoot ? 12 : 8;

  // Format dates
  const dateText = [];
  if (node.dateOfBirth) {
    dateText.push(new Date(node.dateOfBirth).getFullYear());
  }
  if (node.dateOfPassing) {
    dateText.push(new Date(node.dateOfPassing).getFullYear());
  }

  const displayName = `${node.firstName} ${node.lastName}`;
  const truncatedName =
    displayName.length > 20
      ? displayName.substring(0, 18) + "..."
      : displayName;

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  const handleClick = () => onClick?.(node);

  return (
    <G
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      cursor="pointer"
    >
      {/* Background rectangle */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={borderRadius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Side indicator stripe */}
      {!isRoot && (
        <Rect x={x} y={y} width={4} height={height} rx={2} fill={sideColor} />
      )}

      {/* Name text */}
      <Text
        x={x + width / 2}
        y={y + height / 2 - 6}
        textAnchor="middle"
        fill="var(--color-foreground)"
        fontSize="12"
        fontWeight={isRoot ? "700" : "600"}
      >
        {truncatedName}
      </Text>

      {/* Birth/death dates */}
      {dateText.length > 0 && (
        <Text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="var(--color-muted-foreground)"
          fontSize="10"
        >
          {dateText.join(" - ")}
        </Text>
      )}

      {/* Living indicator */}
      <circle
        cx={x + width - 12}
        cy={y + 12}
        r={4}
        fill={
          node.isLiving
            ? "var(--color-primary)"
            : "var(--color-muted-foreground)"
        }
      />

      {/* Gender indicator */}
      {node.gender && (
        <Text
          x={x + width - 24}
          y={y + 15}
          fill="var(--color-muted-foreground)"
          fontSize="10"
        >
          {node.gender === "MALE" ? "M" : node.gender === "FEMALE" ? "F" : ""}
        </Text>
      )}
    </G>
  );
}

/**
 * Calculate layout positions for bowtie chart
 */
function calculateBowtieLayout(
  nodes: BowtieNode[],
  rootPersonId: string,
  centerX: number,
  centerY: number
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();

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

  // Position center node
  if (centerNode) {
    positions.set(centerNode.id, { x: centerX, y: centerY });
  }

  // Position paternal nodes (left side)
  paternalGens.forEach((genNodes, gen) => {
    const yPos = centerY - gen * LEVEL_HEIGHT;
    const leftWidth =
      (paternalGens.get(gen)?.length || 1) * (NODE_WIDTH + HORIZONTAL_GAP / 2);
    const startX = centerX - HORIZONTAL_GAP - leftWidth;

    genNodes.forEach((node, index) => {
      const xPos =
        startX + index * (NODE_WIDTH + HORIZONTAL_GAP / 2) + NODE_WIDTH / 2;
      positions.set(node.id, { x: xPos, y: yPos });
    });
  });

  // Position maternal nodes (right side)
  maternalGens.forEach((genNodes, gen) => {
    const yPos = centerY - gen * LEVEL_HEIGHT;
    const startX = centerX + HORIZONTAL_GAP;

    genNodes.forEach((node, index) => {
      const xPos =
        startX + index * (NODE_WIDTH + HORIZONTAL_GAP / 2) + NODE_WIDTH / 2;
      positions.set(node.id, { x: xPos, y: yPos });
    });
  });

  return positions;
}

function BowtieChartComponent({
  nodes,
  edges,
  rootPersonId,
  onNodeClick,
}: BowtieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Transform state for zoom/pan
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Performance monitoring
  usePerformanceMonitor("BowtieChart", false);

  // Loading state
  const loadingState = useChartLoadingState(nodes.length);

  // Calculate layout positions
  const { nodePositions, centerX, centerY, maxGenDepth } = useMemo(() => {
    if (nodes.length === 0) {
      return {
        nodePositions: new Map<string, NodePosition>(),
        centerX: dimensions.width / 2,
        centerY: dimensions.height / 2,
        maxGenDepth: 0,
      };
    }

    const startTime = performance.now();
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const positions = calculateBowtieLayout(nodes, rootPersonId, cx, cy);

    // Calculate max generation depth
    const paternalGens = nodes
      .filter((n) => n.side === "paternal")
      .map((n) => n.generation ?? 0);
    const maternalGens = nodes
      .filter((n) => n.side === "maternal")
      .map((n) => n.generation ?? 0);
    const maxDepth = Math.max(
      paternalGens.length > 0 ? Math.max(...paternalGens) : 0,
      maternalGens.length > 0 ? Math.max(...maternalGens) : 0
    );

    const endTime = performance.now();
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(
        `[Performance] BowtieChart layout calculated in ${(endTime - startTime).toFixed(2)}ms`
      );
    }

    return {
      nodePositions: positions,
      centerX: cx,
      centerY: cy,
      maxGenDepth: maxDepth,
    };
  }, [nodes, dimensions, rootPersonId]);

  // Calculate initial transform to center the chart
  const initialTransform = useMemo(() => {
    if (nodePositions.size === 0) {
      return { x: dimensions.width / 2, y: dimensions.height / 2, scale: 1 };
    }

    // Calculate content bounds
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodePositions.forEach((pos) => {
      minX = Math.min(minX, pos.x - NODE_WIDTH / 2);
      maxX = Math.max(maxX, pos.x + NODE_WIDTH / 2);
      minY = Math.min(minY, pos.y - NODE_HEIGHT / 2);
      maxY = Math.max(maxY, pos.y + NODE_HEIGHT / 2);
    });

    const contentWidth = maxX - minX + 60;
    const contentHeight = maxY - minY + 60;

    // Calculate scale to fit
    const scaleX = (dimensions.width * 0.9) / contentWidth;
    const scaleY = (dimensions.height * 0.9) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 0.95);

    // Calculate center offset
    const centerContentX = (minX + maxX) / 2;
    const centerContentY = (minY + maxY) / 2;

    return {
      x: dimensions.width / 2 - centerContentX * scale,
      y: dimensions.height / 2 - centerContentY * scale,
      scale,
    };
  }, [nodePositions, dimensions]);

  // Initialize transform
  useMemo(() => {
    setTransform(initialTransform);
  }, [initialTransform]);

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
      const newScale = Math.max(0.1, Math.min(4, transform.scale * delta));

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

  // Handle mouse up/leave
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: BowtieNode) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  // Update dimensions on mount and resize
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

  // Show loading skeleton for large datasets
  if (loadingState.isLoading) {
    return (
      <ChartSkeleton
        message={loadingState.message || undefined}
        estimatedTime={loadingState.estimatedTime}
      />
    );
  }

  if (nodes.length === 0) {
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
      className="bg-card relative h-full w-full overflow-hidden rounded-lg border"
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
          {/* Side labels */}
          <G>
            {/* Paternal label */}
            <Text
              x={centerX - HORIZONTAL_GAP * 2}
              y={centerY - LEVEL_HEIGHT * 0.5}
              textAnchor="middle"
              fill="var(--color-chart-1)"
              fontSize="14"
              fontWeight="700"
              letterSpacing="2"
            >
              PATERNAL
            </Text>

            {/* Maternal label */}
            <Text
              x={centerX + HORIZONTAL_GAP * 2}
              y={centerY - LEVEL_HEIGHT * 0.5}
              textAnchor="middle"
              fill="var(--color-chart-3)"
              fontSize="14"
              fontWeight="700"
              letterSpacing="2"
            >
              MATERNAL
            </Text>
          </G>

          {/* Center divider line */}
          <Line
            x1={centerX}
            x2={centerX}
            y1={centerY - (maxGenDepth + 1) * LEVEL_HEIGHT}
            y2={centerY + LEVEL_HEIGHT / 2}
            stroke="var(--color-border)"
            strokeWidth="2"
            strokeDasharray="8,4"
            opacity={0.5}
          />

          {/* Render edges */}
          <G>
            {edges.map((edge, i) => {
              const source = nodePositions.get(edge.source);
              const target = nodePositions.get(edge.target);

              if (!source || !target) return null;

              // Draw curved path
              const midY = (source.y + target.y) / 2;

              const path = d3.path();
              path.moveTo(source.x, source.y + NODE_HEIGHT / 2);
              path.bezierCurveTo(
                source.x,
                midY,
                target.x,
                midY,
                target.x,
                target.y - NODE_HEIGHT / 2
              );

              return (
                <Path
                  key={`edge-${i}-${edge.source}-${edge.target}`}
                  d={path.toString()}
                  stroke="var(--color-border)"
                  strokeWidth="2"
                  fill="none"
                />
              );
            })}
          </G>

          {/* Render nodes */}
          <G>
            {nodes.map((node) => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;

              const isRoot = node.id === rootPersonId;

              return (
                <BowtieNodeComponent
                  key={node.id}
                  node={node}
                  x={pos.x - NODE_WIDTH / 2}
                  y={pos.y - NODE_HEIGHT / 2}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  isRoot={isRoot}
                  onClick={handleNodeClick}
                />
              );
            })}
          </G>
        </G>
      </Svg>
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const BowtieChart = memo(BowtieChartComponent);
