import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { validateSession } from "~/server/auth.functions";
import { signOut } from "~/lib/auth-client";
import { Nav, NavLink, Button } from "@vamsa/ui";
import { LanguageSwitcher } from "~/components/layout/language-switcher";
import { OIDCProfileClaimModal } from "~/components/auth/oidc-profile-claim-modal";
import { RouteError } from "~/components/error";
import { CommandPalette } from "~/components/search/command-palette";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const result = await validateSession();
    if (!result.valid) {
      throw redirect({ to: "/login" });
    }

    // Redirect users who must change password to the change-password page
    // unless they're already on that page
    if (
      result.user?.mustChangePassword &&
      location.pathname !== "/change-password"
    ) {
      throw redirect({ to: "/change-password" });
    }

    return { user: result.user };
  },
  component: AuthenticatedLayout,
  errorComponent: AuthenticatedErrorComponent,
});

/**
 * Error component for authenticated routes that preserves the navigation.
 * This catches errors in child routes and displays them within the layout.
 */
function AuthenticatedErrorComponent(props: ErrorComponentProps) {
  return (
    <AuthenticatedLayoutShell>
      <RouteError {...props} />
    </AuthenticatedLayoutShell>
  );
}

/**
 * Shared layout shell for the authenticated area.
 * Used by both the main layout and the error component.
 */
function AuthenticatedLayoutShell({ children }: { children: React.ReactNode }) {
  const handleSignOut = async () => {
    await signOut();
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
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              data-testid="signout-button"
            >
              Sign out
            </Button>
          </div>
        }
      >
        <NavLink href="/dashboard" data-testid="nav-dashboard">
          Dashboard
        </NavLink>
        <NavLink href="/people" data-testid="nav-people">
          People
        </NavLink>
        <NavLink href="/visualize" data-testid="nav-visualize">
          Visualizations
        </NavLink>
        <NavLink href="/maps" data-testid="nav-maps">
          Maps
        </NavLink>
        <NavLink href="/activity" data-testid="nav-activity">
          Activity
        </NavLink>
        <NavLink href="/subscribe" data-testid="nav-subscribe">
          Subscribe
        </NavLink>
        <NavLink href="/admin" data-testid="nav-admin">
          Admin
        </NavLink>
      </Nav>

      <main className="py-6 sm:py-8">{children}</main>
    </div>
  );
}

function AuthenticatedLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = Route.useRouteContext();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  // Show profile claim modal for OIDC users with PENDING status
  const showProfileClaimModal =
    !!user?.oidcProvider && user?.profileClaimStatus === "PENDING";

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
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              data-testid="signout-button"
            >
              Sign out
            </Button>
          </div>
        }
      >
        <NavLink
          href="/dashboard"
          active={pathname === "/dashboard"}
          data-testid="nav-dashboard"
        >
          Dashboard
        </NavLink>
        <NavLink
          href="/people"
          active={pathname.startsWith("/people")}
          data-testid="nav-people"
        >
          People
        </NavLink>
        <NavLink
          href="/visualize"
          active={
            pathname === "/visualize" ||
            pathname === "/tree" ||
            pathname.startsWith("/charts")
          }
          data-testid="nav-visualize"
        >
          Visualizations
        </NavLink>
        <NavLink
          href="/maps"
          active={pathname.startsWith("/maps")}
          data-testid="nav-maps"
        >
          Maps
        </NavLink>
        <NavLink
          href="/activity"
          active={pathname === "/activity"}
          data-testid="nav-activity"
        >
          Activity
        </NavLink>
        <NavLink
          href="/subscribe"
          active={pathname === "/subscribe"}
          data-testid="nav-subscribe"
        >
          Subscribe
        </NavLink>
        {user?.role === "ADMIN" && (
          <NavLink
            href="/admin"
            active={pathname.startsWith("/admin")}
            data-testid="nav-admin"
          >
            Admin
          </NavLink>
        )}
      </Nav>

      <main className="py-6 sm:py-8">
        <Outlet />
      </main>

      {/* OIDC Profile Claim Modal */}
      <OIDCProfileClaimModal open={showProfileClaimModal} />

      {/* Command Palette - Global Search */}
      <CommandPalette />
    </div>
  );
}
