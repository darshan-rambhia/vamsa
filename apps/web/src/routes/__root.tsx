/// <reference types="vite/client" />
import { useState } from "react";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "~/i18n/config";
import appCss from "~/styles.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-4xl">404 - Page Not Found</h1>
      <p className="text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link to="/" className="text-primary hover:underline">
        Go back home
      </Link>
    </div>
  );
}

function RootErrorComponent({ error, reset }: ErrorComponentProps) {
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();
  const isDev = import.meta.env.DEV;

  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred";
  const errorStack = error instanceof Error ? error.stack : undefined;

  const handleRetry = () => {
    reset();
    router.invalidate();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <div className="bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <svg
            className="text-destructive h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          We encountered an unexpected error. Please try again or return to the
          home page.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRetry}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          Try Again
        </button>
        <Link
          to="/"
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md border px-4 py-2 text-sm font-medium transition-colors"
        >
          Go Home
        </Link>
      </div>

      {isDev && (
        <div className="w-full max-w-2xl">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            {showDetails ? "Hide" : "Show"} technical details
          </button>

          {showDetails && (
            <div className="bg-muted/50 mt-3 overflow-auto rounded-lg border p-4">
              <p className="text-destructive mb-2 font-mono text-sm font-medium">
                {errorMessage}
              </p>
              {errorStack && (
                <pre className="text-muted-foreground overflow-x-auto font-mono text-xs whitespace-pre-wrap">
                  {errorStack}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Vamsa - Family Tree",
      },
      {
        name: "description",
        content: "Preserve and explore your family history",
      },
    ],
    links: [
      // Google Fonts - Preconnect for performance
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      // Fonts: Fraunces (display), Source Sans 3 (body), JetBrains Mono (mono)
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=JetBrains+Mono:wght@400;500&family=Source+Sans+3:wght@400;500;600;700&display=swap",
      },
      // App styles
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

// Static dark mode initialization script - safe hardcoded string, no XSS risk
const DARK_MODE_SCRIPT = `(function(){var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(s==='dark'||(!s&&p)){document.documentElement.classList.add('dark')}})()`;

function RootDocument({ children }: { children: React.ReactNode }) {
  // Get current language from i18n (defaults to 'en')
  const currentLang = i18n.language || "en";
  // Determine text direction (ltr for English and Hindi, rtl for future languages like Arabic)
  const dir = currentLang === "ar" ? "rtl" : "ltr";

  return (
    <html lang={currentLang} dir={dir} suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Prevent dark mode flash - static script with hardcoded content, no user input */}
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_SCRIPT }} />
      </head>
      <body className="font-body antialiased">
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
