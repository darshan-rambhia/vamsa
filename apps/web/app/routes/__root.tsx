import {
  Outlet,
  ScrollRestoration,
  createRootRoute,
} from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/start";
import { ConvexProvider } from "convex/react";
import { convex } from "~/lib/convex";
import appCss from "~/styles.css?url";

export const Route = createRootRoute({
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

// Static dark mode initialization script - safe, no user input
const DARK_MODE_SCRIPT = `(function(){var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(s==='dark'||(!s&&p)){document.documentElement.classList.add('dark')}})()`;

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Meta />
        {/* Prevent dark mode flash - static script, no XSS risk */}
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_SCRIPT }} />
      </head>
      <body className="font-body antialiased">
        <ConvexProvider client={convex}>{children}</ConvexProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
