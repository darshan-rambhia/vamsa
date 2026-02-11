import {
  Link,
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useState } from "react";
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
import { PasswordStrengthIndicator } from "@vamsa/ui/primitives";
import { authClient } from "~/lib/auth-client";

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordComponent,
  validateSearch: searchSchema,
});

function ResetPasswordComponent() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/reset-password" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Client-side validation
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError(
        "Invalid or missing reset token. Please request a new password reset link."
      );
      setIsLoading(false);
      return;
    }

    try {
      const result = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (result.error) {
        const errorMessage = result.error.message || "Password reset failed";
        // Provide clearer error messages for common cases
        if (errorMessage.includes("token")) {
          setError(
            "Invalid or expired reset token. Please request a new password reset link."
          );
        } else {
          setError(errorMessage);
        }
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate({ to: "/login", search: { reset: true } });
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Password reset failed";
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

      {/* Reset password card */}
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
            <CardTitle className="text-3xl">Create New Password</CardTitle>
            <CardDescription className="mt-2 text-base">
              Enter a new password for your account.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            data-testid="reset-password-form"
          >
            {success && (
              <div
                className="border-primary/30 bg-primary/10 text-primary rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="reset-password-success"
              >
                <div className="mb-1 font-semibold">
                  Password reset successful!
                </div>
                <div>
                  Your password has been updated. Redirecting to login...
                </div>
              </div>
            )}

            {error && (
              <div
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="reset-password-error"
              >
                <div className="mb-1 font-semibold">Error:</div>
                <div>{error}</div>
              </div>
            )}

            {!success && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <FormField label="New Password" required>
                      <Input
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        data-testid="reset-password-new-input"
                      />
                    </FormField>
                    <PasswordStrengthIndicator password={newPassword} />
                  </div>

                  <FormField label="Confirm New Password" required>
                    <Input
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      data-testid="reset-password-confirm-input"
                    />
                  </FormField>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full"
                  data-testid="reset-password-submit-button"
                >
                  {isLoading ? "Resetting password..." : "Reset Password"}
                </Button>
              </>
            )}

            {success && (
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-primary font-medium hover:underline"
                >
                  Go to login
                </Link>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
