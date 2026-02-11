"use client";

import { Search } from "lucide-react";

/**
 * Command Palette Trigger
 *
 * Styled as a search input bar in the nav header.
 * Dispatches a custom event to open the CommandPalette.
 */
export function CommandPaletteTrigger() {
  // Detect OS for keyboard shortcut display
  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const handleClick = () => {
    document.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <button
      onClick={handleClick}
      className="border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-9 w-48 items-center gap-2 rounded-md border px-3 text-sm transition-colors lg:w-64"
      aria-label="Open search (Cmd+K)"
      data-testid="nav-search-trigger"
    >
      <Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1 text-left">Search people...</span>
      <kbd className="bg-muted pointer-events-none hidden rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline-block">
        {isMac ? "⌘" : "Ctrl"}K
      </kbd>
    </button>
  );
}
