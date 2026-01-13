"use client";

import {
  Card,
  CardContent,
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui";

export type ChartType =
  | "ancestor"
  | "descendant"
  | "hourglass"
  | "fan"
  | "timeline"
  | "matrix"
  | "bowtie"
  | "compact"
  | "statistics";

interface ChartControlsProps {
  chartType: ChartType;
  generations: number;
  ancestorGenerations?: number;
  descendantGenerations?: number;
  maxPeople?: number;
  sortBy?: "birth" | "death" | "name";
  onChartTypeChange: (type: ChartType) => void;
  onGenerationsChange: (generations: number) => void;
  onAncestorGenerationsChange?: (generations: number) => void;
  onDescendantGenerationsChange?: (generations: number) => void;
  onMaxPeopleChange?: (maxPeople: number) => void;
  onSortByChange?: (sortBy: "birth" | "death" | "name") => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
}

export function ChartControls({
  chartType,
  generations,
  ancestorGenerations = 2,
  descendantGenerations = 2,
  maxPeople = 20,
  sortBy = "birth",
  onChartTypeChange,
  onGenerationsChange,
  onAncestorGenerationsChange,
  onDescendantGenerationsChange,
  onMaxPeopleChange,
  onSortByChange,
  onExportPNG,
  onExportSVG,
}: ChartControlsProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="chart-type">Chart Type</Label>
            <Select value={chartType} onValueChange={onChartTypeChange}>
              <SelectTrigger id="chart-type">
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ancestor">Ancestor Chart</SelectItem>
                <SelectItem value="descendant">Descendant Chart</SelectItem>
                <SelectItem value="hourglass">Hourglass Chart</SelectItem>
                <SelectItem value="fan">Fan Chart</SelectItem>
                <SelectItem value="timeline">Timeline Chart</SelectItem>
                <SelectItem value="matrix">Relationship Matrix</SelectItem>
                <SelectItem value="bowtie">Bowtie Chart</SelectItem>
                <SelectItem value="compact">Compact Tree</SelectItem>
                <SelectItem value="statistics">Statistics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {chartType === "hourglass" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ancestor-generations">
                  Ancestor Generations ({ancestorGenerations})
                </Label>
                <Input
                  id="ancestor-generations"
                  type="range"
                  min="1"
                  max="10"
                  value={ancestorGenerations}
                  onChange={(e) =>
                    onAncestorGenerationsChange?.(parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descendant-generations">
                  Descendant Generations ({descendantGenerations})
                </Label>
                <Input
                  id="descendant-generations"
                  type="range"
                  min="1"
                  max="10"
                  value={descendantGenerations}
                  onChange={(e) =>
                    onDescendantGenerationsChange?.(parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>
            </>
          ) : chartType === "timeline" ? (
            <div className="space-y-2">
              <Label htmlFor="sort-by">Sort By</Label>
              <Select
                value={sortBy}
                onValueChange={(value) =>
                  onSortByChange?.(value as "birth" | "death" | "name")
                }
              >
                <SelectTrigger id="sort-by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birth">Birth Year</SelectItem>
                  <SelectItem value="death">Death Year</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : chartType === "matrix" ? (
            <div className="space-y-2">
              <Label htmlFor="max-people">Max People ({maxPeople})</Label>
              <Input
                id="max-people"
                type="range"
                min="5"
                max="50"
                value={maxPeople}
                onChange={(e) => onMaxPeopleChange?.(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          ) : chartType === "statistics" ? (
            <div className="space-y-2">
              <span className="text-muted-foreground text-sm">
                Statistical analysis of all family members
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="generations">Generations ({generations})</Label>
              <Input
                id="generations"
                type="range"
                min="1"
                max="10"
                value={generations}
                onChange={(e) => onGenerationsChange(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPNG}
              className="flex-1"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportSVG}
              className="flex-1"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              SVG
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
