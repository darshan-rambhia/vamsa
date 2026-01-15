import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Container,
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
} from "@vamsa/ui";
import { ErrorCard, ErrorBoundary } from "~/components/error";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dev/errors")({
  component: ErrorShowcase,
});

/**
 * Development-only route for testing and showcasing error components.
 * Not linked in navigation - access via /dev/errors
 */
function ErrorShowcase() {
  const [triggerError, setTriggerError] = useState(false);
  const [boundaryKey, setBoundaryKey] = useState(0);

  return (
    <Container className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Error Components Showcase"
          description="Development page for testing error handling and UI components"
        />
        <Badge variant="secondary">Dev Only</Badge>
      </div>

      {/* Warning banner */}
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          This page is for development and testing purposes only. It showcases
          all error component variants and allows testing error boundaries.
        </p>
      </div>

      {/* ErrorCard Variants */}
      <section className="space-y-6">
        <h2 className="font-display text-xl font-semibold">ErrorCard Variants</h2>

        {/* Default variant */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Default (Large Centered)
          </h3>
          <ErrorCard
            title="Something went wrong"
            message="This is the default error card variant with centered content and prominent styling."
            error={new Error("Sample error message for testing")}
            onRetry={() => alert("Retry clicked!")}
            data-testid="error-card-default"
          />
        </div>

        {/* Compact variant */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Compact (Horizontal Layout)
          </h3>
          <ErrorCard
            variant="compact"
            title="Unable to load this section"
            message="This is the compact variant, suitable for inline errors within larger layouts."
            error={new Error("Compact error example")}
            onRetry={() => alert("Retry clicked!")}
            data-testid="error-card-compact"
          />
        </div>

        {/* Minimal variant */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Minimal (Warning Bar)
          </h3>
          <ErrorCard
            variant="minimal"
            message="This is a minimal warning - useful for non-critical issues."
            onRetry={() => alert("Retry clicked!")}
            data-testid="error-card-minimal"
          />
        </div>

        {/* Without retry button */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Without Retry Button
          </h3>
          <ErrorCard
            variant="compact"
            title="Data unavailable"
            message="Some errors don't have a retry action - this card has showRetry=false."
            showRetry={false}
            data-testid="error-card-no-retry"
          />
        </div>

        {/* With custom actions */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            With Custom Actions
          </h3>
          <ErrorCard
            variant="compact"
            title="Session expired"
            message="You can add custom action buttons alongside or instead of the retry button."
            showRetry={false}
            actions={
              <>
                <Button variant="outline" size="sm">
                  Sign In Again
                </Button>
                <Button variant="ghost" size="sm">
                  Contact Support
                </Button>
              </>
            }
            data-testid="error-card-custom-actions"
          />
        </div>
      </section>

      {/* Error Boundary Testing */}
      <section className="space-y-6">
        <h2 className="font-display text-xl font-semibold">
          Error Boundary Testing
        </h2>

        <Card>
          <CardHeader>
            <CardTitle>Live Error Boundary Test</CardTitle>
            <CardDescription>
              Click the button below to trigger an error inside the ErrorBoundary.
              The error should be caught and displayed inline without crashing the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => setTriggerError(true)}
                data-testid="trigger-error-button"
              >
                Trigger Error
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTriggerError(false);
                  setBoundaryKey((k) => k + 1);
                }}
                data-testid="reset-error-button"
              >
                Reset
              </Button>
            </div>

            <div
              className="rounded-lg border-2 border-dashed border-muted p-4"
              data-testid="error-boundary-container"
            >
              <p className="text-sm text-muted-foreground mb-4">
                Error boundary content area:
              </p>
              <ErrorBoundary key={boundaryKey}>
                <ErrorTriggerComponent shouldError={triggerError} />
              </ErrorBoundary>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Error States Reference */}
      <section className="space-y-6">
        <h2 className="font-display text-xl font-semibold">Error States Reference</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Route-Level Errors</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                When a route fails to load, the <code>RouteError</code> or{" "}
                <code>CompactRouteError</code> component is displayed. These
                preserve the navigation layout.
              </p>
              <p className="mt-2">
                Used in: <code>_authenticated.tsx</code>, admin routes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Component-Level Errors</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Wrap components in <code>&lt;ErrorBoundary&gt;</code> to catch
                errors locally. The component shows an error card while the rest
                of the page remains functional.
              </p>
              <p className="mt-2">
                Import from: <code>~/components/error</code>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Root-Level Errors</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Uncaught errors bubble up to <code>RootErrorComponent</code> in{" "}
                <code>__root.tsx</code>. This shows a full-page error with a
                minimal header.
              </p>
              <p className="mt-2">Last resort - try to catch errors earlier.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">404 Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                When a route doesn't exist, the <code>NotFound</code> component
                displays a themed 404 page with navigation options.
              </p>
              <p className="mt-2">
                Test by visiting:{" "}
                <a href="/this-page-does-not-exist" className="text-primary hover:underline">
                  /this-page-does-not-exist
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </Container>
  );
}

/**
 * Component that throws an error when shouldError is true.
 * Used for testing ErrorBoundary behavior.
 */
function ErrorTriggerComponent({ shouldError }: { shouldError: boolean }) {
  if (shouldError) {
    throw new Error(
      "This is a test error thrown intentionally to demonstrate ErrorBoundary functionality."
    );
  }

  return (
    <div
      className="rounded-lg bg-green-500/10 border border-green-500/30 p-4"
      data-testid="healthy-component"
    >
      <p className="text-sm text-green-700 dark:text-green-300">
        This component is working normally. Click "Trigger Error" to simulate a
        component crash.
      </p>
    </div>
  );
}
