import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { getSessionToken } from "~/lib/auth";
import { Nav, NavLink, Button } from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const token = await getSessionToken();
    if (!token) {
      throw redirect({ to: "/login" });
    }
    return { token };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="min-h-screen bg-background">
      <Nav
        logo={
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <svg
                className="h-5 w-5 text-primary"
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
          <Button variant="ghost" size="sm" asChild>
            <a href="/login">Sign out</a>
          </Button>
        }
      >
        <NavLink href="/dashboard" active={pathname === "/dashboard"}>
          Dashboard
        </NavLink>
        <NavLink href="/people" active={pathname.startsWith("/people")}>
          People
        </NavLink>
        <NavLink href="/tree" active={pathname === "/tree"}>
          Tree
        </NavLink>
        <NavLink href="/activity" active={pathname === "/activity"}>
          Activity
        </NavLink>
        <NavLink href="/admin" active={pathname.startsWith("/admin")}>
          Admin
        </NavLink>
      </Nav>

      <main className="py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
