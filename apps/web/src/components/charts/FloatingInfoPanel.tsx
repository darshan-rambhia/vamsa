"use client";

import { useState, useCallback } from "react";
import { cn, Button } from "@vamsa/ui";
import type { ChartType } from "./ChartControls";
import type { ChartMetadata } from "./ChartStatsPanel";

interface FloatingInfoPanelProps {
  chartType: ChartType;
  metadata?: ChartMetadata;
  className?: string;
}

/**
 * Floating info panel that overlays on the chart.
 * Shows stats and legend in a compact, collapsible format.
 * Position: bottom-right of the chart container.
 */
export function FloatingInfoPanel({
  chartType,
  metadata,
  className,
}: FloatingInfoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Statistics chart has its own display - no info panel needed
  if (chartType === "statistics") {
    return null;
  }

  // Matrix has built-in legend
  if (chartType === "matrix") {
    return null;
  }

  // Determine what to show based on chart type
  const showLegend = !["statistics", "matrix"].includes(chartType);
  const hasStats = metadata && metadata.totalPeople > 0;

  return (
    <div
      className={cn(
        "absolute right-3 bottom-3 z-20 transition-all duration-200",
        className
      )}
    >
      {/* Collapsed state - just an info button */}
      {!isExpanded && (
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleExpanded}
          className="bg-card/95 border shadow-lg backdrop-blur-sm"
        >
          <svg
            className="mr-1.5 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Info
        </Button>
      )}

      {/* Expanded state - full info panel */}
      {isExpanded && (
        <div className="bg-card/95 flex max-w-xs flex-col gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm">
          {/* Header with collapse button */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Chart Info</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleExpanded}
              title="Collapse info"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>

          {/* Stats Section */}
          {hasStats && (
            <div className="border-b pb-2">
              <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
                Statistics
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">People:</span>
                  <span className="font-medium">{metadata.totalPeople}</span>
                </div>
                {metadata.totalGenerations !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Generations:</span>
                    <span className="font-medium">
                      {metadata.totalGenerations}
                    </span>
                  </div>
                )}
                {metadata.minYear !== undefined &&
                  metadata.maxYear !== undefined && (
                    <div className="col-span-2 flex justify-between">
                      <span className="text-muted-foreground">Years:</span>
                      <span className="font-medium">
                        {metadata.minYear} - {metadata.maxYear}
                      </span>
                    </div>
                  )}
                {metadata.totalRelationships !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Relations:</span>
                    <span className="font-medium">
                      {metadata.totalRelationships}
                    </span>
                  </div>
                )}
                {chartType === "bowtie" &&
                  metadata.paternalCount !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paternal:</span>
                        <span className="font-medium">
                          {metadata.paternalCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maternal:</span>
                        <span className="font-medium">
                          {metadata.maternalCount ?? 0}
                        </span>
                      </div>
                    </>
                  )}
              </div>
            </div>
          )}

          {/* Legend Section */}
          {showLegend && (
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
                Legend
              </p>
              <div className="grid gap-1.5 text-xs">
                {/* Living/Deceased */}
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 border-primary h-4 w-4 rounded border" />
                  <span className="text-muted-foreground">Living</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted border-border h-4 w-4 rounded border" />
                  <span className="text-muted-foreground">Deceased</span>
                </div>

                {/* Timeline-specific */}
                {chartType === "timeline" && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="bg-primary h-2 w-2 rounded-full" />
                      <span className="text-muted-foreground">Birth</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-muted-foreground h-2 w-2 rounded-full" />
                      <span className="text-muted-foreground">Death</span>
                    </div>
                  </>
                )}

                {/* Bowtie-specific */}
                {chartType === "bowtie" && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="bg-chart-1/30 border-chart-1 h-4 w-4 rounded border" />
                      <span className="text-muted-foreground">Paternal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-chart-3/30 border-chart-3 h-4 w-4 rounded border" />
                      <span className="text-muted-foreground">Maternal</span>
                    </div>
                  </>
                )}

                {/* Edge types for tree-based charts */}
                {[
                  "tree",
                  "ancestor",
                  "descendant",
                  "hourglass",
                  "fan",
                  "compact",
                ].includes(chartType) && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="border-border h-0.5 w-4 border-t-2" />
                      <span className="text-muted-foreground">
                        Parent-Child
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="border-primary h-0.5 w-4 border-t-2 border-dashed" />
                      <span className="text-muted-foreground">Spouse</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
