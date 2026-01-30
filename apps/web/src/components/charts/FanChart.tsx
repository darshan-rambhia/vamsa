"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Circle, G, Line, Path, Svg } from "react-native-svg";
import * as d3 from "d3";
import { useNavigate } from "@tanstack/react-router";
import { CircleNode } from "./ChartElements";
import { ChartTooltip } from "./ChartTooltip";
import { ChartSkeleton } from "./ChartSkeleton";
import { ZoomControls } from "./ZoomControls";
import { calculateRadialBounds, useChartViewport } from "./useChartViewport";
import type { ChartEdge, ChartNode } from "~/server/charts";
import {
  useChartLoadingState,
  usePerformanceMonitor,
} from "~/lib/chart-performance";

interface FanChartProps {
  nodes: Array<ChartNode>;
  edges: Array<ChartEdge>;
  onNodeClick?: (nodeId: string) => void;
  rootPersonId?: string;
  resetSignal?: number;
}

// Layout constants
const INNER_RADIUS = 80;
const RADIUS_STEP = 100;
const NODE_RADIUS = 35;
const MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };

/**
 * Groups nodes by generation
 */
function groupByGeneration(
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
  return generations;
}

interface NodePosition {
  x: number;
  y: number;
  angle: number;
  radius: number;
}

/**
 * Calculate radial positions for all nodes
 */
function calculateRadialLayout(
  nodes: Array<ChartNode>,
  centerX: number,
  centerY: number
): Map<string, NodePosition> {
  const nodePositions = new Map<string, NodePosition>();
  const generations = groupByGeneration(nodes);

  generations.forEach((genNodes, gen) => {
    const radius = gen === 0 ? 0 : INNER_RADIUS + gen * RADIUS_STEP;
    const angleStep = gen === 0 ? 0 : (2 * Math.PI) / genNodes.length;

    genNodes.forEach((node, index) => {
      if (gen === 0) {
        // Generation 0: Center person and any spouses
        if (genNodes.length === 1) {
          // Single root node at center
          nodePositions.set(node.id, {
            x: centerX,
            y: centerY,
            angle: 0,
            radius: 0,
          });
        } else {
          // Multiple nodes at gen 0 (root + spouse): position side by side
          const spouseOffset = NODE_RADIUS * 2.5;
          const totalWidth = (genNodes.length - 1) * spouseOffset;
          const startX = centerX - totalWidth / 2;

          nodePositions.set(node.id, {
            x: startX + index * spouseOffset,
            y: centerY,
            angle: 0,
            radius: 0,
          });
        }
      } else {
        // Calculate angle - start from top and go clockwise
        const angle = -Math.PI / 2 + index * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        nodePositions.set(node.id, { x, y, angle, radius });
      }
    });
  });

  return nodePositions;
}

function FanChartComponent({
  nodes,
  edges,
  onNodeClick,
  rootPersonId,
  resetSignal,
}: FanChartProps) {
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
  usePerformanceMonitor("FanChart", false);

  // Loading state
  const loadingState = useChartLoadingState(nodes.length);

  // Calculate layout positions
  const { nodePositions, centerX, centerY, maxGen } = useMemo(() => {
    if (nodes.length === 0) {
      return {
        nodePositions: new Map<string, NodePosition>(),
        centerX: viewport.dimensions.width / 2,
        centerY: viewport.dimensions.height / 2,
        maxGen: 0,
      };
    }

    const startTime = performance.now();
    const cx = viewport.dimensions.width / 2;
    const cy = viewport.dimensions.height / 2;
    const positions = calculateRadialLayout(nodes, cx, cy);
    const generations = groupByGeneration(nodes);
    const max = Math.max(...Array.from(generations.keys()));

    const endTime = performance.now();
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(
        `[Performance] FanChart layout calculated in ${(endTime - startTime).toFixed(2)}ms`
      );
    }

    return { nodePositions: positions, centerX: cx, centerY: cy, maxGen: max };
  }, [nodes, viewport.dimensions]);

  // Fit content to viewport when layout changes
  useEffect(() => {
    if (nodePositions.size > 0) {
      const maxRadius = INNER_RADIUS + maxGen * RADIUS_STEP + NODE_RADIUS;
      const bounds = calculateRadialBounds(centerX, centerY, maxRadius);
      viewport.fitContent(bounds);
    }
  }, [nodePositions, centerX, centerY, maxGen, viewport]);

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
              (pos.x - centerX) * viewport.transform.scale,
            y:
              rect.top +
              viewport.transform.y +
              (pos.y - centerY) * viewport.transform.scale,
          },
        });
      }
    },
    [nodePositions, viewport.transform, viewport.containerRef, centerX, centerY]
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
              {/* Generation guide circles */}
              <G opacity={0.1}>
                {Array.from({ length: maxGen }, (_, i) => i + 1).map((gen) => {
                  const radius = INNER_RADIUS + gen * RADIUS_STEP;
                  return (
                    <Circle
                      key={`guide-${gen}`}
                      cx={centerX}
                      cy={centerY}
                      r={radius}
                      fill="none"
                      stroke="var(--color-border)"
                      strokeWidth="1"
                      strokeDasharray="5,5"
                    />
                  );
                })}
              </G>

              {/* Render edges */}
              <G>
                {edges.map((edge, i) => {
                  const source = nodePositions.get(edge.source);
                  const target = nodePositions.get(edge.target);

                  if (!source || !target) return null;

                  if (edge.type === "parent-child") {
                    // Radial connection from inner to outer
                    const path = d3.path();
                    path.moveTo(source.x, source.y);
                    path.lineTo(target.x, target.y);

                    return (
                      <Path
                        key={`edge-${i}-${edge.source}-${edge.target}`}
                        d={path.toString()}
                        stroke="var(--color-border)"
                        strokeWidth="2"
                        fill="none"
                      />
                    );
                  } else if (edge.type === "spouse") {
                    // Spouse connection
                    if (source.radius === 0 && target.radius === 0) {
                      // Both at center - draw straight dashed line
                      return (
                        <Line
                          key={`edge-${i}-${edge.source}-${edge.target}`}
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke="var(--color-primary)"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      );
                    } else if (
                      source.radius === target.radius &&
                      source.radius > 0
                    ) {
                      // Arc connection along the same generation circle
                      const radius = source.radius;
                      const startAngle = Math.atan2(
                        source.y - centerY,
                        source.x - centerX
                      );
                      const endAngle = Math.atan2(
                        target.y - centerY,
                        target.x - centerX
                      );

                      const arc = d3
                        .arc()
                        .innerRadius(radius)
                        .outerRadius(radius)
                        .startAngle(startAngle)
                        .endAngle(endAngle);

                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const arcPath = arc({ startAngle, endAngle } as any);

                      return (
                        <Path
                          key={`edge-${i}-${edge.source}-${edge.target}`}
                          d={arcPath || ""}
                          transform={`translate(${centerX}, ${centerY})`}
                          stroke="var(--color-primary)"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          fill="none"
                        />
                      );
                    }
                  }
                  return null;
                })}
              </G>

              {/* Render nodes */}
              <G>
                {nodes.map((node) => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;

                  const isRoot = (node.generation ?? 0) === 0;

                  return (
                    <CircleNode
                      key={node.id}
                      node={node}
                      cx={pos.x}
                      cy={pos.y}
                      radius={NODE_RADIUS}
                      isRoot={isRoot}
                      onMouseEnter={handleNodeMouseEnter}
                      onMouseLeave={handleNodeMouseLeave}
                      onClick={handleNodeClick}
                    />
                  );
                })}
              </G>
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
export const FanChart = memo(FanChartComponent);
