import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { login } from "~/server/auth";
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

const searchSchema = z.object({
  registered: z.boolean().optional(),
  claimed: z.boolean().optional(),
  invited: z.boolean().optional(),
});

export const Route = createFileRoute("/login")({
  component: LoginComponent,
  validateSearch: searchSchema,
});

function LoginComponent() {
  const navigate = useNavigate();
  const { registered, claimed, invited } = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ data: { email, password } });
      navigate({ to: "/people" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
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

      {/* Login card */}
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
              Welcome back. Sign in to explore your family history.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            data-testid="login-form"
          >
            {registered && (
              <div
                className="border-primary/30 bg-primary/10 text-primary rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="login-success"
              >
                <div className="mb-1 font-semibold">Account created!</div>
                <div>Please sign in with your new credentials.</div>
              </div>
            )}

            {claimed && (
              <div
                className="border-primary/30 bg-primary/10 text-primary rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="login-claimed-success"
              >
                <div className="mb-1 font-semibold">Profile claimed!</div>
                <div>Please sign in with your new credentials.</div>
              </div>
            )}

            {invited && (
              <div
                className="border-primary/30 bg-primary/10 text-primary rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="login-invited-success"
              >
                <div className="mb-1 font-semibold">Invite accepted!</div>
                <div>Please sign in with your new credentials.</div>
              </div>
            )}

            {error && (
              <div
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="login-error"
              >
                <div className="mb-1 font-semibold">Error:</div>
                <div>{error}</div>
              </div>
            )}

            <div className="space-y-4">
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
                  data-testid="login-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full"
              data-testid="login-submit-button"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Don&apos;t have an account?{" "}
              </span>
              <Link
                to="/register"
                className="text-primary font-medium hover:underline"
              >
                Create one
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
