import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "~/server/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await getSession();
    if (user) {
      throw redirect({ to: "/visualize" });
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
