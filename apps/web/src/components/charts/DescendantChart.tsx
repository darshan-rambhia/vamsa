"use client";

import { useState, memo, useMemo, useCallback, useRef } from "react";
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
import { useNavigate } from "@tanstack/react-router";

interface DescendantChartProps {
  nodes: ChartNode[];
  edges: ChartEdge[];
  onNodeClick?: (nodeId: string) => void;
  rootPersonId?: string;
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

/**
 * Calculate bounds for centering and fitting
 */
function calculateBounds(positions: Map<string, Position>) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x - NODE_WIDTH / 2);
    maxX = Math.max(maxX, pos.x + NODE_WIDTH / 2);
    minY = Math.min(minY, pos.y - NODE_HEIGHT / 2);
    maxY = Math.max(maxY, pos.y + NODE_HEIGHT / 2);
  });

  return { minX, maxX, minY, maxY };
}

function DescendantChartComponent({
  nodes,
  edges,
  onNodeClick,
  rootPersonId,
}: DescendantChartProps) {
  const navigate = useNavigate();
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
    const positions = calculateDescendantLayout(nodes, edges, dimensions.width);
    const endTime = performance.now();
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(
        `[Performance] DescendantChart layout calculated in ${(endTime - startTime).toFixed(2)}ms`
      );
    }
    return positions;
  }, [nodes, edges, dimensions.width]);

  // Calculate initial view transform to center the chart
  const initialTransform = useMemo(() => {
    if (nodePositions.size === 0) {
      return { x: dimensions.width / 2, y: dimensions.height / 2, scale: 1 };
    }

    const bounds = calculateBounds(nodePositions);
    const contentWidth = bounds.maxX - bounds.minX + MARGIN.left + MARGIN.right;
    const contentHeight =
      bounds.maxY - bounds.minY + MARGIN.top + MARGIN.bottom;

    // Calculate scale to fit content
    const scaleX = dimensions.width / contentWidth;
    const scaleY = dimensions.height / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1:1

    // Calculate center offset
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    return {
      x: dimensions.width / 2 - centerX * scale,
      y: dimensions.height / 2 - centerY * scale,
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

      // Calculate mouse position relative to container
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate zoom delta
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(4, transform.scale * delta));

      // Adjust position to zoom towards mouse
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
      if (e.button !== 0) return; // Only left click
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

  // Handle mouse up to stop pan
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse leave to stop pan
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Handle node interactions
  const handleNodeMouseEnter = useCallback(
    (node: ChartNode) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const pos = nodePositions.get(node.id);
      if (rect && pos) {
        setTooltip({
          node,
          position: {
            x: rect.left + transform.x + pos.x * transform.scale,
            y: rect.top + transform.y + pos.y * transform.scale,
          },
        });
      }
    },
    [nodePositions, transform]
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
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const DescendantChart = memo(DescendantChartComponent);
