import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUnclaimedProfiles, claimProfile } from "~/server/auth.functions";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ThemeToggle,
} from "@vamsa/ui";

export const Route = createFileRoute("/claim-profile")({
  component: ClaimProfileComponent,
});

type UnclaimedProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

function ClaimProfileComponent() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<UnclaimedProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const result = await getUnclaimedProfiles();
        setProfiles(result);
      } catch (_err) {
        setError("Failed to load available profiles");
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    loadProfiles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await claimProfile({
        data: { email, personId: selectedPersonId, password },
      });
      navigate({ to: "/login", search: { claimed: true } });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to claim profile";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center px-4">
      {/* Theme toggle in corner */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      {/* Decorative background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-primary/5 absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full blur-3xl" />
        <div className="bg-secondary/5 absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full blur-3xl" />
      </div>

      {/* Claim Profile card */}
      <Card className="animate-fade-in relative w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          {/* Logo */}
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
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>

          <div>
            <CardTitle className="text-3xl">Vamsa</CardTitle>
            <CardDescription className="mt-2 text-base">
              Claim your existing profile to connect with your family.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            data-testid="claim-profile-form"
          >
            {error && (
              <div
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="claim-profile-error"
              >
                <div className="mb-1 font-semibold">Error:</div>
                <div>{error}</div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile">Select Your Profile</Label>
                {isLoadingProfiles ? (
                  <div className="text-muted-foreground flex h-10 items-center justify-center text-sm">
                    Loading profiles...
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
                    <p className="mb-2 font-semibold">
                      No unclaimed profiles available
                    </p>
                    <p>
                      All existing profiles have been claimed. Please contact
                      your family administrator.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={selectedPersonId}
                    onValueChange={setSelectedPersonId}
                    required
                    disabled={isLoading}
                  >
                    <SelectTrigger
                      id="profile"
                      data-testid="claim-profile-select"
                    >
                      <SelectValue placeholder="Choose your profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.firstName} {profile.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading || profiles.length === 0}
                  data-testid="claim-profile-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min 8 characters)"
                  disabled={isLoading || profiles.length === 0}
                  data-testid="claim-profile-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading || profiles.length === 0}
              className="w-full"
              data-testid="claim-profile-submit-button"
            >
              {isLoading ? "Claiming profile..." : "Claim Profile"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Already have an account?{" "}
              </span>
              <Link
                to="/login"
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
