import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionToken } from "~/lib/auth";

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
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <span className="text-xl font-bold text-foreground">Vamsa</span>
              <div className="ml-10 flex items-baseline space-x-4">
                <a
                  href="/people"
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  People
                </a>
                <a
                  href="/tree"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  Tree
                </a>
                <a
                  href="/admin"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  Admin
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
