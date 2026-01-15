"use client";

import { type ReactNode } from "react";
import {
  Container,
  PageHeader,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Button,
} from "@vamsa/ui";
import { PersonSelector } from "~/components/charts/PersonSelector";
import {
  ChartStatsPanel,
  type ChartMetadata,
} from "~/components/charts/ChartStatsPanel";
import { ChartLegend } from "~/components/charts/ChartLegend";
import { type ChartType } from "~/components/charts/ChartControls";

interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: Date | string | null;
  isLiving?: boolean | null;
}

export interface VisualizationLayoutProps {
  // Type selector
  visualizationType: ChartType;
  onTypeChange: (type: ChartType) => void;

  // Person selector (optional - some charts don't need it)
  showPersonSelector?: boolean;
  persons?: Person[];
  selectedPersonId?: string;
  onPersonChange?: (id: string) => void;
  isLoadingPersons?: boolean;

  // Chart controls slot - for generation sliders, sort options, etc.
  controlsSlot?: ReactNode;

  // Export handlers
  onExportPDF?: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onPrint?: () => void;

  // Chart content
  children: ReactNode;

  // Stats metadata
  metadata?: ChartMetadata;

  // Loading state
  isLoading?: boolean;
}

const chartTypeLabels: Record<ChartType, string> = {
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

export function VisualizationLayout({
  visualizationType,
  onTypeChange,
  showPersonSelector = false,
  persons = [],
  selectedPersonId,
  onPersonChange,
  isLoadingPersons = false,
  controlsSlot,
  onExportPDF,
  onExportPNG,
  onExportSVG,
  onPrint,
  children,
  metadata,
  isLoading = false,
}: VisualizationLayoutProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <Container className="space-y-6">
      {/* Page Header - always shown */}
      <PageHeader
        title="Family Visualizations"
        description="Explore your family tree through interactive charts and diagrams"
      />

      {/* Unified Controls Card - Type Selector + Person Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Visualization Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="viz-type">Visualization Type</Label>
              <Select
                value={visualizationType}
                onValueChange={(value) => onTypeChange(value as ChartType)}
              >
                <SelectTrigger id="viz-type" className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(chartTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Person Selector */}
            {showPersonSelector && onPersonChange && (
              <PersonSelector
                persons={persons}
                selectedPersonId={selectedPersonId}
                onPersonChange={onPersonChange}
                isLoading={isLoadingPersons}
                label="Center On"
                placeholder="Search people..."
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart Controls Card - Generation Sliders + Export Buttons */}
      <Card className="chart-controls">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Left side: Chart-specific controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {controlsSlot}
            </div>

            {/* Right side: Export buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExportPDF}
                disabled={isLoading || !onExportPDF}
                title="Export as PDF"
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
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportPNG}
                disabled={isLoading || !onExportPNG}
                title="Export as PNG (2x resolution)"
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
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                <span className="hidden sm:inline">PNG</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportSVG}
                disabled={isLoading || !onExportSVG}
                title="Export as SVG"
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
                    d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                  />
                </svg>
                <span className="hidden sm:inline">SVG</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isLoading}
                title="Print chart"
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
                    d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
                  />
                </svg>
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart Content Area */}
      <div className="chart-container">{children}</div>

      {/* Stats Panel */}
      {metadata && (
        <ChartStatsPanel chartType={visualizationType} metadata={metadata} />
      )}

      {/* Legend */}
      <ChartLegend chartType={visualizationType} />
    </Container>
  );
}
