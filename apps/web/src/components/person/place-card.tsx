"use client";

import { Badge } from "@vamsa/ui/primitives";

interface PersonPlaceCardProps {
  place: {
    id: string;
    place: {
      id: string;
      name: string;
      placeType: string;
    };
    parentName: string | null;
    fromYear: number | null;
    toYear: number | null;
    type: string | null;
  };
  onClick?: () => void;
}

export function PersonPlaceCard({ place, onClick }: PersonPlaceCardProps) {
  return (
    <div
      onClick={onClick}
      className={
        onClick
          ? "border-border hover:border-primary/30 hover:bg-accent/5 cursor-pointer rounded-md border p-4 transition-all duration-200"
          : "border-border rounded-md border p-4"
      }
    >
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
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-foreground text-base">
              {place.place.name}
            </h4>
            <Badge variant="secondary" className="text-xs">
              {formatPlaceType(place.place.placeType)}
            </Badge>
            {place.type && (
              <Badge
                variant="outline"
                className={getPlaceTypeColor(place.type)}
              >
                {formatPersonPlaceType(place.type)}
              </Badge>
            )}
          </div>

          {place.parentName && (
            <p className="text-muted-foreground text-sm">{place.parentName}</p>
          )}

          {(place.fromYear || place.toYear) && (
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-muted-foreground font-mono text-sm">
                {place.fromYear || "?"} — {place.toYear || "Present"}
              </p>
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
    </div>
  );
}

function formatPlaceType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatPersonPlaceType(type: string): string {
  switch (type) {
    case "BIRTH":
      return "Birth";
    case "MARRIAGE":
      return "Marriage";
    case "DEATH":
      return "Death";
    case "LIVED":
      return "Lived";
    case "WORKED":
      return "Worked";
    case "STUDIED":
      return "Studied";
    case "OTHER":
      return "Other";
    default:
      return type;
  }
}

function getPlaceTypeColor(type: string): string {
  switch (type) {
    case "BIRTH":
      return "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400";
    case "MARRIAGE":
      return "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "DEATH":
      return "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400";
    case "LIVED":
      return "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "WORKED":
      return "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "STUDIED":
      return "border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400";
    default:
      return "border-border bg-muted text-foreground";
  }
}
