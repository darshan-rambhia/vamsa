import { Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button, Container } from "@vamsa/ui";
import { Home } from "lucide-react";
import { ErrorCard } from "./error-card";
import type { ErrorComponentProps } from "@tanstack/react-router";

/**
 * Route-level error component for authenticated routes.
 * Shows the error within the page content area, preserving the navigation.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation("common");
  const router = useRouter();

  const handleRetry = () => {
    reset();
    router.invalidate();
  };

  return (
    <Container className="py-8">
      <ErrorCard
        title={t("errorLoadingPage")}
        message={t("errorLoadingPageMessage")}
        error={error}
        onRetry={handleRetry}
        actions={
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              {t("goToDashboard")}
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
  const { t } = useTranslation("common");
  const router = useRouter();

  const handleRetry = () => {
    reset();
    router.invalidate();
  };

  return (
    <ErrorCard
      title={t("errorLoadingSection")}
      message={t("errorLoadingSectionMessage")}
      error={error}
      onRetry={handleRetry}
      variant="default"
    />
  );
}
