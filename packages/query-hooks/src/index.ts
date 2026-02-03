/**
 * Vamsa Query Hooks
 *
 * Shared TanStack Query hooks for reuse across web and mobile applications.
 * Provides platform-agnostic access to API data through dependency-injected clients.
 *
 * @example
 * ```tsx
 * import { createApiClient } from "@vamsa/client";
 * import { ApiClientProvider, usePersons } from "@vamsa/query-hooks";
 *
 * const client = createApiClient("https://api.vamsa.app/api/v1");
 *
 * function App() {
 *   return (
 *     <ApiClientProvider client={client}>
 *       <MyApp />
 *     </ApiClientProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { data, isLoading } = usePersons({ limit: 20 });
 *   return <div>{isLoading ? "Loading..." : "Loaded"}</div>;
 * }
 * ```
 */

// Context and providers
export { ApiClientProvider, useApiClient } from "./context";

// Query key factories
export { personKeys, relationshipKeys, userKeys, authKeys } from "./keys";

// Person hooks
export {
  usePersons,
  usePerson,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
  type PersonResponse,
  type PersonFilters,
  type CreatePersonInput,
  type UpdatePersonInput,
} from "./persons";

// Relationship hooks
export {
  useRelationships,
  useCreateRelationship,
  useUpdateRelationship,
  useDeleteRelationship,
  type RelationshipResponse,
  type RelationshipFilters,
  type CreateRelationshipInput,
  type UpdateRelationshipInput,
} from "./relationships";
