import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { validateSession, logout } from "~/server/auth";
import { Nav, NavLink, Button } from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const result = await validateSession();
    if (!result.valid) {
      throw redirect({ to: "/login" });
    }
    return { user: result.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = Route.useRouteContext();

  const handleSignOut = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="bg-background min-h-screen">
      <Nav
        data-testid="main-nav"
        logo={
          <a href="/" className="flex items-center gap-3" data-testid="logo">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <svg
                className="text-primary h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
            </div>
            <span className="font-display text-xl font-medium tracking-tight">
              Vamsa
            </span>
          </a>
        }
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            data-testid="signout-button"
          >
            Sign out
          </Button>
        }
      >
        <NavLink href="/dashboard" active={pathname === "/dashboard"} data-testid="nav-dashboard">
          Dashboard
        </NavLink>
        <NavLink href="/people" active={pathname.startsWith("/people")} data-testid="nav-people">
          People
        </NavLink>
        <NavLink href="/tree" active={pathname === "/tree"} data-testid="nav-tree">
          Tree
        </NavLink>
        <NavLink href="/activity" active={pathname === "/activity"} data-testid="nav-activity">
          Activity
        </NavLink>
        {user?.role === "ADMIN" && (
          <NavLink href="/admin" active={pathname.startsWith("/admin")} data-testid="nav-admin">
            Admin
          </NavLink>
        )}
      </Nav>

      <main className="py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
