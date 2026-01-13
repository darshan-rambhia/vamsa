"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@vamsa/ui/primitives";
import { searchPlaces } from "~/server/places";

interface PlaceSearchProps {
  onSelect: (place: {
    id: string;
    name: string;
    placeType: string;
    parentName: string | null;
  }) => void;
  placeholder?: string;
}

export function PlaceSearch({
  onSelect,
  placeholder = "Search for a place...",
}: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["searchPlaces", query],
    queryFn: () => searchPlaces({ data: { query } }),
    enabled: query.length >= 2,
  });

  // Debounce search
  useEffect(() => {
    if (query.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = (place: {
    id: string;
    name: string;
    placeType: string;
    parentName: string | null;
  }) => {
    onSelect(place);
    setQuery("");
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-place-search]")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" data-place-search>
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        {isLoading && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <svg
              className="text-muted-foreground h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="bg-card border-border absolute top-full z-50 mt-1 w-full rounded-md border shadow-lg">
          <div className="max-h-80 overflow-y-auto p-2">
            {results.map((place) => (
              <button
                key={place.id}
                onClick={() => handleSelect(place)}
                className="hover:bg-accent/50 w-full rounded-md p-3 text-left transition-colors duration-150"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                      <span>{place.name}</span>
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                        {formatPlaceType(place.placeType)}
                      </span>
                    </div>
                    {place.parentName && (
                      <p className="text-muted-foreground text-xs">
                        {formatHierarchy(place.name, place.parentName)}
                      </p>
                    )}
                  </div>
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
        <div className="bg-card border-border absolute top-full z-50 mt-1 w-full rounded-md border shadow-lg">
          <div className="p-6 text-center">
            <div className="text-muted-foreground/50 mb-2">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">
              No places found matching &ldquo;{query}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatPlaceType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatHierarchy(placeName: string, parentName: string): string {
  return `${placeName}, ${parentName}`;
}
