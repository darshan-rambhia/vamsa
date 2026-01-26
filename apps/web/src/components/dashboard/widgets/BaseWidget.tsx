"use client";

import { Settings, X, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from "@vamsa/ui";
import { ErrorBoundary } from "../../error/error-boundary";
import type { BaseWidgetProps } from "./types";

/**
 * Base wrapper component for dashboard widgets.
 * Provides consistent chrome (title bar, settings, remove), loading states,
 * and error handling.
 *
 * @example
 * ```tsx
 * <BaseWidget
 *   config={config}
 *   isLoading={loading}
 *   onSettings={() => setShowSettings(true)}
 *   onRemove={handleRemove}
 * >
 *   <div>Widget content</div>
 * </BaseWidget>
 * ```
 */
export function BaseWidget({
  config,
  children,
  isLoading = false,
  error = null,
  onSettings,
  onRemove,
  onRefresh,
  className,
}: BaseWidgetProps) {
  return (
    <ErrorBoundary
      errorCardProps={{
        variant: "compact",
        title: "Widget error",
        message: "This widget encountered an error",
      }}
    >
      <Card
        className={cn(
          "flex h-full flex-col",
          // Subtle focus indicator for keyboard navigation
          "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
          className
        )}
      >
        {/* Title Bar */}
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="font-display text-base font-medium">
            {config.title}
          </CardTitle>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Refresh Button (optional) */}
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                aria-label={`Refresh ${config.title}`}
                className="h-8 w-8"
              >
                <RefreshCw
                  className={cn(
                    "text-muted-foreground hover:text-foreground h-4 w-4 transition-transform",
                    isLoading && "animate-spin"
                  )}
                />
              </Button>
            )}

            {/* Settings Button */}
            {onSettings && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSettings}
                aria-label={`Configure ${config.title}`}
                className="h-8 w-8"
              >
                <Settings className="text-muted-foreground hover:text-foreground h-4 w-4" />
              </Button>
            )}

            {/* Remove Button */}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                aria-label={`Remove ${config.title}`}
                className="h-8 w-8"
              >
                <X className="text-muted-foreground hover:text-destructive h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-auto pt-0">
          {/* Loading State */}
          {isLoading && (
            <div
              className="flex h-full items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="text-muted-foreground h-6 w-6 animate-spin"
                aria-label="Loading"
              />
              <span className="sr-only">Loading {config.title}...</span>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div
              className="border-destructive/20 bg-destructive/5 flex h-full items-center justify-center rounded-lg border p-4"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="text-destructive mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-destructive text-sm font-medium">
                    Error Loading Widget
                  </h4>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {error.message || "Something went wrong"}
                  </p>
                  {onRefresh && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRefresh}
                      className="mt-3"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Widget Content */}
          {!isLoading && !error && children}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
}
