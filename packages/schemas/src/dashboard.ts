import { z } from "@hono/zod-openapi";

/**
 * Widget size schema - grid units for react-grid-layout
 */
export const widgetSizeSchema = z.object({
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(12),
});

/**
 * Widget position schema - grid coordinates
 */
export const widgetPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

/**
 * Widget configuration schema
 * Defines a single dashboard widget and its properties
 */
export const widgetConfigSchema = z.object({
  /** Unique identifier for this widget instance */
  id: z.string().min(1, "Widget ID required"),
  /** Widget type identifier (maps to registered widget types) */
  type: z.string().min(1, "Widget type required"),
  /** Display title for the widget */
  title: z.string().min(1).max(100),
  /** Widget size in grid units */
  size: widgetSizeSchema,
  /** Widget position in grid units */
  position: widgetPositionSchema,
  /** Widget-specific settings */
  settings: z.record(z.string(), z.any()).optional(),
});

/**
 * Dashboard layout schema
 * Defines the overall layout structure of the dashboard
 */
export const dashboardLayoutSchema = z.object({
  columns: z.number().int().min(1).max(12).default(4),
  theme: z.enum(["light", "dark", "auto"] as const).default("auto"),
  density: z.enum(["compact", "normal", "spacious"] as const).default("normal"),
});

/**
 * Dashboard preferences schema
 * Complete user dashboard preferences for storage
 */
export const dashboardPreferencesSchema = z.object({
  layout: dashboardLayoutSchema,
  widgets: z.array(widgetConfigSchema).default([]),
});

/**
 * Request body for saving dashboard preferences
 */
export const saveDashboardPreferencesSchema = z.object({
  layout: dashboardLayoutSchema.partial().optional(),
  widgets: z.array(widgetConfigSchema).optional(),
});

/**
 * Default dashboard layout for new users
 */
export const DEFAULT_DASHBOARD_LAYOUT: z.infer<typeof dashboardLayoutSchema> = {
  columns: 4,
  theme: "auto",
  density: "normal",
};

/**
 * Default dashboard widgets
 */
export const DEFAULT_DASHBOARD_WIDGETS: Array<
  z.infer<typeof widgetConfigSchema>
> = [
  {
    id: "default-stats",
    type: "people_statistics",
    title: "Family Statistics",
    size: { w: 2, h: 2 },
    position: { x: 0, y: 0 },
    settings: { showChart: true, recentDays: 7 },
  },
  {
    id: "default-calendar",
    type: "calendar",
    title: "Upcoming Events",
    size: { w: 2, h: 3 },
    position: { x: 2, y: 0 },
    settings: {
      showBirthdays: true,
      showAnniversaries: true,
      showDeaths: false,
      monthsAhead: 3,
    },
  },
  {
    id: "default-activity",
    type: "recent_activity",
    title: "Recent Activity",
    size: { w: 2, h: 2 },
    position: { x: 0, y: 2 },
    settings: { maxItems: 10, showUser: true, filterTypes: [] },
  },
  {
    id: "default-actions",
    type: "quick_actions",
    title: "Quick Actions",
    size: { w: 2, h: 2 },
    position: { x: 2, y: 3 },
    settings: {},
  },
];

export type WidgetSize = z.infer<typeof widgetSizeSchema>;
export type WidgetPosition = z.infer<typeof widgetPositionSchema>;
export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;
export type DashboardPreferences = z.infer<typeof dashboardPreferencesSchema>;
export type SaveDashboardPreferencesInput = z.infer<
  typeof saveDashboardPreferencesSchema
>;
