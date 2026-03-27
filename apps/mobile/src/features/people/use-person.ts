import { useEffect, useState, useSyncExternalStore } from "react";

import {
  getPeopleMutationSnapshot,
  getPersonById,
  subscribePeopleMutation,
} from "./api";
import type { PeopleDataSource } from "./api";
import type { PersonSummary } from "./types";
import { useAuthState } from "@/src/features/auth/use-auth-state";

type UsePersonState = {
  person?: PersonSummary;
  loading: boolean;
  warning?: string;
  source: PeopleDataSource;
};

export function usePerson(id?: string) {
  const { cookie } = useAuthState();
  const mutationVersion = useSyncExternalStore(
    subscribePeopleMutation,
    getPeopleMutationSnapshot,
    getPeopleMutationSnapshot
  );
  const [state, setState] = useState<UsePersonState>({
    loading: true,
    source: "api",
  });

  const refresh = async (signal?: AbortSignal) => {
    if (!id) {
      setState({ loading: false, source: "fixture" });
      return;
    }

    setState((previous) => ({ ...previous, loading: true }));

    try {
      const result = await getPersonById(id, signal);
      setState({
        person: result.person,
        loading: false,
        source: result.source,
        warning: result.warning,
      });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setState({
        person: undefined,
        loading: false,
        source: "fixture",
        warning:
          error instanceof Error
            ? `Failed to load profile (${error.message})`
            : "Failed to load profile",
      });
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);

    return () => controller.abort();
  }, [cookie, id, mutationVersion]);

  return {
    ...state,
    refresh,
  };
}
