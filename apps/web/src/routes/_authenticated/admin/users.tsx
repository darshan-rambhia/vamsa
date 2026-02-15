import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Card, CardContent, Container, PageHeader } from "@vamsa/ui";
import { useTranslation } from "react-i18next";
import { getUsers } from "~/server/users";
import { getCurrentUser } from "~/server/auth.functions";
import { UsersTable } from "~/components/admin/users-table";
import { AdminRouteError } from "~/components/admin/route-error";

export const Route = createFileRoute("/_authenticated/admin/users")({
  loader: async () => {
    const [usersData, currentUser] = await Promise.all([
      getUsers({ data: {} }),
      getCurrentUser(),
    ]);
    return { users: usersData.items, currentUser };
  },
  component: UsersPage,
  errorComponent: AdminRouteError,
});

function UsersPage() {
  const { t } = useTranslation(["admin", "common"]);
  const { users, currentUser } = Route.useLoaderData();
  const router = useRouter();

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
        title={t("admin:usersTitle")}
        description={t("admin:usersTitle")}
      />
      <UsersTable
        users={users}
        currentUserId={currentUser.id}
        onUserUpdated={() => router.invalidate()}
      />
    </Container>
  );
}
