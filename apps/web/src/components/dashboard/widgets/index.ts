// Widget types
export type {
  WidgetConfig,
  WidgetProps,
  WidgetDefinition,
  BaseWidgetProps,
} from "./types";

// Base widget component
export { BaseWidget } from "./BaseWidget";

// Widget components
export { QuickActionsWidget } from "./QuickActionsWidget";
export { RecentActivityWidget } from "./RecentActivityWidget";
export { QuickSearchWidget } from "./QuickSearchWidget";

// Widget registration
export { registerAllWidgets } from "./register-widgets";
