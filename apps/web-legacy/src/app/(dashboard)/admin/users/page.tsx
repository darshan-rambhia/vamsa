import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUsers } from "@/actions/user";
import { UsersTable } from "@/components/admin/users-table";

export default async function UsersPage() {
  const session = await getSession();

  if (session?.user?.role !== "ADMIN") {
    redirect("/tree");
  }

  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
