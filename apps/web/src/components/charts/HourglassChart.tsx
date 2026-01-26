"use client";

import { memo, useMemo, useCallback, useEffect } from "react";
import { Svg, G, Line } from "react-native-svg";
import type { ChartNode, ChartEdge } from "~/server/charts";
import { RectNode, ParentChildEdge } from "./ChartElements";
import type { Position } from "~/lib/d3-utils";
import {
  useChartLoadingState,
  usePerformanceMonitor,
} from "~/lib/chart-performance";
import { ChartSkeleton } from "./ChartSkeleton";
import { ZoomControls } from "./ZoomControls";
import {
  useChartViewport,
  calculateBoundsFromPositions,
} from "./useChartViewport";

interface HourglassChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  rootPersonId: string;
  onNodeClick?: (nodeId: string) => void;
  resetSignal?: number;
}

// Layout constants
const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const LEVEL_HEIGHT = 120;
const MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };

/**
 * Groups nodes by generation
 */
function groupByGeneration(nodes: ChartNode[]): Map<number, ChartNode[]> {
  const generations = new Map<number, ChartNode[]>();
  nodes.forEach((node) => {
    const gen = node.generation ?? 0;
    if (!generations.has(gen)) {
      generations.set(gen, []);
    }
    generations.get(gen)!.push(node);
  });
  return generations;
}

/**
 * Calculates positions for hourglass layout
 * Ancestors above center, descendants below
 */
function calculateHourglassLayout(
  nodes: ChartNode[],
  rootPersonId: string,
  width: number,
  height: number
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const centerY = height / 2;

  // Find root node
  const rootNode = nodes.find((n) => n.id === rootPersonId);

  // Separate ancestors and descendants
  const ancestors: ChartNode[] = [];
  const descendants: ChartNode[] = [];

  nodes.forEach((node) => {
    if (node.id === rootPersonId) {
      return; // Handle root separately
    }

    // Ancestors have positive generation values
    if (node.generation && node.generation > 0) {
      ancestors.push(node);
    } else {
      descendants.push(node);
    }
  });

  // Position root node at center
  if (rootNode) {
    positions.set(rootNode.id, { x: width / 2, y: centerY });
  }

  // Group by generation
  const ancestorGens = groupByGeneration(ancestors);
  const descendantGens = new Map<number, ChartNode[]>();

  descendants.forEach((node) => {
    const gen = Math.abs(node.generation ?? 0);
    if (!descendantGens.has(gen)) descendantGens.set(gen, []);
    descendantGens.get(gen)!.push(node);
  });

  // Position ancestors (going up)
  ancestorGens.forEach((genNodes, gen) => {
    const yPos = centerY - gen * LEVEL_HEIGHT;
    const totalWidth = genNodes.length * NODE_WIDTH * 1.5;
    const startX = (width - totalWidth) / 2;

    genNodes.forEach((node, index) => {
      const xPos = startX + index * NODE_WIDTH * 1.5 + NODE_WIDTH / 2;
      positions.set(node.id, { x: xPos, y: yPos });
    });
  });

  // Position descendants (going down)
  descendantGens.forEach((genNodes, gen) => {
    if (gen === 0) return; // Skip root
    const yPos = centerY + gen * LEVEL_HEIGHT;
    const totalWidth = genNodes.length * NODE_WIDTH * 1.5;
    const startX = (width - totalWidth) / 2;

    genNodes.forEach((node, index) => {
      const xPos = startX + index * NODE_WIDTH * 1.5 + NODE_WIDTH / 2;
      positions.set(node.id, { x: xPos, y: yPos });
    });
  });

  return positions;
}

function HourglassChartComponent({
  nodes,
  edges,
  rootPersonId,
  onNodeClick,
  resetSignal,
}: HourglassChartProps) {
  // Use the standardized chart viewport hook
  const viewport = useChartViewport({
    margin: MARGIN,
    resetSignal,
  });

  // Performance monitoring
  usePerformanceMonitor("HourglassChart", false);

  // Loading state
  const loadingState = useChartLoadingState(nodes.length);

  // Calculate layout positions
  const nodePositions = useMemo(() => {
    if (nodes.length === 0) return new Map<string, Position>();
    const startTime = performance.now();
    const positions = calculateHourglassLayout(
      nodes,
      rootPersonId,
      viewport.dimensions.width,
      viewport.dimensions.height
    );
    const endTime = performance.now();
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(
        `[Performance] HourglassChart layout calculated in ${(endTime - startTime).toFixed(2)}ms`
      );
    }
    return positions;
  }, [nodes, rootPersonId, viewport.dimensions]);

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
  }, [nodePositions, viewport.fitContent]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: ChartNode) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  // Show loading skeleton
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
              {/* Render edges first */}
              {edges.map((edge, i) => {
                const source = nodePositions.get(edge.source);
                const target = nodePositions.get(edge.target);

                if (!source || !target) return null;

                if (edge.type === "parent-child") {
                  return (
                    <ParentChildEdge
                      key={`edge-${i}-${edge.source}-${edge.target}`}
                      sourceX={source.x}
                      sourceY={source.y}
                      targetX={target.x}
                      targetY={target.y}
                      nodeHeight={NODE_HEIGHT}
                    />
                  );
                } else if (edge.type === "spouse") {
                  // Spouse edge (dashed horizontal line)
                  return (
                    <Line
                      key={`edge-${i}-${edge.source}-${edge.target}`}
                      x1={Math.min(source.x, target.x) + NODE_WIDTH / 2}
                      y1={source.y}
                      x2={Math.max(source.x, target.x) - NODE_WIDTH / 2}
                      y2={target.y}
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      strokeDasharray="5,5"
                    />
                  );
                }
                return null;
              })}

              {/* Render nodes */}
              {nodes.map((node) => {
                const pos = nodePositions.get(node.id);
                if (!pos) return null;

                const isRoot = node.id === rootPersonId;

                return (
                  <RectNode
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

// Export memoized version
export const HourglassChart = memo(HourglassChartComponent);
