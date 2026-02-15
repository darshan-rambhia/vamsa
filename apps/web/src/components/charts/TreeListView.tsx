"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@vamsa/ui";
import type { ChartEdge, ChartNode } from "~/server/charts";

interface TreeListViewProps {
  nodes: Array<ChartNode>;
  edges: Array<ChartEdge>;
  rootPersonId?: string;
  onNodeClick?: (id: string) => void;
}

interface TreeItem {
  node: ChartNode;
  children: Array<TreeItem>;
  spouseId?: string;
  level: number;
}

export function TreeListView({
  nodes,
  edges,
  rootPersonId,
  onNodeClick,
}: TreeListViewProps) {
  const { t } = useTranslation(["charts"]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Build tree structure from nodes and edges
  const treeData = useMemo(() => {
    if (!rootPersonId) return null;

    // Build parent-child map
    const childrenMap = new Map<string, Array<string>>();
    const spouseMap = new Map<string, string>();

    edges.forEach((edge) => {
      if (edge.type === "parent-child") {
        const children = childrenMap.get(edge.source) || [];
        children.push(edge.target);
        childrenMap.set(edge.source, children);
      } else if (edge.type === "spouse") {
        spouseMap.set(edge.source, edge.target);
        spouseMap.set(edge.target, edge.source);
      }
    });

    // Build tree recursively
    const buildTree = (nodeId: string, level: number): TreeItem | null => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const childIds = childrenMap.get(nodeId) || [];
      const children = childIds
        .map((childId) => buildTree(childId, level + 1))
        .filter((child): child is TreeItem => child !== null);

      return {
        node,
        children,
        spouseId: spouseMap.get(nodeId),
        level,
      };
    };

    return buildTree(rootPersonId, 0);
  }, [nodes, edges, rootPersonId]);

  // Flatten tree for keyboard navigation
  const flattenedNodes = useMemo(() => {
    const result: Array<{ id: string; level: number }> = [];

    const traverse = (item: TreeItem) => {
      result.push({ id: item.node.id, level: item.level });
      if (expandedNodes.has(item.node.id)) {
        item.children.forEach(traverse);
      }
    };

    if (treeData) {
      traverse(treeData);
    }

    return result;
  }, [treeData, expandedNodes]);

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, nodeId: string, hasChildren: boolean) => {
      const currentIndex = flattenedNodes.findIndex((n) => n.id === nodeId);
      if (currentIndex === -1) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (currentIndex < flattenedNodes.length - 1) {
            const nextNode = flattenedNodes[currentIndex + 1];
            setFocusedNodeId(nextNode.id);
            itemRefs.current.get(nextNode.id)?.focus();
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (currentIndex > 0) {
            const prevNode = flattenedNodes[currentIndex - 1];
            setFocusedNodeId(prevNode.id);
            itemRefs.current.get(prevNode.id)?.focus();
          }
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (hasChildren && !expandedNodes.has(nodeId)) {
            toggleExpanded(nodeId);
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (hasChildren && expandedNodes.has(nodeId)) {
            toggleExpanded(nodeId);
          }
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          if (hasChildren) {
            toggleExpanded(nodeId);
          }
          if (onNodeClick) {
            onNodeClick(nodeId);
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          if (flattenedNodes.length > 0) {
            const firstNode = flattenedNodes[0];
            setFocusedNodeId(firstNode.id);
            itemRefs.current.get(firstNode.id)?.focus();
          }
          break;
        }
        case "End": {
          e.preventDefault();
          if (flattenedNodes.length > 0) {
            const lastNode = flattenedNodes[flattenedNodes.length - 1];
            setFocusedNodeId(lastNode.id);
            itemRefs.current.get(lastNode.id)?.focus();
          }
          break;
        }
      }
    },
    [flattenedNodes, expandedNodes, toggleExpanded, onNodeClick]
  );

  // Auto-focus first item on mount
  useEffect(() => {
    if (flattenedNodes.length > 0 && !focusedNodeId) {
      const firstNode = flattenedNodes[0];
      setFocusedNodeId(firstNode.id);
    }
  }, [flattenedNodes, focusedNodeId]);

  if (!treeData) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">{t("charts:noTreeData")}</p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-auto p-4"
      role="tree"
      aria-label={t("charts:familyTreeListView")}
    >
      <TreeNode
        item={treeData}
        expandedNodes={expandedNodes}
        onToggleExpanded={toggleExpanded}
        onNodeClick={onNodeClick}
        onKeyDown={handleKeyDown}
        itemRefs={itemRefs}
        focusedNodeId={focusedNodeId}
      />
    </div>
  );
}

interface TreeNodeProps {
  item: TreeItem;
  expandedNodes: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  onNodeClick?: (nodeId: string) => void;
  onKeyDown: (
    e: React.KeyboardEvent,
    nodeId: string,
    hasChildren: boolean
  ) => void;
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  focusedNodeId: string | null;
}

function TreeNode({
  item,
  expandedNodes,
  onToggleExpanded,
  onNodeClick,
  onKeyDown,
  itemRefs,
  focusedNodeId,
}: TreeNodeProps) {
  const { t } = useTranslation(["charts"]);
  const { node, children, spouseId, level } = item;
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  const spouseNode = spouseId
    ? item.children.find((child) => child.node.id === spouseId)?.node
    : null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasChildren) {
      onToggleExpanded(node.id);
    }
    if (onNodeClick) {
      onNodeClick(node.id);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return t("charts:unknown");
    return new Date(date).getFullYear().toString();
  };

  return (
    <>
      <div
        ref={(el) => {
          if (el) {
            itemRefs.current.set(node.id, el);
          } else {
            itemRefs.current.delete(node.id);
          }
        }}
        role="treeitem"
        aria-level={level + 1}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={focusedNodeId === node.id}
        aria-label={`${node.firstName} ${node.lastName}, ${node.isLiving ? t("charts:living") : `${t("charts:deceased")} ${formatDate(node.dateOfPassing)}`}, ${t("charts:born")} ${formatDate(node.dateOfBirth)}`}
        tabIndex={focusedNodeId === node.id ? 0 : -1}
        className="focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
        style={{ marginLeft: `${level * 2}rem` }}
        onClick={handleClick}
        onKeyDown={(e) => onKeyDown(e, node.id, hasChildren)}
      >
        <Card className="transition-smooth hover:border-primary/20 mb-2 hover:shadow-md">
          <button
            className="w-full cursor-pointer border-0 bg-transparent p-4 text-left"
            tabIndex={-1}
            onClick={handleClick}
          >
            <div className="flex items-start gap-4">
              {/* Expand/collapse indicator */}
              {hasChildren && (
                <div className="text-muted-foreground flex-shrink-0 pt-1">
                  {isExpanded ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </div>
              )}
              {!hasChildren && <div className="w-4 flex-shrink-0" />}

              <div className="flex-1">
                {/* Name */}
                <h3 className="font-display text-foreground text-lg font-medium">
                  {node.firstName} {node.lastName}
                </h3>

                {/* Dates */}
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {node.dateOfBirth && (
                    <span className="font-mono">
                      {t("charts:born")}: {formatDate(node.dateOfBirth)}
                    </span>
                  )}
                  {node.isLiving ? (
                    <span className="text-primary font-medium">
                      {t("charts:living")}
                    </span>
                  ) : (
                    node.dateOfPassing && (
                      <span className="font-mono">
                        {t("charts:died")}: {formatDate(node.dateOfPassing)}
                      </span>
                    )
                  )}
                  {node.gender && (
                    <span className="capitalize">{node.gender}</span>
                  )}
                </div>

                {/* Spouse info if applicable */}
                {spouseNode && (
                  <div className="text-muted-foreground mt-2 text-sm">
                    <span className="mr-1">{t("charts:spouse")}:</span>
                    <span className="font-medium">
                      {spouseNode.firstName} {spouseNode.lastName}
                    </span>
                  </div>
                )}

                {/* Generation indicator */}
                {node.generation !== undefined && (
                  <div className="mt-2">
                    <span className="bg-primary/10 text-primary inline-flex items-center rounded-md px-2 py-1 font-mono text-xs font-medium">
                      {t("charts:generation")} {node.generation}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        </Card>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div role="group">
          {children.map((child) => (
            <TreeNode
              key={child.node.id}
              item={child}
              expandedNodes={expandedNodes}
              onToggleExpanded={onToggleExpanded}
              onNodeClick={onNodeClick}
              onKeyDown={onKeyDown}
              itemRefs={itemRefs}
              focusedNodeId={focusedNodeId}
            />
          ))}
        </div>
      )}
    </>
  );
}
