/**
 * API Client Context
 *
 * Provides dependency injection of the API client to query hooks.
 * This allows hooks to be platform-agnostic and work with web, React Native, etc.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext } from "react";
import type { ApiClient } from "@vamsa/client";

const ApiClientContext = createContext<ApiClient | null>(null);

/**
 * Provider component for injecting API client into hooks
 *
 * @example
 * ```tsx
 * <ApiClientProvider client={client}>
 *   <YourApp />
 * </ApiClientProvider>
 * ```
 */
export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

/**
 * Hook to access the injected API client
 *
 * @throws Error if used outside of ApiClientProvider
 * @example
 * ```tsx
 * const client = useApiClient();
 * ```
 */
export function useApiClient(): any {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error(
      "useApiClient must be used within an ApiClientProvider. Make sure your app is wrapped with <ApiClientProvider client={client}> at a high level."
    );
  }
  return client;
}
