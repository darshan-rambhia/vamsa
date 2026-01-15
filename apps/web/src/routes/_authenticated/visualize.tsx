import {
  createFileRoute,
  useSearch,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "~/server/auth";
import { useCallback, useMemo, useState } from "react";
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
} from "@vamsa/ui";
import { listPersons } from "~/server/persons";
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
import {
  ChartControls,
  type ChartType,
} from "~/components/charts/ChartControls";
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
import {
  ChartContainer,
  ChartEmptyState,
  ChartLoadingState,
  ChartErrorState,
} from "~/components/charts/ChartContainer";
import { ChartLegend } from "~/components/charts/ChartLegend";
import { ChartStatsPanel } from "~/components/charts/ChartStatsPanel";
import { PersonSelector } from "~/components/charts/PersonSelector";

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

  const visualizationType = search.type || "tree";

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

  // Determine if person selector should be shown
  // All views except timeline, matrix, and statistics need person selection
  const showPersonSelector = !["timeline", "matrix", "statistics"].includes(
    visualizationType
  );

  return (
    <Container className="space-y-6">
      {/* Page Header - always shown for consistency */}
      <PageHeader
        title="Family Visualizations"
        description="Explore your family tree through interactive charts and diagrams"
      />

      <Card>
        <CardContent className="flex flex-col gap-2 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <svg
              className="text-primary mt-0.5 h-5 w-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.75v4.5m0 4.5h.008v.008H12v-.008zm9-4.5a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-foreground">Tips</p>
              <p>Drag to pan, scroll or pinch to zoom, and click a node for details. Use Reset view to refit the chart.</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Need more room? Charts grow to ~60% of your viewport height.</div>
        </CardContent>
      </Card>

      {/* Unified Controls Card - Chart Type + Person Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Chart Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="viz-type">Visualization Type</Label>
              <Select
                value={visualizationType}
                onValueChange={(value) =>
                  handleTypeChange(value as VisualizationType)
                }
              >
                <SelectTrigger id="viz-type" className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tree">Interactive Tree</SelectItem>
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

            {/* Person Selector (for views that need it - including tree) */}
            {showPersonSelector && (
              <PersonSelector
                persons={personsData?.items || []}
                selectedPersonId={selectedPersonId}
                onPersonChange={handlePersonChange}
                isLoading={isLoadingPersons}
                label="Center On"
                placeholder="Search people..."
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visualization Content - All charts use ChartVisualization */}
      <ChartVisualization
        type={visualizationType as ChartType}
        personId={selectedPersonId}
        search={search}
        navigate={navigate}
      />
    </Container>
  );
}

// Separate component for chart visualization
interface ChartVisualizationProps {
  type: ChartType;
  personId: string | undefined;
  search: VisualizeSearchParams;
  navigate: ReturnType<typeof useNavigate>;
}

function ChartVisualization({
  type: chartType,
  personId: selectedPersonId,
  search,
  navigate,
}: ChartVisualizationProps) {
  const [resetToken, setResetToken] = useState(0);
  const generations = search.generations || 3;
  const ancestorGenerations = search.ancestorGenerations || 2;
  const descendantGenerations = search.descendantGenerations || 2;
  const maxPeople = search.maxPeople || 20;
  const sortBy = search.sortBy || "birth";

  const activeContextLabel = useMemo(() => {
    if (chartType === "timeline") return `Sorted by ${sortBy}`;
    if (chartType === "matrix") return `Max people: ${maxPeople}`;
    return undefined;
  }, [chartType, sortBy, maxPeople]);

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

  const getChartTitle = () => {
    const typeNames: Record<ChartType, string> = {
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
    return typeNames[chartType];
  };

  const handleExportPDF = async () => {
    const svg = document.querySelector(".chart-container svg");
    if (!svg) return;

    try {
      // Determine if chart is wide (should use landscape orientation)
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
  };

  const handleExportPNG = () => {
    const svg = document.querySelector(".chart-container svg");
    if (!svg) return;

    try {
      const filename = `vamsa-${chartType}-chart-${new Date().toISOString().split("T")[0]}.png`;
      exportToPNG(svg as SVGElement, filename, 2);
    } catch (error) {
      console.error("Failed to export PNG:", error);
      alert("Failed to export chart as PNG. Please try again.");
    }
  };

  const handleExportSVG = () => {
    const svg = document.querySelector(".chart-container svg");
    if (!svg) return;

    try {
      const filename = `vamsa-${chartType}-chart-${new Date().toISOString().split("T")[0]}.svg`;
      exportToSVG(svg as SVGElement, filename);
    } catch (error) {
      console.error("Failed to export SVG:", error);
      alert("Failed to export chart as SVG. Please try again.");
    }
  };

  const handleGenerationsChange = (newGenerations: number) => {
    navigate({
      to: "/visualize",
      search: {
        ...search,
        generations: newGenerations,
      },
      replace: true,
    });
  };

  const handleAncestorGenerationsChange = (newGenerations: number) => {
    navigate({
      to: "/visualize",
      search: {
        ...search,
        ancestorGenerations: newGenerations,
      },
      replace: true,
    });
  };

  const handleDescendantGenerationsChange = (newGenerations: number) => {
    navigate({
      to: "/visualize",
      search: {
        ...search,
        descendantGenerations: newGenerations,
      },
      replace: true,
    });
  };

  const handleMaxPeopleChange = (newMaxPeople: number) => {
    navigate({
      to: "/visualize",
      search: {
        ...search,
        maxPeople: newMaxPeople,
      },
      replace: true,
    });
  };

  const handleSortByChange = (newSortBy: "birth" | "death" | "name") => {
    navigate({
      to: "/visualize",
      search: {
        ...search,
        sortBy: newSortBy,
      },
      replace: true,
    });
  };

  return (
    <>
      {/* Chart Controls - only generations/options and export (chart type is in main header) */}
      <ChartControls
        chartType={chartType}
        generations={generations}
        ancestorGenerations={ancestorGenerations}
        descendantGenerations={descendantGenerations}
        maxPeople={maxPeople}
        sortBy={sortBy}
        hideChartTypeSelector={true}
        onGenerationsChange={handleGenerationsChange}
        onAncestorGenerationsChange={handleAncestorGenerationsChange}
        onDescendantGenerationsChange={handleDescendantGenerationsChange}
        onMaxPeopleChange={handleMaxPeopleChange}
        onSortByChange={handleSortByChange}
        onExportPDF={handleExportPDF}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onResetView={() => setResetToken((v) => v + 1)}
        activeContextLabel={activeContextLabel}
      />

      {/* Chart Rendering Area */}
      <div className="chart-container">
        {/* Timeline, Matrix, and Statistics don't need person selection */}
        {chartType !== "timeline" &&
        chartType !== "matrix" &&
        chartType !== "statistics" &&
        !selectedPersonId ? (
          <ChartEmptyState
            icon={
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
            }
            title="Select a Person"
            description="Choose a person from the dropdown above to generate a chart"
          />
        ) : isLoadingChart ? (
          <ChartLoadingState message="Generating chart..." />
        ) : error ? (
          <ChartErrorState
            title="Error Loading Chart"
            message={error instanceof Error ? error.message : "An unknown error occurred"}
            retry={() => void refetch()}
          />
        ) : !chartData ||
          // Check if data is empty based on chart type
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
            chartData.nodes.length === 0) ? (
          <ChartEmptyState
            icon={
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
            }
            title="No Data Available"
            description={
              chartType === "timeline"
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
                        } to display`
            }
          />
        ) : (
          <ChartContainer
            heightClass={chartType === "statistics" ? "min-h-[600px]" : "h-[600px]"}
            className="p-0"
          >
            {chartType === "tree" &&
              "nodes" in chartData &&
              selectedPersonId && (
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
            {chartType === "bowtie" &&
              "nodes" in chartData &&
              selectedPersonId && (
                <BowtieChart
                  nodes={
                    chartData.nodes as import("~/server/charts").BowtieNode[]
                  }
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
        )}
      </div>

      {/* Chart Stats Panel - renders conditionally based on chart type */}
      {chartData && (
        <ChartStatsPanel chartType={chartType} metadata={chartData.metadata} />
      )}

      {/* Legend - renders conditionally based on chart type */}
      <ChartLegend chartType={chartType} />
    </>
  );
}
