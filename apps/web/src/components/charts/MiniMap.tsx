"use client";

import { useCallback, useMemo } from "react";

export interface MiniMapProps {
  /** Full tree bounds in tree coordinates */
  treeBounds: { width: number; height: number };
  /** Current viewport in tree coordinates */
  viewport: { x: number; y: number; width: number; height: number };
  /** Callback when user clicks mini-map to navigate */
  onNavigate: (x: number, y: number) => void;
  /** Node positions for rendering dots */
  nodePositions: Array<{
    id: string;
    x: number;
    y: number;
    generation?: number;
  }>;
  /** Root person ID for highlighting */
  rootPersonId?: string;
}

const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = 100;
const NODE_DOT_RADIUS = 3;
const VIEWPORT_STROKE_WIDTH = 2;

/**
 * Mini-map overlay for large family tree navigation.
 * Shows entire tree structure with current viewport indicator.
 * Only visible when tree has 30+ nodes.
 */
export function MiniMap({
  treeBounds,
  viewport,
  onNavigate,
  nodePositions,
  rootPersonId,
}: MiniMapProps) {
  // Calculate scale to fit full tree in mini-map
  const scale = useMemo(() => {
    const scaleX = MINIMAP_WIDTH / treeBounds.width;
    const scaleY = MINIMAP_HEIGHT / treeBounds.height;
    return Math.min(scaleX, scaleY);
  }, [treeBounds]);

  // Convert tree coordinates to mini-map coordinates
  const toMiniMapCoords = useCallback(
    (x: number, y: number) => ({
      x: x * scale,
      y: y * scale,
    }),
    [scale]
  );

  // Convert mini-map click to tree coordinates
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert to tree coordinates
      const treeX = clickX / scale;
      const treeY = clickY / scale;

      onNavigate(treeX, treeY);
    },
    [scale, onNavigate]
  );

  // Calculate viewport rectangle in mini-map space
  const viewportRect = useMemo(() => {
    const topLeft = toMiniMapCoords(viewport.x, viewport.y);
    const bottomRight = toMiniMapCoords(
      viewport.x + viewport.width,
      viewport.y + viewport.height
    );
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }, [viewport, toMiniMapCoords]);

  // Group nodes by whether they're the root
  const { rootNode, otherNodes } = useMemo(() => {
    const root = nodePositions.find((n) => n.id === rootPersonId);
    const others = nodePositions.filter((n) => n.id !== rootPersonId);
    return { rootNode: root, otherNodes: others };
  }, [nodePositions, rootPersonId]);

  // Don't show mini-map for small trees
  if (nodePositions.length < 30) {
    return null;
  }

  return (
    <div
      className="absolute right-4 bottom-4 z-10"
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
    >
      <svg
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="bg-card/80 transition-smooth hover:border-primary/40 cursor-pointer rounded-lg border-2 backdrop-blur-sm"
        onClick={handleClick}
        role="img"
        aria-label="Mini-map navigation: click to jump to a location in the tree"
      >
        {/* Background */}
        <rect
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          fill="var(--color-card)"
          fillOpacity={0.8}
        />

        {/* Regular nodes as dots */}
        {otherNodes.map((node) => {
          const pos = toMiniMapCoords(node.x, node.y);
          // Color by generation: current (0) is green, others are muted
          const fill =
            node.generation === 0
              ? "var(--color-primary)"
              : "var(--color-muted-foreground)";
          return (
            <circle
              key={node.id}
              cx={pos.x}
              cy={pos.y}
              r={NODE_DOT_RADIUS}
              fill={fill}
              opacity={0.6}
            />
          );
        })}

        {/* Root node - highlighted */}
        {rootNode && (
          <circle
            cx={toMiniMapCoords(rootNode.x, rootNode.y).x}
            cy={toMiniMapCoords(rootNode.x, rootNode.y).y}
            r={NODE_DOT_RADIUS + 1}
            fill="var(--color-primary)"
            opacity={1}
            stroke="var(--color-background)"
            strokeWidth={1}
          />
        )}

        {/* Viewport rectangle */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={VIEWPORT_STROKE_WIDTH}
          opacity={0.8}
        />
      </svg>
    </div>
  );
}
