import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Container, PageHeader, Card, CardContent } from "@vamsa/ui";
import { getUsers } from "~/server/users";
import { getCurrentUser } from "~/server/auth";
import { UsersTable } from "~/components/admin/users-table";

export const Route = createFileRoute("/_authenticated/admin/users")({
  loader: async () => {
    const [users, currentUser] = await Promise.all([
      getUsers(),
      getCurrentUser(),
    ]);
    return { users, currentUser };
  },
  component: UsersPage,
});

function UsersPage() {
  const { users, currentUser } = Route.useLoaderData();
  const router = useRouter();

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
        title="User Management"
        description="Manage user accounts and permissions"
      />
      <UsersTable
        users={users}
        currentUserId={currentUser.id}
        onUserUpdated={() => router.invalidate()}
      />
    </Container>
  );
}
