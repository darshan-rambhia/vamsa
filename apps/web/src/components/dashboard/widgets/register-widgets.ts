import { registerWidget } from "../widget-registry";
import { QuickActionsWidget } from "./QuickActionsWidget";
import { RecentActivityWidget } from "./RecentActivityWidget";
import { QuickSearchWidget } from "./QuickSearchWidget";
import { z } from "zod";

/**
 * Register all available dashboard widgets.
 * Call this once during app initialization to make widgets available.
 *
 * @example
 * ```tsx
 * // In dashboard route or app initialization
 * import { registerAllWidgets } from "@/components/dashboard/widgets/register-widgets";
 *
 * useEffect(() => {
 *   registerAllWidgets();
 * }, []);
 * ```
 */
export function registerAllWidgets() {
  // Quick Actions Widget
  registerWidget({
    type: "quick_actions",
    name: "Quick Actions",
    description: "Quick links to common tasks and frequently used features",
    icon: "Zap",
    component: QuickActionsWidget,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 2 },
    settingsSchema: z.object({
      actions: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            icon: z.enum([
              "UserPlus",
              "Share2",
              "Search",
              "Settings",
              "Mail",
              "Download",
            ]),
            href: z.string().optional(),
            action: z.string().optional(),
          })
        )
        .optional(),
    }),
    defaultSettings: {
      actions: [
        {
          id: "add-person",
          label: "Add Person",
          icon: "UserPlus" as const,
          href: "/people/new",
        },
        {
          id: "visualize",
          label: "View Charts",
          icon: "Share2" as const,
          href: "/visualize",
        },
        {
          id: "search",
          label: "Search",
          icon: "Search" as const,
          href: "/search",
        },
        {
          id: "settings",
          label: "Settings",
          icon: "Settings" as const,
          href: "/settings",
        },
      ],
    },
  });

  // Recent Activity Widget
  registerWidget({
    type: "recent_activity",
    name: "Recent Activity",
    description: "Display recent changes and updates to the family tree",
    icon: "Activity",
    component: RecentActivityWidget,
    defaultSize: { w: 2, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 },
    settingsSchema: z.object({
      maxItems: z.number().min(1).max(50).optional(),
      showUser: z.boolean().optional(),
      filterTypes: z.array(z.string()).optional(),
      refreshInterval: z.number().min(0).optional(),
    }),
    defaultSettings: {
      maxItems: 10,
      showUser: true,
      filterTypes: [],
      refreshInterval: 0,
    },
  });

  // Quick Search Widget
  registerWidget({
    type: "quick_search",
    name: "Quick Search",
    description: "Search for people in your family tree",
    icon: "Search",
    component: QuickSearchWidget,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
    defaultSettings: {},
  });
}
