import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSessionToken } from "~/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const token = await getSessionToken();
    if (token) {
      throw redirect({ to: "/dashboard" });
    }
    throw redirect({ to: "/login" });
  },
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecting...</p>
    </div>
  );
}
