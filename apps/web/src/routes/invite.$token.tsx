import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ThemeToggle,
} from "@vamsa/ui";
import { PasswordStrengthIndicator } from "@vamsa/ui/primitives";
import { acceptInvite, getInviteByToken } from "~/server/invites";

export const Route = createFileRoute("/invite/$token")({
  loader: async ({ params }) => {
    const result = await getInviteByToken({ data: { token: params.token } });
    return result;
  },
  component: InviteAcceptPage,
});

function InviteAcceptPage() {
  const { token } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    setIsLoading(true);

    try {
      await acceptInvite({ data: { token, name, password } });
      navigate({ to: "/login", search: { invited: true } });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to accept invite";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Invalid invite
  if (!loaderData.valid || !loaderData.invite) {
    return (
      <div className="bg-background relative flex min-h-screen flex-col items-center justify-center px-4">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-destructive h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold">Invalid Invite</h2>
            <p className="text-muted-foreground mb-6">
              {loaderData.error || "This invite link is not valid."}
            </p>
            <Button onClick={() => navigate({ to: "/login" })}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invite } = loaderData;

  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center px-4">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      {/* Decorative background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-primary/5 absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full blur-3xl" />
        <div className="bg-secondary/5 absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full blur-3xl" />
      </div>

      <Card className="animate-fade-in relative w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="text-primary h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          </div>

          <div>
            <CardTitle className="text-3xl">Join Vamsa</CardTitle>
            <CardDescription className="mt-2 text-base">
              You have been invited to join the family tree
              {invite.person && (
                <>
                  {" "}
                  as{" "}
                  <span className="font-medium">
                    {invite.person.firstName} {invite.person.lastName}
                  </span>
                </>
              )}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            data-testid="invite-accept-form"
          >
            {error && (
              <div
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="invite-accept-error"
              >
                {error}
              </div>
            )}

            <div className="rounded-lg border-2 border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              <p className="font-medium">Invite Details</p>
              <p className="mt-1">Email: {invite.email}</p>
              <p>Role: {invite.role}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  data-testid="invite-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  data-testid="invite-password-input"
                />
                <PasswordStrengthIndicator password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  data-testid="invite-confirm-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full"
              data-testid="invite-accept-submit"
            >
              {isLoading ? "Creating account..." : "Accept Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
