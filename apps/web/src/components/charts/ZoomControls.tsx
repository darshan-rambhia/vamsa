"use client";

import { Button } from "@vamsa/ui";

export interface ZoomControlsProps {
  scale: number;
  minScale?: number;
  maxScale?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

/**
 * Zoom controls for chart components with +/- buttons and reset
 */
export function ZoomControls({
  scale,
  minScale = 0.1,
  maxScale = 4,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  const canZoomIn = scale < maxScale;
  const canZoomOut = scale > minScale;

  return (
    <div className="bg-card/90 absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border p-1 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom out"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </Button>

      <span className="text-muted-foreground min-w-[3rem] text-center text-xs font-medium">
        {Math.round(scale * 100)}%
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom in"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </Button>

      <div className="bg-border mx-1 h-4 w-px" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onReset}
        title="Reset zoom"
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </Button>
    </div>
  );
}
