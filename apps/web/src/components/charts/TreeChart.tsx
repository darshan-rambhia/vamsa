"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { G, Svg } from "react-native-svg";
import { useNavigate } from "@tanstack/react-router";
import { ParentChildEdge, RectNode, SpouseEdge } from "./ChartElements";
import { ChartTooltip } from "./ChartTooltip";
import { ChartSkeleton } from "./ChartSkeleton";
import { ZoomControls } from "./ZoomControls";
import {
  calculateBoundsFromPositions,
  useChartViewport,
} from "./useChartViewport";
import type { Position } from "~/lib/d3-utils";
import type { ChartEdge, ChartNode } from "~/server/charts";
import {
  useChartLoadingState,
  usePerformanceMonitor,
  useVisibleEdges,
  useVisibleNodes,
} from "~/lib/chart-performance";

interface TreeChartProps {
  nodes: Array<ChartNode>;
  edges: Array<ChartEdge>;
  onNodeClick?: (nodeId: string) => void;
  rootPersonId?: string;
  resetSignal?: number;
}

// Layout constants
const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const HORIZONTAL_SPACING = 40;
const SPOUSE_SPACING = 200;
const VERTICAL_SPACING = 120;
const MARGIN = { top: 60, right: 60, bottom: 60, left: 60 };

/**
 * Groups nodes by generation and sorts siblings by birth date
 */
function groupAndSortByGeneration(
  nodes: Array<ChartNode>
): Map<number, Array<ChartNode>> {
  const generations = new Map<number, Array<ChartNode>>();

  nodes.forEach((node) => {
    const gen = node.generation ?? 0;
    if (!generations.has(gen)) {
      generations.set(gen, []);
    }
    generations.get(gen)!.push(node);
  });

  // Sort each generation by birth date
  generations.forEach((genNodes) => {
    genNodes.sort((a, b) => {
      if (!a.dateOfBirth && !b.dateOfBirth) return 0;
      if (!a.dateOfBirth) return 1;
      if (!b.dateOfBirth) return -1;
      return a.dateOfBirth.localeCompare(b.dateOfBirth);
    });
  });

  return generations;
}

/**
 * Calculates positions for all nodes in a tree layout
 * Generation 0 is centered, negative generations above, positive below
 */
function calculateTreeLayout(
  nodes: Array<ChartNode>,
  edges: Array<ChartEdge>
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const generations = groupAndSortByGeneration(nodes);

  // Build spouse map for couple positioning
  const spouseEdges = edges.filter((e) => e.type === "spouse");
  const spouseMap = new Map<string, string>();
  spouseEdges.forEach((e) => {
    spouseMap.set(e.source, e.target);
    spouseMap.set(e.target, e.source);
  });

  // Sort generation keys (negative to positive)
  const sortedGens = Array.from(generations.keys()).sort((a, b) => a - b);

  // Find the middle generation (typically 0)
  const midGen =
    sortedGens.find((g) => g === 0) ??
    sortedGens[Math.floor(sortedGens.length / 2)];

  sortedGens.forEach((gen) => {
    const genNodes = generations.get(gen)!;
    const yPos = (gen - midGen) * VERTICAL_SPACING;

    // Group nodes into couples and singles
    const couples: Array<{ primary: ChartNode; spouse: ChartNode | null }> = [];
    const processed = new Set<string>();

    genNodes.forEach((node) => {
      if (processed.has(node.id)) return;
      processed.add(node.id);

      const spouseId = spouseMap.get(node.id);
      const spouseNode = spouseId
        ? genNodes.find((n) => n.id === spouseId)
        : null;

      if (spouseNode && !processed.has(spouseNode.id)) {
        processed.add(spouseNode.id);
        couples.push({ primary: node, spouse: spouseNode });
      } else {
        couples.push({ primary: node, spouse: null });
      }
    });

    // Calculate widths
    const coupleWidths = couples.map((c) =>
      c.spouse ? NODE_WIDTH * 2 + SPOUSE_SPACING : NODE_WIDTH
    );
    const totalWidth =
      coupleWidths.reduce((sum, w) => sum + w, 0) +
      (couples.length - 1) * HORIZONTAL_SPACING;

    // Center the generation
    let x = -totalWidth / 2;

    couples.forEach((couple, i) => {
      const width = coupleWidths[i];
      if (couple.spouse) {
        // Position couple side by side
        positions.set(couple.primary.id, { x: x + NODE_WIDTH / 2, y: yPos });
        positions.set(couple.spouse.id, {
          x: x + NODE_WIDTH / 2 + NODE_WIDTH + SPOUSE_SPACING - NODE_WIDTH,
          y: yPos,
        });
      } else {
        // Single person
        positions.set(couple.primary.id, { x: x + width / 2, y: yPos });
      }
      x += width + HORIZONTAL_SPACING;
    });
  });

  return positions;
}

function TreeChartComponent({
  nodes,
  edges,
  onNodeClick,
  rootPersonId,
  resetSignal,
}: TreeChartProps) {
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
  usePerformanceMonitor("TreeChart", false);

  // Loading state for large datasets
  const loadingState = useChartLoadingState(nodes.length);

  // Calculate layout positions
  const nodePositions = useMemo(() => {
    if (nodes.length === 0) return new Map<string, Position>();
    const startTime = performance.now();
    const positions = calculateTreeLayout(nodes, edges);
    const endTime = performance.now();
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(
        `[Performance] TreeChart layout calculated in ${(endTime - startTime).toFixed(2)}ms`
      );
    }
    return positions;
  }, [nodes, edges]);

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
              {visibleEdges.map((edge, i) => {
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
              {visibleNodes.map((node) => {
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
                tooltip.node.generation !== undefined
                  ? tooltip.node.generation === 0
                    ? "Center"
                    : tooltip.node.generation < 0
                      ? `${Math.abs(tooltip.node.generation)} generation${Math.abs(tooltip.node.generation) > 1 ? "s" : ""} up`
                      : `${tooltip.node.generation} generation${tooltip.node.generation > 1 ? "s" : ""} down`
                  : undefined
              }
            />
          )}

          {/* Node count indicator for virtualized rendering */}
          {isVirtualized && (
            <div className="text-muted-foreground absolute bottom-2 left-2 rounded bg-black/5 px-2 py-1 text-xs backdrop-blur-sm">
              Rendering {visibleNodes.length} of {nodes.length} nodes
            </div>
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
export const TreeChart = memo(TreeChartComponent);
