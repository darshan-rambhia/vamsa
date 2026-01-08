import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Container, PageHeader } from "@vamsa/ui";
import { cn } from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const adminNavItems = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/suggestions", label: "Suggestions" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/backup", label: "Backup" },
];

function AdminLayout() {
  const location = useLocation();

  return (
    <Container>
      <PageHeader
        title="Administration"
        subtitle="Manage users, review suggestions, and configure system settings"
      />

      {/* Admin navigation tabs */}
      <nav className="mb-8 flex gap-1 border-b-2 border-border">
        {adminNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors",
                "border-b-2 -mb-[2px]",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </Container>
  );
}
