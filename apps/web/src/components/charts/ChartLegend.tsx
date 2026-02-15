"use client";

import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@vamsa/ui";
import type { ChartType } from "./ChartControls";

/**
 * Legend configuration for different chart types.
 * Each chart type can specify which legend items to show.
 */
interface LegendConfig {
  showNodeLegend: boolean; // Living/Deceased person indicators
  showEdgeLegend: boolean; // Parent-Child/Spouse line indicators
  showTimelineLegend: boolean; // Timeline-specific indicators
  showBowtieLegend: boolean; // Paternal/Maternal side indicators
  customContent?: React.ReactNode; // For fully custom legends
}

/**
 * Legend configurations per chart type.
 * - tree, ancestor, descendant, hourglass, fan, compact: Standard node + edge legend
 * - timeline: Timeline-specific legend (bars, date markers)
 * - matrix: No external legend (has built-in legend in the chart)
 * - bowtie: Standard + paternal/maternal indicators
 * - statistics: No legend (Recharts has built-in legends)
 */
const legendConfigs: Record<ChartType, LegendConfig> = {
  tree: {
    showNodeLegend: true,
    showEdgeLegend: true,
    showTimelineLegend: false,
    showBowtieLegend: false,
  },
  ancestor: {
    showNodeLegend: true,
    showEdgeLegend: true,
    showTimelineLegend: false,
    showBowtieLegend: false,
  },
  descendant: {
    showNodeLegend: true,
    showEdgeLegend: true,
    showTimelineLegend: false,
    showBowtieLegend: false,
  },
  hourglass: {
    showNodeLegend: true,
    showEdgeLegend: true,
    showTimelineLegend: false,
    showBowtieLegend: false,
  },
  fan: {
    showNodeLegend: true,
    showEdgeLegend: true,
    showTimelineLegend: false,
    showBowtieLegend: false,
  },
  compact: {
    showNodeLegend: true,
    showEdgeLegend: true,
    showTimelineLegend: false,
    showBowtieLegend: false,
  },
  timeline: {
    showNodeLegend: false,
    showEdgeLegend: false,
    showTimelineLegend: true,
    showBowtieLegend: false,
  },
  matrix: {
    showNodeLegend: false,
    showEdgeLegend: false,
    showTimelineLegend: false,
    showBowtieLegend: false,
  }, // Built-in legend
  bowtie: {
    showNodeLegend: true,
    showEdgeLegend: true,
    showTimelineLegend: false,
    showBowtieLegend: true,
  },
  statistics: {
    showNodeLegend: false,
    showEdgeLegend: false,
    showTimelineLegend: false,
    showBowtieLegend: false,
  }, // Recharts legends
  list: {
    showNodeLegend: false,
    showEdgeLegend: false,
    showTimelineLegend: false,
    showBowtieLegend: false,
  }, // List view doesn't need a legend (text-based)
};

interface ChartLegendProps {
  chartType: ChartType;
}

/**
 * Node legend items - Living/Deceased person indicators
 */
function NodeLegend() {
  const { t } = useTranslation(["charts"]);
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 border-primary h-12 w-12 rounded-lg border-2" />
        <div>
          <p className="text-sm font-medium">{t("charts:livingPerson")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:greenBorder")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-muted border-border h-12 w-12 rounded-lg border-2" />
        <div>
          <p className="text-sm font-medium">{t("charts:deceasedPerson")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:grayBackground")}
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * Edge legend items - Parent-Child/Spouse line indicators
 */
function EdgeLegend() {
  const { t } = useTranslation(["charts"]);
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="border-border h-12 w-12 rounded-lg border-2" />
        <div>
          <p className="text-sm font-medium">{t("charts:parentChild")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:solidLine")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="border-primary h-12 w-12 rounded-lg border-2 border-dashed" />
        <div>
          <p className="text-sm font-medium">{t("charts:spouse")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:dashedLine")}
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * Timeline-specific legend items
 */
function TimelineLegend() {
  const { t } = useTranslation(["charts"]);
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="bg-primary/60 border-primary h-6 w-16 rounded border" />
        <div>
          <p className="text-sm font-medium">{t("charts:livingPerson")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:extendToPresent")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-muted border-border h-6 w-16 rounded border" />
        <div>
          <p className="text-sm font-medium">{t("charts:deceasedPerson")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:birthToDeath")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center">
          <div className="bg-primary h-2 w-2 rounded-full" />
        </div>
        <div>
          <p className="text-sm font-medium">{t("charts:birthDate")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:greenMarker")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center">
          <div className="bg-muted-foreground h-2 w-2 rounded-full" />
        </div>
        <div>
          <p className="text-sm font-medium">{t("charts:deathDate")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:grayMarker")}
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * Bowtie-specific legend additions (paternal/maternal indicators)
 */
function BowtieLegend() {
  const { t } = useTranslation(["charts"]);
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="bg-chart-1/30 border-chart-1 h-12 w-12 rounded-lg border-2" />
        <div>
          <p className="text-sm font-medium">{t("charts:paternalSide")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:paternalAncestors")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-chart-3/30 border-chart-3 h-12 w-12 rounded-lg border-2" />
        <div>
          <p className="text-sm font-medium">{t("charts:maternalSide")}</p>
          <p className="text-muted-foreground text-xs">
            {t("charts:maternalAncestors")}
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * ChartLegend component that renders appropriate legend items
 * based on the chart type configuration.
 */
export function ChartLegend({ chartType }: ChartLegendProps) {
  const { t } = useTranslation(["charts"]);
  const config = legendConfigs[chartType];

  // Don't render if no legend items are configured
  if (
    !config.showNodeLegend &&
    !config.showEdgeLegend &&
    !config.showTimelineLegend &&
    !config.showBowtieLegend &&
    !config.customContent
  ) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-display mb-4 text-lg font-medium">
          {t("charts:legend")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {config.showNodeLegend && <NodeLegend />}
          {config.showEdgeLegend && <EdgeLegend />}
          {config.showTimelineLegend && <TimelineLegend />}
          {config.showBowtieLegend && <BowtieLegend />}
          {config.customContent}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Check if a chart type needs a legend.
 * Useful for conditional rendering in parent components.
 */
export function chartTypesNeedsLegend(chartType: ChartType): boolean {
  const config = legendConfigs[chartType];
  return (
    config.showNodeLegend ||
    config.showEdgeLegend ||
    config.showTimelineLegend ||
    config.showBowtieLegend ||
    !!config.customContent
  );
}
