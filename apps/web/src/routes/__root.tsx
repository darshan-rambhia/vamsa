/// <reference types="vite/client" />
import { useLayoutEffect, useState } from "react";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Home,
  RefreshCw,
  Search,
} from "lucide-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import i18n from "~/i18n/config";
import appCss from "~/styles.css?url";
import printCss from "~/styles/print.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

/**
 * 404 Not Found page - themed to match the app
 */
function NotFound() {
  return (
    <div className="bg-background min-h-screen">
      {/* Minimal header */}
      <header className="border-border/50 border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <svg
                className="text-primary h-5 w-5"
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
            <span className="font-display text-xl font-medium tracking-tight">
              Vamsa
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-col items-center justify-center px-4 py-24 sm:py-32">
        <div className="text-center">
          {/* Decorative 404 */}
          <p className="font-display text-primary/20 text-[120px] leading-none font-bold sm:text-[180px]">
            404
          </p>

          <h1 className="font-display -mt-8 text-2xl font-semibold sm:text-3xl">
            Page not found
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md text-base">
            The page you&apos;re looking for doesn&apos;t exist or may have been
            moved. Check the URL or navigate back home.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-colors"
            >
              <Home className="h-4 w-4" />
              Go to Homepage
            </Link>
            <Link
              to="/people"
              className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-sm font-medium transition-colors"
            >
              <Search className="h-4 w-4" />
              Search People
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Root error component - shown when an unhandled error occurs.
 * This is the last resort error page when errors bubble up to the root.
 */
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
    <div className="bg-background min-h-screen">
      {/* Minimal header */}
      <header className="border-border/50 border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <svg
                className="text-primary h-5 w-5"
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
            <span className="font-display text-xl font-medium tracking-tight">
              Vamsa
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-lg">
          {/* Error card */}
          <div className="border-destructive/20 bg-card rounded-xl border-2 p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="bg-destructive/10 mb-5 flex h-16 w-16 items-center justify-center rounded-full">
                <AlertTriangle className="text-destructive h-8 w-8" />
              </div>

              <h1 className="font-display text-2xl font-semibold">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mt-2 max-w-sm">
                We encountered an unexpected error. Please try again or return
                to the home page.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleRetry}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                <Link
                  to="/"
                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </div>
            </div>

            {isDev && (
              <div className="mt-8 border-t pt-6">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1 text-sm"
                >
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {showDetails ? "Hide" : "Show"} technical details
                </button>

                {showDetails && (
                  <div className="bg-muted/50 mt-4 overflow-auto rounded-lg border p-4">
                    <p className="text-destructive mb-2 font-mono text-sm font-medium break-all">
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

          {/* Help text */}
          <p className="text-muted-foreground mt-6 text-center text-sm">
            If this problem persists, please{" "}
            <a
              href="https://github.com/anthropics/claude-code/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              report an issue
            </a>
            .
          </p>
        </div>
      </main>
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
      // Print styles
      {
        rel: "stylesheet",
        href: printCss,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  useLayoutEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

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
        {/* Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Skip to main content
        </a>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
