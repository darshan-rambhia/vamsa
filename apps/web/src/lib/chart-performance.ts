import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ChartEdge, ChartNode } from "~/server/charts";
import type { Position } from "./d3-utils";

/**
 * Performance utilities for chart rendering optimizations
 * Provides memoization, debouncing, and virtual rendering helpers
 */

/**
 * Memoized calculation of node positions by generation
 * Prevents expensive recalculations when data hasn't changed
 */
export function useNodePositions(
  nodes: Array<ChartNode>,
  width: number,
  nodeWidth: number,
  levelHeight: number,
  marginTop: number
): Map<string, Position> {
  return useMemo(() => {
    const nodePositions = new Map<string, Position>();

    // Group nodes by generation
    const generations = new Map<number, Array<ChartNode>>();
    nodes.forEach((node) => {
      const gen = node.generation ?? 0;
      if (!generations.has(gen)) {
        generations.set(gen, []);
      }
      generations.get(gen)!.push(node);
    });

    // Calculate positions
    generations.forEach((genNodes, gen) => {
      const yPos = marginTop + gen * levelHeight;
      const totalWidth = genNodes.length * nodeWidth * 1.5;
      const startX = (width - totalWidth) / 2;

      genNodes.forEach((node, index) => {
        const xPos = startX + index * nodeWidth * 1.5 + nodeWidth / 2;
        nodePositions.set(node.id, { x: xPos, y: yPos });
      });
    });

    return nodePositions;
  }, [nodes, width, nodeWidth, levelHeight, marginTop]);
}

/**
 * Memoized calculation of chart dimensions
 */
export function useChartDimensions(
  containerWidth: number,
  nodeCount: number,
  minHeight = 600
) {
  return useMemo(() => {
    return {
      width: containerWidth,
      height: Math.max(minHeight, nodeCount * 80),
    };
  }, [containerWidth, nodeCount, minHeight]);
}

/**
 * Debounced zoom/pan handler using TanStack Pacer
 * Returns a callback that will be debounced to achieve 60fps (16ms)
 */
export function useDebouncedZoom<T extends Array<unknown>>(
  callback: (...args: T) => void,
  delay = 16 // 16ms = 60fps
) {
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback reference fresh
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Scheduled animation using requestAnimationFrame
 * Coordinates animations to avoid layout thrashing
 */
export function useScheduledAnimation() {
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return useCallback((fn: () => void) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(fn);
  }, []);
}

/**
 * Memoized edge filtering
 * Only returns edges that have both source and target nodes present
 */
export function useValidEdges(
  edges: Array<ChartEdge>,
  nodePositions: Map<string, Position>
): Array<ChartEdge> {
  return useMemo(() => {
    return edges.filter(
      (edge) => nodePositions.has(edge.source) && nodePositions.has(edge.target)
    );
  }, [edges, nodePositions]);
}

/**
 * Virtual rendering helper - returns only visible nodes
 * For future optimization when dealing with very large datasets
 */
export function useVisibleNodes(
  nodes: Array<ChartNode>,
  nodePositions: Map<string, Position>,
  viewport: { x: number; y: number; width: number; height: number } | null
): Array<ChartNode> {
  return useMemo(() => {
    // If no viewport provided, return all nodes
    if (!viewport) return nodes;

    // Filter nodes that are within viewport bounds (with padding)
    const padding = 200; // Extra padding to render nodes slightly outside viewport
    return nodes.filter((node) => {
      const pos = nodePositions.get(node.id);
      if (!pos) return false;

      return (
        pos.x >= viewport.x - padding &&
        pos.x <= viewport.x + viewport.width + padding &&
        pos.y >= viewport.y - padding &&
        pos.y <= viewport.y + viewport.height + padding
      );
    });
  }, [nodes, nodePositions, viewport]);
}

/**
 * Loading state manager for large datasets
 */
export function useChartLoadingState(nodeCount: number) {
  return useMemo(() => {
    if (nodeCount === 0) {
      return { isLoading: false, message: null };
    }

    if (nodeCount > 2000) {
      return {
        isLoading: true,
        message: "Rendering large family tree...",
        estimatedTime: "~5-10s",
      };
    }

    if (nodeCount > 500) {
      return {
        isLoading: true,
        message: "Loading family tree...",
        estimatedTime: "~2-5s",
      };
    }

    return { isLoading: false, message: null };
  }, [nodeCount]);
}

/**
 * Memoized generation grouping
 */
export function useGenerationGroups(
  nodes: Array<ChartNode>
): Map<number, Array<ChartNode>> {
  return useMemo(() => {
    const generations = new Map<number, Array<ChartNode>>();
    nodes.forEach((node) => {
      const gen = node.generation ?? 0;
      if (!generations.has(gen)) {
        generations.set(gen, []);
      }
      generations.get(gen)!.push(node);
    });
    return generations;
  }, [nodes]);
}

/**
 * Performance monitoring hook
 * Tracks render times and provides performance metrics
 */
export function usePerformanceMonitor(componentName: string, enabled = false) {
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (enabled) {
      startTimeRef.current = performance.now();
    }
  });

  useEffect(() => {
    if (enabled && startTimeRef.current > 0) {
      const duration = performance.now() - startTimeRef.current;
      // eslint-disable-next-line no-console
      console.log(
        `[Performance] ${componentName} render: ${duration.toFixed(2)}ms`
      );
    }
  });
}
