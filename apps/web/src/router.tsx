import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { DefaultRouteError } from "./components/module-load-error";
import { getCspNonce } from "./server/csp-nonce";

/**
 * Per-request CSP nonce for TanStack's inline hydration scripts and React's
 * streaming scripts. On the server it reads Hono's nonce; the client has none.
 */
const getSsrNonce = createIsomorphicFn()
  .server(() => getCspNonce())
  .client(() => undefined);

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultErrorComponent: DefaultRouteError,
    scrollRestoration: true,
    ssr: { nonce: getSsrNonce() },
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
