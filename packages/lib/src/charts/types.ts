/**
 * Chart Types - Shared type definitions for chart components
 *
 * These types are platform-agnostic and can be used in both web and mobile.
 */

/**
 * 2D position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Margin specification for chart layouts
 */
export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Options for rectangular node rendering
 */
export interface RectNodeOptions {
  width: number;
  height: number;
  borderRadius?: number;
  isRoot?: boolean;
}

/**
 * Options for circular node rendering
 */
export interface CircleNodeOptions {
  radius: number;
  isRoot?: boolean;
}

/**
 * Edge/line styling options
 */
export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: string;
  strokeDasharray?: string;
}

/**
 * Scale extent for zoom behavior [min, max]
 */
export type ScaleExtent = [number, number];

/**
 * Default chart layout constants
 */
export const CHART_DEFAULTS = {
  /** Default scale extent for zoom */
  SCALE_EXTENT: [0.1, 4] as ScaleExtent,
  /** Default animation duration in ms */
  ANIMATION_DURATION: 750,
  /** Default fit to container scale (90% of available space) */
  FIT_SCALE: 0.9,
  /** Default max scale for fit operations */
  MAX_SCALE: 1,
  /** Default rectangular node dimensions */
  RECT_NODE: {
    width: 160,
    height: 60,
    borderRadius: 8,
  },
  /** Default circular node radius */
  CIRCLE_NODE: {
    radius: 40,
  },
  /** Default margin */
  MARGIN: {
    top: 40,
    right: 40,
    bottom: 40,
    left: 40,
  } as Margin,
};
