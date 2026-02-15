import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Badge,
  Card,
  CardContent,
  Container,
  PageHeader,
} from "@vamsa/ui";
import type { ActivityFilters } from "~/components/activity/ActivityFilterPanel";
import {
  getActivityFilterOptions,
  getRecentActivity,
} from "~/server/dashboard";
import { ActivityFilterPanel } from "~/components/activity/ActivityFilterPanel";

export const Route = createFileRoute("/_authenticated/activity")({
  component: ActivityComponent,
});

// Default filters: last 7 days
const defaultFilters: ActivityFilters = {
  dateFrom: Date.now() - 7 * 24 * 60 * 60 * 1000,
  dateTo: Date.now(),
  actionTypes: [],
  entityTypes: [],
  userId: undefined,
  searchQuery: "",
};

function ActivityComponent() {
  const { t } = useTranslation(["common"]);
  const [filters, setFilters] = useState<ActivityFilters>(defaultFilters);

  // Fetch filter options
  const { data: filterOptions, isLoading: isLoadingOptions } = useQuery({
    queryKey: ["activityFilterOptions"],
    queryFn: () => getActivityFilterOptions(),
  });

  // Fetch activity with filters
  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", filters],
    queryFn: () =>
      getRecentActivity({
        data: {
          limit: 100,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          actionTypes:
            filters.actionTypes.length > 0 ? filters.actionTypes : undefined,
          entityTypes:
            filters.entityTypes.length > 0 ? filters.entityTypes : undefined,
          userId: filters.userId,
          searchQuery: filters.searchQuery || undefined,
        },
      }),
  });

  // Count active filters for display
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.actionTypes.length > 0) count++;
    if (filters.entityTypes.length > 0) count++;
    if (filters.userId) count++;
    if (filters.searchQuery) count++;
    return count;
  }, [filters]);

  return (
    <Container className="space-y-6">
      <PageHeader title={t("activity")} description={t("recentChanges")} />

      {/* Filter Panel */}
      <ActivityFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        actionTypeOptions={filterOptions?.actionTypes ?? []}
        entityTypeOptions={filterOptions?.entityTypes ?? []}
        userOptions={filterOptions?.users ?? []}
        isLoading={isLoadingOptions}
      />

      {/* Results count */}
      {!isLoading && activity && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span>
            {activity.length}{" "}
            {activity.length === 1 ? t("result") : t("results")}
          </span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}{" "}
              {activeFilterCount === 1 ? t("filter") : t("filters")}{" "}
              {t("active")}
            </Badge>
          )}
        </div>
      )}

      <Card>
        <CardContent className="py-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex animate-pulse items-start gap-4">
                  <div className="bg-muted h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-4 w-3/4 rounded" />
                    <div className="bg-muted h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activity?.length ? (
            <div className="py-12 text-center">
              <div className="bg-secondary/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <svg
                  className="text-muted-foreground h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-foreground mb-2 text-lg">
                {t("noActivityYet")}
              </h3>
              <p className="text-muted-foreground mx-auto max-w-sm">
                {t("activityWillAppear")}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="bg-border absolute top-0 bottom-0 left-5 w-px" />

              <div className="space-y-6">
                {activity.map((item, index) => (
                  <ActivityItem
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

interface ActivityItemProps {
  item: {
    id: string;
    actionType: string;
    entityType: string;
    entityId?: string | null;
    description: string;
    timestamp: number;
    user: { id: string; name: string } | null;
  };
  isFirst: boolean;
}

function ActivityItem({ item, isFirst }: ActivityItemProps) {
  const { t } = useTranslation(["common"]);
  const actionColors = {
    CREATE: "bg-primary/10 text-primary",
    UPDATE: "bg-secondary text-secondary-foreground",
    DELETE: "bg-destructive/10 text-destructive",
  };

  const actionIcons = {
    CREATE: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4.5v15m7.5-7.5h-15"
        />
      </svg>
    ),
    UPDATE: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
      </svg>
    ),
    DELETE: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
        />
      </svg>
    ),
  };

  const colorClass =
    actionColors[item.actionType as keyof typeof actionColors] ||
    "bg-muted text-muted-foreground";
  const icon = actionIcons[item.actionType as keyof typeof actionIcons];

  // Make description clickable if it's a person
  const isPersonActivity = item.entityType === "PERSON" && item.entityId;

  const content = (
    <div className="flex items-start gap-4">
      {/* Icon */}
      <div
        className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${colorClass}`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-foreground">{item.description}</p>
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
          {item.user && (
            <>
              <Avatar
                size="sm"
                fallback={item.user.name.slice(0, 2)}
                alt={item.user.name}
                className="h-5 w-5 text-[10px]"
              />
              <span>{item.user.name}</span>
              <span>·</span>
            </>
          )}
          <time dateTime={new Date(item.timestamp).toISOString()}>
            {formatRelativeTime(item.timestamp, t)}
          </time>
        </div>
      </div>

      {/* Action indicator for first item */}
      {isFirst && (
        <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-1 text-xs font-medium">
          {t("latest")}
        </span>
      )}
    </div>
  );

  if (isPersonActivity) {
    return (
      <Link
        to="/people/$personId"
        params={{ personId: item.entityId! }}
        className="hover:bg-accent -mx-2 block rounded-lg p-2 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return <div className="-mx-2 p-2">{content}</div>;
}

function formatRelativeTime(
  timestamp: number,
  t: (key: string) => string
): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t("justNow");
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
