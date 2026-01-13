"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Input,
  Button,
  Badge,
} from "@vamsa/ui";
import type { CompactTreeResult } from "~/server/charts";

interface CompactTreeProps {
  data: CompactTreeResult;
  onNodeClick?: (nodeId: string) => void;
}

interface FlattenedNode {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  dateOfPassing: string | null;
  isLiving: boolean;
  gender: string | null;
  photoUrl: string | null;
  generation: number;
  parentId: string | null;
  hasChildren: boolean;
  spouseCount: number;
  depth: number;
  isExpanded: boolean;
  isVisible: boolean;
}

const ROW_HEIGHT = 48;
const INDENT_SIZE = 24;

export function CompactTree({ data, onNodeClick }: CompactTreeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Initialize with root expanded
  useEffect(() => {
    if (data.root) {
      setExpandedNodes(new Set([data.root.id]));
    }
  }, [data.root]);

  // Build flattened visible list based on expansion state
  const visibleNodes = useMemo(() => {
    const nodes: FlattenedNode[] = [];
    const visited = new Set<string>();

    function traverse(
      node: CompactTreeResult["flatList"][0] & { hasChildren: boolean },
      depth: number
    ) {
      if (visited.has(node.id)) return;
      visited.add(node.id);

      const isExpanded = expandedNodes.has(node.id);

      // Filter by search query
      const matchesSearch =
        searchQuery === "" ||
        `${node.firstName} ${node.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      nodes.push({
        ...node,
        depth,
        isExpanded,
        isVisible: matchesSearch || searchQuery === "",
      });

      // If expanded, add children
      if (isExpanded) {
        const children = data.flatList.filter((n) => n.parentId === node.id);
        children.forEach((child) => traverse(child, depth + 1));
      }
    }

    // Start from root
    const rootNode = data.flatList.find((n) => n.parentId === null);
    if (rootNode) {
      traverse(rootNode, 0);
    }

    return nodes;
  }, [data.flatList, expandedNodes, searchQuery]);

  // Filter visible nodes for display
  const displayNodes = useMemo(() => {
    if (searchQuery === "") return visibleNodes;
    return visibleNodes.filter((n) => n.isVisible);
  }, [visibleNodes, searchQuery]);

  // Virtual scrolling calculations
  const totalHeight = displayNodes.length * ROW_HEIGHT;
  const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2;
  const endIndex = Math.min(startIndex + visibleCount, displayNodes.length);
  const offsetY = startIndex * ROW_HEIGHT;

  const visibleItems = displayNodes.slice(startIndex, endIndex);

  // Resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
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

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allIds = data.flatList.filter((n) => n.hasChildren).map((n) => n.id);
    setExpandedNodes(new Set(allIds));
  }, [data.flatList]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    // Keep only root expanded
    if (data.root) {
      setExpandedNodes(new Set([data.root.id]));
    } else {
      setExpandedNodes(new Set());
    }
  }, [data.root]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (displayNodes.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            Math.min(prev + 1, displayNodes.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "ArrowRight":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < displayNodes.length) {
            const node = displayNodes[focusedIndex];
            if (node.hasChildren && !expandedNodes.has(node.id)) {
              toggleNode(node.id);
            }
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < displayNodes.length) {
            const node = displayNodes[focusedIndex];
            if (expandedNodes.has(node.id)) {
              toggleNode(node.id);
            } else if (node.parentId) {
              // Focus parent
              const parentIndex = displayNodes.findIndex(
                (n) => n.id === node.parentId
              );
              if (parentIndex >= 0) {
                setFocusedIndex(parentIndex);
              }
            }
          }
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < displayNodes.length) {
            const node = displayNodes[focusedIndex];
            onNodeClick?.(node.id);
          }
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(displayNodes.length - 1);
          break;
      }
    },
    [displayNodes, focusedIndex, expandedNodes, toggleNode, onNodeClick]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedTop = focusedIndex * ROW_HEIGHT;
      const focusedBottom = focusedTop + ROW_HEIGHT;

      if (focusedTop < scrollTop) {
        listRef.current.scrollTop = focusedTop;
      } else if (focusedBottom > scrollTop + containerHeight) {
        listRef.current.scrollTop = focusedBottom - containerHeight;
      }
    }
  }, [focusedIndex, scrollTop, containerHeight]);

  // Format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.getFullYear().toString();
  };

  // Get generation label
  const getGenerationLabel = (gen: number): string => {
    const labels = [
      "Root",
      "1st Gen",
      "2nd Gen",
      "3rd Gen",
      "4th Gen",
      "5th Gen",
      "6th Gen",
      "7th Gen",
      "8th Gen",
      "9th Gen",
      "10th Gen",
    ];
    return labels[gen] || `${gen}th Gen`;
  };

  if (!data.root) {
    return (
      <div className="bg-card flex h-full items-center justify-center rounded-lg border p-8">
        <p className="text-muted-foreground">No tree data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card flex h-full flex-col rounded-lg border">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            Collapse All
          </Button>
        </div>
        <div className="text-muted-foreground text-sm">
          {displayNodes.length} of {data.flatList.length} visible
        </div>
      </div>

      {/* Tree List */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        role="tree"
        aria-label="Family tree"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={listRef}
          className="absolute inset-0 overflow-auto"
          onScroll={handleScroll}
        >
          <div style={{ height: totalHeight, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                top: offsetY,
                left: 0,
                right: 0,
              }}
            >
              {visibleItems.map((node, index) => {
                const actualIndex = startIndex + index;
                const isFocused = actualIndex === focusedIndex;

                return (
                  <div
                    key={node.id}
                    role="treeitem"
                    aria-expanded={node.hasChildren ? node.isExpanded : undefined}
                    aria-level={node.depth + 1}
                    aria-selected={isFocused}
                    tabIndex={isFocused ? 0 : -1}
                    className={`flex h-12 cursor-pointer items-center gap-2 px-4 transition-colors ${
                      isFocused
                        ? "bg-accent"
                        : "hover:bg-muted/50"
                    }`}
                    style={{ paddingLeft: 16 + node.depth * INDENT_SIZE }}
                    onClick={() => onNodeClick?.(node.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onNodeClick?.(node.id);
                      }
                    }}
                  >
                    {/* Expand/Collapse button */}
                    <button
                      type="button"
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors ${
                        node.hasChildren
                          ? "hover:bg-muted"
                          : "invisible"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (node.hasChildren) {
                          toggleNode(node.id);
                        }
                      }}
                      tabIndex={-1}
                    >
                      {node.hasChildren && (
                        <svg
                          className={`h-4 w-4 transition-transform ${
                            node.isExpanded ? "rotate-90" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Living indicator */}
                    <div
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        node.isLiving
                          ? "bg-primary"
                          : "bg-muted-foreground"
                      }`}
                    />

                    {/* Gender icon */}
                    <span className="text-muted-foreground w-4 flex-shrink-0 text-xs">
                      {node.gender === "MALE"
                        ? "M"
                        : node.gender === "FEMALE"
                          ? "F"
                          : "-"}
                    </span>

                    {/* Name */}
                    <span className="flex-1 truncate font-medium">
                      {node.firstName} {node.lastName}
                    </span>

                    {/* Spouse count */}
                    {node.spouseCount > 0 && (
                      <Badge variant="secondary" className="flex-shrink-0">
                        {node.spouseCount} spouse{node.spouseCount > 1 ? "s" : ""}
                      </Badge>
                    )}

                    {/* Dates */}
                    <span className="text-muted-foreground flex-shrink-0 text-sm">
                      {formatDate(node.dateOfBirth)}
                      {node.dateOfBirth && !node.isLiving && " - "}
                      {!node.isLiving && formatDate(node.dateOfPassing)}
                    </span>

                    {/* Generation */}
                    <Badge
                      variant="outline"
                      className="flex-shrink-0 text-xs"
                    >
                      {getGenerationLabel(node.generation)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-muted-foreground flex items-center justify-between border-t p-3 text-sm">
        <div>
          <span className="font-medium">{data.metadata.totalPeople}</span> people
          across{" "}
          <span className="font-medium">{data.metadata.totalGenerations}</span>{" "}
          generations
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="bg-primary h-2 w-2 rounded-full" />
            <span>Living</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-muted-foreground h-2 w-2 rounded-full" />
            <span>Deceased</span>
          </div>
        </div>
      </div>
    </div>
  );
}
