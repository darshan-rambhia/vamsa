"use client";

import { Link } from "@tanstack/react-router";
import {
  UserPlus,
  Share2,
  Search,
  Settings,
  Mail,
  Download,
} from "lucide-react";
import { cn } from "@vamsa/ui";
import { BaseWidget } from "./BaseWidget";
import type { WidgetProps } from "./types";

/**
 * Quick action definition
 */
interface QuickAction {
  /** Unique identifier for this action */
  id: string;
  /** Action label displayed to user */
  label: string;
  /** Lucide icon name */
  icon: keyof typeof ICON_MAP;
  /** Navigation href (for link actions) */
  href?: string;
  /** In-app action handler (for non-navigation actions) */
  action?: string;
}

/**
 * Widget settings for QuickActionsWidget
 */
interface QuickActionsWidgetSettings {
  /** Array of actions to display (defaults to DEFAULT_ACTIONS) */
  actions?: QuickAction[];
}

/**
 * Map of icon names to Lucide icon components
 */
const ICON_MAP = {
  UserPlus,
  Share2,
  Search,
  Settings,
  Mail,
  Download,
} as const;

/**
 * Default quick actions
 */
const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: "add-person",
    label: "Add Person",
    icon: "UserPlus",
    href: "/people/new",
  },
  {
    id: "visualize",
    label: "View Charts",
    icon: "Share2",
    href: "/visualize",
  },
  {
    id: "search",
    label: "Search",
    icon: "Search",
    href: "/search",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "Settings",
    href: "/settings",
  },
];

/**
 * Quick Actions Widget
 *
 * Displays a grid of configurable action buttons for common tasks.
 * Actions can navigate to other pages or trigger in-app actions.
 *
 * @example
 * ```tsx
 * <QuickActionsWidget
 *   config={config}
 *   onConfigChange={handleConfigChange}
 *   onRemove={handleRemove}
 * />
 * ```
 */
export function QuickActionsWidget({ config, onRemove }: WidgetProps) {
  const settings = (config.settings || {}) as QuickActionsWidgetSettings;
  const actions = settings.actions || DEFAULT_ACTIONS;

  return (
    <BaseWidget config={config} onRemove={onRemove}>
      <div
        className="grid h-full grid-cols-2 gap-3"
        role="navigation"
        aria-label="Quick actions"
      >
        {actions.map((action) => {
          const Icon = ICON_MAP[action.icon];

          // Navigation action - use Link
          if (action.href) {
            return (
              <Link
                key={action.id}
                to={action.href}
                className={cn(
                  // Layout
                  "flex flex-col items-center justify-center gap-2",
                  // Padding & border radius
                  "rounded-lg p-4",
                  // Colors & borders
                  "border-border bg-card border-2",
                  // Hover effects - subtle lift and border enhancement
                  "transition-all duration-200 ease-out",
                  "hover:border-primary/30 hover:bg-card/80 hover:-translate-y-0.5 hover:shadow-md",
                  // Active state
                  "active:scale-[0.98]",
                  // Focus state
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                )}
                aria-label={action.label}
              >
                <Icon className="text-primary h-6 w-6" aria-hidden="true" />
                <span className="text-foreground text-center text-sm font-medium">
                  {action.label}
                </span>
              </Link>
            );
          }

          // In-app action - use button
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                // TODO: Implement in-app action handlers
                // Actions like "openInviteModal" or "exportData" need to be wired up
              }}
              className={cn(
                // Layout
                "flex flex-col items-center justify-center gap-2",
                // Padding & border radius
                "rounded-lg p-4",
                // Colors & borders
                "border-border bg-card border-2",
                // Hover effects - subtle lift and border enhancement
                "transition-all duration-200 ease-out",
                "hover:border-primary/30 hover:bg-card/80 hover:-translate-y-0.5 hover:shadow-md",
                // Active state
                "active:scale-[0.98]",
                // Focus state
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              )}
              aria-label={action.label}
            >
              <Icon className="text-primary h-6 w-6" aria-hidden="true" />
              <span className="text-foreground text-center text-sm font-medium">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </BaseWidget>
  );
}
