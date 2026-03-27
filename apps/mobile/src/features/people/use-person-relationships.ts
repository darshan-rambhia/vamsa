import { useEffect, useState } from "react";

import { listRelationshipsForPerson } from "./api";
import type { PeopleDataSource } from "./api";
import type { RelationshipSummary } from "./types";
import { useAuthState } from "@/src/features/auth/use-auth-state";

type UsePersonRelationshipsState = {
  relationships: Array<RelationshipSummary>;
  loading: boolean;
  source: PeopleDataSource;
  warning?: string;
};

export function usePersonRelationships(personId?: string) {
  const { cookie } = useAuthState();
  const [state, setState] = useState<UsePersonRelationshipsState>({
    relationships: [],
    loading: true,
    source: "api",
  });

  const refresh = async (signal?: AbortSignal) => {
    if (!personId) {
      setState({
        relationships: [],
        loading: false,
        source: "api",
      });
      return;
    }

    setState((previous) => ({ ...previous, loading: true }));

    try {
      const result = await listRelationshipsForPerson(personId, signal);
      setState({
        relationships: result.relationships,
        loading: false,
        source: result.source,
        warning: result.warning,
      });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setState({
        relationships: [],
        loading: false,
        source: "fixture",
        warning:
          error instanceof Error
            ? `Failed to load relationships (${error.message})`
            : "Failed to load relationships",
      });
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);

    return () => controller.abort();
  }, [cookie, personId]);

  return {
    ...state,
    refresh,
  };
}
