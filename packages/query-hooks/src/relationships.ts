/**
 * Relationship Query Hooks
 *
 * Provides reusable TanStack Query hooks for relationship-related data.
 * Platform-agnostic: works with web, React Native, etc.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "./context";
import { relationshipKeys } from "./keys";
import type { CursorPaginatedResponse } from "@vamsa/schemas";

/**
 * Relationship response type from API
 */
export interface RelationshipResponse {
  id: string;
  personId: string;
  relatedPersonId: string;
  type: "PARENT" | "CHILD" | "SPOUSE" | "SIBLING";
  marriageDate?: string | null;
  divorceDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Filters for listing relationships
 */
export interface RelationshipFilters extends Record<string, unknown> {
  personId?: string;
  type?: "PARENT" | "CHILD" | "SPOUSE" | "SIBLING";
  cursor?: string;
  limit?: number;
}

/**
 * Hook to list relationships with optional filtering
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useRelationships({ personId: "person_123" });
 * ```
 */
export function useRelationships(filters?: RelationshipFilters) {
  const client = useApiClient();

  return useQuery({
    queryKey: relationshipKeys.list(filters),
    queryFn: async () => {
      const response = await client.relationships.$get({
        query: filters,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch relationships: ${response.status}`);
      }

      return response.json() as Promise<
        CursorPaginatedResponse<RelationshipResponse>
      >;
    },
  });
}

/**
 * Input for creating a relationship
 */
export interface CreateRelationshipInput {
  personId: string;
  relatedPersonId: string;
  type: "PARENT" | "CHILD" | "SPOUSE" | "SIBLING";
  marriageDate?: string | null;
  divorceDate?: string | null;
}

/**
 * Hook to create a new relationship
 *
 * @example
 * ```tsx
 * const createMutation = useCreateRelationship();
 *
 * const handleCreate = async () => {
 *   await createMutation.mutateAsync({
 *     personId: "person_123",
 *     relatedPersonId: "person_456",
 *     type: "PARENT",
 *   });
 * };
 * ```
 */
export function useCreateRelationship() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRelationshipInput) => {
      const response = await client.relationships.$post({
        json: data,
      });

      if (!response.ok) {
        throw new Error(`Failed to create relationship: ${response.status}`);
      }

      return response.json() as Promise<RelationshipResponse>;
    },
    onSuccess: () => {
      // Invalidate relationship lists to refetch
      queryClient.invalidateQueries({ queryKey: relationshipKeys.lists() });
    },
  });
}

/**
 * Input for updating a relationship
 */
export interface UpdateRelationshipInput {
  marriageDate?: string | null;
  divorceDate?: string | null;
}

/**
 * Hook to update a relationship
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateRelationship("rel_123");
 *
 * const handleUpdate = async () => {
 *   await updateMutation.mutateAsync({
 *     marriageDate: "2010-06-15",
 *   });
 * };
 * ```
 */
export function useUpdateRelationship(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRelationshipInput) => {
      const response = await client.relationships[":id"].$patch({
        param: { id },
        json: data,
      });

      if (!response.ok) {
        throw new Error(`Failed to update relationship: ${response.status}`);
      }

      return response.json() as Promise<RelationshipResponse>;
    },
    onSuccess: () => {
      // Invalidate relationship lists to refetch
      queryClient.invalidateQueries({ queryKey: relationshipKeys.lists() });
    },
  });
}

/**
 * Hook to delete a relationship
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteRelationship("rel_123");
 *
 * const handleDelete = async () => {
 *   await deleteMutation.mutateAsync();
 * };
 * ```
 */
export function useDeleteRelationship(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.relationships[":id"].$delete({
        param: { id },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete relationship: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relationship lists to refetch
      queryClient.invalidateQueries({ queryKey: relationshipKeys.lists() });
    },
  });
}
