import { useCallback, useEffect, useState } from "react";
import type { ChartEdge, ChartNode } from "~/server/charts";

export interface TreeNode {
  id: string;
  parentId?: string;
  childIds?: Array<string>;
}

export interface UseTreeKeyboardNavProps {
  nodes: Array<ChartNode>;
  edges: Array<ChartEdge>;
  rootNodeId?: string;
  onSelect?: (nodeId: string) => void;
  onActivate?: (nodeId: string) => void;
  enabled?: boolean;
}

export interface UseTreeKeyboardNavReturn {
  focusedNodeId: string | null;
  selectedNodeId: string | null;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  setFocusedNode: (id: string) => void;
  containerProps: {
    role: string;
    tabIndex: number;
    "aria-activedescendant": string | undefined;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  getNodeProps: (nodeId: string) => {
    role: string;
    id: string;
    "aria-selected": boolean;
  };
}

/**
 * Custom hook for keyboard navigation in tree visualizations.
 * Follows WAI-ARIA TreeView pattern.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 */
export function useTreeKeyboardNav({
  nodes,
  edges,
  rootNodeId,
  onSelect,
  onActivate,
  enabled = true,
}: UseTreeKeyboardNavProps): UseTreeKeyboardNavReturn {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Build tree structure from nodes and edges
  const treeStructure = useCallback((): Map<string, TreeNode> => {
    const tree = new Map<string, TreeNode>();

    // Initialize all nodes
    nodes.forEach((node) => {
      tree.set(node.id, {
        id: node.id,
        childIds: [],
      });
    });

    // Build parent-child relationships from edges
    edges.forEach((edge) => {
      if (edge.type === "parent-child") {
        const parent = tree.get(edge.source);
        const child = tree.get(edge.target);

        if (parent && child) {
          parent.childIds = parent.childIds || [];
          if (!parent.childIds.includes(edge.target)) {
            parent.childIds.push(edge.target);
          }
          child.parentId = edge.source;
        }
      }
    });

    return tree;
  }, [nodes, edges]);

  // Get visible nodes (respecting tree structure)
  const getVisibleNodes = useCallback((): Array<string> => {
    const tree = treeStructure();
    const visibleNodes: Array<string> = [];
    const visited = new Set<string>();

    // Find root node
    const root =
      rootNodeId ||
      nodes.find((n) => !tree.get(n.id)?.parentId)?.id ||
      nodes[0]?.id;

    if (!root) return [];

    // Depth-first traversal to maintain tree order
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      visibleNodes.push(nodeId);

      const node = tree.get(nodeId);
      if (node?.childIds) {
        node.childIds.forEach((childId) => traverse(childId));
      }
    };

    traverse(root);

    return visibleNodes;
  }, [nodes, rootNodeId, treeStructure]);

  // Navigation helpers
  const getPreviousVisibleNode = useCallback(
    (currentId: string): string | null => {
      const visible = getVisibleNodes();
      const currentIndex = visible.indexOf(currentId);

      if (currentIndex <= 0) return null;
      return visible[currentIndex - 1];
    },
    [getVisibleNodes]
  );

  const getNextVisibleNode = useCallback(
    (currentId: string): string | null => {
      const visible = getVisibleNodes();
      const currentIndex = visible.indexOf(currentId);

      if (currentIndex === -1 || currentIndex >= visible.length - 1) {
        return null;
      }
      return visible[currentIndex + 1];
    },
    [getVisibleNodes]
  );

  const getFirstChild = useCallback(
    (nodeId: string): string | null => {
      const tree = treeStructure();
      const node = tree.get(nodeId);
      return node?.childIds?.[0] || null;
    },
    [treeStructure]
  );

  const getParent = useCallback(
    (nodeId: string): string | null => {
      const tree = treeStructure();
      const node = tree.get(nodeId);
      return node?.parentId || null;
    },
    [treeStructure]
  );

  const getFirstNode = useCallback((): string | null => {
    const visible = getVisibleNodes();
    return visible[0] || null;
  }, [getVisibleNodes]);

  const getLastNode = useCallback((): string | null => {
    const visible = getVisibleNodes();
    return visible[visible.length - 1] || null;
  }, [getVisibleNodes]);

  // Initialize focus to first node or root
  useEffect(() => {
    if (enabled && !focusedNodeId && nodes.length > 0) {
      const initialFocus = rootNodeId || nodes[0]?.id;
      if (initialFocus) {
        setFocusedNodeId(initialFocus);
      }
    }
  }, [enabled, focusedNodeId, nodes, rootNodeId]);

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled || !focusedNodeId) return;

      let handled = false;

      switch (e.key) {
        case "ArrowUp": {
          // Previous sibling or parent
          const prev = getPreviousVisibleNode(focusedNodeId);
          if (prev) {
            setFocusedNodeId(prev);
            handled = true;
          }
          break;
        }

        case "ArrowDown": {
          // Next sibling or first child
          const next = getNextVisibleNode(focusedNodeId);
          if (next) {
            setFocusedNodeId(next);
            handled = true;
          }
          break;
        }

        case "ArrowLeft": {
          // Go to parent
          const parent = getParent(focusedNodeId);
          if (parent) {
            setFocusedNodeId(parent);
            handled = true;
          }
          break;
        }

        case "ArrowRight": {
          // Go to first child
          const firstChild = getFirstChild(focusedNodeId);
          if (firstChild) {
            setFocusedNodeId(firstChild);
            handled = true;
          }
          break;
        }

        case "Home": {
          // First node
          const first = getFirstNode();
          if (first) {
            setFocusedNodeId(first);
            handled = true;
          }
          break;
        }

        case "End": {
          // Last node
          const last = getLastNode();
          if (last) {
            setFocusedNodeId(last);
            handled = true;
          }
          break;
        }

        case "Enter": {
          // Activate node (e.g., navigate to detail page)
          if (onActivate) {
            onActivate(focusedNodeId);
            handled = true;
          }
          break;
        }

        case " ": {
          // Space key - select node
          if (onSelect) {
            onSelect(focusedNodeId);
            setSelectedNodeId(focusedNodeId);
            handled = true;
          }
          break;
        }
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [
      enabled,
      focusedNodeId,
      getPreviousVisibleNode,
      getNextVisibleNode,
      getParent,
      getFirstChild,
      getFirstNode,
      getLastNode,
      onActivate,
      onSelect,
    ]
  );

  const containerProps = {
    role: "tree" as const,
    tabIndex: enabled ? 0 : -1,
    "aria-activedescendant": focusedNodeId || undefined,
    onKeyDown: handleKeyDown,
  };

  const getNodeProps = useCallback(
    (nodeId: string) => ({
      role: "treeitem" as const,
      id: nodeId,
      "aria-selected": nodeId === selectedNodeId,
    }),
    [selectedNodeId]
  );

  return {
    focusedNodeId,
    selectedNodeId,
    handleKeyDown,
    setFocusedNode: setFocusedNodeId,
    containerProps,
    getNodeProps,
  };
}
