"use client";

import { useState, memo, useMemo, useCallback, useEffect } from "react";
import { Svg, G } from "react-native-svg";
import type { ChartNode, ChartEdge } from "~/server/charts";
import { RectNode, ParentChildEdge, SpouseEdge } from "./ChartElements";
import type { Position } from "~/lib/d3-utils";
import {
  useChartLoadingState,
  usePerformanceMonitor,
} from "~/lib/chart-performance";
import { ChartTooltip } from "./ChartTooltip";
import { ChartSkeleton } from "./ChartSkeleton";
import { ZoomControls } from "./ZoomControls";
import {
  useChartViewport,
  calculateBoundsFromPositions,
} from "./useChartViewport";
import { useNavigate } from "@tanstack/react-router";

interface DescendantChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  onNodeClick?: (nodeId: string) => void;
  rootPersonId?: string;
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
 * Calculates positions for all nodes in descendant layout
 */
function calculateDescendantLayout(
  nodes: ChartNode[],
  edges: ChartEdge[],
  width: number
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const generations = groupByGeneration(nodes);

  // Build spouse map for couple positioning
  const spouseEdges = edges.filter((e) => e.type === "spouse");
  const spouseMap = new Map<string, string>();
  spouseEdges.forEach((e) => {
    spouseMap.set(e.source, e.target);
    spouseMap.set(e.target, e.source);
  });

  generations.forEach((genNodes, gen) => {
    const yPos = MARGIN.top + gen * LEVEL_HEIGHT;
    const totalWidth = genNodes.length * NODE_WIDTH * 1.5;
    const startX = (width - totalWidth) / 2;

    genNodes.forEach((node, index) => {
      const xPos = startX + index * NODE_WIDTH * 1.5 + NODE_WIDTH / 2;
      positions.set(node.id, { x: xPos, y: yPos });
    });
  });

  return positions;
}

function DescendantChartComponent({
  nodes,
  edges,
  onNodeClick,
  rootPersonId,
  resetSignal,
}: DescendantChartProps) {
  const navigate = useNavigate();

  // Use the standardized chart viewport hook
  const viewport = useChartViewport({
    margin: MARGIN,
    resetSignal,
  });

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    node: ChartNode;
    position: { x: number; y: number };
  } | null>(null);

  // Performance monitoring
  usePerformanceMonitor("DescendantChart", false);

  // Loading state for large datasets
  const loadingState = useChartLoadingState(nodes.length);

  // Calculate layout positions
  const nodePositions = useMemo(() => {
    if (nodes.length === 0) return new Map<string, Position>();
    const startTime = performance.now();
    const positions = calculateDescendantLayout(
      nodes,
      edges,
      viewport.dimensions.width
    );
    const endTime = performance.now();
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(
        `[Performance] DescendantChart layout calculated in ${(endTime - startTime).toFixed(2)}ms`
      );
    }
    return positions;
  }, [nodes, edges, viewport.dimensions.width]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodePositions]);

  // Handle node interactions
  const handleNodeMouseEnter = useCallback(
    (node: ChartNode) => {
      const rect = viewport.containerRef.current?.getBoundingClientRect();
      const pos = nodePositions.get(node.id);
      if (rect && pos) {
        setTooltip({
          node,
          position: {
            x:
              rect.left +
              viewport.transform.x +
              pos.x * viewport.transform.scale,
            y:
              rect.top +
              viewport.transform.y +
              pos.y * viewport.transform.scale,
          },
        });
      }
    },
    [nodePositions, viewport.transform, viewport.containerRef]
  );

  const handleNodeMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleNodeClick = useCallback(
    (node: ChartNode) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  // Handle tooltip actions
  const handleViewProfile = useCallback(
    (nodeId: string) => {
      navigate({ to: "/people/$personId", params: { personId: nodeId } });
      setTooltip(null);
    },
    [navigate]
  );

  const handleSetAsCenter = useCallback(
    (nodeId: string) => {
      onNodeClick?.(nodeId);
      setTooltip(null);
    },
    [onNodeClick]
  );

  // Use provided root or first node
  const effectiveRootId = rootPersonId || nodes[0]?.id;

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
              {/* Render edges first (behind nodes) */}
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
                  return (
                    <SpouseEdge
                      key={`edge-${i}-${edge.source}-${edge.target}`}
                      sourceX={source.x}
                      sourceY={source.y}
                      targetX={target.x}
                      targetY={target.y}
                      nodeWidth={NODE_WIDTH}
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
                    onMouseEnter={handleNodeMouseEnter}
                    onMouseLeave={handleNodeMouseLeave}
                    onClick={handleNodeClick}
                  />
                );
              })}
            </G>
          </Svg>

          {/* Tooltip */}
          {tooltip && effectiveRootId && (
            <ChartTooltip
              node={tooltip.node}
              position={tooltip.position}
              rootPersonId={effectiveRootId}
              onSetAsCenter={handleSetAsCenter}
              onViewProfile={handleViewProfile}
              relationshipLabel={
                tooltip.node.generation
                  ? `Generation ${tooltip.node.generation}`
                  : undefined
              }
            />
          )}

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

// Export memoized version to prevent unnecessary re-renders
export const DescendantChart = memo(DescendantChartComponent);
