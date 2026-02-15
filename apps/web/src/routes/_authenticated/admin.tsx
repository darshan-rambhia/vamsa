import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { Badge, Container, PageHeader, cn } from "@vamsa/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ location, context }) => {
    // Security: Verify user has admin role
    // The parent _authenticated route provides user in context
    const user = context?.user as { role?: string } | undefined;
    if (!user || user.role !== "ADMIN") {
      // Redirect non-admin users to dashboard
      throw redirect({ to: "/dashboard" });
    }

    // Redirect /admin to /admin/settings as the default view
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      throw redirect({ to: "/admin/settings" });
    }
  },
  component: AdminLayout,
});

interface AdminNavItem {
  href: string;
  labelKey: string;
  badge?: string;
}

function AdminLayout() {
  const { t } = useTranslation(["admin", "common"]);
  const location = useLocation();

  const adminNavItems: Array<AdminNavItem> = [
    { href: "/admin/users", labelKey: "users" },
    { href: "/admin/invites", labelKey: "invites" },
    { href: "/admin/suggestions", labelKey: "suggestions" },
    { href: "/admin/settings", labelKey: "settings" },
    { href: "/admin/backup", labelKey: "backup" },
    { href: "/admin/metrics", labelKey: "metrics", badge: "BETA" },
  ];

  return (
    <Container>
      <PageHeader
        title={t("admin:title")}
        description={t("admin:description")}
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
                "-mb-0.5 flex items-center gap-2 border-b-2",
                isActive
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground hover:border-border border-transparent"
              )}
            >
              {t(`admin:${item.labelKey}`)}
              {item.badge && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
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
