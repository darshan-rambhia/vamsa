import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  InteractiveMap,
  type MapMarker,
} from "~/components/maps/interactive-map";
import { TimelineSlider } from "~/components/maps/timeline-slider";
import { MapControls } from "~/components/maps/map-controls";
import { getFamilyLocations, getPlacesByTimeRange } from "~/server/maps";
import { Container, PageHeader, Card, CardContent, Button } from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated/maps/")({
  component: MapsComponent,
});

function MapsComponent() {
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite" | "terrain">(
    "streets"
  );
  const [useTimelineFilter, setUseTimelineFilter] = useState(false);
  const [timelineRange, setTimelineRange] = useState<{
    startYear: number;
    endYear: number;
  } | null>(null);

  // Fetch all family locations
  const { data: familyData, isLoading: isLoadingFamily } = useQuery({
    queryKey: ["family-locations"],
    queryFn: () => getFamilyLocations({ data: { onlyHeadOfFamily: false } }),
  });

  // Fetch timeline filtered locations
  const { data: timelineData, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ["timeline-locations", timelineRange],
    queryFn: () =>
      getPlacesByTimeRange({
        data: {
          startYear: timelineRange!.startYear,
          endYear: timelineRange!.endYear,
        },
      }),
    enabled: useTimelineFilter && timelineRange !== null,
  });

  // Determine which markers to show
  const markers: MapMarker[] = useMemo(() => {
    if (useTimelineFilter && timelineData) {
      // Convert timeline markers to map markers
      const markerMap = new Map<string, MapMarker>();

      timelineData.markers.forEach((tm) => {
        if (!markerMap.has(tm.id)) {
          markerMap.set(tm.id, {
            id: tm.id,
            name: tm.name,
            latitude: tm.latitude,
            longitude: tm.longitude,
            placeType: tm.placeType,
            description: null,
            personCount: tm.personIds.length,
            eventCount: 1,
            eventTypes: [tm.eventType],
            timeRange: {
              earliest: tm.year,
              latest: tm.year,
            },
          });
        } else {
          const existing = markerMap.get(tm.id)!;
          existing.personCount = Math.max(
            existing.personCount,
            tm.personIds.length
          );
          existing.eventCount += 1;
          if (!existing.eventTypes.includes(tm.eventType)) {
            existing.eventTypes.push(tm.eventType);
          }
          if (tm.year && existing.timeRange.earliest) {
            existing.timeRange.earliest = Math.min(
              existing.timeRange.earliest,
              tm.year
            );
            existing.timeRange.latest = Math.max(
              existing.timeRange.latest || 0,
              tm.year
            );
          }
        }
      });

      return Array.from(markerMap.values());
    }

    return familyData?.markers || [];
  }, [useTimelineFilter, familyData, timelineData]);

  // Calculate min/max years for timeline
  const yearRange = useMemo(() => {
    if (!familyData?.markers.length)
      return { min: 1900, max: new Date().getFullYear() };

    const years: number[] = [];
    familyData.markers.forEach((marker) => {
      if (marker.timeRange.earliest) years.push(marker.timeRange.earliest);
      if (marker.timeRange.latest) years.push(marker.timeRange.latest);
    });

    if (years.length === 0) return { min: 1900, max: new Date().getFullYear() };

    return {
      min: Math.min(...years),
      max: Math.max(...years),
    };
  }, [familyData]);

  const handleTimelineChange = (startYear: number, endYear: number) => {
    setTimelineRange({ startYear, endYear });
  };

  const handleToggleTimeline = () => {
    if (!useTimelineFilter) {
      setTimelineRange({ startYear: yearRange.min, endYear: yearRange.max });
    }
    setUseTimelineFilter(!useTimelineFilter);
  };

  const isLoading = isLoadingFamily || (useTimelineFilter && isLoadingTimeline);

  return (
    <Container className="space-y-6">
      <PageHeader
        title="Family Maps"
        description="Explore your family history through interactive maps"
        actions={
          <Button
            variant={useTimelineFilter ? "default" : "outline"}
            onClick={handleToggleTimeline}
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
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {useTimelineFilter ? "Timeline Active" : "Enable Timeline"}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">Total Locations</p>
            <p className="text-foreground text-2xl font-semibold">
              {isLoading ? "-" : markers.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">Total People</p>
            <p className="text-foreground text-2xl font-semibold">
              {isLoading ? "-" : familyData?.familySize || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">Year Range</p>
            <p className="text-foreground text-2xl font-semibold">
              {yearRange.min} - {yearRange.max}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Map */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[600px] w-full">
              {isLoading ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="space-y-4 text-center">
                    <div className="bg-primary/10 mx-auto h-12 w-12 animate-pulse rounded-full" />
                    <p className="text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              ) : markers.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="space-y-4 text-center">
                    <div className="bg-secondary/50 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
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
                          d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-foreground font-medium">
                        No Locations Found
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Add geographic information to places to see them on the
                        map
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <InteractiveMap markers={markers} style={mapStyle} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controls Sidebar */}
        <div className="space-y-4">
          <MapControls currentStyle={mapStyle} onStyleChange={setMapStyle} />

          {useTimelineFilter && (
            <TimelineSlider
              minYear={yearRange.min}
              maxYear={yearRange.max}
              onRangeChange={handleTimelineChange}
              initialStartYear={yearRange.min}
              initialEndYear={yearRange.max}
            />
          )}

          {/* Legend */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-medium">Marker Colors</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: "hsl(142, 71%, 45%)" }}
                  />
                  <span className="text-muted-foreground text-xs">
                    Birth Events
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: "hsl(0, 84%, 60%)" }}
                  />
                  <span className="text-muted-foreground text-xs">
                    Death Events
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: "hsl(280, 100%, 70%)" }}
                  />
                  <span className="text-muted-foreground text-xs">
                    Marriage Events
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-primary h-4 w-4 rounded-full" />
                  <span className="text-muted-foreground text-xs">
                    Other Locations
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
