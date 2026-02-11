"use client";

import { useQuery } from "@tanstack/react-query";
import { getPeopleStatistics } from "../../../server/statistics";
import { AnimatedNumber } from "../../ui/animated-number";
import { BaseWidget } from "./BaseWidget";
import type { WidgetProps } from "./types";

/**
 * Widget settings for People Statistics
 */
interface PeopleStatsWidgetSettings {
  showChart: boolean;
  recentDays: 7 | 30;
}

/**
 * People Statistics Widget
 *
 * Displays family tree statistics including:
 * - Total people count
 * - Living vs deceased breakdown
 * - Recent additions (last 7/30 days)
 * - Gender distribution (optional chart)
 */
export function PeopleStatisticsWidget({
  config,
  onRemove,
  className,
}: WidgetProps) {
  const rawSettings = config.settings as PeopleStatsWidgetSettings | undefined;
  const settings: PeopleStatsWidgetSettings = {
    showChart: rawSettings?.showChart ?? true,
    recentDays: rawSettings?.recentDays ?? 7,
  };

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["people-statistics"],
    queryFn: () => getPeopleStatistics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  return (
    <BaseWidget
      config={config}
      isLoading={isLoading}
      error={error as Error}
      onRemove={onRemove}
      onRefresh={() => refetch()}
      className={className}
    >
      {stats && (
        <div className="flex h-full flex-col gap-6 p-2">
          {/* Hero Stat */}
          <div className="flex flex-1 flex-col justify-center space-y-2">
            <span className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
              Total Family Members
            </span>
            <div className="font-display text-primary text-7xl font-light tabular-nums">
              <AnimatedNumber value={stats.total} />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
                +
                {settings.recentDays === 7
                  ? stats.recentAdditions.last7Days
                  : stats.recentAdditions.last30Days}{" "}
                this week
              </span>
              <span>growing legacy</span>
            </div>
          </div>

          {/* Breakdown Stats */}
          <div className="border-border/50 grid grid-cols-3 gap-4 border-t pt-4">
            <div className="space-y-1">
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Living
              </span>
              <div className="font-display text-2xl tabular-nums">
                {stats.living}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Deceased
              </span>
              <div className="font-display text-2xl tabular-nums">
                {stats.deceased}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Recent
              </span>
              <div className="font-display text-2xl tabular-nums">
                {settings.recentDays === 7
                  ? stats.recentAdditions.last7Days
                  : stats.recentAdditions.last30Days}
              </div>
            </div>
          </div>

          {/* Gender Distribution Bar (Decorative) */}
          {settings.showChart && (
            <div className="bg-secondary/10 flex h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{
                  width: `${(stats.male / stats.total) * 100}%`,
                }}
              />
              <div
                className="bg-secondary h-full transition-all duration-500"
                style={{
                  width: `${(stats.female / stats.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}
