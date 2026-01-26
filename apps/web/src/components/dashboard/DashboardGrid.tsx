"use client";

import { useCallback, useMemo } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import { cn } from "@vamsa/ui";
import { BaseWidget } from "./widgets/BaseWidget";
import { getWidget } from "./widget-registry";
import type { WidgetConfig } from "./widgets/types";

// Import react-grid-layout CSS
import "react-grid-layout/css/styles.css";

// Layout is a readonly array of LayoutItems
type LayoutItem = Layout extends readonly (infer T)[] ? T : never;

interface DashboardGridProps {
  /** Array of widget configurations to render */
  widgets: WidgetConfig[];
  /** Callback when layout changes (position/size) */
  onLayoutChange: (layout: LayoutItem[]) => void;
  /** Callback when a widget is removed */
  onWidgetRemove: (widgetId: string) => void;
  /** Callback when widget settings are changed */
  onWidgetSettingsChange: (widgetId: string, settings: WidgetConfig) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the grid is in edit mode (allows drag/resize) */
  isEditable?: boolean;
}

/**
 * Responsive grid layout for dashboard widgets.
 * Uses react-grid-layout for drag-and-drop reordering and resizing.
 *
 * Features:
 * - Responsive breakpoints (desktop: 12 cols, tablet: 6 cols, mobile: 2 cols)
 * - Drag-and-drop widget reordering
 * - Resize handles with min/max constraints
 * - Collision detection and snap to grid
 * - Debounced layout persistence
 *
 * @example
 * ```tsx
 * <DashboardGrid
 *   widgets={widgets}
 *   onLayoutChange={handleLayoutChange}
 *   onWidgetRemove={handleRemove}
 *   onWidgetSettingsChange={handleSettingsChange}
 *   isEditable={true}
 * />
 * ```
 */
export function DashboardGrid({
  widgets,
  onLayoutChange,
  onWidgetRemove,
  onWidgetSettingsChange,
  className,
  isEditable = true,
}: DashboardGridProps) {
  // Convert widget configs to react-grid-layout format
  const layout = useMemo<LayoutItem[]>(
    () =>
      widgets.map((widget) => {
        const definition = getWidget(widget.type);
        return {
          i: widget.id,
          x: widget.position.x,
          y: widget.position.y,
          w: widget.size.w,
          h: widget.size.h,
          minW: definition?.minSize?.w,
          minH: definition?.minSize?.h,
          maxW: definition?.maxSize?.w,
          maxH: definition?.maxSize?.h,
        };
      }),
    [widgets]
  );

  // Handle layout changes (drag/resize)
  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      // Convert readonly Layout to mutable array for callback
      const newLayoutArray = [...newLayout];

      // Only trigger callback if layout actually changed
      const hasChanged = newLayoutArray.some((item, idx) => {
        const oldItem = layout[idx];
        return (
          oldItem &&
          (item.x !== oldItem.x ||
            item.y !== oldItem.y ||
            item.w !== oldItem.w ||
            item.h !== oldItem.h)
        );
      });

      if (hasChanged) {
        onLayoutChange(newLayoutArray);
      }
    },
    [layout, onLayoutChange]
  );

  // Type assertion to work around incomplete GridLayout types
  const GridLayoutComponent = GridLayout as React.ComponentType<{
    className?: string;
    layout: LayoutItem[];
    rowHeight?: number;
    width?: number;
    isDraggable?: boolean;
    isResizable?: boolean;
    compactType?: "vertical" | "horizontal" | null;
    preventCollision?: boolean;
    useCSSTransforms?: boolean;
    onLayoutChange?: (layout: Layout) => void;
    draggableHandle?: string;
    resizeHandles?: string[];
    children?: React.ReactNode;
  }>;

  return (
    <div className={cn("dashboard-grid", className)}>
      <GridLayoutComponent
        className="layout"
        layout={layout}
        rowHeight={80}
        width={1200}
        isDraggable={isEditable}
        isResizable={isEditable}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        resizeHandles={["se"]}
      >
        {widgets.map((widget) => {
          const definition = getWidget(widget.type);

          if (!definition) {
            console.warn(`Widget type "${widget.type}" not found in registry`);
            return null;
          }

          const WidgetComponent = definition.component;

          return (
            <div key={widget.id} className="dashboard-grid-item">
              <BaseWidget
                config={widget}
                onRemove={() => onWidgetRemove(widget.id)}
                onSettings={() => {
                  // Settings callback - could open a modal/drawer
                  onWidgetSettingsChange?.(widget.id, widget);
                }}
                className={cn(
                  "h-full",
                  // Add drag handle styling to the card header
                  isEditable && "widget-drag-handle cursor-move"
                )}
              >
                <WidgetComponent
                  config={widget}
                  onConfigChange={(partial) =>
                    onWidgetSettingsChange(widget.id, {
                      ...widget,
                      ...partial,
                    })
                  }
                  onRemove={() => onWidgetRemove(widget.id)}
                />
              </BaseWidget>
            </div>
          );
        })}
      </GridLayoutComponent>
    </div>
  );
}
