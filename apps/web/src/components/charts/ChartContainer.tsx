"use client";

import { forwardRef } from "react";
import { cn } from "@vamsa/ui";
import type { ReactNode } from "react";

interface ChartContainerProps {
  children: ReactNode;
  className?: string;
  /**
   * Whether to fill the parent container height.
   * When true, uses h-full. When false, uses min-h-[600px].
   * Default: false for backwards compatibility
   */
  fillHeight?: boolean;
  /**
   * Custom height class override
   */
  heightClass?: string;
  /**
   * Immersive mode - fills almost the entire viewport
   * Use for maximizing chart viewing area
   */
  immersive?: boolean;
}

/**
 * Unified container component for all chart visualizations.
 * Provides consistent styling with the design system:
 * - bg-card background
 * - rounded-lg border
 * - overflow-hidden for clean edges
 * - Fills width and height of parent
 */
export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    { children, className, fillHeight = false, heightClass, immersive = false },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base container styles - matches tree view aesthetic
          "bg-card relative w-full overflow-hidden rounded-lg border",
          // Height handling - immersive mode takes priority
          immersive
            ? "h-[calc(100vh-8rem)]" // Full viewport minus minimal header
            : heightClass
              ? heightClass
              : fillHeight
                ? "h-full"
                : "min-h-[70vh]",
          className
        )}
      >
        {children}
      </div>
    );
  }
);

ChartContainer.displayName = "ChartContainer";

/**
 * Empty state component for charts
 */
interface ChartEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function ChartEmptyState({
  icon,
  title,
  description,
  action,
}: ChartEmptyStateProps) {
  return (
    <ChartContainer className="flex items-center justify-center">
      <div className="max-w-md p-6 text-center">
        {icon && (
          <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            {icon}
          </div>
        )}
        <h3 className="font-display text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </ChartContainer>
  );
}

/**
 * Loading state component for charts
 */
interface ChartLoadingStateProps {
  message?: string;
}

export function ChartLoadingState({
  message = "Generating chart...",
}: ChartLoadingStateProps) {
  return (
    <ChartContainer className="flex items-center justify-center">
      <div className="text-center">
        <div className="bg-primary/20 mx-auto mb-4 h-12 w-12 animate-pulse rounded-full" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </ChartContainer>
  );
}

/**
 * Error state component for charts
 */
interface ChartErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
}

export function ChartErrorState({
  title = "Error Loading Chart",
  message = "An unknown error occurred",
  retry,
}: ChartErrorStateProps) {
  return (
    <ChartContainer className="flex items-center justify-center">
      <div className="max-w-md p-6 text-center">
        <div className="bg-destructive/10 text-destructive mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h3 className="font-display text-lg font-medium">{title}</h3>
        <p className="text-muted-foreground mt-2">{message}</p>
        {retry && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={retry}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </ChartContainer>
  );
}
