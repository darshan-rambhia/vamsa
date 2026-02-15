"use client";

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input } from "@vamsa/ui";
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
export function QuickSearchWidget({
  config,
  onRemove,
  className,
}: WidgetProps) {
  const { t } = useTranslation(["dashboard", "common"]);
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
  const [_error, setError] = useState<Error | null>(null);

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

  // Format person status
  const formatPersonStatus = (person: (typeof results)[0]) => {
    return person.isLiving ? t("dashboard:living") : t("dashboard:deceased");
  };

  const showResults = debouncedQuery && !isSearching && results.length > 0;
  const showNoResults = debouncedQuery && !isSearching && results.length === 0;

  return (
    <BaseWidget config={config} onRemove={onRemove} className={className}>
      <div className="flex h-full flex-col justify-center p-6">
        <div className="relative w-full">
          <Search className="text-muted-foreground peer-focus:text-primary absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transform transition-colors duration-200" />
          <Input
            type="text"
            placeholder={t("dashboard:searchFamily")}
            value={query}
            onChange={handleInputChange}
            className="peer border-border/50 bg-background/50 focus:border-primary/50 focus:bg-background focus:ring-primary/10 h-14 w-full rounded-2xl border-2 pr-10 pl-12 text-lg shadow-sm transition-all duration-300 focus:ring-4"
            aria-label={t("dashboard:searchFamily")}
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 rounded-full opacity-50 hover:bg-transparent hover:opacity-100"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results / Prompt */}
        <div className="mt-4 flex-1">
          {!query && !isSearching && (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <p className="text-muted-foreground text-xs font-medium">
                {t("dashboard:trySearching")}{" "}
                <span className="text-foreground">&quot;Grandpa&quot;</span>{" "}
                {t("dashboard:orDates")}
              </p>
            </div>
          )}

          {isSearching && (
            <div className="flex justify-center p-4">
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
            </div>
          )}

          {showResults && (
            <div className="custom-scrollbar max-h-[160px] space-y-2 overflow-y-auto pr-1">
              {results.slice(0, 3).map((person) => (
                <Link
                  key={person.id}
                  to="/people/$personId"
                  params={{ personId: person.id }}
                  className="group bg-secondary/5 hover:bg-secondary/10 hover:border-secondary/20 flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:shadow-sm"
                >
                  <div className="bg-background border-border/50 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm">
                    {person.photoUrl ? (
                      <img
                        src={person.photoUrl}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-primary text-sm font-bold">
                        {person.firstName[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-foreground group-hover:text-primary truncate text-sm font-medium transition-colors">
                      {formatPersonName(person)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatPersonStatus(person)} • {formatPersonDates(person)}
                    </p>
                  </div>
                </Link>
              ))}
              <div className="pt-2">
                <Link
                  to="/people"
                  className="text-primary block text-center text-xs font-medium hover:underline"
                >
                  {t("dashboard:viewAllResults")}
                </Link>
              </div>
            </div>
          )}

          {showNoResults && (
            <p className="text-destructive mt-4 text-center text-sm">
              {t("dashboard:noResultsFound")}
            </p>
          )}
        </div>
      </div>
    </BaseWidget>
  );
}
