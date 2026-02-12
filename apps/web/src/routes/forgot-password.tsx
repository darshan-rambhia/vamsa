import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordComponent,
});

function ForgotPasswordComponent() {
  const { t } = useTranslation(["auth", "common"]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Call Better Auth forget-password endpoint directly
      const response = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          redirectTo: "/reset-password",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        // Only show errors for unexpected issues, not for user enumeration
        setError(t("resetPasswordUnexpectedError"));
        setIsLoading(false);
        return;
      }

      // Always show success message for anti-enumeration
      setSuccess(true);
      setIsLoading(false);
    } catch (_err) {
      setError(t("resetPasswordUnexpectedError"));
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

      {/* Forgot password card */}
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
            <CardTitle className="text-3xl">{t("resetPassword")}</CardTitle>
            <CardDescription className="mt-2 text-base">
              {t("resetPasswordDescription")}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            data-testid="forgot-password-form"
          >
            {success && (
              <div
                className="border-primary/30 bg-primary/10 text-primary rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="forgot-password-success"
              >
                <div className="mb-1 font-semibold">{t("checkYourEmail")}</div>
                <div>{t("resetPasswordCheckEmail")}</div>
              </div>
            )}

            {error && (
              <div
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="forgot-password-error"
              >
                <div className="mb-1 font-semibold">{t("common:error")}:</div>
                <div>{error}</div>
              </div>
            )}

            {!success && (
              <>
                <FormField label={t("common:email")} required>
                  <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    data-testid="forgot-password-email-input"
                  />
                </FormField>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full"
                  data-testid="forgot-password-submit-button"
                >
                  {isLoading ? t("sending") : t("sendResetLink")}
                </Button>
              </>
            )}

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {t("rememberPassword")}{" "}
              </span>
              <Link
                to="/login"
                className="text-primary font-medium hover:underline"
              >
                {t("signIn")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
