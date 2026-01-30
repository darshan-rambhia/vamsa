"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface ContentBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ChartViewportOptions {
  /** Minimum scale allowed (default: 0.1) */
  minScale?: number;
  /** Maximum scale allowed (default: 4) */
  maxScale?: number;
  /** Margin around content when fitting to viewport */
  margin?: { top: number; right: number; bottom: number; left: number };
  /** Minimum height for the container (default: 600) */
  minHeight?: number;
  /** Reset signal - increment to reset view */
  resetSignal?: number;
}

export interface ChartViewportResult {
  /** Ref to attach to the container div */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current container dimensions */
  dimensions: { width: number; height: number };
  /** Current transform state */
  transform: Transform;
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** True once we have valid dimensions from the container */
  isReady: boolean;
  /** Event handlers to attach to the container */
  handlers: {
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
  /** Zoom control functions */
  controls: {
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    panTo: (x: number, y: number) => void;
  };
  /** Calculate and set initial transform based on content bounds */
  fitContent: (bounds: ContentBounds) => void;
  /** Current scale for display (e.g., "100%") */
  scalePercent: number;
}

const DEFAULT_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };

/**
 * Hook that provides standardized zoom/pan/transform functionality for charts.
 * This centralizes the transform calculation logic to ensure consistency across all charts.
 *
 * Usage:
 * ```tsx
 * const viewport = useChartViewport({ minScale: 0.5 });
 *
 * // After calculating layout, call fitContent with the bounds
 * useEffect(() => {
 *   if (nodePositions.size > 0) {
 *     viewport.fitContent(calculateBounds(nodePositions));
 *   }
 * }, [nodePositions]);
 *
 * return (
 *   <div ref={viewport.containerRef} {...viewport.handlers}>
 *     <Svg width={viewport.dimensions.width} height={viewport.dimensions.height}>
 *       <G transform={`translate(${viewport.transform.x}, ${viewport.transform.y}) scale(${viewport.transform.scale})`}>
 *         ...
 *       </G>
 *     </Svg>
 *     <ZoomControls
 *       scale={viewport.transform.scale}
 *       onZoomIn={viewport.controls.zoomIn}
 *       onZoomOut={viewport.controls.zoomOut}
 *       onReset={viewport.controls.reset}
 *     />
 *   </div>
 * );
 * ```
 */
export function useChartViewport(
  options: ChartViewportOptions = {}
): ChartViewportResult {
  const {
    minScale = 0.1,
    maxScale = 4,
    margin = DEFAULT_MARGIN,
    minHeight = 600,
    resetSignal,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  // Start with 0 dimensions - will be set by ResizeObserver on mount
  // This prevents rendering with wrong dimensions before container is measured
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Store the last content bounds for reset functionality
  const lastBoundsRef = useRef<ContentBounds | null>(null);

  // Track if we've received initial dimensions
  const hasInitialDimensions = dimensions.width > 0 && dimensions.height > 0;

  // Calculate initial transform based on content bounds
  const calculateInitialTransform = useCallback(
    (bounds: ContentBounds): Transform => {
      const contentWidth =
        bounds.maxX - bounds.minX + margin.left + margin.right;
      const contentHeight =
        bounds.maxY - bounds.minY + margin.top + margin.bottom;

      // Calculate scale to fit content with some padding (95% of viewport)
      const scaleX = (dimensions.width * 0.95) / contentWidth;
      const scaleY = (dimensions.height * 0.95) / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1:1

      // Calculate content center
      const contentCenterX = (bounds.minX + bounds.maxX) / 2;
      const contentCenterY = (bounds.minY + bounds.maxY) / 2;

      // Center the content in the viewport
      return {
        x: dimensions.width / 2 - contentCenterX * scale,
        y: dimensions.height / 2 - contentCenterY * scale,
        scale: Math.max(scale, minScale),
      };
    },
    [dimensions, margin, minScale]
  );

  // Fit content to viewport
  const fitContent = useCallback(
    (bounds: ContentBounds) => {
      lastBoundsRef.current = bounds;
      setTransform(calculateInitialTransform(bounds));
    },
    [calculateInitialTransform]
  );

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(minHeight, entry.contentRect.height),
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [minHeight]);

  // Re-fit content when dimensions change
  useEffect(() => {
    if (lastBoundsRef.current) {
      setTransform(calculateInitialTransform(lastBoundsRef.current));
    }
  }, [dimensions, calculateInitialTransform]);

  // Reset view when resetSignal changes
  useEffect(() => {
    if (resetSignal !== undefined && lastBoundsRef.current) {
      setTransform(calculateInitialTransform(lastBoundsRef.current));
    }
  }, [resetSignal, calculateInitialTransform]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Reduced zoom sensitivity: 0.95/1.05 for smoother zooming
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, transform.scale * delta)
      );

      // Zoom towards mouse position
      const scaleChange = newScale / transform.scale;
      const newX = mouseX - (mouseX - transform.x) * scaleChange;
      const newY = mouseY - (mouseY - transform.y) * scaleChange;

      setTransform({ x: newX, y: newY, scale: newScale });
    },
    [transform, minScale, maxScale]
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

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Zoom in control
  const zoomIn = useCallback(() => {
    const newScale = Math.min(maxScale, transform.scale * 1.2);
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const scaleChange = newScale / transform.scale;
    setTransform({
      x: cx - (cx - transform.x) * scaleChange,
      y: cy - (cy - transform.y) * scaleChange,
      scale: newScale,
    });
  }, [transform, dimensions, maxScale]);

  // Zoom out control
  const zoomOut = useCallback(() => {
    const newScale = Math.max(minScale, transform.scale / 1.2);
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const scaleChange = newScale / transform.scale;
    setTransform({
      x: cx - (cx - transform.x) * scaleChange,
      y: cy - (cy - transform.y) * scaleChange,
      scale: newScale,
    });
  }, [transform, dimensions, minScale]);

  // Reset to initial view
  const reset = useCallback(() => {
    if (lastBoundsRef.current) {
      setTransform(calculateInitialTransform(lastBoundsRef.current));
    }
  }, [calculateInitialTransform]);

  // Pan to a specific point in tree coordinates (center viewport on that point)
  const panTo = useCallback(
    (treeX: number, treeY: number) => {
      const newX = dimensions.width / 2 - treeX * transform.scale;
      const newY = dimensions.height / 2 - treeY * transform.scale;
      setTransform({
        ...transform,
        x: newX,
        y: newY,
      });
    },
    [transform, dimensions]
  );

  return {
    containerRef,
    dimensions,
    transform,
    isDragging,
    /** True once we have valid dimensions from the container */
    isReady: hasInitialDimensions,
    handlers: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
    controls: {
      zoomIn,
      zoomOut,
      reset,
      panTo,
    },
    fitContent,
    scalePercent: Math.round(transform.scale * 100),
  };
}

/**
 * Helper function to calculate bounds from a map of node positions
 */
export function calculateBoundsFromPositions(
  positions: Map<string, { x: number; y: number }>,
  nodeWidth: number,
  nodeHeight: number
): ContentBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x - nodeWidth / 2);
    maxX = Math.max(maxX, pos.x + nodeWidth / 2);
    minY = Math.min(minY, pos.y - nodeHeight / 2);
    maxY = Math.max(maxY, pos.y + nodeHeight / 2);
  });

  // Handle empty positions case
  if (positions.size === 0) {
    return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Helper function to calculate bounds for radial charts (FanChart)
 */
export function calculateRadialBounds(
  centerX: number,
  centerY: number,
  maxRadius: number
): ContentBounds {
  return {
    minX: centerX - maxRadius,
    maxX: centerX + maxRadius,
    minY: centerY - maxRadius,
    maxY: centerY + maxRadius,
  };
}

/**
 * Helper function to calculate bounds for linear content (TimelineChart, Matrix)
 */
export function calculateLinearBounds(
  width: number,
  height: number
): ContentBounds {
  return {
    minX: 0,
    maxX: width,
    minY: 0,
    maxY: height,
  };
}
