"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@vamsa/ui";

const STORAGE_KEY = "vamsa-chart-tips-dismissed";

interface DismissibleTipsProps {
  className?: string;
}

/**
 * Dismissible tips banner for chart visualization.
 * Remembers dismissal state in localStorage.
 */
export function DismissibleTips({ className }: DismissibleTipsProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash
  const [isLoaded, setIsLoaded] = useState(false);

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === "true");
    setIsLoaded(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const handleShow = useCallback(() => {
    setIsDismissed(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Don't render anything until we've loaded the state
  if (!isLoaded) {
    return null;
  }

  // Show a small button to restore tips when dismissed
  if (isDismissed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleShow}
        className="text-muted-foreground hover:text-foreground text-xs"
      >
        <svg
          className="mr-1 h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          />
        </svg>
        Show tips
      </Button>
    );
  }

  return (
    <div
      className={`bg-muted/50 flex items-center justify-between gap-3 rounded-lg border px-4 py-2 ${className ?? ""}`}
    >
      <div className="flex items-center gap-3">
        <svg
          className="text-primary h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          />
        </svg>
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">Tip:</span> Drag to pan,
          scroll to zoom, click a node for details. Use controls to adjust
          generations.
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={handleDismiss}
        title="Dismiss tips"
      >
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </Button>
    </div>
  );
}
