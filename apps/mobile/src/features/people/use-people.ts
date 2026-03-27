import { useEffect, useState, useSyncExternalStore } from "react";

import {
  getPeopleMutationSnapshot,
  listPeople,
  subscribePeopleMutation,
} from "./api";
import type { PeopleDataSource } from "./api";
import type { PersonSummary } from "./types";
import { useAuthState } from "@/src/features/auth/use-auth-state";

type UsePeopleState = {
  people: Array<PersonSummary>;
  loading: boolean;
  warning?: string;
  source: PeopleDataSource;
};

export function usePeople(searchQuery?: string) {
  const { cookie } = useAuthState();
  const mutationVersion = useSyncExternalStore(
    subscribePeopleMutation,
    getPeopleMutationSnapshot,
    getPeopleMutationSnapshot
  );
  const [state, setState] = useState<UsePeopleState>({
    people: [],
    loading: true,
    source: "api",
  });

  const refresh = async (signal?: AbortSignal) => {
    setState((previous) => ({ ...previous, loading: true }));

    try {
      const result = await listPeople(signal, searchQuery);
      setState({
        people: result.people,
        loading: false,
        source: result.source,
        warning: result.warning,
      });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setState({
        people: [],
        loading: false,
        source: "fixture",
        warning:
          error instanceof Error
            ? `Failed to load people (${error.message})`
            : "Failed to load people",
      });
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);

    return () => controller.abort();
  }, [cookie, mutationVersion, searchQuery]);

  return {
    ...state,
    refresh,
  };
}
