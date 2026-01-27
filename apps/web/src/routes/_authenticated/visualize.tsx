import {
  createFileRoute,
  useSearch,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "~/server/auth.functions";
import { useCallback, useId, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Label,
} from "@vamsa/ui";
import { listPersons } from "~/server/persons.functions";
import {
  getAncestorChart,
  getDescendantChart,
  getHourglassChart,
  getFanChart,
  getTimelineChart,
  getRelationshipMatrix,
  getBowtieChart,
  getCompactTreeData,
  getStatistics,
  getTreeChart,
} from "~/server/charts";
import { type ChartType } from "~/components/charts/ChartControls";
import { AncestorChart } from "~/components/charts/AncestorChart";
import { DescendantChart } from "~/components/charts/DescendantChart";
import { HourglassChart } from "~/components/charts/HourglassChart";
import { FanChart } from "~/components/charts/FanChart";
import { TimelineChart } from "~/components/charts/TimelineChart";
import { RelationshipMatrix } from "~/components/charts/RelationshipMatrix";
import { BowtieChart } from "~/components/charts/BowtieChart";
import { CompactTree } from "~/components/charts/CompactTree";
import { StatisticsCharts } from "~/components/charts/StatisticsCharts";
import { TreeChart } from "~/components/charts/TreeChart";
import { exportToPDF, exportToPNG, exportToSVG } from "~/lib/chart-export";
import { ChartContainer } from "~/components/charts/ChartContainer";
import { PersonSelector } from "~/components/charts/PersonSelector";
import { FloatingInfoPanel } from "~/components/charts/FloatingInfoPanel";
import { GenerationSlider } from "~/components/charts/GenerationSlider";

// ChartType now includes "tree", so we use it directly
export type VisualizationType = ChartType;

interface VisualizeSearchParams {
  type?: VisualizationType;
  personId?: string;
  view?: "focused" | "full";
  expanded?: string;
  generations?: number;
  ancestorGenerations?: number;
  descendantGenerations?: number;
  maxPeople?: number;
  sortBy?: "birth" | "death" | "name";
}

export const Route = createFileRoute("/_authenticated/visualize")({
  component: VisualizeComponent,
  validateSearch: (search: Record<string, unknown>): VisualizeSearchParams => ({
    type: (search.type as VisualizationType) || "tree",
    personId: typeof search.personId === "string" ? search.personId : undefined,
    view: search.view === "full" ? "full" : "focused",
    expanded: typeof search.expanded === "string" ? search.expanded : undefined,
    generations:
      typeof search.generations === "number" ? search.generations : 3,
    ancestorGenerations:
      typeof search.ancestorGenerations === "number"
        ? search.ancestorGenerations
        : 2,
    descendantGenerations:
      typeof search.descendantGenerations === "number"
        ? search.descendantGenerations
        : 2,
    maxPeople: typeof search.maxPeople === "number" ? search.maxPeople : 20,
    sortBy:
      search.sortBy === "birth" ||
      search.sortBy === "death" ||
      search.sortBy === "name"
        ? search.sortBy
        : "birth",
  }),
});

function VisualizeComponent() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/visualize" });
  const [resetToken, setResetToken] = useState(0);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const chartTypeId = useId();
  const sortById = useId();

  const visualizationType = search.type || "tree";
  const ancestorGenerations = search.ancestorGenerations || 2;
  const descendantGenerations = search.descendantGenerations || 2;
  const maxPeople = search.maxPeople || 20;
  const sortBy = search.sortBy || "birth";

  // Fetch current user for tree centering
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  // Fetch all persons for chart person selection
  const { data: personsData, isLoading: isLoadingPersons } = useQuery({
    queryKey: ["persons"],
    queryFn: () => listPersons({ data: {} }),
  });

  // Selected person - default to current user's personId for charts
  const selectedPersonId =
    search.personId || currentUser?.personId || undefined;

  // Handle visualization type change
  const handleTypeChange = useCallback(
    (type: VisualizationType) => {
      navigate({
        to: "/visualize",
        search: {
          ...search,
          type: type === "tree" ? undefined : type,
        },
        replace: true,
      });
    },
    [navigate, search]
  );

  // Handle person change
  const handlePersonChange = useCallback(
    (personId: string) => {
      navigate({
        to: "/visualize",
        search: {
          ...search,
          personId,
        },
        replace: true,
      });
    },
    [navigate, search]
  );

  const handleAncestorGenerationsChange = useCallback(
    (newGenerations: number) => {
      navigate({
        to: "/visualize",
        search: {
          ...search,
          ancestorGenerations: newGenerations,
        },
        replace: true,
      });
    },
    [navigate, search]
  );

  const handleDescendantGenerationsChange = useCallback(
    (newGenerations: number) => {
      navigate({
        to: "/visualize",
        search: {
          ...search,
          descendantGenerations: newGenerations,
        },
        replace: true,
      });
    },
    [navigate, search]
  );

  const handleMaxPeopleChange = useCallback(
    (newMaxPeople: number) => {
      navigate({
        to: "/visualize",
        search: {
          ...search,
          maxPeople: newMaxPeople,
        },
        replace: true,
      });
    },
    [navigate, search]
  );

  const handleSortByChange = useCallback(
    (newSortBy: "birth" | "death" | "name") => {
      navigate({
        to: "/visualize",
        search: {
          ...search,
          sortBy: newSortBy,
        },
        replace: true,
      });
    },
    [navigate, search]
  );

  // Determine which controls to show
  const showPersonSelector = !["timeline", "matrix", "statistics"].includes(
    visualizationType
  );
  const showAncestorSlider = [
    "tree",
    "hourglass",
    "ancestor",
    "fan",
    "bowtie",
  ].includes(visualizationType);
  const showDescendantSlider = [
    "tree",
    "hourglass",
    "descendant",
    "compact",
  ].includes(visualizationType);
  const showSortBy = visualizationType === "timeline";
  const showMaxPeople = visualizationType === "matrix";

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

  const getChartTitle = () => chartTypeLabels[visualizationType];

  const handleExportPDF = async () => {
    const svg = document.querySelector(".chart-container svg[data-chart-svg]");
    if (!svg) return;

    try {
      const bbox = (svg as SVGGraphicsElement).getBBox();
      const isWideChart = bbox.width > bbox.height * 1.2;

      await exportToPDF(svg as SVGElement, {
        title: getChartTitle(),
        orientation: isWideChart ? "landscape" : "portrait",
        includeMetadata: true,
        scale: 1,
      });
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Failed to export chart as PDF. Please try again.");
    }
    setIsExportOpen(false);
  };

  const handleExportPNG = () => {
    const svg = document.querySelector(".chart-container svg[data-chart-svg]");
    if (!svg) return;

    try {
      const filename = `vamsa-${visualizationType}-chart-${new Date().toISOString().split("T")[0]}.png`;
      exportToPNG(svg as SVGElement, filename, 2);
    } catch (error) {
      console.error("Failed to export PNG:", error);
      alert("Failed to export chart as PNG. Please try again.");
    }
    setIsExportOpen(false);
  };

  const handleExportSVG = () => {
    const svg = document.querySelector(".chart-container svg[data-chart-svg]");
    if (!svg) return;

    try {
      const filename = `vamsa-${visualizationType}-chart-${new Date().toISOString().split("T")[0]}.svg`;
      exportToSVG(svg as SVGElement, filename);
    } catch (error) {
      console.error("Failed to export SVG:", error);
      alert("Failed to export chart as SVG. Please try again.");
    }
    setIsExportOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-2 p-2">
      {/* Top toolbar - all controls in one row */}
      <div className="bg-card flex flex-wrap items-end gap-4 rounded-lg border p-3">
        {/* Chart Type Selector */}
        <div className="shrink-0 space-y-1">
          <Label className="space-y-1 text-xs" htmlFor={chartTypeId}>
            <span className="block">Chart Type</span>
            <Select
              value={visualizationType}
              onValueChange={(value) =>
                handleTypeChange(value as VisualizationType)
              }
            >
              <SelectTrigger id={chartTypeId} className="h-9 w-40">
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
          </Label>
        </div>

        {/* Person Selector (for views that need it) */}
        {showPersonSelector && (
          <div className="shrink-0">
            <PersonSelector
              persons={personsData?.items || []}
              selectedPersonId={selectedPersonId}
              onPersonChange={handlePersonChange}
              isLoading={isLoadingPersons}
              label="Center On"
              placeholder="Select person..."
            />
          </div>
        )}

        {/* Ancestor generations slider */}
        {showAncestorSlider && (
          <div className="shrink-0">
            <GenerationSlider
              label="Ancestors"
              value={ancestorGenerations}
              min={1}
              max={10}
              onChange={handleAncestorGenerationsChange}
              showNumberInput
              id="ancestor-gen"
              compact
            />
          </div>
        )}

        {/* Descendant generations slider */}
        {showDescendantSlider && (
          <div className="shrink-0">
            <GenerationSlider
              label="Descendants"
              value={descendantGenerations}
              min={1}
              max={10}
              onChange={handleDescendantGenerationsChange}
              showNumberInput
              id="descendant-gen"
              compact
            />
          </div>
        )}

        {/* Timeline sort dropdown */}
        {showSortBy && (
          <div className="shrink-0 space-y-1">
            <Label className="space-y-1 text-xs" htmlFor={sortById}>
              <span className="block">Sort By</span>
              <Select
                value={sortBy}
                onValueChange={(value) =>
                  handleSortByChange(value as "birth" | "death" | "name")
                }
              >
                <SelectTrigger id={sortById} className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birth">Birth Year</SelectItem>
                  <SelectItem value="death">Death Year</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </Label>
          </div>
        )}

        {/* Matrix max people slider */}
        {showMaxPeople && (
          <div className="shrink-0">
            <GenerationSlider
              label="Max People"
              value={maxPeople}
              min={5}
              max={50}
              onChange={handleMaxPeopleChange}
              showNumberInput
              id="max-people"
              compact
            />
          </div>
        )}

        {/* Spacer to push action buttons to the right */}
        <div className="min-w-4 flex-1" />

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetToken((v) => v + 1)}
            title="Reset zoom and recenter"
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
                d="M4.5 9.75A7.5 7.5 0 0112 2.25c4.142 0 7.5 3.358 7.5 7.5m0 0H18m1.5 0V6.75M19.5 14.25A7.5 7.5 0 0112 21.75 7.5 7.5 0 014.5 14.25m0 0H6m-1.5 0v3"
              />
            </svg>
            Reset
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportOpen(!isExportOpen)}
              title="Export chart"
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
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              Export
            </Button>

            {isExportOpen && (
              <div className="bg-popover border-border absolute top-full right-0 z-30 mt-1 w-36 rounded-md border shadow-lg">
                <div className="flex flex-col py-1 text-sm">
                  <button
                    className="hover:bg-muted px-3 py-2 text-left"
                    onClick={() => void handleExportPDF()}
                  >
                    Export PDF
                  </button>
                  <button
                    className="hover:bg-muted px-3 py-2 text-left"
                    onClick={handleExportPNG}
                  >
                    Export PNG (2x)
                  </button>
                  <button
                    className="hover:bg-muted px-3 py-2 text-left"
                    onClick={handleExportSVG}
                  >
                    Export SVG
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Visualization - fills remaining space */}
      <ChartVisualization
        type={visualizationType as ChartType}
        personId={selectedPersonId}
        search={search}
        resetToken={resetToken}
      />
    </div>
  );
}

// Separate component for chart visualization
interface ChartVisualizationProps {
  type: ChartType;
  personId: string | undefined;
  search: VisualizeSearchParams;
  resetToken: number;
}

function ChartVisualization({
  type: chartType,
  personId: selectedPersonId,
  search,
  resetToken,
}: ChartVisualizationProps) {
  const navigate = useNavigate();
  const generations = search.generations || 3;
  const ancestorGenerations = search.ancestorGenerations || 2;
  const descendantGenerations = search.descendantGenerations || 2;
  const maxPeople = search.maxPeople || 20;
  const sortBy = search.sortBy || "birth";

  // Fetch chart data based on selected person and chart type
  const {
    data: chartData,
    isLoading: isLoadingChart,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "chart",
      chartType,
      selectedPersonId,
      generations,
      ancestorGenerations,
      descendantGenerations,
      maxPeople,
      sortBy,
    ],
    queryFn: async () => {
      // Timeline, Matrix, and Statistics don't require a person selection
      if (chartType === "timeline") {
        return await getTimelineChart({
          data: { sortBy },
        });
      }

      if (chartType === "matrix") {
        return await getRelationshipMatrix({
          data: { maxPeople },
        });
      }

      if (chartType === "statistics") {
        return await getStatistics({
          data: { includeDeceased: true },
        });
      }

      // Other charts require a person selection
      if (!selectedPersonId) return null;

      switch (chartType) {
        case "tree":
          return await getTreeChart({
            data: {
              personId: selectedPersonId,
              ancestorGenerations,
              descendantGenerations,
            },
          });
        case "ancestor":
          return await getAncestorChart({
            data: { personId: selectedPersonId, generations },
          });
        case "descendant":
          return await getDescendantChart({
            data: { personId: selectedPersonId, generations },
          });
        case "hourglass":
          return await getHourglassChart({
            data: {
              personId: selectedPersonId,
              ancestorGenerations,
              descendantGenerations,
            },
          });
        case "fan":
          return await getFanChart({
            data: { personId: selectedPersonId, generations },
          });
        case "bowtie":
          return await getBowtieChart({
            data: { personId: selectedPersonId, generations },
          });
        case "compact":
          return await getCompactTreeData({
            data: { personId: selectedPersonId, generations },
          });
        default:
          return null;
      }
    },
    enabled:
      chartType === "timeline" ||
      chartType === "matrix" ||
      chartType === "statistics" ||
      !!selectedPersonId,
  });

  const handleNodeClick = (nodeId: string) => {
    navigate({
      to: "/visualize",
      search: {
        ...search,
        personId: nodeId,
      },
      replace: true,
    });
  };

  // Empty state - no person selected
  if (
    chartType !== "timeline" &&
    chartType !== "matrix" &&
    chartType !== "statistics" &&
    !selectedPersonId
  ) {
    return (
      <ChartContainer className="chart-container flex-1" fillHeight>
        <div className="flex h-full items-center justify-center">
          <div className="max-w-md p-6 text-center">
            <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-primary h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
            </div>
            <h3 className="font-display text-lg font-medium">
              Select a Person
            </h3>
            <p className="text-muted-foreground mt-2">
              Choose a person from the dropdown above to generate a chart
            </p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  // Loading state
  if (isLoadingChart) {
    return (
      <ChartContainer className="chart-container flex-1" fillHeight>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="bg-primary/20 mx-auto mb-4 h-12 w-12 animate-pulse rounded-full" />
            <p className="text-muted-foreground">Generating chart...</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ChartContainer className="chart-container flex-1" fillHeight>
        <div className="flex h-full items-center justify-center">
          <div className="max-w-md p-6 text-center">
            <div className="bg-destructive/10 text-destructive mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3 className="font-display text-lg font-medium">
              Error Loading Chart
            </h3>
            <p className="text-muted-foreground mt-2">
              {error instanceof Error
                ? error.message
                : "An unknown error occurred"}
            </p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => void refetch()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </ChartContainer>
    );
  }

  // Check if data is empty
  const isDataEmpty =
    !chartData ||
    (chartType === "timeline" &&
      "entries" in chartData &&
      chartData.entries.length === 0) ||
    (chartType === "matrix" &&
      "people" in chartData &&
      chartData.people.length === 0) ||
    (chartType === "statistics" &&
      "ageDistribution" in chartData &&
      chartData.metadata.totalPeople === 0) ||
    (chartType === "compact" &&
      "flatList" in chartData &&
      chartData.flatList.length === 0) ||
    (!("entries" in chartData) &&
      !("people" in chartData) &&
      !("ageDistribution" in chartData) &&
      !("flatList" in chartData) &&
      "nodes" in chartData &&
      chartData.nodes.length === 0);

  if (isDataEmpty) {
    return (
      <ChartContainer className="chart-container flex-1" fillHeight>
        <div className="flex h-full items-center justify-center">
          <div className="max-w-md p-6 text-center">
            <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-muted-foreground h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                />
              </svg>
            </div>
            <h3 className="font-display text-lg font-medium">
              No Data Available
            </h3>
            <p className="text-muted-foreground mt-2">
              {chartType === "timeline"
                ? "No people with date information to display"
                : chartType === "matrix"
                  ? "No people found for the relationship matrix"
                  : chartType === "statistics"
                    ? "No family members to generate statistics"
                    : chartType === "compact"
                      ? "No descendants found for this person"
                      : `This person has no ${
                          chartType === "ancestor"
                            ? "ancestors"
                            : chartType === "descendant"
                              ? "descendants"
                              : chartType === "bowtie"
                                ? "parental lineage"
                                : "family members"
                        } to display`}
            </p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  // Render chart with floating info panel
  return (
    <ChartContainer className="chart-container flex-1" fillHeight>
      {/* Floating Info Panel - bottom right */}
      <FloatingInfoPanel chartType={chartType} metadata={chartData?.metadata} />

      {/* Chart content */}
      {chartType === "tree" && "nodes" in chartData && selectedPersonId && (
        <TreeChart
          nodes={chartData.nodes}
          edges={chartData.edges}
          rootPersonId={selectedPersonId}
          onNodeClick={handleNodeClick}
          resetSignal={resetToken}
        />
      )}
      {chartType === "ancestor" && "nodes" in chartData && (
        <AncestorChart
          nodes={chartData.nodes}
          edges={chartData.edges}
          onNodeClick={handleNodeClick}
        />
      )}
      {chartType === "descendant" && "nodes" in chartData && (
        <DescendantChart
          nodes={chartData.nodes}
          edges={chartData.edges}
          onNodeClick={handleNodeClick}
        />
      )}
      {chartType === "hourglass" &&
        "nodes" in chartData &&
        selectedPersonId && (
          <HourglassChart
            nodes={chartData.nodes}
            edges={chartData.edges}
            rootPersonId={selectedPersonId}
            onNodeClick={handleNodeClick}
          />
        )}
      {chartType === "fan" && "nodes" in chartData && (
        <FanChart
          nodes={chartData.nodes}
          edges={chartData.edges}
          onNodeClick={handleNodeClick}
        />
      )}
      {chartType === "timeline" && "entries" in chartData && (
        <TimelineChart
          entries={chartData.entries}
          minYear={chartData.metadata.minYear}
          maxYear={chartData.metadata.maxYear}
          onNodeClick={handleNodeClick}
          resetSignal={resetToken}
        />
      )}
      {chartType === "matrix" && "people" in chartData && (
        <RelationshipMatrix
          people={chartData.people}
          matrix={chartData.matrix}
          onNodeClick={handleNodeClick}
          resetSignal={resetToken}
        />
      )}
      {chartType === "bowtie" && "nodes" in chartData && selectedPersonId && (
        <BowtieChart
          nodes={chartData.nodes as import("~/server/charts").BowtieNode[]}
          edges={chartData.edges}
          rootPersonId={selectedPersonId}
          onNodeClick={handleNodeClick}
        />
      )}
      {chartType === "compact" && "flatList" in chartData && (
        <CompactTree
          data={chartData as import("~/server/charts").CompactTreeResult}
          onNodeClick={handleNodeClick}
        />
      )}
      {chartType === "statistics" && "ageDistribution" in chartData && (
        <StatisticsCharts
          data={chartData as import("~/server/charts").StatisticsResult}
        />
      )}
    </ChartContainer>
  );
}
