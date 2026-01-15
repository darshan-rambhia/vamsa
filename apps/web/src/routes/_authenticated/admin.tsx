import {
  createFileRoute,
  Outlet,
  Link,
  useLocation,
  redirect,
} from "@tanstack/react-router";
import { Container, PageHeader, Badge } from "@vamsa/ui";
import { cn } from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ location }) => {
    // Redirect /admin to /admin/settings as the default view
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      throw redirect({ to: "/admin/settings" });
    }
  },
  component: AdminLayout,
});

interface AdminNavItem {
  href: string;
  label: string;
  badge?: string;
}

const adminNavItems: AdminNavItem[] = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/suggestions", label: "Suggestions" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/backup", label: "Backup" },
  { href: "/admin/metrics", label: "Metrics", badge: "BETA" },
];

function AdminLayout() {
  const location = useLocation();

  return (
    <Container>
      <PageHeader
        title="Administration"
        description="Manage users, review suggestions, and configure system settings"
      />

      {/* Admin navigation tabs */}
      <nav className="border-border mb-8 flex gap-1 border-b-2">
        {adminNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors",
                "-mb-0.5 border-b-2 flex items-center gap-2",
                isActive
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground hover:border-border border-transparent"
              )}
            >
              {item.label}
              {item.badge && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </Container>
  );
}
