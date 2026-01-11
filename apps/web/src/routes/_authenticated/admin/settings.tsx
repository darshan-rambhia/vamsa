import { createFileRoute } from "@tanstack/react-router";
import {
  Container,
  PageHeader,
  Card,
  CardContent,
} from "@vamsa/ui";
import { getFamilySettings } from "~/server/settings";
import { getCurrentUser } from "~/server/auth";
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
  const { settings, currentUser } = Route.useLoaderData();

  // If not admin, show access denied
  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <Container>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-medium">Access Denied</p>
            <p className="text-muted-foreground mt-2 text-sm">
              You need admin privileges to view this page.
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title="Settings"
        description="Configure your Vamsa application"
      />
      <SettingsForm settings={settings} />
    </Container>
  );
}
