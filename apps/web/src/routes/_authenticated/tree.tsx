import {
  createFileRoute,
  useSearch,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { FamilyTree } from "~/components/tree";
import { getFamilyTreeLayout } from "~/server/relationships";
import { getCurrentUser } from "~/server/auth";
import { useCallback, useMemo } from "react";

interface TreeSearchParams {
  view?: "focused" | "full";
  expanded?: string;
}

export const Route = createFileRoute("/_authenticated/tree")({
  component: TreeComponent,
  validateSearch: (search: Record<string, unknown>): TreeSearchParams => ({
    view: search.view === "full" ? "full" : "focused",
    expanded: typeof search.expanded === "string" ? search.expanded : undefined,
  }),
});

function TreeComponent() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/tree" });

  const viewMode = search.view ?? "focused";
  const expandedNodes = useMemo(
    () => (search.expanded ? search.expanded.split(",") : []),
    [search.expanded]
  );

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const focusedPersonId = currentUser?.personId;

  const { data: layoutData, isLoading: isLayoutLoading } = useQuery({
    queryKey: [
      "familyTreeLayout",
      focusedPersonId,
      viewMode,
      expandedNodes.join(","),
    ],
    queryFn: () =>
      getFamilyTreeLayout({
        data: {
          focusedPersonId: focusedPersonId!,
          view: viewMode,
          expandedNodes,
          generationDepth: 1, // ±1 generation by default
        },
      }),
    enabled: !!focusedPersonId,
  });

  // Handlers for view mode changes
  const handleViewModeChange = useCallback(
    (mode: "focused" | "full") => {
      navigate({
        to: "/tree",
        search: {
          view: mode === "full" ? "full" : undefined,
          expanded: search.expanded,
        },
        replace: true,
      });
    },
    [navigate, search.expanded]
  );

  const handleFocusOnMe = useCallback(() => {
    navigate({
      to: "/tree",
      search: {
        view: undefined,
        expanded: undefined,
      },
      replace: true,
    });
  }, [navigate]);

  const handleExpandAncestors = useCallback(() => {
    if (!focusedPersonId || !layoutData) return;

    // Get all ancestor IDs from the current layout
    const newExpanded = new Set(expandedNodes);

    // Add all people who have hidden parents
    layoutData.nodes.forEach((node) => {
      if (node.hasHiddenParents) {
        newExpanded.add(node.id);
      }
    });

    navigate({
      to: "/tree",
      search: {
        view: search.view,
        expanded:
          newExpanded.size > 0 ? Array.from(newExpanded).join(",") : undefined,
      },
      replace: true,
    });
  }, [focusedPersonId, layoutData, expandedNodes, navigate, search.view]);

  const handleExpandDescendants = useCallback(() => {
    if (!focusedPersonId || !layoutData) return;

    // Get all descendant IDs from the current layout
    const newExpanded = new Set(expandedNodes);

    // Add all people who have hidden children
    layoutData.nodes.forEach((node) => {
      if (node.hasHiddenChildren) {
        newExpanded.add(node.id);
      }
    });

    navigate({
      to: "/tree",
      search: {
        view: search.view,
        expanded:
          newExpanded.size > 0 ? Array.from(newExpanded).join(",") : undefined,
      },
      replace: true,
    });
  }, [focusedPersonId, layoutData, expandedNodes, navigate, search.view]);

  return (
    <main className="h-[calc(100vh-4rem)]">
      {isUserLoading || isLayoutLoading ? (
        <div className="flex h-full items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="bg-primary/20 mx-auto h-12 w-12 animate-pulse rounded-full" />
            <p className="text-muted-foreground">Loading family tree...</p>
          </div>
        </div>
      ) : !focusedPersonId ? (
        <div className="flex h-full items-center justify-center">
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground text-lg">
              Your account is not linked to a person in the family tree.
            </p>
            <p className="text-muted-foreground text-sm">
              Please contact an administrator to link your account.
            </p>
          </div>
        </div>
      ) : !layoutData ? (
        <div className="flex h-full items-center justify-center">
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground text-lg">
              No family tree data available.
            </p>
          </div>
        </div>
      ) : (
        <ReactFlowProvider>
          <FamilyTree
            layout={layoutData}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onFocusOnMe={handleFocusOnMe}
            onExpandAncestors={handleExpandAncestors}
            onExpandDescendants={handleExpandDescendants}
            hasCurrentUser={!!focusedPersonId}
          />
        </ReactFlowProvider>
      )}
    </main>
  );
}
