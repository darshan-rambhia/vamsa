import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSession } from "~/lib/auth-client";

export const Route = createFileRoute("/")({
  // No beforeLoad to avoid server function initialization issues
  component: IndexComponent,
});

/**
 * Index page that redirects based on auth status.
 * Uses client-side auth check to avoid server function bundler issues.
 */
function IndexComponent() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        navigate({ to: "/visualize", replace: true });
      } else {
        navigate({ to: "/login", replace: true });
      }
    }
  }, [session, isPending, navigate]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    </div>
  );
}
