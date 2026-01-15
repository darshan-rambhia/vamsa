"use client";

import { Card, CardContent } from "@vamsa/ui";
import type { ChartType } from "./ChartControls";

/**
 * Stats panel configuration for different chart types.
 * Each chart type can specify which stats to show.
 */
interface StatsConfig {
  showChartType: boolean;
  showTotalPeople: boolean;
  showGenerations: boolean;
  showYearRange: boolean;
  showRelationships: boolean;
  showLivingCount: boolean;
  showBowtieCounts: boolean;
  hidden: boolean; // When true, no stats panel is shown
}

/**
 * Stats configurations per chart type.
 * - statistics: Hidden (the chart IS the stats)
 * - timeline: Year range focused
 * - matrix: Relationship count focused
 * - bowtie: Includes paternal/maternal breakdown
 * - others: Standard generation-focused
 */
const statsConfigs: Record<ChartType, StatsConfig> = {
  tree: {
    showChartType: true,
    showTotalPeople: true,
    showGenerations: true,
    showYearRange: false,
    showRelationships: false,
    showLivingCount: false,
    showBowtieCounts: false,
    hidden: false,
  },
  ancestor: {
    showChartType: true,
    showTotalPeople: true,
    showGenerations: true,
    showYearRange: false,
    showRelationships: false,
    showLivingCount: false,
    showBowtieCounts: false,
    hidden: false,
  },
  descendant: {
    showChartType: true,
    showTotalPeople: true,
    showGenerations: true,
    showYearRange: false,
    showRelationships: false,
    showLivingCount: false,
    showBowtieCounts: false,
    hidden: false,
  },
  hourglass: {
    showChartType: true,
    showTotalPeople: true,
    showGenerations: true,
    showYearRange: false,
    showRelationships: false,
    showLivingCount: false,
    showBowtieCounts: false,
    hidden: false,
  },
  fan: {
    showChartType: true,
    showTotalPeople: true,
    showGenerations: true,
    showYearRange: false,
    showRelationships: false,
    showLivingCount: false,
    showBowtieCounts: false,
    hidden: false,
  },
  compact: {
    showChartType: true,
    showTotalPeople: true,
    showGenerations: true,
    showYearRange: false,
    showRelationships: false,
    showLivingCount: false,
    showBowtieCounts: false,
    hidden: false,
  },
  timeline: {
    showChartType: true,
    showTotalPeople: true,
    showGenerations: false,
    showYearRange: true,
    showRelationships: false,
    showLivingCount: false,
    showBowtieCounts: false,
    hidden: false,
  },
  matrix: {
    showChartType: true,
    showTotalPeople: true,
    showGenerations: false,
    showYearRange: false,
    showRelationships: true,
    showLivingCount: false,
    showBowtieCounts: false,
    hidden: false,
  },
  bowtie: {
    showChartType: true,
    showTotalPeople: true,
    showGenerations: true,
    showYearRange: false,
    showRelationships: false,
    showLivingCount: false,
    showBowtieCounts: true,
    hidden: false,
  },
  statistics: {
    // Statistics charts are themselves stats - don't show redundant panel
    showChartType: false,
    showTotalPeople: false,
    showGenerations: false,
    showYearRange: false,
    showRelationships: false,
    showLivingCount: false,
    showBowtieCounts: false,
    hidden: true,
  },
};

/**
 * Metadata shape from chart data
 */
export interface ChartMetadata {
  totalPeople: number;
  totalGenerations?: number;
  minYear?: number;
  maxYear?: number;
  totalRelationships?: number;
  livingCount?: number;
  paternalCount?: number;
  maternalCount?: number;
}

interface ChartStatsPanelProps {
  chartType: ChartType;
  metadata: ChartMetadata;
}

/**
 * Individual stat item component
 */
function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-display text-lg font-medium">{value}</p>
    </div>
  );
}

/**
 * ChartStatsPanel component that renders appropriate stats
 * based on the chart type configuration.
 */
export function ChartStatsPanel({ chartType, metadata }: ChartStatsPanelProps) {
  const config = statsConfigs[chartType];

  // Don't render if hidden or no stats configured
  if (config.hidden) {
    return null;
  }

  // Build the stats grid dynamically
  const stats: Array<{ label: string; value: string | number }> = [];

  if (config.showChartType) {
    // Format chart type name nicely
    const chartNames: Record<ChartType, string> = {
      tree: "Interactive Tree",
      ancestor: "Ancestor Chart",
      descendant: "Descendant Chart",
      hourglass: "Hourglass Chart",
      fan: "Fan Chart",
      timeline: "Timeline Chart",
      matrix: "Relationship Matrix",
      bowtie: "Bowtie Chart",
      compact: "Compact Tree",
      statistics: "Statistics",
    };
    stats.push({ label: "Chart Type", value: chartNames[chartType] });
  }

  if (config.showTotalPeople) {
    stats.push({ label: "Total People", value: metadata.totalPeople });
  }

  if (config.showGenerations && metadata.totalGenerations !== undefined) {
    stats.push({ label: "Generations", value: metadata.totalGenerations });
  }

  if (config.showYearRange && metadata.minYear !== undefined && metadata.maxYear !== undefined) {
    stats.push({ label: "Year Range", value: `${metadata.minYear} - ${metadata.maxYear}` });
  }

  if (config.showRelationships && metadata.totalRelationships !== undefined) {
    stats.push({ label: "Relationships", value: metadata.totalRelationships });
  }

  if (config.showLivingCount && metadata.livingCount !== undefined) {
    stats.push({ label: "Living", value: metadata.livingCount });
  }

  // Don't render if no stats to show
  if (stats.length === 0 && !config.showBowtieCounts) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <StatItem key={index} label={stat.label} value={stat.value} />
          ))}

          {/* Bowtie-specific stats */}
          {config.showBowtieCounts && metadata.paternalCount !== undefined && (
            <>
              <StatItem label="Paternal Ancestors" value={metadata.paternalCount} />
              <StatItem label="Maternal Ancestors" value={metadata.maternalCount ?? 0} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Check if a chart type needs a stats panel.
 * Useful for conditional rendering in parent components.
 */
export function chartTypeNeedsStatsPanel(chartType: ChartType): boolean {
  return !statsConfigs[chartType].hidden;
}
