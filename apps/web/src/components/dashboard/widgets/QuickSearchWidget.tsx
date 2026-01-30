"use client";

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Search, User } from "lucide-react";
import { Button, Input, cn } from "@vamsa/ui";
import { searchPeople } from "../../../server/search";
import { BaseWidget } from "./BaseWidget";
import type { WidgetProps } from "./types";

/**
 * Quick Search Widget settings
 */
interface QuickSearchSettings {
  /** Maximum number of results to display (default: 5) */
  maxResults: number;
}

/**
 * Quick Search Widget Component
 *
 * Provides inline search with debounced input and quick navigation to person pages.
 *
 * Features:
 * - Debounced search input (300ms)
 * - Inline results display (max 5 by default)
 * - Click result to navigate to person page
 * - "See all results" link to full search page
 * - Loading and empty states
 *
 * @example
 * ```tsx
 * <QuickSearchWidget
 *   config={{
 *     id: "search-1",
 *     type: "quick_search",
 *     title: "Quick Search",
 *     size: { w: 3, h: 2 },
 *     position: { x: 0, y: 0 },
 *     settings: { maxResults: 5 }
 *   }}
 *   onConfigChange={handleConfigChange}
 *   onRemove={handleRemove}
 * />
 * ```
 */
export function QuickSearchWidget({ config, onRemove }: WidgetProps) {
  const settings = config.settings as QuickSearchSettings | undefined;
  const maxResults = settings?.maxResults ?? 5;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      maidenName?: string | null;
      photoUrl?: string | null;
      dateOfBirth?: Date | null;
      dateOfPassing?: Date | null;
      isLiving: boolean;
    }>
  >([]);
  const [error, setError] = useState<Error | null>(null);

  // Debounce search query (300ms)
  useEffect(() => {
    // Clear results if query is empty
    if (!query.trim()) {
      setDebouncedQuery("");
      setResults([]);
      setError(null);
      return;
    }

    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Execute search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) return;

    const executeSearch = async () => {
      setIsSearching(true);
      setError(null);

      try {
        const searchResults = await searchPeople({
          data: {
            query: debouncedQuery,
            limit: maxResults,
            offset: 0,
          },
        });

        setResults(searchResults.results.map((r) => r.item));
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Search failed"));
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    executeSearch();
  }, [debouncedQuery, maxResults]);

  // Format person display name
  const formatPersonName = (person: (typeof results)[0]) => {
    const name = `${person.firstName} ${person.lastName}`;
    return person.maidenName ? `${name} (${person.maidenName})` : name;
  };

  // Format person dates
  const formatPersonDates = (person: (typeof results)[0]) => {
    if (person.isLiving) {
      return person.dateOfBirth
        ? `b. ${new Date(person.dateOfBirth).getFullYear()}`
        : "";
    }
    const birth = person.dateOfBirth
      ? new Date(person.dateOfBirth).getFullYear()
      : "?";
    const death = person.dateOfPassing
      ? new Date(person.dateOfPassing).getFullYear()
      : "?";
    return `${birth} - ${death}`;
  };

  const showResults = debouncedQuery && !isSearching && results.length > 0;
  const showNoResults = debouncedQuery && !isSearching && results.length === 0;

  return (
    <BaseWidget config={config} onRemove={onRemove}>
      <div className="flex h-full flex-col gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search your family tree..."
            value={query}
            onChange={handleInputChange}
            className="pr-9 pl-9"
            aria-label="Search family tree"
            aria-describedby={
              showResults
                ? "search-results-status"
                : showNoResults
                  ? "no-results-message"
                  : undefined
            }
          />
          {isSearching && (
            <Loader2
              className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin"
              aria-label="Searching"
            />
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {/* Loading State */}
          {isSearching && (
            <div
              className="flex items-center justify-center py-8"
              role="status"
              aria-live="polite"
            >
              <span className="text-muted-foreground text-sm">
                Searching...
              </span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div
              className="border-destructive/20 bg-destructive/5 rounded-lg border p-4"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-destructive text-sm">{error.message}</p>
            </div>
          )}

          {/* No Results */}
          {showNoResults && (
            <div
              id="no-results-message"
              className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-center"
              role="status"
              aria-live="polite"
            >
              <User className="h-8 w-8 opacity-50" aria-hidden="true" />
              <p className="text-sm">No people found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          )}

          {/* Results List */}
          {showResults && (
            <div
              id="search-results-status"
              className="sr-only"
              role="status"
              aria-live="polite"
            >
              Found {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
          )}
          {showResults && (
            <div className="space-y-2" role="list" aria-label="Search results">
              {results.map((person) => (
                <Link
                  key={person.id}
                  to="/people/$personId"
                  params={{ personId: person.id }}
                  className={cn(
                    "hover:bg-accent focus-visible:bg-accent flex items-start gap-3 rounded-lg p-3 transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  )}
                  role="listitem"
                >
                  {/* Avatar placeholder */}
                  <div
                    className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    aria-hidden="true"
                  >
                    {person.photoUrl ? (
                      <img
                        src={person.photoUrl}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="text-muted-foreground h-5 w-5" />
                    )}
                  </div>

                  {/* Person info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {formatPersonName(person)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatPersonDates(person)}
                    </p>
                  </div>
                </Link>
              ))}

              {/* See All Results Link */}
              {debouncedQuery && (
                <div className="border-border mt-4 border-t pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    asChild
                  >
                    <Link
                      to="/people"
                      className="flex items-center justify-between"
                    >
                      <span>See all results</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </BaseWidget>
  );
}
