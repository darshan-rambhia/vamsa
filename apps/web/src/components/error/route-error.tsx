import {
  useRouter,
  type ErrorComponentProps,
  Link,
} from "@tanstack/react-router";
import { Button, Container } from "@vamsa/ui";
import { ErrorCard } from "./error-card";
import { Home } from "lucide-react";

/**
 * Route-level error component for authenticated routes.
 * Shows the error within the page content area, preserving the navigation.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  const handleRetry = () => {
    reset();
    router.invalidate();
  };

  return (
    <Container className="py-8">
      <ErrorCard
        title="Unable to load this page"
        message="We encountered an error while loading this page. Please try again or navigate to a different section."
        error={error}
        onRetry={handleRetry}
        actions={
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        }
      />
    </Container>
  );
}

/**
 * Compact route error for use in tabbed layouts or nested routes.
 * Preserves more of the parent layout context.
 */
export function CompactRouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  const handleRetry = () => {
    reset();
    router.invalidate();
  };

  return (
    <ErrorCard
      title="Unable to load this section"
      message="Something went wrong while loading this content. Please try again or navigate to a different section using the tabs above."
      error={error}
      onRetry={handleRetry}
      variant="default"
    />
  );
}
