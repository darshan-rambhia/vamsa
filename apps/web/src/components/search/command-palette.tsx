"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { Loader2, Search, Sparkles, User, X } from "lucide-react";
import { cn } from "@vamsa/ui";
import { searchPeople } from "../../server/search";
import { CATEGORY_LABELS, filterNavigationItems } from "./command-palette-data";
import type { NavigationItem } from "./command-palette-data";

interface CommandPaletteProps {
  isAdmin?: boolean;
}

/**
 * Universal Command Palette
 *
 * Provides a global search interface with keyboard shortcuts.
 * Shows navigation items, quick actions, chart links, and search results.
 *
 * Features:
 * - Triggered with Cmd+K / Ctrl+K
 * - Natural language search with NLP explanation banners
 * - Navigation + quick actions (client-side, instant)
 * - People search via server FTS
 * - Admin items filtered by role
 * - Debounced search (300ms)
 * - Keyboard navigation
 * - ESC to close
 */
export function CommandPalette({ isAdmin = false }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [intentType, setIntentType] = useState<string | null>(null);
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
  const navigate = useNavigate();

  // Toggle command palette with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Listen for custom event from nav search trigger
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    document.addEventListener("open-command-palette", handleOpen);
    return () =>
      document.removeEventListener("open-command-palette", handleOpen);
  }, []);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setIsSearching(false);
      setError(null);
      setExplanation(null);
      setIntentType(null);
    }
  }, [open]);

  // Debounced search execution (only when there's a query)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      setExplanation(null);
      setIntentType(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const searchResults = await searchPeople({
          data: {
            query,
            limit: 10,
            offset: 0,
          },
        });

        setResults(searchResults.results.map((r) => r.item));
        setExplanation(searchResults.explanation ?? null);
        setIntentType(searchResults.intentType ?? null);
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
        setError("Search is temporarily unavailable. Please try again later.");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Client-side filtered navigation items
  const navItems = useMemo(
    () => filterNavigationItems(query, isAdmin),
    [query, isAdmin]
  );

  // Group nav items by category
  const navGroups = useMemo(() => {
    const groups: Record<string, Array<NavigationItem>> = {};
    for (const item of navItems) {
      const key = item.category;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [navItems]);

  // Handle person selection
  const handleSelectPerson = useCallback(
    (personId: string) => {
      setOpen(false);
      navigate({ to: "/people/$personId", params: { personId } });
    },
    [navigate]
  );

  // Handle navigation item selection
  const handleSelectNavItem = useCallback(
    (item: NavigationItem) => {
      setOpen(false);
      // Handle query params in hrefs like /visualize?type=tree
      const [path, search] = item.href.split("?");
      if (search) {
        const params = new URLSearchParams(search);
        navigate({
          to: path,
          search: Object.fromEntries(params),
        });
      } else {
        navigate({ to: path });
      }
    },
    [navigate]
  );

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

  // Detect if query looks like natural language
  const isNLPQuery = query.trim().split(" ").length > 2;

  // Determine what to show
  const hasQuery = query.trim().length > 0;
  const hasServerResults = results.length > 0;
  const hasNavResults = hasQuery && navItems.length > 0;
  const hasAnyResults = hasServerResults || hasNavResults;
  const showEmptyState = hasQuery && !isSearching && !error && !hasAnyResults;

  // For empty query, show Quick Actions and Navigation groups
  const emptyQueryCategories = ["actions", "navigation", "charts"];
  // For queries, show nav items that matched (grouped)
  const queryNavCategories = hasQuery
    ? ["actions", "navigation", "charts", "admin"]
    : emptyQueryCategories;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Command Palette Dialog */}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        className={cn(
          "bg-background border-border fixed top-[20%] left-[50%] z-50 w-full max-w-2xl translate-x-[-50%] overflow-hidden rounded-xl border-2 shadow-lg",
          open && "animate-in fade-in-0 zoom-in-95 slide-in-from-top-[48%]",
          !open && "animate-out fade-out-0 zoom-out-95 slide-out-to-top-[48%]"
        )}
        label="Global search"
      >
        {/* Search Input */}
        <div className="border-border flex items-center gap-3 border-b px-4">
          {isNLPQuery ? (
            <Sparkles
              className="text-primary h-5 w-5 flex-shrink-0"
              aria-label="AI search"
            />
          ) : (
            <Search
              className="text-muted-foreground h-5 w-5 flex-shrink-0"
              aria-label="Search"
            />
          )}
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search people, pages, or ask your tree..."
            className="placeholder:text-muted-foreground flex h-14 w-full bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          {isSearching && (
            <Loader2
              className="text-muted-foreground h-5 w-5 flex-shrink-0 animate-spin"
              aria-label="Searching"
            />
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground flex-shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          {/* Error state */}
          {hasQuery && !isSearching && error && (
            <div className="text-destructive px-4 py-8 text-center text-sm">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>{error}</p>
            </div>
          )}

          {/* NLP Explanation Banner */}
          {explanation && intentType && intentType !== "PERSON_SEARCH" && (
            <div className="bg-primary/5 border-primary/20 mx-2 mb-2 flex items-start gap-2 rounded-lg border px-3 py-2">
              <Sparkles className="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="text-foreground text-sm">{explanation}</p>
            </div>
          )}

          {/* People Results */}
          {hasServerResults && (
            <Command.Group
              heading="People"
              className="text-muted-foreground mb-2 px-3 py-2 text-xs font-medium"
            >
              {results.map((person) => (
                <Command.Item
                  key={person.id}
                  value={`person-${person.id}`}
                  onSelect={() => handleSelectPerson(person.id)}
                  className={cn(
                    "aria-selected:bg-accent aria-selected:text-accent-foreground flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  )}
                >
                  {/* Avatar */}
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

                  {/* Keyboard hint */}
                  <kbd className="bg-muted pointer-events-none hidden rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-50 sm:inline-block">
                    ↵
                  </kbd>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Navigation Groups */}
          {!error &&
            queryNavCategories.map((category) => {
              const items = navGroups[category];
              if (!items || items.length === 0) return null;

              return (
                <Command.Group
                  key={category}
                  heading={CATEGORY_LABELS[category] || category}
                  className="text-muted-foreground mb-2 px-3 py-2 text-xs font-medium"
                >
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelectNavItem(item)}
                        className={cn(
                          "aria-selected:bg-accent aria-selected:text-accent-foreground flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        )}
                      >
                        <div
                          className="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
                          aria-hidden="true"
                        >
                          <Icon className="text-muted-foreground h-4 w-4" />
                        </div>
                        <span className="truncate text-sm">{item.label}</span>
                        <kbd className="bg-muted pointer-events-none ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-50 sm:inline-block">
                          ↵
                        </kbd>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}

          {/* Empty state — only when query has no results at all */}
          {showEmptyState && (
            <Command.Empty className="text-muted-foreground px-4 py-8 text-center text-sm">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No results found</p>
              <p className="text-muted-foreground/70 mt-1 text-xs">
                Try a different search term or browse pages above
              </p>
            </Command.Empty>
          )}
        </Command.List>

        {/* Footer with keyboard hints */}
        <div className="border-border flex items-center justify-between border-t px-4 py-2">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <kbd className="bg-muted pointer-events-none rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
                ↑↓
              </kbd>
              <span className="text-muted-foreground">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="bg-muted pointer-events-none rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
                ↵
              </kbd>
              <span className="text-muted-foreground">Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="bg-muted pointer-events-none rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
                ESC
              </kbd>
              <span className="text-muted-foreground">Close</span>
            </div>
          </div>
          {isNLPQuery && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="text-primary h-3 w-3" />
              <span className="text-muted-foreground text-[10px]">
                AI-powered search
              </span>
            </div>
          )}
        </div>
      </Command.Dialog>
    </>
  );
}
