/**
 * TanStack Query Key Factory
 *
 * Provides type-safe query key generation for all cached data.
 * @see https://tanstack.com/query/latest/docs/react/guides/important-defaults#using-the-querykey
 */

export const personKeys = {
  all: ["persons"] as const,
  lists: () => [...personKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...personKeys.lists(), filters] as const,
  details: () => [...personKeys.all, "detail"] as const,
  detail: (id: string) => [...personKeys.details(), id] as const,
};

export const relationshipKeys = {
  all: ["relationships"] as const,
  lists: () => [...relationshipKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...relationshipKeys.lists(), filters] as const,
  details: () => [...relationshipKeys.all, "detail"] as const,
  detail: (id: string) => [...relationshipKeys.details(), id] as const,
};

export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const,
  profile: () => [...userKeys.all, "profile"] as const,
};

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  providers: () => [...authKeys.all, "providers"] as const,
};
