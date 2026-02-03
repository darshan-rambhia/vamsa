/**
 * Person Query Hooks
 *
 * Provides reusable TanStack Query hooks for person-related data.
 * Platform-agnostic: works with web, React Native, etc.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "./context";
import { personKeys } from "./keys";
import type { CursorPaginatedResponse } from "@vamsa/schemas";

/**
 * Person response type from API
 */
export interface PersonResponse {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string | null;
  dateOfBirth?: string | null;
  dateOfPassing?: string | null;
  birthPlace?: string | null;
  gender?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  profession?: string | null;
  isLiving: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Filters for listing persons
 */
export interface PersonFilters extends Record<string, unknown> {
  cursor?: string;
  limit?: number;
  search?: string;
  sortBy?: "lastName" | "firstName" | "dateOfBirth" | "createdAt";
  sortOrder?: "asc" | "desc";
  isLiving?: boolean;
}

/**
 * Hook to list all persons with optional filtering
 *
 * @example
 * ```tsx
 * const { data, isLoading } = usePersons({ limit: 20, search: "John" });
 * ```
 */
export function usePersons(filters?: PersonFilters) {
  const client = useApiClient();

  return useQuery({
    queryKey: personKeys.list(filters),
    queryFn: async () => {
      const response = await client.persons.$get({
        query: filters,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch persons: ${response.status}`);
      }

      return response.json() as Promise<
        CursorPaginatedResponse<PersonResponse>
      >;
    },
  });
}

/**
 * Hook to get a single person by ID
 *
 * @param id - Person ID
 *
 * @example
 * ```tsx
 * const { data, isLoading } = usePerson("person_123");
 * ```
 */
export function usePerson(id: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: personKeys.detail(id),
    queryFn: async () => {
      const response = await client.persons[":id"].$get({
        param: { id },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch person: ${response.status}`);
      }

      return response.json() as Promise<PersonResponse>;
    },
    enabled: !!id,
  });
}

/**
 * Input for creating a person
 */
export interface CreatePersonInput {
  firstName: string;
  lastName: string;
  maidenName?: string | null;
  dateOfBirth?: string | null;
  birthPlace?: string | null;
  gender?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  profession?: string | null;
  isLiving?: boolean;
}

/**
 * Hook to create a new person
 *
 * @example
 * ```tsx
 * const createMutation = useCreatePerson();
 *
 * const handleCreate = async () => {
 *   await createMutation.mutateAsync({
 *     firstName: "John",
 *     lastName: "Doe",
 *   });
 * };
 * ```
 */
export function useCreatePerson() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePersonInput) => {
      const response = await client.persons.$post({
        json: data,
      });

      if (!response.ok) {
        throw new Error(`Failed to create person: ${response.status}`);
      }

      return response.json() as Promise<PersonResponse>;
    },
    onSuccess: (newPerson) => {
      // Invalidate lists to refetch with new person
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
      // Optionally add to cache
      queryClient.setQueryData(personKeys.detail(newPerson.id), newPerson);
    },
  });
}

/**
 * Input for updating a person
 */
export interface UpdatePersonInput {
  firstName?: string;
  lastName?: string;
  maidenName?: string | null;
  dateOfBirth?: string | null;
  dateOfPassing?: string | null;
  birthPlace?: string | null;
  gender?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  profession?: string | null;
  isLiving?: boolean;
}

/**
 * Hook to update a person
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdatePerson("person_123");
 *
 * const handleUpdate = async () => {
 *   await updateMutation.mutateAsync({
 *     firstName: "Jane",
 *   });
 * };
 * ```
 */
export function useUpdatePerson(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePersonInput) => {
      const response = await client.persons[":id"].$patch({
        param: { id },
        json: data,
      });

      if (!response.ok) {
        throw new Error(`Failed to update person: ${response.status}`);
      }

      return response.json() as Promise<PersonResponse>;
    },
    onSuccess: (updatedPerson) => {
      // Update detail cache
      queryClient.setQueryData(personKeys.detail(id), updatedPerson);
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
    },
  });
}

/**
 * Hook to delete a person
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeletePerson("person_123");
 *
 * const handleDelete = async () => {
 *   await deleteMutation.mutateAsync();
 * };
 * ```
 */
export function useDeletePerson(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.persons[":id"].$delete({
        param: { id },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete person: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: personKeys.detail(id) });
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
    },
  });
}
