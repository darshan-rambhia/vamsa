"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CheckCircle,
  Edit,
  LogIn,
  LogOut,
  Trash2,
  User,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@vamsa/ui";
import { getRecentActivity } from "../../../server/dashboard";
import { BaseWidget } from "./BaseWidget";
import type { WidgetProps } from "./types";

/**
 * Widget settings interface
 */
export interface RecentActivityWidgetSettings {
  /** Maximum number of activity items to display */
  maxItems: number;
  /** Show user who performed the action */
  showUser: boolean;
  /** Filter by specific action types (empty = all) */
  filterTypes: Array<string>;
  /** Auto-refresh interval in milliseconds (0 = disabled) */
  refreshInterval: number;
}

/**
 * Default settings for Recent Activity Widget
 */
const DEFAULT_SETTINGS: RecentActivityWidgetSettings = {
  maxItems: 10,
  showUser: true,
  filterTypes: [],
  refreshInterval: 0,
};

/**
 * Get Lucide icon for activity action type
 *
 * @param actionType - Activity action type
 * @returns Lucide icon component
 */
function getActivityIcon(actionType: string) {
  switch (actionType) {
    case "CREATE":
      return UserPlus;
    case "UPDATE":
      return Edit;
    case "DELETE":
      return Trash2;
    case "LOGIN":
      return LogIn;
    case "LOGOUT":
      return LogOut;
    case "APPROVE":
      return CheckCircle;
    case "REJECT":
      return XCircle;
    default:
      return Activity;
  }
}

/**
 * Get color classes for activity action type
 *
 * @param actionType - Activity action type
 * @returns Tailwind CSS classes for icon color
 */
function getActivityColor(actionType: string): string {
  switch (actionType) {
    case "CREATE":
      return "text-primary";
    case "UPDATE":
      return "text-secondary";
    case "DELETE":
      return "text-destructive";
    case "LOGIN":
      return "text-muted-foreground";
    case "LOGOUT":
      return "text-muted-foreground";
    case "APPROVE":
      return "text-primary";
    case "REJECT":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Get link path for entity based on type and ID
 *
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @returns Link path or null if no link available
 */
function getEntityLink(
  entityType: string,
  entityId: string | null
): string | null {
  if (!entityId) return null;

  switch (entityType) {
    case "PERSON":
      return `/people/${entityId}`;
    case "USER":
      return `/users/${entityId}`;
    default:
      return null;
  }
}

/**
 * Recent Activity Widget Component
 *
 * Displays recent audit log entries with:
 * - Activity type icons
 * - Relative timestamps
 * - Links to affected records
 * - User attribution
 *
 * @example
 * ```tsx
 * <RecentActivityWidget
 *   config={{
 *     id: "widget-1",
 *     type: "recent_activity",
 *     title: "Recent Activity",
 *     size: { w: 2, h: 2 },
 *     position: { x: 0, y: 0 },
 *     settings: { maxItems: 10, showUser: true }
 *   }}
 *   onConfigChange={(config) => {...}}
 *   onRemove={() => {...}}
 * />
 * ```
 */
export function RecentActivityWidget({
  config,
  onRemove,
  className,
}: WidgetProps) {
  const settings: RecentActivityWidgetSettings = {
    ...DEFAULT_SETTINGS,
    ...(config.settings as Partial<RecentActivityWidgetSettings>),
  };

  // This state triggers re-renders for relative time updates (e.g., "2 minutes ago")
  const [, setNow] = useState(Date.now());

  // Fetch recent activity
  const {
    data: activities,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["recentActivity", settings.maxItems, settings.filterTypes],
    queryFn: async () => {
      const result = await getRecentActivity({
        data: {
          limit: settings.maxItems,
          actionTypes:
            settings.filterTypes.length > 0 ? settings.filterTypes : undefined,
        },
      });
      return result;
    },
    refetchInterval:
      settings.refreshInterval > 0 ? settings.refreshInterval : false,
  });

  // Update "now" timestamp every minute for relative time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    void refetch();
  };

  return (
    <BaseWidget
      config={config}
      isLoading={isLoading}
      error={error ? error : null}
      onRemove={onRemove}
      onRefresh={handleRefresh}
      className={cn("flex flex-col", className)}
    >
      <div className="space-y-1">
        {activities && activities.length === 0 && (
          <div
            className="text-muted-foreground flex items-center justify-center py-8 text-sm"
            role="status"
          >
            No recent activity
          </div>
        )}

        {activities &&
          activities.length > 0 &&
          activities.map((activity) => {
            const Icon = getActivityIcon(activity.actionType);
            const iconColor = getActivityColor(activity.actionType);
            const entityLink = getEntityLink(
              activity.entityType,
              activity.entityId
            );
            const relativeTime = formatDistanceToNow(activity.timestamp, {
              addSuffix: true,
            });

            return (
              <div
                key={activity.id}
                className={cn(
                  "border-border group transition-smooth flex items-start gap-3 rounded-md border p-3",
                  "hover:border-primary/20 hover:bg-muted/30"
                )}
              >
                {/* Activity Icon */}
                <div
                  className={cn("mt-0.5 shrink-0", iconColor)}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Activity Details */}
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Description */}
                  {entityLink ? (
                    <Link
                      to={entityLink}
                      className="text-foreground hover:text-primary transition-smooth line-clamp-2 text-sm"
                    >
                      {activity.description}
                    </Link>
                  ) : (
                    <p className="text-foreground line-clamp-2 text-sm">
                      {activity.description}
                    </p>
                  )}

                  {/* Metadata: User + Time */}
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    {settings.showUser && activity.user && (
                      <>
                        <User className="h-3 w-3" aria-hidden="true" />
                        <span>{activity.user.name}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <time
                      dateTime={new Date(activity.timestamp).toISOString()}
                      title={new Date(activity.timestamp).toLocaleString()}
                    >
                      {relativeTime}
                    </time>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </BaseWidget>
  );
}
