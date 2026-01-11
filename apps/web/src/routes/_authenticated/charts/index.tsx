import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "~/server/charts";
import { ChartControls } from "~/components/charts/ChartControls";
import { AncestorChart } from "~/components/charts/AncestorChart";
import { DescendantChart } from "~/components/charts/DescendantChart";
import { HourglassChart } from "~/components/charts/HourglassChart";
import { FanChart } from "~/components/charts/FanChart";

export const Route = createFileRoute("/_authenticated/charts/")({
  component: ChartsComponent,
});

function ChartsComponent() {
  const [chartType, setChartType] = useState<
    "ancestor" | "descendant" | "hourglass" | "fan"
  >("ancestor");
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [generations, setGenerations] = useState(3);
  const [ancestorGenerations, setAncestorGenerations] = useState(2);
  const [descendantGenerations, setDescendantGenerations] = useState(2);

  // Fetch all persons for the dropdown
  const { data: personsData, isLoading: isLoadingPersons } = useQuery({
    queryKey: ["persons"],
    queryFn: () => listPersons(),
  });

  // Fetch chart data based on selected person and chart type
  const {
    data: chartData,
    isLoading: isLoadingChart,
    error,
  } = useQuery({
    queryKey: [
      "chart",
      chartType,
      selectedPersonId,
      generations,
      ancestorGenerations,
      descendantGenerations,
    ],
    queryFn: async () => {
      if (!selectedPersonId) return null;

      switch (chartType) {
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
        default:
          return null;
      }
    },
    enabled: !!selectedPersonId,
  });

  // Auto-select first person if none selected
  useState(() => {
    if (personsData && personsData.items.length > 0 && !selectedPersonId) {
      setSelectedPersonId(personsData.items[0].id);
    }
  });

  const handleNodeClick = (nodeId: string) => {
    setSelectedPersonId(nodeId);
  };

  const handleExportPNG = () => {
    const svg = document.querySelector(".chart-container svg");
    if (!svg) return;

    // Create a canvas element
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get SVG dimensions
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement("a");
        link.download = `vamsa-${chartType}-chart.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src = url;
  };

  const handleExportSVG = () => {
    const svg = document.querySelector(".chart-container svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const link = document.createElement("a");
    link.download = `vamsa-${chartType}-chart.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container className="space-y-6">
      <PageHeader
        title="Family Charts"
        description="Visualize your family tree in different chart formats"
      />

      {/* Person Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="person-select">Center Chart On</Label>
            {isLoadingPersons ? (
              <div className="bg-muted flex h-10 items-center justify-center rounded-md border">
                <span className="text-muted-foreground text-sm">
                  Loading people...
                </span>
              </div>
            ) : (
              <Select
                value={selectedPersonId}
                onValueChange={setSelectedPersonId}
              >
                <SelectTrigger id="person-select">
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {personsData?.items.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                      {person.dateOfBirth &&
                        ` (b. ${new Date(person.dateOfBirth).getFullYear()})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart Controls */}
      <ChartControls
        chartType={chartType}
        generations={generations}
        ancestorGenerations={ancestorGenerations}
        descendantGenerations={descendantGenerations}
        onChartTypeChange={setChartType}
        onGenerationsChange={setGenerations}
        onAncestorGenerationsChange={setAncestorGenerations}
        onDescendantGenerationsChange={setDescendantGenerations}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
      />

      {/* Chart Rendering Area */}
      <div className="chart-container min-h-[600px]">
        {!selectedPersonId ? (
          <Card className="flex h-[600px] items-center justify-center">
            <CardContent className="text-center">
              <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
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
            </CardContent>
          </Card>
        ) : isLoadingChart ? (
          <Card className="flex h-[600px] items-center justify-center">
            <CardContent className="text-center">
              <div className="bg-primary/20 mx-auto mb-4 h-12 w-12 animate-pulse rounded-full" />
              <p className="text-muted-foreground">Generating chart...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="flex h-[600px] items-center justify-center">
            <CardContent className="text-center">
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
            </CardContent>
          </Card>
        ) : !chartData || chartData.nodes.length === 0 ? (
          <Card className="flex h-[600px] items-center justify-center">
            <CardContent className="text-center">
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
                This person has no{" "}
                {chartType === "ancestor"
                  ? "ancestors"
                  : chartType === "descendant"
                    ? "descendants"
                    : "family members"}{" "}
                to display
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="h-[600px]">
            {chartType === "ancestor" && (
              <AncestorChart
                nodes={chartData.nodes}
                edges={chartData.edges}
                onNodeClick={handleNodeClick}
              />
            )}
            {chartType === "descendant" && (
              <DescendantChart
                nodes={chartData.nodes}
                edges={chartData.edges}
                onNodeClick={handleNodeClick}
              />
            )}
            {chartType === "hourglass" && (
              <HourglassChart
                nodes={chartData.nodes}
                edges={chartData.edges}
                rootPersonId={selectedPersonId}
                onNodeClick={handleNodeClick}
              />
            )}
            {chartType === "fan" && (
              <FanChart
                nodes={chartData.nodes}
                edges={chartData.edges}
                onNodeClick={handleNodeClick}
              />
            )}
          </div>
        )}
      </div>

      {/* Chart Info */}
      {chartData && chartData.nodes.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-sm">Chart Type</p>
                <p className="font-display text-lg font-medium capitalize">
                  {chartType}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total People</p>
                <p className="font-display text-lg font-medium">
                  {chartData.metadata.totalPeople}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Generations</p>
                <p className="font-display text-lg font-medium">
                  {chartData.metadata.totalGenerations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-display mb-4 text-lg font-medium">Legend</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 border-primary h-12 w-12 rounded-lg border-2" />
              <div>
                <p className="text-sm font-medium">Living Person</p>
                <p className="text-muted-foreground text-xs">Green border</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-muted border-border h-12 w-12 rounded-lg border-2" />
              <div>
                <p className="text-sm font-medium">Deceased Person</p>
                <p className="text-muted-foreground text-xs">Gray background</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="border-border h-12 w-12 rounded-lg border-2" />
              <div>
                <p className="text-sm font-medium">Parent-Child</p>
                <p className="text-muted-foreground text-xs">Solid line</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="border-primary h-12 w-12 rounded-lg border-2 border-dashed" />
              <div>
                <p className="text-sm font-medium">Spouse</p>
                <p className="text-muted-foreground text-xs">Dashed line</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
