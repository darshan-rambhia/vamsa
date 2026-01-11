"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Badge, Button } from "@vamsa/ui/primitives";
import { getPlace, getPlaceHierarchy, getPlaceChildren } from "~/server/places";

interface PlaceBrowserProps {
  initialPlaceId?: string;
  onPlaceSelect?: (placeId: string) => void;
}

export function PlaceBrowser({
  initialPlaceId,
  onPlaceSelect,
}: PlaceBrowserProps) {
  const [currentPlaceId, setCurrentPlaceId] = useState<string | null>(
    initialPlaceId || null
  );

  const { data: place, isLoading } = useQuery({
    queryKey: ["place", currentPlaceId],
    queryFn: () => getPlace({ data: { id: currentPlaceId! } }),
    enabled: !!currentPlaceId,
  });

  const { data: hierarchy = [] } = useQuery({
    queryKey: ["placeHierarchy", currentPlaceId],
    queryFn: () => getPlaceHierarchy({ data: { id: currentPlaceId! } }),
    enabled: !!currentPlaceId,
  });

  const { data: children = [] } = useQuery({
    queryKey: ["placeChildren", currentPlaceId],
    queryFn: () => getPlaceChildren({ data: { parentId: currentPlaceId! } }),
    enabled: !!currentPlaceId && (place?.childCount ?? 0) > 0,
  });

  const handleNavigateToParent = () => {
    if (place?.parentId) {
      setCurrentPlaceId(place.parentId);
      onPlaceSelect?.(place.parentId);
    }
  };

  const handleNavigateToChild = (childId: string) => {
    setCurrentPlaceId(childId);
    onPlaceSelect?.(childId);
  };

  if (!currentPlaceId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground/50 mb-4">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="font-display text-foreground mb-2 text-xl">
            No Place Selected
          </h3>
          <p className="text-muted-foreground">
            Select a place to browse its hierarchy
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex animate-pulse flex-col items-center gap-4">
            <div className="bg-muted h-12 w-12 rounded-full" />
            <div className="bg-muted h-4 w-32 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!place) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <h3 className="font-display text-foreground mb-2 text-xl">
            Place Not Found
          </h3>
          <p className="text-muted-foreground">
            This place may have been removed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        {/* Breadcrumbs */}
        {hierarchy.length > 1 && (
          <div className="mb-6">
            <nav className="flex items-center gap-2 overflow-x-auto">
              {hierarchy.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  {index > 0 && (
                    <svg
                      className="text-muted-foreground h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                  <button
                    onClick={() => {
                      setCurrentPlaceId(item.id);
                      onPlaceSelect?.(item.id);
                    }}
                    className={
                      item.id === currentPlaceId
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground transition-colors"
                    }
                  >
                    {item.name}
                  </button>
                </div>
              ))}
            </nav>
          </div>
        )}

        {/* Current place */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <h3 className="font-display text-foreground text-2xl">
              {place.name}
            </h3>
            <Badge variant="secondary">
              {formatPlaceType(place.placeType)}
            </Badge>
          </div>

          {place.description && (
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {place.description}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="text-muted-foreground">
              <span className="font-medium">{place.childCount}</span> child
              places
            </div>
            <div className="text-muted-foreground">
              <span className="font-medium">{place.personCount}</span> people
            </div>
            <div className="text-muted-foreground">
              <span className="font-medium">{place.eventCount}</span> events
            </div>
          </div>

          {/* Parent navigation */}
          {place.parentId && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigateToParent}
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Go to parent place
              </Button>
            </div>
          )}
        </div>

        {/* Child places */}
        {place.childCount > 0 && children.length > 0 && (
          <div>
            <h4 className="font-display text-foreground mb-3 text-sm font-medium">
              Child Places
            </h4>
            <div className="space-y-2">
              {children.map(
                (child: { id: string; name: string; placeType: string }) => (
                  <button
                    key={child.id}
                    onClick={() => handleNavigateToChild(child.id)}
                    className="border-border hover:border-primary/30 hover:bg-accent/5 w-full rounded-md border p-3 text-left transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg
                          className="text-muted-foreground h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                        </svg>
                        <div>
                          <p className="text-foreground text-sm font-medium">
                            {child.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatPlaceType(child.placeType)}
                          </p>
                        </div>
                      </div>
                      <svg
                        className="text-muted-foreground h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatPlaceType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
