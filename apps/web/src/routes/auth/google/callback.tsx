import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { handleGoogleCallback } from "~/server/auth-oidc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vamsa/ui";

const searchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/auth/google/callback")({
  component: GoogleCallbackComponent,
  validateSearch: searchSchema,
});

function GoogleCallbackComponent() {
  const navigate = useNavigate();
  const {
    code,
    state,
    error: oauthError,
    error_description,
  } = useSearch({
    from: "/auth/google/callback",
  });
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    async function processCallback() {
      // Handle OAuth errors from provider
      if (oauthError) {
        setError(
          error_description ||
            oauthError ||
            "Authentication was cancelled or failed"
        );
        setIsProcessing(false);
        return;
      }

      if (!code || !state) {
        setError("Missing authentication parameters");
        setIsProcessing(false);
        return;
      }

      try {
        const result = await handleGoogleCallback({ data: { code, state } });

        if (result.success) {
          // Redirect to the intended destination or dashboard
          navigate({ to: result.redirectTo || "/dashboard" });
          return;
        }

        setError("Authentication failed");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        setIsProcessing(false);
      }
    }

    processCallback();
  }, [code, state, oauthError, error_description, navigate]);

  if (error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
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
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <CardTitle>Authentication Failed</CardTitle>
            <CardDescription className="mt-2">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <button
              onClick={() => navigate({ to: "/login" })}
              className="text-primary hover:underline"
            >
              Return to login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-primary h-8 w-8 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <CardTitle>Signing you in...</CardTitle>
            <CardDescription className="mt-2">
              Please wait while we complete your Google sign-in.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return null;
}
