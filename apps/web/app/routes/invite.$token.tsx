import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@vamsa/api/convex/_generated/api";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
} from "@vamsa/ui";
import { setSessionToken } from "~/lib/auth";

export const Route = createFileRoute("/invite/$token")({
  component: InviteAcceptPage,
});

function InviteAcceptPage() {
  const { token: inviteToken } = Route.useParams();
  const navigate = useNavigate();

  const invite = useQuery(api.invites.getByToken, { inviteToken });
  const acceptInvite = useMutation(api.invites.accept);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await acceptInvite({
        inviteToken,
        name,
        password,
      });

      // Set session token and redirect to dashboard
      await setSessionToken({ data: { token: result.token } });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (invite === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-8 w-48 rounded bg-muted mx-auto" />
          <div className="h-4 w-64 rounded bg-muted mx-auto" />
        </div>
      </div>
    );
  }

  // Invalid or not found
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <svg
                className="h-8 w-8 text-destructive"
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
            <h2 className="text-xl font-semibold">Invalid Invite</h2>
            <p className="mt-2 text-muted-foreground">
              This invite link is invalid or has already been used.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/login" })}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired
  if (invite.status === "EXPIRED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Invite Expired</h2>
            <p className="mt-2 text-muted-foreground">
              This invite link has expired. Please contact the person who invited you
              for a new invite.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/login" })}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already accepted or revoked
  if (invite.status !== "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Invite Unavailable</h2>
            <p className="mt-2 text-muted-foreground">
              This invite is no longer available.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/login" })}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid pending invite - show acceptance form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-8 w-8 text-primary"
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
          <CardTitle>Welcome to the Family!</CardTitle>
          <CardDescription>
            You've been invited to join the family tree
            {invite.person && (
              <span className="block mt-1 font-medium text-foreground">
                as {invite.person.firstName} {invite.person.lastName}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                Creating account for:{" "}
                <span className="font-medium text-foreground">{invite.email}</span>
              </p>
              <p className="text-muted-foreground mt-1">
                Role:{" "}
                <span className="font-medium text-foreground">
                  {invite.role.charAt(0) + invite.role.slice(1).toLowerCase()}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={!name || !password || !confirmPassword || isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Accept Invite & Join"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
