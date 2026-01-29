"use client";

import { Search } from "lucide-react";
import { Button } from "@vamsa/ui";

/**
 * Command Palette Trigger Button
 *
 * A visually accessible button that triggers the command palette.
 * Shows keyboard shortcut hint (Cmd+K / Ctrl+K).
 *
 * Design:
 * - Minimalistic ghost button style
 * - Displays keyboard shortcut
 * - ARIA labels for screen readers
 *
 * @example
 * ```tsx
 * <CommandPaletteTrigger onClick={handleOpen} />
 * ```
 */
export function CommandPaletteTrigger({ onClick }: { onClick: () => void }) {
  // Detect OS for keyboard shortcut display
  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground flex items-center gap-2"
      aria-label="Open search (Cmd+K)"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="bg-muted pointer-events-none hidden rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium md:inline-block">
        {isMac ? "⌘" : "Ctrl"}K
      </kbd>
    </Button>
  );
}
