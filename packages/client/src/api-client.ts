import { hc } from "hono/client";
import type { AppType } from "../../../apps/web/server/api";

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Create a type-safe API client using Hono RPC
 *
 * @param baseUrl - Base URL for API (e.g., "https://api.vamsa.app/api/v1")
 * @param options - Fetch options (headers, credentials, etc.)
 *
 * @example
 * ```ts
 * const client = createApiClient("https://api.vamsa.app/api/v1", {
 *   headers: { Authorization: `Bearer ${token}` },
 * });
 * const persons = await client.persons.$get();
 * ```
 */
export function createApiClient(
  baseUrl: string,
  options?: RequestInit
): ReturnType<typeof hc<AppType>> {
  return hc<AppType>(baseUrl, {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...options,
        ...init,
        headers: {
          ...options?.headers,
          ...init?.headers,
        },
      }),
  });
}
