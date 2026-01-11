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

interface ChartControlsProps {
  chartType: "ancestor" | "descendant" | "hourglass" | "fan";
  generations: number;
  ancestorGenerations?: number;
  descendantGenerations?: number;
  onChartTypeChange: (
    type: "ancestor" | "descendant" | "hourglass" | "fan"
  ) => void;
  onGenerationsChange: (generations: number) => void;
  onAncestorGenerationsChange?: (generations: number) => void;
  onDescendantGenerationsChange?: (generations: number) => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
}

export function ChartControls({
  chartType,
  generations,
  ancestorGenerations = 2,
  descendantGenerations = 2,
  onChartTypeChange,
  onGenerationsChange,
  onAncestorGenerationsChange,
  onDescendantGenerationsChange,
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
