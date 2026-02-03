/**
 * Vamsa API Client
 *
 * Type-safe API client for interacting with the Vamsa API.
 * Built on Hono RPC for compile-time type safety and excellent DX.
 *
 * @example
 * ```ts
 * import { createApiClient } from "@vamsa/client";
 *
 * const client = createApiClient("https://api.vamsa.app/api/v1", {
 *   headers: { Authorization: `Bearer ${token}` },
 * });
 *
 * // Type-safe API calls
 * const persons = await client.persons.$get();
 * const person = await client.persons[":id"].$get({ param: { id: "123" } });
 * ```
 */

export { createApiClient, type ApiClient } from "./api-client";
export * from "./types";
