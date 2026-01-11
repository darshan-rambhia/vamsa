import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Card, CardContent } from "@vamsa/ui";
import { getInvites } from "~/server/invites";
import { getCurrentUser } from "~/server/auth";
import { InvitesTable } from "~/components/admin/invites-table";
import { CreateInviteDialog } from "~/components/admin/create-invite-dialog";

export const Route = createFileRoute("/_authenticated/admin/invites")({
  loader: async () => {
    const [invites, currentUser] = await Promise.all([
      getInvites(),
      getCurrentUser(),
    ]);
    return { invites, currentUser };
  },
  component: InvitesPage,
});

function InvitesPage() {
  const { invites, currentUser } = Route.useLoaderData();
  const router = useRouter();

  // If not admin, show access denied
  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive font-medium">Access Denied</p>
          <p className="text-muted-foreground mt-2 text-sm">
            You need admin privileges to view this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invite Management</h2>
          <p className="text-muted-foreground text-sm">
            Invite family members to join and manage the family tree
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
