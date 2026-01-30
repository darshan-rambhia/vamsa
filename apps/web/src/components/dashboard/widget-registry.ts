import { z } from "zod";
import { RecentActivityWidget } from "./widgets/RecentActivityWidget";

// Register built-in widgets
import { PeopleStatisticsWidget } from "./widgets/PeopleStatisticsWidget";
import { CalendarWidget } from "./widgets/CalendarWidget";
import { QuickActionsWidget } from "./widgets/QuickActionsWidget";
import { QuickSearchWidget } from "./widgets/QuickSearchWidget";
import type { WidgetDefinition } from "./widgets/types";

/**
 * Global widget registry for dashboard widgets.
 * Widgets must be registered before they can be used in the dashboard.
 */
class WidgetRegistry {
  private registry = new Map<string, WidgetDefinition>();

  /**
   * Register a widget definition.
   * Throws an error if a widget with the same type is already registered.
   *
   * @param widget - Widget definition to register
   * @throws Error if widget type already exists
   *
   * @example
   * ```ts
   * registerWidget({
   *   type: "calendar",
   *   name: "Calendar",
   *   description: "Monthly calendar view",
   *   icon: "Calendar",
   *   component: CalendarWidget,
   *   defaultSize: { w: 2, h: 2 },
   * });
   * ```
   */
  registerWidget(widget: WidgetDefinition): void {
    if (this.registry.has(widget.type)) {
      throw new Error(
        `Widget type "${widget.type}" is already registered. Use a unique type identifier.`
      );
    }

    // Validate required fields
    if (!widget.type || typeof widget.type !== "string") {
      throw new Error("Widget type must be a non-empty string");
    }
    if (!widget.name || typeof widget.name !== "string") {
      throw new Error("Widget name must be a non-empty string");
    }
    if (!widget.component) {
      throw new Error("Widget component is required");
    }
    if (
      !widget.defaultSize ||
      typeof widget.defaultSize.w !== "number" ||
      typeof widget.defaultSize.h !== "number" ||
      widget.defaultSize.w <= 0 ||
      widget.defaultSize.h <= 0
    ) {
      throw new Error(
        "Widget defaultSize must have positive width (w) and height (h)"
      );
    }

    // Validate size constraints if provided
    if (widget.minSize) {
      if (
        typeof widget.minSize.w !== "number" ||
        typeof widget.minSize.h !== "number" ||
        widget.minSize.w <= 0 ||
        widget.minSize.h <= 0
      ) {
        throw new Error(
          "Widget minSize must have positive width (w) and height (h)"
        );
      }
      if (
        widget.defaultSize.w < widget.minSize.w ||
        widget.defaultSize.h < widget.minSize.h
      ) {
        throw new Error("Widget defaultSize cannot be smaller than minSize");
      }
    }

    if (widget.maxSize) {
      if (
        typeof widget.maxSize.w !== "number" ||
        typeof widget.maxSize.h !== "number" ||
        widget.maxSize.w <= 0 ||
        widget.maxSize.h <= 0
      ) {
        throw new Error(
          "Widget maxSize must have positive width (w) and height (h)"
        );
      }
      if (
        widget.defaultSize.w > widget.maxSize.w ||
        widget.defaultSize.h > widget.maxSize.h
      ) {
        throw new Error("Widget defaultSize cannot be larger than maxSize");
      }
    }

    if (widget.minSize && widget.maxSize) {
      if (
        widget.maxSize.w < widget.minSize.w ||
        widget.maxSize.h < widget.minSize.h
      ) {
        throw new Error("Widget maxSize cannot be smaller than minSize");
      }
    }

    this.registry.set(widget.type, widget);
  }

  /**
   * Get a widget definition by type.
   *
   * @param type - Widget type identifier
   * @returns Widget definition or undefined if not found
   *
   * @example
   * ```ts
   * const widget = getWidget("calendar");
   * if (widget) {
   *   const Component = widget.component;
   * }
   * ```
   */
  getWidget(type: string): WidgetDefinition | undefined {
    return this.registry.get(type);
  }

  /**
   * Get all registered widgets.
   *
   * @returns Array of all widget definitions
   *
   * @example
   * ```ts
   * const widgets = getAllWidgets();
   * widgets.forEach(widget => {
   *   console.log(widget.name);
   * });
   * ```
   */
  getAllWidgets(): Array<WidgetDefinition> {
    return Array.from(this.registry.values());
  }

  /**
   * Unregister a widget by type.
   * Useful for cleanup or testing.
   *
   * @param type - Widget type identifier
   * @returns true if widget was removed, false if not found
   *
   * @example
   * ```ts
   * const removed = unregisterWidget("calendar");
   * ```
   */
  unregisterWidget(type: string): boolean {
    return this.registry.delete(type);
  }

  /**
   * Check if a widget type is registered.
   *
   * @param type - Widget type identifier
   * @returns true if widget is registered
   *
   * @example
   * ```ts
   * if (hasWidget("calendar")) {
   *   // Widget is available
   * }
   * ```
   */
  hasWidget(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * Clear all registered widgets.
   * Mainly for testing purposes.
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered widgets.
   *
   * @returns Number of widgets in registry
   */
  get size(): number {
    return this.registry.size;
  }
}

// Export singleton instance
const widgetRegistry = new WidgetRegistry();

export { widgetRegistry };

// Export convenience functions that delegate to singleton
export const registerWidget =
  widgetRegistry.registerWidget.bind(widgetRegistry);
export const getWidget = widgetRegistry.getWidget.bind(widgetRegistry);
export const getAllWidgets = widgetRegistry.getAllWidgets.bind(widgetRegistry);
export const unregisterWidget =
  widgetRegistry.unregisterWidget.bind(widgetRegistry);
export const hasWidget = widgetRegistry.hasWidget.bind(widgetRegistry);

// Recent Activity Widget
registerWidget({
  type: "recent_activity",
  name: "Recent Activity",
  description: "Shows recent changes in the family tree",
  icon: "Activity",
  component: RecentActivityWidget,
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 4, h: 4 },
  settingsSchema: z.object({
    maxItems: z.number().int().min(1).max(50).optional(),
    showUser: z.boolean().optional(),
    filterTypes: z.array(z.string()).optional(),
    refreshInterval: z.number().int().min(0).optional(),
  }),
  defaultSettings: {
    maxItems: 10,
    showUser: true,
    filterTypes: [],
    refreshInterval: 0,
  },
});

// People Statistics Widget
registerWidget({
  type: "people_statistics",
  name: "Family Statistics",
  description: "Overview of people in your family tree",
  icon: "Users",
  component: PeopleStatisticsWidget,
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 3, h: 3 },
  settingsSchema: z.object({
    showChart: z.boolean().default(true),
    recentDays: z.union([z.literal(7), z.literal(30)]).default(7),
  }),
  defaultSettings: {
    showChart: true,
    recentDays: 7,
  },
});

// Calendar Widget
registerWidget({
  type: "calendar",
  name: "Upcoming Events",
  description: "Birthdays, anniversaries, and important dates",
  icon: "Calendar",
  component: CalendarWidget,
  defaultSize: { w: 2, h: 3 },
  minSize: { w: 2, h: 3 },
  maxSize: { w: 4, h: 5 },
  settingsSchema: z.object({
    showBirthdays: z.boolean().default(true),
    showAnniversaries: z.boolean().default(true),
    showDeaths: z.boolean().default(false),
    monthsAhead: z.number().int().min(1).max(12).default(3),
  }),
  defaultSettings: {
    showBirthdays: true,
    showAnniversaries: true,
    showDeaths: false,
    monthsAhead: 3,
  },
});

// Quick Actions Widget
registerWidget({
  type: "quick_actions",
  name: "Quick Actions",
  description: "Quick links to common tasks",
  icon: "Zap",
  component: QuickActionsWidget,
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 3, h: 2 },
  defaultSettings: {},
});

// Quick Search Widget
registerWidget({
  type: "quick_search",
  name: "Quick Search",
  description: "Search your family tree",
  icon: "Search",
  component: QuickSearchWidget,
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 4, h: 3 },
  settingsSchema: z.object({
    maxResults: z.number().int().min(1).max(10).default(5),
  }),
  defaultSettings: {
    maxResults: 5,
  },
});
