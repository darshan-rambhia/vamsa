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
    <div className="bg-card/90 absolute right-4 bottom-4 flex flex-col items-center gap-1 rounded-lg border p-1 backdrop-blur-sm">
      {/* Zoom In (top) */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
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

      {/* Scale percentage */}
      <span className="text-muted-foreground text-center text-xs font-medium">
        {Math.round(scale * 100)}%
      </span>

      {/* Zoom Out */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
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

      {/* Divider */}
      <div className="bg-border my-1 h-px w-4" />

      {/* Fit/Reset (bottom) */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onReset}
        title="Fit to view"
        aria-label="Fit to view"
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
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
          />
        </svg>
      </Button>
    </div>
  );
}
