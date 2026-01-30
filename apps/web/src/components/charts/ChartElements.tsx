/**
 * Chart Elements using react-native-svg
 *
 * This file contains React component versions of chart rendering functions,
 * replacing D3 DOM manipulation with declarative react-native-svg components.
 *
 * These components are cross-platform compatible (web + React Native) via react-native-svg-web.
 */

import { useState } from "react";
import { Circle, G, Line, Rect, Text } from "react-native-svg";
import type { ChartNode } from "~/server/charts";

// ============================================================================
// Rectangular Node Component
// ============================================================================

export interface RectNodeProps {
  node: ChartNode;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  isRoot?: boolean;
  onMouseEnter?: (node: ChartNode) => void;
  onMouseLeave?: (node: ChartNode) => void;
  onClick?: (node: ChartNode) => void;
}

/**
 * Renders a rectangular node with person information.
 * Replaces renderRectNode() from d3-utils.ts
 */
export function RectNode({
  node,
  x,
  y,
  width,
  height,
  borderRadius = 8,
  isRoot = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: RectNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Colors based on state
  const fillColor = isHovered
    ? "var(--color-accent)"
    : isRoot
      ? "color-mix(in oklch, var(--color-primary) 10%, transparent)"
      : node.isLiving
        ? "var(--color-card)"
        : "var(--color-muted)";

  const strokeColor = isRoot
    ? "var(--color-primary)"
    : node.isLiving
      ? "var(--color-primary)"
      : "var(--color-border)";

  const strokeWidth = isRoot ? 3 : 2;

  // Format dates
  const dateText = [];
  if (node.dateOfBirth) {
    dateText.push(new Date(node.dateOfBirth).getFullYear());
  }
  if (node.dateOfPassing) {
    dateText.push(new Date(node.dateOfPassing).getFullYear());
  }

  const handleMouseEnter = () => {
    setIsHovered(true);
    onMouseEnter?.(node);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onMouseLeave?.(node);
  };

  const handleClick = () => {
    onClick?.(node);
  };

  return (
    <G
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Background rectangle */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={borderRadius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Name text */}
      <Text
        x={x + width / 2}
        y={y + height / 2 - 8}
        textAnchor="middle"
        fill="var(--color-foreground)"
        fontSize="14"
        fontWeight={isRoot ? "700" : "600"}
      >
        {`${node.firstName} ${node.lastName}`}
      </Text>

      {/* Birth/death dates */}
      {dateText.length > 0 && (
        <Text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          fill="var(--color-muted-foreground)"
          fontSize="12"
        >
          {dateText.join(" - ")}
        </Text>
      )}

      {/* Living/deceased indicator badge */}
      <Circle
        cx={x + width - 31}
        cy={y + 14}
        r={4}
        fill={
          node.isLiving
            ? "var(--color-primary)"
            : "var(--color-muted-foreground)"
        }
      />
    </G>
  );
}

// ============================================================================
// Circular Node Component
// ============================================================================

export interface CircleNodeProps {
  node: ChartNode;
  cx: number;
  cy: number;
  radius: number;
  isRoot?: boolean;
  onMouseEnter?: (node: ChartNode) => void;
  onMouseLeave?: (node: ChartNode) => void;
  onClick?: (node: ChartNode) => void;
}

/**
 * Renders a circular node with person information.
 * Replaces renderCircleNode() from d3-utils.ts
 */
export function CircleNode({
  node,
  cx,
  cy,
  radius,
  isRoot = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: CircleNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const effectiveRadius = isHovered ? radius + 5 : radius;

  const fillColor = isHovered
    ? "var(--color-accent)"
    : isRoot
      ? "color-mix(in oklch, var(--color-primary) 20%, transparent)"
      : node.isLiving
        ? "var(--color-card)"
        : "var(--color-muted)";

  const strokeColor = isRoot
    ? "var(--color-primary)"
    : node.isLiving
      ? "var(--color-primary)"
      : "var(--color-border)";

  const strokeWidth = isRoot ? 3 : 2;

  // Truncate names for better fit
  const firstName =
    node.firstName.length > 12
      ? node.firstName.substring(0, 10) + "..."
      : node.firstName;
  const lastName =
    node.lastName.length > 12
      ? node.lastName.substring(0, 10) + "..."
      : node.lastName;

  const handleMouseEnter = () => {
    setIsHovered(true);
    onMouseEnter?.(node);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onMouseLeave?.(node);
  };

  const handleClick = () => {
    onClick?.(node);
  };

  return (
    <G
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Main circle */}
      <Circle
        cx={cx}
        cy={cy}
        r={effectiveRadius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* First name */}
      <Text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill="var(--color-foreground)"
        fontSize="11"
        fontWeight={isRoot ? "700" : "600"}
      >
        {firstName}
      </Text>

      {/* Last name */}
      <Text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        fill="var(--color-foreground)"
        fontSize="11"
        fontWeight={isRoot ? "700" : "600"}
      >
        {lastName}
      </Text>

      {/* Birth year (outside the circle) */}
      {node.dateOfBirth && (
        <Text
          x={cx}
          y={cy + radius + 15}
          textAnchor="middle"
          fill="var(--color-muted-foreground)"
          fontSize="10"
        >
          {new Date(node.dateOfBirth).getFullYear()}
        </Text>
      )}

      {/* Living indicator */}
      <Circle
        cx={cx + radius - 10}
        cy={cy - radius + 10}
        r={4}
        fill={
          node.isLiving
            ? "var(--color-primary)"
            : "var(--color-muted-foreground)"
        }
      />
    </G>
  );
}

// ============================================================================
// Edge Components
// ============================================================================

export interface ParentChildEdgeProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  nodeHeight: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

/**
 * Renders a parent-child edge (solid line).
 * Replaces renderParentChildEdge() from d3-utils.ts
 */
export function ParentChildEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  nodeHeight,
  stroke = "var(--color-border)",
  strokeWidth = 2,
  strokeDasharray,
}: ParentChildEdgeProps) {
  return (
    <Line
      x1={sourceX}
      y1={sourceY + nodeHeight / 2}
      x2={targetX}
      y2={targetY - nodeHeight / 2}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
    />
  );
}

export interface SpouseEdgeProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  nodeWidth: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

/**
 * Renders a spouse edge (dashed horizontal line).
 * Replaces renderSpouseEdge() from d3-utils.ts
 */
export function SpouseEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  nodeWidth,
  stroke = "var(--color-primary)",
  strokeWidth = 2,
  strokeDasharray = "5,5",
}: SpouseEdgeProps) {
  return (
    <Line
      x1={sourceX + nodeWidth / 2}
      y1={sourceY}
      x2={targetX - nodeWidth / 2}
      y2={targetY}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
    />
  );
}

// ============================================================================
// Example Usage Pattern
// ============================================================================

/**
 * Example showing how to use these components in a chart:
 *
 * <Svg width={width} height={height}>
 *   <G transform={`translate(${x}, ${y})`}>
 *     {edges.map((edge, i) => (
 *       edge.type === "parent-child" ? (
 *         <ParentChildEdge
 *           key={`edge-${i}`}
 *           sourceX={edge.source.x}
 *           sourceY={edge.source.y}
 *           targetX={edge.target.x}
 *           targetY={edge.target.y}
 *           nodeHeight={NODE_HEIGHT}
 *         />
 *       ) : (
 *         <SpouseEdge
 *           key={`edge-${i}`}
 *           sourceX={edge.source.x}
 *           sourceY={edge.source.y}
 *           targetX={edge.target.x}
 *           targetY={edge.target.y}
 *           nodeWidth={NODE_WIDTH}
 *         />
 *       )
 *     ))}
 *
 *     {nodes.map((node) => (
 *       <RectNode
 *         key={node.id}
 *         node={node}
 *         x={node.x - NODE_WIDTH / 2}
 *         y={node.y - NODE_HEIGHT / 2}
 *         width={NODE_WIDTH}
 *         height={NODE_HEIGHT}
 *         isRoot={node.id === rootId}
 *         onMouseEnter={handleMouseEnter}
 *         onMouseLeave={handleMouseLeave}
 *         onClick={handleNodeClick}
 *       />
 *     ))}
 *   </G>
 * </Svg>
 */
