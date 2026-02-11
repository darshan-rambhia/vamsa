"use client";

import { useCallback, useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { cn } from "@vamsa/ui";
import { getWidget } from "./widget-registry";
import type { Layout } from "react-grid-layout";
import type { WidgetConfig } from "./widgets/types";

// Import react-grid-layout CSS
import "react-grid-layout/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Layout is a readonly array of LayoutItems
type LayoutItem = Layout extends ReadonlyArray<infer T> ? T : never;

interface DashboardGridProps {
  /** Array of widget configurations to render */
  widgets: Array<WidgetConfig>;
  /** Callback when layout changes (position/size) */
  onLayoutChange: (layout: Array<LayoutItem>) => void;
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
 * - Responsive breakpoints (desktop: 4 cols, tablet: 2 cols, mobile: 1 col)
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
  const layout = useMemo<Array<LayoutItem>>(
    () =>
      widgets.map((widget) => {
        const definition = getWidget(widget.type);
        return {
          i: widget.id,
          x: widget.position.x,
          y: widget.position.y,
          w: widget.size.w,
          h: widget.size.h,
          minW: definition?.minSize?.w ?? 2,
          minH: definition?.minSize?.h ?? 2,
          maxW: definition?.maxSize?.w ?? 4,
          maxH: definition?.maxSize?.h ?? 4,
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
      const hasChanged = newLayoutArray.some((item, _idx) => {
        const oldItem = layout.find((l) => l.i === item.i);
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

  return (
    <div className={cn("dashboard-grid", className)}>
      <ResponsiveGridLayout
        className="layout"
        layouts={{
          lg: layout,
          md: layout,
          sm: layout,
          xs: layout,
          xxs: layout,
        }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 4, md: 4, sm: 2, xs: 1, xxs: 1 }}
        rowHeight={100}
        isDraggable={isEditable}
        isResizable={isEditable}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        onLayoutChange={(layout: Layout) => handleLayoutChange(layout)}
        draggableHandle=".widget-drag-handle"
        resizeHandles={["se"]}
        margin={[16, 16]}
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
              <WidgetComponent
                config={widget}
                onConfigChange={(partial) =>
                  onWidgetSettingsChange(widget.id, {
                    ...widget,
                    ...partial,
                  })
                }
                onRemove={() => onWidgetRemove(widget.id)}
                className={cn(
                  "h-full w-full",
                  // Add drag handle styling to the card header
                  isEditable && "widget-drag-handle cursor-move"
                )}
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
