import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Container, PageHeader } from "@vamsa/ui";
import { getDashboardStats } from "~/server/dashboard";
import { OnboardingDashboard } from "~/components/onboarding";
import { ConfigurableDashboard } from "~/components/dashboard/ConfigurableDashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery({
      queryKey: ["dashboard-stats"],
      queryFn: () => getDashboardStats(),
    });
  },
  component: DashboardComponent,
});

function DashboardComponent() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  // Show onboarding for new users with no people
  if (!isLoading && stats?.totalPeople === 0) {
    return (
      <Container className="space-y-8">
        <OnboardingDashboard />
      </Container>
    );
  }

  return (
    <Container className="space-y-8">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.welcome")}
        actions={
          <Button asChild>
            <Link to="/people/new">{t("people.addPerson")}</Link>
          </Button>
        }
      />

      {/* Configurable Dashboard with Widgets */}
      <ConfigurableDashboard />
    </Container>
  );
}
