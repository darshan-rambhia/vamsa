import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 border-b pb-4">
        <h1 className="text-2xl font-bold text-foreground">Admin</h1>
        <nav className="flex space-x-4">
          <a
            href="/admin/users"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Users
          </a>
          <a
            href="/admin/suggestions"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Suggestions
          </a>
          <a
            href="/admin/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Settings
          </a>
          <a
            href="/admin/backup"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Backup
          </a>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
