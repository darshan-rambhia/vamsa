import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, Container, PageHeader } from "@vamsa/ui";
import { useTranslation } from "react-i18next";
import { getFamilySettings } from "~/server/settings";
import { getCurrentUser } from "~/server/auth.functions";
import { SettingsForm } from "~/components/admin/settings-form";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  loader: async () => {
    const [settings, currentUser] = await Promise.all([
      getFamilySettings(),
      getCurrentUser(),
    ]);
    return { settings, currentUser };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation(["admin", "common"]);
  const { settings, currentUser } = Route.useLoaderData();

  // If not admin, show access denied
  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <Container>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-medium">{t("common:error")}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("common:serverError")}
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title={t("admin:settings")}
        description={t("admin:settingsTitle")}
      />
      <SettingsForm settings={settings} />
    </Container>
  );
}
