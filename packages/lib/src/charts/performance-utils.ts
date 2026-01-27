/**
 * Chart Performance Utilities - Pure calculation functions
 *
 * These functions extract the pure computation logic from React hooks,
 * enabling unit testing without React dependencies.
 *
 * Exported Functions:
 * - calculateNodePositions: Calculate x,y positions for nodes by generation
 * - calculateChartDimensions: Calculate chart width/height based on content
 * - filterVisibleNodes: Get nodes within viewport bounds
 * - getLoadingState: Determine loading state based on node count
 */

import type { Position } from "./types";

/**
 * Node with required generation property for position calculations
 */
export interface GenerationNode {
  id: string;
  generation?: number | null;
}

/**
 * Viewport bounds for visibility filtering
 */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Loading state information
 */
export interface LoadingState {
  isLoading: boolean;
  message: string | null;
  estimatedTime?: string;
}

/**
 * Calculate node positions by generation
 *
 * Arranges nodes in horizontal rows by generation, centering each row
 * within the available width.
 *
 * @param nodes - Array of nodes with generation property
 * @param width - Total available width
 * @param nodeWidth - Width of each node
 * @param levelHeight - Vertical spacing between generations
 * @param marginTop - Top margin offset
 * @returns Map of node ID to {x, y} position
 *
 * @example
 * const positions = calculateNodePositions(nodes, 800, 160, 100, 40);
 * // Map { "node-1" => { x: 320, y: 40 }, ... }
 */
export function calculateNodePositions<T extends GenerationNode>(
  nodes: T[],
  width: number,
  nodeWidth: number,
  levelHeight: number,
  marginTop: number
): Map<string, Position> {
  const nodePositions = new Map<string, Position>();

  // Group nodes by generation
  const generations = new Map<number, T[]>();
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
}

/**
 * Calculate chart dimensions based on node count
 *
 * Returns width/height suitable for the chart container, scaling
 * height based on number of nodes.
 *
 * @param containerWidth - Available container width
 * @param nodeCount - Number of nodes in the chart
 * @param minHeight - Minimum chart height (default 600)
 * @returns Chart dimensions {width, height}
 *
 * @example
 * const dims = calculateChartDimensions(800, 50, 600);
 * // { width: 800, height: 4000 }
 */
export function calculateChartDimensions(
  containerWidth: number,
  nodeCount: number,
  minHeight = 600
): { width: number; height: number } {
  return {
    width: containerWidth,
    height: Math.max(minHeight, nodeCount * 80),
  };
}

/**
 * Filter nodes to only those visible within viewport
 *
 * Used for virtual rendering optimization when dealing with
 * large datasets. Returns nodes within viewport bounds plus padding.
 *
 * @param nodes - Array of nodes to filter
 * @param nodePositions - Map of node ID to position
 * @param viewport - Current viewport bounds, or null for all nodes
 * @param padding - Extra padding around viewport (default 200)
 * @returns Array of nodes within viewport
 *
 * @example
 * const visible = filterVisibleNodes(nodes, positions, {x: 0, y: 0, width: 800, height: 600});
 * // Returns only nodes visible in the viewport
 */
export function filterVisibleNodes<T extends { id: string }>(
  nodes: T[],
  nodePositions: Map<string, Position>,
  viewport: Viewport | null,
  padding = 200
): T[] {
  // If no viewport provided, return all nodes
  if (!viewport) return nodes;

  // Filter nodes that are within viewport bounds (with padding)
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
}

/**
 * Get loading state based on node count
 *
 * Returns loading state information including message and estimated
 * time for large datasets.
 *
 * @param nodeCount - Number of nodes to render
 * @returns Loading state object
 *
 * @example
 * const state = getLoadingState(2500);
 * // { isLoading: true, message: "Rendering large family tree...", estimatedTime: "~5-10s" }
 */
export function getLoadingState(nodeCount: number): LoadingState {
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
}

/**
 * Filter edges to only those with valid source and target nodes
 *
 * Returns edges where both source and target nodes have calculated positions.
 *
 * @param edges - Array of edges with source and target properties
 * @param nodePositions - Map of node ID to position
 * @returns Array of valid edges
 *
 * @example
 * const valid = filterValidEdges(edges, positions);
 * // Returns only edges where both endpoints exist
 */
export function filterValidEdges<T extends { source: string; target: string }>(
  edges: T[],
  nodePositions: Map<string, Position>
): T[] {
  return edges.filter(
    (edge) => nodePositions.has(edge.source) && nodePositions.has(edge.target)
  );
}
