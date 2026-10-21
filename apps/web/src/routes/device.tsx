import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ThemeToggle } from "@vamsa/ui";
import { getCurrentUser } from "~/server/auth.functions";
import { decideDeviceRequest, getDeviceRequest } from "~/server/device";
import { DeviceApproval } from "~/components/auth/device-approval";

const searchSchema = z.object({
  user_code: z.string().max(32).optional(),
});

/**
 * /device: approve a `vamsa login` from the browser (RFC 8628 verification
 * page). Signed-out visitors go through the normal login (password or SSO)
 * and come back here with the code intact.
 */
export const Route = createFileRoute("/device")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      const back = search.user_code
        ? `/device?user_code=${encodeURIComponent(search.user_code)}`
        : "/device";
      throw redirect({ to: "/login", search: { redirect: back } });
    }
    return { email: user.email };
  },
  component: DevicePage,
});

function DevicePage() {
  const { user_code } = Route.useSearch();
  const { email } = Route.useRouteContext();
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center px-4">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-primary/5 absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full blur-3xl" />
        <div className="bg-secondary/5 absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full blur-3xl" />
      </div>
      <DeviceApproval
        initialCode={user_code}
        email={email}
        load={(userCode) => getDeviceRequest({ data: { userCode } })}
        decide={(userCode, approve) =>
          decideDeviceRequest({ data: { userCode, approve } })
        }
      />
    </div>
  );
}
