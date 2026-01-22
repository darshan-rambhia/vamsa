/**
 * Chart Utilities - Pure functions for chart data manipulation
 *
 * These functions have no DOM dependencies and can be used cross-platform.
 */

/**
 * Groups nodes by their generation number
 *
 * @param nodes - Array of nodes with optional generation property
 * @returns Map of generation number to array of nodes
 *
 * @example
 * const nodes = [
 *   { id: '1', generation: 0 },
 *   { id: '2', generation: 0 },
 *   { id: '3', generation: 1 },
 * ];
 * const grouped = groupByGeneration(nodes);
 * // Map { 0 => [node1, node2], 1 => [node3] }
 */
export function groupByGeneration<T extends { generation?: number | null }>(
  nodes: T[]
): Map<number, T[]> {
  const generations = new Map<number, T[]>();

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
 * Calculates the bounding box dimensions for a set of positions
 *
 * @param positions - Array of {x, y} positions
 * @returns Bounding box with min/max coordinates and dimensions
 */
export function calculateBoundingBox(
  positions: Array<{ x: number; y: number }>
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (positions.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  positions.forEach(({ x, y }) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculates the scale factor to fit content within a container
 *
 * @param contentWidth - Width of the content
 * @param contentHeight - Height of the content
 * @param containerWidth - Width of the container
 * @param containerHeight - Height of the container
 * @param padding - Padding factor (0-1, e.g., 0.9 for 90% fill)
 * @param maxScale - Maximum allowed scale
 * @returns Scale factor
 */
export function calculateFitScale(
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding = 0.9,
  maxScale = 1
): number {
  if (contentWidth === 0 || contentHeight === 0) {
    return 1;
  }

  const scaleX = (containerWidth * padding) / contentWidth;
  const scaleY = (containerHeight * padding) / contentHeight;

  return Math.min(scaleX, scaleY, maxScale);
}

/**
 * Generates an array of generation numbers from min to max
 *
 * @param minGen - Minimum generation number
 * @param maxGen - Maximum generation number
 * @returns Array of generation numbers
 */
export function generateGenerationRange(
  minGen: number,
  maxGen: number
): number[] {
  const range: number[] = [];
  for (let i = minGen; i <= maxGen; i++) {
    range.push(i);
  }
  return range;
}

/**
 * Sorts generation keys in ascending order
 *
 * @param generations - Map of generations
 * @returns Sorted array of generation numbers
 */
export function getSortedGenerations<T>(generations: Map<number, T>): number[] {
  return Array.from(generations.keys()).sort((a, b) => a - b);
}
