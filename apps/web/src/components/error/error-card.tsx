import { useState } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Card, CardContent, cn } from "@vamsa/ui";

export interface ErrorCardProps {
  /** Title for the error - defaults to "Something went wrong" */
  title?: string;
  /** Description message */
  message?: string;
  /** The actual error object (for dev details) */
  error?: Error | unknown;
  /** Called when user clicks retry */
  onRetry?: () => void;
  /** Show retry button */
  showRetry?: boolean;
  /** Additional actions to show */
  actions?: React.ReactNode;
  /** Size variant */
  variant?: "default" | "compact" | "minimal";
  /** Additional className */
  className?: string;
}

/**
 * A themed error card for displaying errors inline within the page.
 * Used for component-level and section-level errors.
 */
export function ErrorCard({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  error,
  onRetry,
  showRetry = true,
  actions,
  variant = "default",
  className,
}: ErrorCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isDev = import.meta.env.DEV;

  const errorMessage =
    error instanceof Error ? error.message : String(error || "");
  const errorStack = error instanceof Error ? error.stack : undefined;

  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3",
          className
        )}
      >
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300 flex-1">
          {message}
        </p>
        {showRetry && onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Card className={cn("border-destructive/20", className)}>
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-full shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
              {(showRetry && onRetry) || actions ? (
                <div className="flex items-center gap-2 mt-3">
                  {showRetry && onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      Try Again
                    </Button>
                  )}
                  {actions}
                </div>
              ) : null}
            </div>
          </div>

          {isDev && errorMessage && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showDetails ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                Technical details
              </button>
              {showDetails && (
                <div className="mt-2 bg-muted/50 rounded p-3 overflow-auto">
                  <p className="text-destructive font-mono text-xs">
                    {errorMessage}
                  </p>
                  {errorStack && (
                    <pre className="text-muted-foreground font-mono text-xs mt-2 whitespace-pre-wrap">
                      {errorStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant - centered, larger
  return (
    <Card className={cn("border-destructive/20", className)}>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="bg-destructive/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">{message}</p>

        {(showRetry && onRetry) || actions ? (
          <div className="flex items-center gap-3 mt-6">
            {showRetry && onRetry && (
              <Button onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {actions}
          </div>
        ) : null}

        {isDev && errorMessage && (
          <div className="mt-8 w-full max-w-lg text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {showDetails ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              Technical details
            </button>
            {showDetails && (
              <div className="mt-2 bg-muted/50 rounded-lg border p-4 overflow-auto">
                <p className="text-destructive font-mono text-sm font-medium">
                  {errorMessage}
                </p>
                {errorStack && (
                  <pre className="text-muted-foreground font-mono text-xs mt-2 whitespace-pre-wrap">
                    {errorStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
