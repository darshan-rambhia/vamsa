// Widget registry
export {
  widgetRegistry,
  registerWidget,
  getWidget,
  getAllWidgets,
  unregisterWidget,
  hasWidget,
} from "./widget-registry";

// Re-export widget types and components
export type {
  WidgetConfig,
  WidgetProps,
  WidgetDefinition,
  BaseWidgetProps,
} from "./widgets";
export { BaseWidget } from "./widgets";

// Dashboard grid
export { DashboardGrid } from "./DashboardGrid";

// Modals
export { AddWidgetModal } from "./AddWidgetModal";

// Main dashboard component
export { ConfigurableDashboard } from "./ConfigurableDashboard";
