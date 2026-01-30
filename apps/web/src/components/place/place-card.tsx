"use client";

import { Badge, Card, CardContent } from "@vamsa/ui/primitives";

interface PlaceCardProps {
  place: {
    id: string;
    name: string;
    placeType: string;
    parentName?: string | null;
    childCount?: number;
    personCount?: number;
    latitude?: number | null;
    longitude?: number | null;
  };
  onClick?: (placeId: string) => void;
  showCounts?: boolean;
}

export function PlaceCard({
  place,
  onClick,
  showCounts = true,
}: PlaceCardProps) {
  const hasCoordinates = place.latitude !== null && place.longitude !== null;

  return (
    <Card
      className={
        onClick
          ? "hover:border-primary/30 cursor-pointer transition-all duration-200"
          : ""
      }
      onClick={() => onClick?.(place.id)}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Icon */}
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <svg
              className="h-5 w-5"
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-display text-foreground text-lg">
                    {place.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {formatPlaceType(place.placeType)}
                  </Badge>
                </div>

                {place.parentName && (
                  <p className="text-muted-foreground text-sm">
                    {place.parentName}
                  </p>
                )}
              </div>

              {hasCoordinates && (
                <div className="bg-accent/50 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
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
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Counts */}
            {showCounts &&
              (place.childCount !== undefined ||
                place.personCount !== undefined) && (
                <div className="flex flex-wrap gap-4 text-sm">
                  {place.childCount !== undefined && place.childCount > 0 && (
                    <div className="text-muted-foreground flex items-center gap-1">
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
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                      </svg>
                      <span className="font-medium">{place.childCount}</span>{" "}
                      child {place.childCount === 1 ? "place" : "places"}
                    </div>
                  )}

                  {place.personCount !== undefined && place.personCount > 0 && (
                    <div className="text-muted-foreground flex items-center gap-1">
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
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-medium">{place.personCount}</span>{" "}
                      {place.personCount === 1 ? "person" : "people"}
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Arrow indicator if clickable */}
          {onClick && (
            <svg
              className="text-muted-foreground h-5 w-5 shrink-0"
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
        </div>
      </CardContent>
    </Card>
  );
}

function formatPlaceType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
