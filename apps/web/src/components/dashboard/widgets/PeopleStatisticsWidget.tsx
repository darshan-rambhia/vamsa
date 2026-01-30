"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, UserCheck, UserMinus, Users } from "lucide-react";
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
 * Stat card component for displaying individual statistics
 */
function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <div className="border-border bg-muted/30 hover:bg-muted/50 flex items-start gap-3 rounded-lg border-2 p-4 transition-colors">
      <div className={`rounded-md p-2 ${iconColor}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p className="font-display mt-1 text-2xl font-semibold tabular-nums">
          <AnimatedNumber value={value} />
        </p>
      </div>
    </div>
  );
}

/**
 * Simple horizontal bar chart for gender distribution
 */
function GenderDistributionChart({
  male,
  female,
  unknown,
  total,
}: {
  male: number;
  female: number;
  unknown: number;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="text-muted-foreground text-center text-sm">
        No data to display
      </div>
    );
  }

  const malePercent = (male / total) * 100;
  const femalePercent = (female / total) * 100;
  const unknownPercent = (unknown / total) * 100;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Gender Distribution</h4>
      <div
        className="border-border flex h-8 w-full overflow-hidden rounded-md border-2"
        role="img"
        aria-label={`Gender distribution: ${male} male, ${female} female, ${unknown} unknown`}
      >
        {malePercent > 0 && (
          <div
            className="bg-chart-1 flex items-center justify-center text-xs font-medium text-white transition-all"
            style={{ width: `${malePercent}%` }}
            title={`Male: ${male} (${malePercent.toFixed(1)}%)`}
          >
            {malePercent > 10 && <span>{male}</span>}
          </div>
        )}
        {femalePercent > 0 && (
          <div
            className="bg-chart-3 flex items-center justify-center text-xs font-medium text-white transition-all"
            style={{ width: `${femalePercent}%` }}
            title={`Female: ${female} (${femalePercent.toFixed(1)}%)`}
          >
            {femalePercent > 10 && <span>{female}</span>}
          </div>
        )}
        {unknownPercent > 0 && (
          <div
            className="bg-muted-foreground flex items-center justify-center text-xs font-medium text-white transition-all"
            style={{ width: `${unknownPercent}%` }}
            title={`Unknown: ${unknown} (${unknownPercent.toFixed(1)}%)`}
          >
            {unknownPercent > 10 && <span>{unknown}</span>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="bg-chart-1 h-3 w-3 rounded-sm" aria-hidden="true" />
          <span className="text-muted-foreground">
            Male: {male} ({malePercent.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-chart-3 h-3 w-3 rounded-sm" aria-hidden="true" />
          <span className="text-muted-foreground">
            Female: {female} ({femalePercent.toFixed(1)}%)
          </span>
        </div>
        {unknown > 0 && (
          <div className="flex items-center gap-1.5">
            <div
              className="bg-muted-foreground h-3 w-3 rounded-sm"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              Unknown: {unknown} ({unknownPercent.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
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
export function PeopleStatisticsWidget({ config, onRemove }: WidgetProps) {
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
    >
      {stats && (
        <div className="space-y-4">
          {/* Main Statistics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total People"
              value={stats.total}
              icon={Users}
              iconColor="bg-primary/10 text-primary"
            />
            <StatCard
              label="Living"
              value={stats.living}
              icon={UserCheck}
              iconColor="bg-chart-1/10 text-chart-1"
            />
            <StatCard
              label="Deceased"
              value={stats.deceased}
              icon={UserMinus}
              iconColor="bg-muted-foreground/10 text-muted-foreground"
            />
            <StatCard
              label={`Recent (${settings.recentDays}d)`}
              value={
                settings.recentDays === 7
                  ? stats.recentAdditions.last7Days
                  : stats.recentAdditions.last30Days
              }
              icon={TrendingUp}
              iconColor="bg-chart-2/10 text-chart-2"
            />
          </div>

          {/* Gender Distribution Chart */}
          {settings.showChart && (
            <div className="border-border bg-muted/30 rounded-lg border-2 p-4">
              <GenderDistributionChart
                male={stats.male}
                female={stats.female}
                unknown={stats.unknown}
                total={stats.total}
              />
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}
