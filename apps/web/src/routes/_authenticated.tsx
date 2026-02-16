import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
// Note: Server-only modules are dynamically imported inside checkAuthInline
// to prevent them from leaking into the client bundle (react-dom/server, i18next-fs-backend)
import { Button, Nav, NavLink } from "@vamsa/ui";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { signOut } from "~/lib/auth-client";
import { LanguageSwitcher } from "~/components/layout/language-switcher";
import { OIDCProfileClaimModal } from "~/components/auth/oidc-profile-claim-modal";
import { RouteError } from "~/components/error";
import { CommandPalette } from "~/components/search/command-palette";
import { CommandPaletteTrigger } from "~/components/search/command-palette-trigger";
import { AIProvider } from "~/contexts/ai-context";
import { AIChatPanel } from "~/components/ai/chat-panel";

const BETTER_AUTH_COOKIE_NAME = "better-auth.session_token";

// Inline server function to check authentication
// This avoids the bundler circular dependency that occurs when importing from auth.functions.ts
// Uses dynamic import to prevent server-only modules from leaking into client bundle
const checkAuthInline = createServerFn({ method: "GET" }).handler(async () => {
  try {
    // Dynamic imports to keep server-only modules out of client bundle
    const { betterAuthGetSessionWithUserFromCookie } =
      await import("@vamsa/lib/server/business/auth-better-api");
    const { getCookie } = await import("@tanstack/react-start/server");

    const cookie = getCookie(BETTER_AUTH_COOKIE_NAME);
    const user = await betterAuthGetSessionWithUserFromCookie(
      cookie ? `${BETTER_AUTH_COOKIE_NAME}=${cookie}` : undefined
    );

    if (!user) {
      return { valid: false, user: null };
    }

    return { valid: true, user };
  } catch {
    return { valid: false, user: null };
  }
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location, context }) => {
    const result = await context.queryClient.ensureQueryData({
      queryKey: ["auth", "session"],
      queryFn: () => checkAuthInline(),
      staleTime: 1000 * 60 * 5, // 5 minutes — matches existing React Query default
    });

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
/**
 * Skip to main content link for keyboard accessibility.
 * Hidden by default, becomes visible on focus.
 */
function SkipToMainContent() {
  const { t } = useTranslation("navigation");
  return (
    <a
      href="#main-content"
      className="focus:bg-primary focus:text-primary-foreground focus:ring-primary sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:ring-2 focus:ring-offset-2 focus:outline-none"
    >
      {t("skipToMainContent")}
    </a>
  );
}

function AuthenticatedLayoutShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("navigation");
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    queryClient.removeQueries({ queryKey: ["auth", "session"] });
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div className="bg-background min-h-screen">
      <SkipToMainContent />
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
              {t("vamsa")}
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
              {t("signOut")}
            </Button>
          </div>
        }
      >
        <NavLink href="/dashboard" data-testid="nav-dashboard">
          {t("dashboard")}
        </NavLink>
        <NavLink href="/people" data-testid="nav-people">
          {t("people")}
        </NavLink>
        <NavLink href="/visualize" data-testid="nav-visualize">
          {t("visualizations")}
        </NavLink>
        <NavLink href="/maps" data-testid="nav-maps">
          {t("maps")}
        </NavLink>
        <NavLink href="/activity" data-testid="nav-activity">
          {t("activity")}
        </NavLink>
        <NavLink href="/subscribe" data-testid="nav-subscribe">
          {t("subscribe")}
        </NavLink>
        <NavLink href="/admin" data-testid="nav-admin">
          {t("admin")}
        </NavLink>
      </Nav>

      <main
        id="main-content"
        tabIndex={-1}
        className="py-6 outline-none sm:py-8"
      >
        {children}
      </main>
    </div>
  );
}

function AuthenticatedLayout() {
  const { t } = useTranslation("navigation");
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    queryClient.removeQueries({ queryKey: ["auth", "session"] });
    await signOut();
    window.location.href = "/login";
  };

  // Show profile claim modal for OIDC users with PENDING status
  const showProfileClaimModal =
    !!user?.oidcProvider && user?.profileClaimStatus === "PENDING";

  return (
    <AIProvider>
      <div className="bg-background min-h-screen">
        <SkipToMainContent />
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
                {t("vamsa")}
              </span>
            </a>
          }
          actions={
            <div className="flex items-center gap-3">
              <CommandPaletteTrigger />
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                data-testid="signout-button"
              >
                {t("signOut")}
              </Button>
            </div>
          }
        >
          <NavLink
            href="/dashboard"
            active={pathname === "/dashboard"}
            data-testid="nav-dashboard"
          >
            {t("dashboard")}
          </NavLink>
          <NavLink
            href="/people"
            active={pathname.startsWith("/people")}
            data-testid="nav-people"
          >
            {t("people")}
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
            {t("visualizations")}
          </NavLink>
          <NavLink
            href="/maps"
            active={pathname.startsWith("/maps")}
            data-testid="nav-maps"
          >
            {t("maps")}
          </NavLink>
          <NavLink
            href="/activity"
            active={pathname === "/activity"}
            data-testid="nav-activity"
          >
            {t("activity")}
          </NavLink>
          <NavLink
            href="/subscribe"
            active={pathname === "/subscribe"}
            data-testid="nav-subscribe"
          >
            {t("subscribe")}
          </NavLink>
          {user?.role === "ADMIN" && (
            <NavLink
              href="/admin"
              active={pathname.startsWith("/admin")}
              data-testid="nav-admin"
            >
              {t("admin")}
            </NavLink>
          )}
        </Nav>

        <main
          id="main-content"
          tabIndex={-1}
          className="py-6 outline-none sm:py-8"
        >
          <Outlet />
        </main>

        {/* OIDC Profile Claim Modal */}
        <OIDCProfileClaimModal open={showProfileClaimModal} />

        {/* Command Palette - Global Search */}
        <CommandPalette isAdmin={user?.role === "ADMIN"} />

        {/* AI Chat Panel - Only visible when AI is enabled */}
        <AIChatPanel />
      </div>
    </AIProvider>
  );
}
