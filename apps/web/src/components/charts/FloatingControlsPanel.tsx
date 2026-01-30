"use client";

import { useCallback, useState } from "react";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@vamsa/ui";
import { GenerationSlider } from "./GenerationSlider";
import type { ChartType } from "./ChartControls";

interface FloatingControlsPanelProps {
  chartType: ChartType;
  generations: number;
  ancestorGenerations?: number;
  descendantGenerations?: number;
  maxPeople?: number;
  sortBy?: "birth" | "death" | "name";
  onGenerationsChange: (generations: number) => void;
  onAncestorGenerationsChange?: (generations: number) => void;
  onDescendantGenerationsChange?: (generations: number) => void;
  onMaxPeopleChange?: (maxPeople: number) => void;
  onSortByChange?: (sortBy: "birth" | "death" | "name") => void;
  onExportPDF?: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onResetView?: () => void;
  className?: string;
}

/**
 * Floating controls panel that overlays on the chart.
 * Collapsible to maximize chart viewing area.
 */
export function FloatingControlsPanel({
  chartType,
  ancestorGenerations = 2,
  descendantGenerations = 2,
  maxPeople = 20,
  sortBy = "birth",
  onAncestorGenerationsChange,
  onDescendantGenerationsChange,
  onMaxPeopleChange,
  onSortByChange,
  onExportPDF,
  onExportPNG,
  onExportSVG,
  onResetView,
  className,
}: FloatingControlsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const toggleExportMenu = useCallback(() => {
    setIsExportOpen((prev) => !prev);
  }, []);

  const handleExportClick = useCallback((fn?: () => void) => {
    if (fn) fn();
    setIsExportOpen(false);
  }, []);

  // Determine which controls to show based on chart type
  const showAncestorSlider = [
    "tree",
    "hourglass",
    "ancestor",
    "fan",
    "bowtie",
  ].includes(chartType);
  const showDescendantSlider = [
    "tree",
    "hourglass",
    "descendant",
    "compact",
  ].includes(chartType);
  const showSortBy = chartType === "timeline";
  const showMaxPeople = chartType === "matrix";
  const showStatisticsInfo = chartType === "statistics";

  return (
    <div
      className={cn(
        "absolute top-3 left-3 z-20 transition-all duration-200",
        className
      )}
    >
      {/* Collapsed state - just a button */}
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
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
          Controls
        </Button>
      )}

      {/* Expanded state - full controls panel */}
      {isExpanded && (
        <div className="bg-card/95 flex flex-col gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm">
          {/* Header with collapse button */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Chart Controls</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleExpanded}
              title="Collapse controls"
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

          {/* Generation Controls */}
          <div className="flex flex-col gap-3">
            {showAncestorSlider && (
              <GenerationSlider
                label="Ancestors"
                value={ancestorGenerations}
                min={1}
                max={10}
                onChange={(v) => onAncestorGenerationsChange?.(v)}
                showNumberInput
                id="floating-ancestor-generations"
                compact
              />
            )}

            {showDescendantSlider && (
              <GenerationSlider
                label="Descendants"
                value={descendantGenerations}
                min={1}
                max={10}
                onChange={(v) => onDescendantGenerationsChange?.(v)}
                showNumberInput
                id="floating-descendant-generations"
                compact
              />
            )}

            {showSortBy && (
              <div className="space-y-1">
                <Label htmlFor="floating-sort-by" className="text-xs">
                  Sort By
                </Label>
                <Select
                  value={sortBy}
                  onValueChange={(value) =>
                    onSortByChange?.(value as "birth" | "death" | "name")
                  }
                >
                  <SelectTrigger id="floating-sort-by" className="h-8 text-xs">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birth">Birth Year</SelectItem>
                    <SelectItem value="death">Death Year</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {showMaxPeople && (
              <GenerationSlider
                label="Max People"
                value={maxPeople}
                min={5}
                max={50}
                onChange={(v) => onMaxPeopleChange?.(v)}
                showNumberInput
                id="floating-max-people"
                compact
              />
            )}

            {showStatisticsInfo && (
              <p className="text-muted-foreground text-xs">
                Analysis of all family members
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onResetView}
              title="Reset zoom and recenter"
            >
              <svg
                className="mr-1 h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 9.75A7.5 7.5 0 0112 2.25c4.142 0 7.5 3.358 7.5 7.5m0 0H18m1.5 0V6.75M19.5 14.25A7.5 7.5 0 0112 21.75 7.5 7.5 0 014.5 14.25m0 0H6m-1.5 0v3"
                />
              </svg>
              Reset
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={toggleExportMenu}
                title="Export chart"
              >
                <svg
                  className="mr-1 h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                Export
              </Button>

              {isExportOpen && (
                <div className="bg-popover border-border absolute top-full left-0 z-30 mt-1 w-32 rounded-md border shadow-lg">
                  <div className="flex flex-col py-1 text-xs">
                    <button
                      className="hover:bg-muted px-3 py-1.5 text-left"
                      onClick={() => handleExportClick(onExportPDF)}
                    >
                      PDF
                    </button>
                    <button
                      className="hover:bg-muted px-3 py-1.5 text-left"
                      onClick={() => handleExportClick(onExportPNG)}
                    >
                      PNG (2x)
                    </button>
                    <button
                      className="hover:bg-muted px-3 py-1.5 text-left"
                      onClick={() => handleExportClick(onExportSVG)}
                    >
                      SVG
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
