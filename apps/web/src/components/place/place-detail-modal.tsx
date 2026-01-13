"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge, Button } from "@vamsa/ui/primitives";
import { getPlace, getPlaceHierarchy } from "~/server/places";

interface PlaceDetailModalProps {
  placeId: string;
  onClose: () => void;
}

export function PlaceDetailModal({ placeId, onClose }: PlaceDetailModalProps) {
  const { data: place, isLoading } = useQuery({
    queryKey: ["place", placeId],
    queryFn: () => getPlace({ data: { id: placeId } }),
  });

  const { data: hierarchy = [] } = useQuery({
    queryKey: ["placeHierarchy", placeId],
    queryFn: () => getPlaceHierarchy({ data: { id: placeId } }),
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <button
          type="button"
          className="bg-background/80 absolute inset-0 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Close modal"
        />
        <div className="bg-card border-border relative z-10 mx-4 w-full max-w-2xl rounded-lg border-2 shadow-xl">
          <div className="flex animate-pulse flex-col items-center gap-4 p-12">
            <div className="bg-muted h-12 w-12 rounded-full" />
            <div className="bg-muted h-4 w-32 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <button
          type="button"
          className="bg-background/80 absolute inset-0 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Close modal"
        />
        <div className="bg-card border-border relative z-10 mx-4 w-full max-w-2xl rounded-lg border-2 shadow-xl">
          <div className="p-12 text-center">
            <h2 className="font-display text-foreground mb-2 text-xl">
              Place Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              This place may have been removed.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  const hasCoordinates = place.latitude !== null && place.longitude !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="bg-background/80 absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="bg-card border-border relative z-10 mx-4 w-full max-w-2xl rounded-lg border-2 shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
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
            <h2 className="font-display text-foreground text-2xl">
              Place Details
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-accent"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
          {/* Name and type */}
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="font-display text-foreground text-2xl">
                {place.name}
              </h3>
              <Badge variant="secondary">
                {formatPlaceType(place.placeType)}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {place.description && (
            <div>
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Description
              </p>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {place.description}
              </p>
            </div>
          )}

          {/* Hierarchy path */}
          {hierarchy.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Location Hierarchy
              </p>
              <nav className="flex flex-wrap items-center gap-2">
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
                    <span
                      className={
                        item.id === placeId
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {item.name}
                    </span>
                  </div>
                ))}
              </nav>
            </div>
          )}

          {/* Geographic coordinates */}
          {hasCoordinates && (
            <div>
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Geographic Coordinates
              </p>
              <div className="text-foreground space-y-1 font-mono text-sm">
                <p>Latitude: {place.latitude?.toFixed(6)}</p>
                <p>Longitude: {place.longitude?.toFixed(6)}</p>
              </div>
              {/* Map preview placeholder */}
              <div className="bg-accent/20 border-border mt-3 flex h-48 items-center justify-center rounded-md border">
                <div className="text-muted-foreground text-center">
                  <svg
                    className="mx-auto mb-2 h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  <p className="text-sm">Map preview coming soon</p>
                </div>
              </div>
            </div>
          )}

          {/* Alternative names */}
          {place.alternativeNames && place.alternativeNames.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Alternative Names
              </p>
              <div className="flex flex-wrap gap-2">
                {place.alternativeNames.map((name, index) => (
                  <Badge key={index} variant="outline">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div>
            <p className="text-muted-foreground mb-3 text-sm font-medium">
              Statistics
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border-border rounded-md border p-3">
                <div className="text-muted-foreground mb-1 text-xs">
                  Child Places
                </div>
                <div className="text-foreground text-2xl font-semibold">
                  {place.childCount}
                </div>
              </div>
              <div className="border-border rounded-md border p-3">
                <div className="text-muted-foreground mb-1 text-xs">People</div>
                <div className="text-foreground text-2xl font-semibold">
                  {place.personCount}
                </div>
              </div>
              <div className="border-border rounded-md border p-3">
                <div className="text-muted-foreground mb-1 text-xs">Events</div>
                <div className="text-foreground text-2xl font-semibold">
                  {place.eventCount}
                </div>
              </div>
            </div>
          </div>

          {/* Parent place link */}
          {place.parent && (
            <div>
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Parent Place
              </p>
              <div className="border-border bg-accent/5 hover:bg-accent/10 cursor-pointer rounded-md border p-3 transition-colors">
                <div className="flex items-center gap-2">
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                  </svg>
                  <span className="text-foreground text-sm font-medium">
                    {place.parent.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {formatPlaceType(place.parent.placeType)}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border border-t px-6 py-4">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatPlaceType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
