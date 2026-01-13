import { useState } from "react";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Button, Card, CardContent } from "@vamsa/ui";

/**
 * Reusable error component for admin child routes.
 * Shows a user-friendly error message within the admin layout,
 * keeping tabs visible so users can navigate to other sections.
 */
export function AdminRouteError({ error, reset }: ErrorComponentProps) {
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();
  const isDev = import.meta.env.DEV;

  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred";
  const errorStack = error instanceof Error ? error.stack : undefined;

  const handleRetry = () => {
    reset();
    router.invalidate();
  };

  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="bg-destructive/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <svg
            className="text-destructive h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="font-display text-lg font-semibold">
          Unable to load this section
        </h2>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Something went wrong while loading this page. Please try again or
          navigate to a different section using the tabs above.
        </p>

        <div className="mt-6">
          <Button onClick={handleRetry} size="sm">
            Try Again
          </Button>
        </div>

        {isDev && (
          <div className="mt-6 w-full max-w-lg text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
            >
              {showDetails ? "Hide" : "Show"} technical details
            </button>

            {showDetails && (
              <div className="bg-muted/50 mt-2 overflow-auto rounded border p-3">
                <p className="text-destructive font-mono text-xs font-medium">
                  {errorMessage}
                </p>
                {errorStack && (
                  <pre className="text-muted-foreground mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
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
