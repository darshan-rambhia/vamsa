import {
  Link,
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  ThemeToggle,
} from "@vamsa/ui";
import { signIn } from "~/lib/auth-client";
import { SSOButtons } from "~/components/auth/sso-buttons";

const searchSchema = z.object({
  registered: z.boolean().optional(),
  claimed: z.boolean().optional(),
  invited: z.boolean().optional(),
  verify: z.boolean().optional(),
  reset: z.boolean().optional(),
});

export const Route = createFileRoute("/login")({
  component: LoginComponent,
  validateSearch: searchSchema,
});

function LoginComponent() {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const { registered, claimed, invited, verify, reset } = useSearch({
    from: "/login",
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Login failed");
        setIsLoading(false);
        return;
      }
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
      <Card
        className="animate-fade-in relative w-full max-w-md"
        id="main-content"
      >
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
              {t("welcomeBack")}
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
                <div className="mb-1 font-semibold">{t("accountCreated")}</div>
                <div>{t("signInWithNewCredentials")}</div>
              </div>
            )}

            {claimed && (
              <div
                className="border-primary/30 bg-primary/10 text-primary rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="login-claimed-success"
              >
                <div className="mb-1 font-semibold">{t("profileClaimed")}</div>
                <div>{t("signInWithNewCredentials")}</div>
              </div>
            )}

            {invited && (
              <div
                className="border-primary/30 bg-primary/10 text-primary rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="login-invited-success"
              >
                <div className="mb-1 font-semibold">{t("inviteAccepted")}</div>
                <div>{t("signInWithNewCredentials")}</div>
              </div>
            )}

            {verify && (
              <div
                className="rounded-lg border-2 border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-200"
                data-testid="login-verify-email"
              >
                <div className="mb-1 font-semibold">{t("checkYourEmail")}</div>
                <div>{t("emailVerificationSent")}</div>
              </div>
            )}

            {reset && (
              <div
                className="border-primary/30 bg-primary/10 text-primary rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="login-reset-success"
              >
                <div className="mb-1 font-semibold">
                  {t("passwordResetSuccess")}
                </div>
                <div>{t("signInWithNewPassword")}</div>
              </div>
            )}

            {error && (
              <div
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="login-error"
              >
                <div className="mb-1 font-semibold">{t("common:error")}:</div>
                <div>{error}</div>
              </div>
            )}

            {/* Dev credentials hint - check .env for ADMIN_EMAIL/ADMIN_PASSWORD */}
            {import.meta.env.DEV && (
              <div className="bg-muted/50 border-muted-foreground/20 rounded-lg border px-4 py-3 text-xs">
                <div className="text-muted-foreground">
                  Dev mode: Check <code className="font-mono">.env</code> for{" "}
                  <code className="font-mono">ADMIN_EMAIL</code> /{" "}
                  <code className="font-mono">ADMIN_PASSWORD</code>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <FormField label={t("common:email")} required>
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="login-email-input"
                />
              </FormField>

              <div className="space-y-2">
                <FormField label={t("common:password")} required>
                  <Input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    data-testid="login-password-input"
                  />
                </FormField>
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-primary text-sm hover:underline"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full"
              data-testid="login-submit-button"
            >
              {isLoading ? t("signingIn") : t("signIn")}
            </Button>

            {/* SSO Buttons */}
            <SSOButtons redirectTo="/people" disabled={isLoading} />

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {t("dontHaveAccount")}{" "}
              </span>
              <Link
                to="/register"
                className="text-primary font-medium hover:underline"
              >
                {t("createOne")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
