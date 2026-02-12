"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui";
import { GenerationSlider } from "./GenerationSlider";

export type ChartType =
  | "tree"
  | "ancestor"
  | "descendant"
  | "hourglass"
  | "fan"
  | "timeline"
  | "matrix"
  | "bowtie"
  | "compact"
  | "statistics"
  | "list";

export interface ChartControlsProps {
  chartType: ChartType;
  generations: number;
  ancestorGenerations?: number;
  descendantGenerations?: number;
  maxPeople?: number;
  sortBy?: "birth" | "death" | "name";
  hideChartTypeSelector?: boolean;
  showMiniMap?: boolean;
  onChartTypeChange?: (type: ChartType) => void;
  onGenerationsChange: (generations: number) => void;
  onAncestorGenerationsChange?: (generations: number) => void;
  onDescendantGenerationsChange?: (generations: number) => void;
  onMaxPeopleChange?: (maxPeople: number) => void;
  onSortByChange?: (sortBy: "birth" | "death" | "name") => void;
  onExportPDF?: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onPrint?: () => void;
  onResetView?: () => void;
  onToggleMiniMap?: () => void;
  activeContextLabel?: string;
}

export function ChartControls({
  chartType,
  ancestorGenerations = 2,
  descendantGenerations = 2,
  maxPeople = 20,
  sortBy = "birth",
  hideChartTypeSelector = false,
  showMiniMap = false,
  onChartTypeChange,
  onAncestorGenerationsChange,
  onDescendantGenerationsChange,
  onMaxPeopleChange,
  onSortByChange,
  onExportPDF,
  onExportPNG,
  onExportSVG,
  onPrint,
  onResetView,
  onToggleMiniMap,
  activeContextLabel,
}: ChartControlsProps) {
  const { t } = useTranslation(["charts", "common"]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const toggleExportMenu = () => setIsExportOpen((prev) => !prev);

  const closeExportMenu = () => setIsExportOpen(false);

  const handleExportClick = (fn?: () => void) => {
    if (fn) fn();
    closeExportMenu();
  };

  return (
    <Card className="chart-controls">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {/* Left side: Controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {!hideChartTypeSelector && (
              <div className="space-y-2">
                <Label htmlFor="chart-type">{t("charts:chartType")}</Label>
                <Select value={chartType} onValueChange={onChartTypeChange}>
                  <SelectTrigger id="chart-type" className="w-45">
                    <SelectValue placeholder={t("charts:selectChartType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tree">
                      {t("charts:interactiveTree")}
                    </SelectItem>
                    <SelectItem value="ancestor">
                      {t("charts:ancestorChart")}
                    </SelectItem>
                    <SelectItem value="descendant">
                      {t("charts:descendantChart")}
                    </SelectItem>
                    <SelectItem value="hourglass">
                      {t("charts:hourglassChart")}
                    </SelectItem>
                    <SelectItem value="fan">{t("charts:fanChart")}</SelectItem>
                    <SelectItem value="timeline">
                      {t("charts:timelineChart")}
                    </SelectItem>
                    <SelectItem value="matrix">
                      {t("charts:relationshipMatrix")}
                    </SelectItem>
                    <SelectItem value="bowtie">
                      {t("charts:bowtieChart")}
                    </SelectItem>
                    <SelectItem value="compact">
                      {t("charts:compactTree")}
                    </SelectItem>
                    <SelectItem value="statistics">
                      {t("charts:statistics")}
                    </SelectItem>
                    <SelectItem value="list">
                      {t("charts:listViewAccessible")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Generation sliders based on chart type configuration:
                - Tree, Hourglass: Both ancestor + descendant
                - Ancestor, Fan, Bowtie: Ancestor only
                - Descendant, Compact: Descendant only
                - Timeline: Sort dropdown
                - Matrix: Max people slider
                - Statistics: No controls */}

            {/* Ancestor slider - for: tree, hourglass, ancestor, fan, bowtie */}
            {["tree", "hourglass", "ancestor", "fan", "bowtie"].includes(
              chartType
            ) && (
              <GenerationSlider
                label={t("charts:ancestorGenerations")}
                value={ancestorGenerations}
                min={1}
                max={10}
                onChange={(v) => onAncestorGenerationsChange?.(v)}
                showNumberInput
                id="ancestor-generations"
              />
            )}

            {/* Descendant slider - for: tree, hourglass, descendant, compact */}
            {["tree", "hourglass", "descendant", "compact"].includes(
              chartType
            ) && (
              <GenerationSlider
                label={t("charts:descendantGenerations")}
                value={descendantGenerations}
                min={1}
                max={10}
                onChange={(v) => onDescendantGenerationsChange?.(v)}
                showNumberInput
                id="descendant-generations"
              />
            )}

            {/* Timeline: Sort dropdown */}
            {chartType === "timeline" && (
              <div className="space-y-2">
                <Label htmlFor="sort-by">{t("charts:sortBy")}</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value) =>
                    onSortByChange?.(value as "birth" | "death" | "name")
                  }
                >
                  <SelectTrigger id="sort-by" className="w-40">
                    <SelectValue placeholder={t("charts:sortBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birth">
                      {t("charts:birthYear")}
                    </SelectItem>
                    <SelectItem value="death">
                      {t("charts:deathYear")}
                    </SelectItem>
                    <SelectItem value="name">{t("common:name")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Matrix: Max people slider */}
            {chartType === "matrix" && (
              <GenerationSlider
                label={t("charts:maxPeople")}
                value={maxPeople}
                min={5}
                max={50}
                onChange={(v) => onMaxPeopleChange?.(v)}
                showNumberInput
                id="max-people"
              />
            )}

            {/* Statistics: Info text */}
            {chartType === "statistics" && (
              <div className="flex items-center">
                <span className="text-muted-foreground text-sm">
                  {t("charts:statisticalAnalysis")}
                </span>
              </div>
            )}
          </div>

          {/* Actions: mini-map toggle, reset view + export menu */}
          <div className="flex flex-wrap items-center gap-2">
            {activeContextLabel && (
              <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                {activeContextLabel}
              </span>
            )}
            {onToggleMiniMap && (
              <Button
                variant={showMiniMap ? "default" : "outline"}
                size="sm"
                onClick={onToggleMiniMap}
                title={t("charts:toggleMiniMap")}
                aria-label={t("charts:toggleMiniMap")}
              >
                <svg
                  className="h-4 w-4 sm:mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                  />
                </svg>
                <span className="hidden sm:inline">{t("charts:miniMap")}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onResetView}
              title={t("charts:resetZoomRecenter")}
            >
              <svg
                className="h-4 w-4 sm:mr-1.5"
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
              <span className="hidden sm:inline">{t("charts:resetView")}</span>
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleExportMenu}
                title={t("charts:exportOrShare")}
              >
                <svg
                  className="h-4 w-4 sm:mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {t("charts:exportShare")}
                </span>
              </Button>

              {isExportOpen && (
                <div className="bg-popover border-border absolute right-0 z-20 mt-2 w-44 rounded-md border shadow-lg">
                  <div className="flex flex-col py-2 text-sm">
                    <button
                      className="hover:bg-muted px-3 py-2 text-left"
                      onClick={() => handleExportClick(onExportPDF)}
                    >
                      {t("charts:exportPdf")}
                    </button>
                    <button
                      className="hover:bg-muted px-3 py-2 text-left"
                      onClick={() => handleExportClick(onExportPNG)}
                    >
                      {t("charts:exportPng2x")}
                    </button>
                    <button
                      className="hover:bg-muted px-3 py-2 text-left"
                      onClick={() => handleExportClick(onExportSVG)}
                    >
                      {t("charts:exportSvg")}
                    </button>
                    <button
                      className="hover:bg-muted px-3 py-2 text-left"
                      onClick={() => handleExportClick(handlePrint)}
                    >
                      {t("charts:print")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
