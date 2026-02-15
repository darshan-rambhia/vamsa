import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Card, CardContent } from "@vamsa/ui";
import { useTranslation } from "react-i18next";
import { getInvites } from "~/server/invites";
import { getCurrentUser } from "~/server/auth.functions";
import { InvitesTable } from "~/components/admin/invites-table";
import { CreateInviteDialog } from "~/components/admin/create-invite-dialog";

export const Route = createFileRoute("/_authenticated/admin/invites")({
  loader: async () => {
    const [invitesData, currentUser] = await Promise.all([
      getInvites({ data: {} }),
      getCurrentUser(),
    ]);
    return { invites: invitesData.items, currentUser };
  },
  component: InvitesPage,
});

function InvitesPage() {
  const { t } = useTranslation(["admin", "common"]);
  const { invites, currentUser } = Route.useLoaderData();
  const router = useRouter();

  // If not admin, show access denied
  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive font-medium">{t("common:error")}</p>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("common:serverError")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("admin:invitesTitle")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("admin:invitesCreateDescription")}
          </p>
        </div>
        <CreateInviteDialog onInviteCreated={() => router.invalidate()} />
      </div>

      <InvitesTable
        invites={invites}
        onInviteUpdated={() => router.invalidate()}
      />
    </div>
  );
}
