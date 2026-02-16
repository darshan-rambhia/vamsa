"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { G, Line, Path, Rect, Svg, Text } from "react-native-svg";
import * as d3 from "d3";
import { ChartSkeleton } from "./ChartSkeleton";
import { ZoomControls } from "./ZoomControls";
import { MiniMap } from "./MiniMap";
import {
  calculateBoundsFromPositions,
  useChartViewport,
} from "./useChartViewport";
import type { BowtieNode, ChartEdge } from "~/server/charts";
import {
  useChartLoadingState,
  usePerformanceMonitor,
  useVisibleEdges,
  useVisibleNodes,
} from "~/lib/chart-performance";

interface BowtieChartProps {
  nodes: Array<BowtieNode>;
  edges: Array<ChartEdge>;
  rootPersonId: string;
  onNodeClick?: (nodeId: string) => void;
  showMiniMap?: boolean;
}

// Layout constants
const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;
const LEVEL_HEIGHT = 100;
const HORIZONTAL_GAP = 80;
const MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };

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
  nodes: Array<BowtieNode>,
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
  const paternalGens = new Map<number, Array<BowtieNode>>();
  const maternalGens = new Map<number, Array<BowtieNode>>();

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

  // Position paternal nodes (left side) - centered within left half
  paternalGens.forEach((genNodes, gen) => {
    const yPos = centerY - gen * LEVEL_HEIGHT;
    const nodeSpacing = NODE_WIDTH + HORIZONTAL_GAP / 2;
    const totalWidth = genNodes.length * nodeSpacing - HORIZONTAL_GAP / 2;
    // Center the generation within the left side
    const startX = centerX - HORIZONTAL_GAP / 2 - totalWidth;

    genNodes.forEach((node, index) => {
      const xPos = startX + index * nodeSpacing + NODE_WIDTH / 2;
      positions.set(node.id, { x: xPos, y: yPos });
    });
  });

  // Position maternal nodes (right side) - mirror of paternal
  maternalGens.forEach((genNodes, gen) => {
    const yPos = centerY - gen * LEVEL_HEIGHT;
    const nodeSpacing = NODE_WIDTH + HORIZONTAL_GAP / 2;
    // Start from center gap
    const startX = centerX + HORIZONTAL_GAP / 2;

    genNodes.forEach((node, index) => {
      const xPos = startX + index * nodeSpacing + NODE_WIDTH / 2;
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
  showMiniMap = false,
}: BowtieChartProps) {
  // Use the standardized chart viewport hook
  const viewport = useChartViewport({
    margin: MARGIN,
  });

  // Performance monitoring
  usePerformanceMonitor("BowtieChart", false);

  // Loading state
  const loadingState = useChartLoadingState(nodes.length);

  // Calculate layout positions
  const { nodePositions, centerX, centerY, maxGenDepth } = useMemo(() => {
    if (nodes.length === 0) {
      return {
        nodePositions: new Map<string, NodePosition>(),
        centerX: viewport.dimensions.width / 2,
        centerY: viewport.dimensions.height / 2,
        maxGenDepth: 0,
      };
    }

    const startTime = performance.now();
    const cx = viewport.dimensions.width / 2;
    const cy = viewport.dimensions.height / 2;
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
  }, [nodes, viewport.dimensions, rootPersonId]);

  // Virtual rendering: only render visible nodes for large datasets
  const visibleNodes = useVisibleNodes(
    nodes,
    nodePositions,
    viewport.viewportBounds
  );
  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes]
  );
  const visibleEdges = useVisibleEdges(edges, visibleNodeIds);
  const isVirtualized =
    nodes.length >= 500 && visibleNodes.length < nodes.length;

  // Fit content to viewport when layout changes
  useEffect(() => {
    if (nodePositions.size > 0) {
      const bounds = calculateBoundsFromPositions(
        nodePositions,
        NODE_WIDTH,
        NODE_HEIGHT
      );
      viewport.fitContent(bounds);
    }
  }, [nodePositions, viewport]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: BowtieNode) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  // Calculate tree bounds and viewport for mini-map
  const miniMapData = useMemo(() => {
    if (!showMiniMap || nodePositions.size === 0) return null;

    const bounds = calculateBoundsFromPositions(
      nodePositions,
      NODE_WIDTH,
      NODE_HEIGHT
    );

    // Normalize node positions to start at (0, 0) relative to bounds
    const nodeArray = Array.from(nodePositions.entries()).map(([id, pos]) => {
      const node = nodes.find((n) => n.id === id);
      return {
        id,
        x: pos.x - bounds.minX,
        y: pos.y - bounds.minY,
        generation: node?.generation,
      };
    });

    // Calculate current viewport in tree coordinates (normalized to bounds origin)
    const viewportX =
      -viewport.transform.x / viewport.transform.scale - bounds.minX;
    const viewportY =
      -viewport.transform.y / viewport.transform.scale - bounds.minY;

    const viewportInTreeCoords = {
      x: viewportX,
      y: viewportY,
      width: viewport.dimensions.width / viewport.transform.scale,
      height: viewport.dimensions.height / viewport.transform.scale,
    };

    return {
      treeBounds: {
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      },
      viewport: viewportInTreeCoords,
      nodePositions: nodeArray,
      boundsOffset: { x: bounds.minX, y: bounds.minY },
    };
  }, [showMiniMap, nodePositions, nodes, viewport]);

  // Handle mini-map navigation
  const handleMiniMapNavigate = useCallback(
    (x: number, y: number) => {
      // Add back the bounds offset to convert from normalized to actual tree coords
      if (miniMapData) {
        const actualX = x + miniMapData.boundsOffset.x;
        const actualY = y + miniMapData.boundsOffset.y;
        viewport.controls.panTo(actualX, actualY);
      }
    },
    [viewport.controls, miniMapData]
  );

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

  // Always render the container so ResizeObserver can measure it
  // Only render SVG content once we have valid dimensions
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
                {visibleEdges.map((edge, i) => {
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
                {visibleNodes.map((node) => {
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

          {/* Zoom controls */}
          <ZoomControls
            scale={viewport.transform.scale}
            onZoomIn={viewport.controls.zoomIn}
            onZoomOut={viewport.controls.zoomOut}
            onReset={viewport.controls.reset}
          />

          {/* Mini-map overlay */}
          {miniMapData && (
            <MiniMap
              treeBounds={miniMapData.treeBounds}
              viewport={miniMapData.viewport}
              onNavigate={handleMiniMapNavigate}
              nodePositions={miniMapData.nodePositions}
              rootPersonId={rootPersonId}
            />
          )}

          {/* Node count indicator for virtualized rendering */}
          {isVirtualized && (
            <div className="text-muted-foreground absolute bottom-2 left-2 rounded bg-black/5 px-2 py-1 text-xs backdrop-blur-sm">
              Rendering {visibleNodes.length} of {nodes.length} nodes
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const BowtieChart = memo(BowtieChartComponent);
