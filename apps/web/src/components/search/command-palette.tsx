"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { Loader2, Search, Sparkles, User, X } from "lucide-react";
import { cn } from "@vamsa/ui";
import { searchPeople } from "../../server/search";

/**
 * Command Palette Component
 *
 * Provides a global search interface with keyboard shortcuts.
 * Integrates with NLP-based search for natural language queries.
 *
 * Features:
 * - Triggered with Cmd+K / Ctrl+K
 * - Natural language search support
 * - Debounced search (300ms)
 * - Keyboard navigation
 * - ESC to close
 *
 * Design:
 * - Professional + minimalistic + organic aesthetic
 * - Earth tones palette
 * - Accessible (WCAG 2.1 AA)
 * - Keyboard-first interaction
 *
 * @example
 * ```tsx
 * <CommandPalette />
 * ```
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setIsSearching(false);
    }
  }, [open]);

  // Debounced search execution
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);

      try {
        const searchResults = await searchPeople({
          data: {
            query,
            limit: 10,
            offset: 0,
          },
        });

        setResults(searchResults.results.map((r) => r.item));
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Handle person selection
  const handleSelect = useCallback(
    (personId: string) => {
      setOpen(false);
      navigate({ to: "/people/$personId", params: { personId } });
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
            placeholder="Ask your tree... (e.g., 'Who are the children of John Doe?')"
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
          {!query && (
            <div className="text-muted-foreground px-4 py-8 text-center text-sm">
              <p className="mb-2">Try natural language queries:</p>
              <div className="text-muted-foreground/70 space-y-1 text-xs">
                <p>&quot;Who are the children of John Doe?&quot;</p>
                <p>&quot;Show me people born in London&quot;</p>
                <p>&quot;Find descendants of Mary Smith&quot;</p>
              </div>
            </div>
          )}

          {query && !isSearching && results.length === 0 && (
            <Command.Empty className="text-muted-foreground px-4 py-8 text-center text-sm">
              <User className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No people found</p>
              <p className="text-muted-foreground/70 mt-1 text-xs">
                Try a different search term
              </p>
            </Command.Empty>
          )}

          {results.length > 0 && (
            <Command.Group
              heading="People"
              className="text-muted-foreground mb-2 px-3 py-2 text-xs font-medium"
            >
              {results.map((person) => (
                <Command.Item
                  key={person.id}
                  value={person.id}
                  onSelect={() => handleSelect(person.id)}
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
