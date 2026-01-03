"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  PersonNode,
  type PersonNodeType,
  type PersonNodeData,
} from "./person-node";
import type { Person, Relationship } from "@prisma/client";
import { Button } from "@/components/ui/button";

interface FamilyTreeProps {
  persons: Person[];
  relationships: Relationship[];
  currentPersonId?: string;
}

const nodeTypes = {
  person: PersonNode,
};

export function FamilyTree({
  persons,
  relationships,
  currentPersonId,
}: FamilyTreeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const expanded = searchParams.get("expanded");
    return expanded ? new Set(expanded.split(",")) : new Set();
  });
  const [viewMode, setViewMode] = useState<"focused" | "full">(() => {
    const mode = searchParams.get("view");
    return mode === "full" ? "full" : "focused";
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (viewMode === "full") {
      params.set("view", "full");
    } else {
      params.delete("view");
    }

    if (expandedNodes.size > 0) {
      params.set("expanded", Array.from(expandedNodes).join(","));
    } else {
      params.delete("expanded");
    }

    const newSearch = params.toString();
    const newUrl = newSearch ? `${pathname}?${newSearch}` : pathname;

    if (window.location.pathname + window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [expandedNodes, viewMode, pathname, router, searchParams]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const parentChildRels = relationships.filter((r) => r.type === "PARENT");
    const spouseRels = relationships.filter((r) => r.type === "SPOUSE");

    const generations = new Map<string, number>();
    const spousePairs = new Map<string, Set<string>>();

    spouseRels.forEach((rel) => {
      if (!spousePairs.has(rel.personId)) {
        spousePairs.set(rel.personId, new Set());
      }
      if (!spousePairs.has(rel.relatedPersonId)) {
        spousePairs.set(rel.relatedPersonId, new Set());
      }
      spousePairs.get(rel.personId)!.add(rel.relatedPersonId);
      spousePairs.get(rel.relatedPersonId)!.add(rel.personId);
    });

    const roots = persons.filter(
      (p) => !parentChildRels.some((r) => r.personId === p.id)
    );

    const queue: Array<{ id: string; generation: number }> = [];
    roots.forEach((root) => queue.push({ id: root.id, generation: 0 }));

    while (queue.length > 0) {
      const { id, generation } = queue.shift()!;

      if (generations.has(id) && generations.get(id)! <= generation) {
        continue;
      }

      generations.set(id, generation);

      const spouses = spousePairs.get(id);
      if (spouses) {
        spouses.forEach((spouseId) => {
          if (
            !generations.has(spouseId) ||
            generations.get(spouseId)! > generation
          ) {
            queue.push({ id: spouseId, generation });
          }
        });
      }

      const children = parentChildRels
        .filter((r) => r.relatedPersonId === id)
        .map((r) => r.personId);

      children.forEach((childId) => {
        queue.push({ id: childId, generation: generation + 1 });
      });
    }

    persons.forEach((p) => {
      if (!generations.has(p.id)) {
        generations.set(p.id, 0);
      }
    });

    let visiblePersonIds = new Set(persons.map((p) => p.id));

    if (viewMode === "focused" && currentPersonId) {
      const currentGen = generations.get(currentPersonId);
      if (currentGen !== undefined) {
        const minGen = currentGen - 2;
        const maxGen = currentGen + 2;

        visiblePersonIds = new Set(
          persons
            .filter((p) => {
              const gen = generations.get(p.id) || 0;
              return (
                (gen >= minGen && gen <= maxGen) || expandedNodes.has(p.id)
              );
            })
            .map((p) => p.id)
        );

        expandedNodes.forEach((nodeId) => {
          const children = parentChildRels
            .filter((r) => r.relatedPersonId === nodeId)
            .map((r) => r.personId);
          children.forEach((childId) => visiblePersonIds.add(childId));

          const parents = parentChildRels
            .filter((r) => r.personId === nodeId)
            .map((r) => r.relatedPersonId);
          parents.forEach((parentId) => visiblePersonIds.add(parentId));

          const spouses = spousePairs.get(nodeId);
          if (spouses) {
            spouses.forEach((spouseId) => visiblePersonIds.add(spouseId));
          }
        });
      }
    }

    const visiblePersons = persons.filter((p) => visiblePersonIds.has(p.id));

    const generationGroups = new Map<number, string[]>();
    visiblePersons.forEach((person) => {
      const gen = generations.get(person.id) || 0;
      if (!generationGroups.has(gen)) {
        generationGroups.set(gen, []);
      }
      generationGroups.get(gen)!.push(person.id);
    });

    const nodePositions = new Map<string, { x: number; y: number }>();
    const nodeWidth = 180;
    const nodeHeight = 100;
    const horizontalSpacing = 220;
    const spouseHorizontalSpacing = 200;
    const verticalSpacing = 150;

    const sortedGenerations = Array.from(generationGroups.keys()).sort(
      (a, b) => a - b
    );

    const _familyGroups = new Map<
      number,
      Array<{ parents: string[]; children: string[] }>
    >();

    sortedGenerations.forEach((gen) => {
      const peopleInGen = generationGroups.get(gen)!;
      const processed = new Set<string>();
      const groups: Array<{ members: string[]; children: string[] }> = [];

      peopleInGen.forEach((personId) => {
        if (processed.has(personId)) return;

        const group = [personId];
        processed.add(personId);

        const spouses = spousePairs.get(personId);
        if (spouses) {
          spouses.forEach((spouseId) => {
            if (peopleInGen.includes(spouseId) && !processed.has(spouseId)) {
              group.push(spouseId);
              processed.add(spouseId);
            }
          });
        }

        const childrenOfGroup = parentChildRels
          .filter((r) => group.includes(r.relatedPersonId))
          .map((r) => r.personId)
          .filter((childId, idx, arr) => arr.indexOf(childId) === idx);

        groups.push({ members: group, children: childrenOfGroup });
      });

      let currentX = 0;
      groups.forEach((group) => {
        const childrenCount = group.children.length;
        const groupWidth =
          group.members.length === 1
            ? horizontalSpacing
            : spouseHorizontalSpacing * group.members.length;

        const childrenWidth = Math.max(
          childrenCount * horizontalSpacing,
          groupWidth
        );
        const actualWidth = Math.max(groupWidth, childrenWidth);

        const groupStartX = currentX + (actualWidth - groupWidth) / 2;

        group.members.forEach((personId, idx) => {
          const xPos =
            group.members.length === 1
              ? groupStartX
              : groupStartX + idx * spouseHorizontalSpacing;

          nodePositions.set(personId, {
            x: xPos,
            y: gen * verticalSpacing,
          });
        });

        if (group.children.length > 0) {
          const childrenStartX =
            currentX +
            (actualWidth - (childrenCount - 1) * horizontalSpacing) / 2;
          group.children.forEach((childId, idx) => {
            const existingPos = nodePositions.get(childId);
            if (!existingPos) {
              nodePositions.set(childId, {
                x: childrenStartX + idx * horizontalSpacing,
                y: (gen + 1) * verticalSpacing,
              });
            }
          });
        }

        currentX += actualWidth + horizontalSpacing / 2;
      });
    });

    const allXPositions = Array.from(nodePositions.values()).map(
      (pos) => pos.x
    );
    const minX = Math.min(...allXPositions);
    const maxX = Math.max(...allXPositions);
    const offsetX = -(minX + maxX) / 2;

    nodePositions.forEach((pos, _id) => {
      pos.x += offsetX;
    });

    const nodes: PersonNodeType[] = visiblePersons.map((person) => {
      const pos = nodePositions.get(person.id) || { x: 0, y: 0 };
      const hasHiddenChildren = parentChildRels
        .filter((r) => r.relatedPersonId === person.id)
        .some((r) => !visiblePersonIds.has(r.personId));
      const hasHiddenParents = parentChildRels
        .filter((r) => r.personId === person.id)
        .some((r) => !visiblePersonIds.has(r.relatedPersonId));

      return {
        id: person.id,
        type: "person" as const,
        position: pos,
        data: {
          person,
          onClick: () => router.push(`/people/${person.id}`),
          hasHiddenChildren,
          hasHiddenParents,
        },
        style: { width: nodeWidth, height: nodeHeight },
      };
    });

    const edges: Edge[] = [];

    parentChildRels.forEach((rel) => {
      if (
        visiblePersonIds.has(rel.personId) &&
        visiblePersonIds.has(rel.relatedPersonId)
      ) {
        edges.push({
          id: `${rel.relatedPersonId}-${rel.personId}`,
          source: rel.relatedPersonId,
          target: rel.personId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#64748b" },
        });
      }
    });

    const processedSpouses = new Set<string>();
    spouseRels.forEach((rel) => {
      if (
        visiblePersonIds.has(rel.personId) &&
        visiblePersonIds.has(rel.relatedPersonId)
      ) {
        const key = [rel.personId, rel.relatedPersonId].sort().join("-");
        if (!processedSpouses.has(key)) {
          processedSpouses.add(key);
          edges.push({
            id: `spouse-${key}`,
            source: rel.personId,
            target: rel.relatedPersonId,
            type: "straight",
            style: { stroke: "#ec4899", strokeDasharray: "5,5" },
            label: "spouse",
            labelStyle: { fontSize: 10, fill: "#ec4899" },
          });
        }
      }
    });

    return { nodes, edges };
  }, [
    persons,
    relationships,
    router,
    expandedNodes,
    viewMode,
    currentPersonId,
  ]);

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: PersonNodeType) => {
      if (node.data.onClick) {
        node.data.onClick();
      }
    },
    []
  );

  const expandAllAncestors = useCallback(() => {
    if (!currentPersonId) return;
    const newExpanded = new Set(expandedNodes);

    const addAncestors = (personId: string) => {
      const parentRels = relationships.filter(
        (r) => r.type === "PARENT" && r.personId === personId
      );
      parentRels.forEach((rel) => {
        newExpanded.add(rel.relatedPersonId);
        addAncestors(rel.relatedPersonId);
      });
    };

    addAncestors(currentPersonId);
    setExpandedNodes(newExpanded);
  }, [currentPersonId, relationships, expandedNodes]);

  const expandAllDescendants = useCallback(() => {
    if (!currentPersonId) return;
    const newExpanded = new Set(expandedNodes);

    const addDescendants = (personId: string) => {
      const childRels = relationships.filter(
        (r) => r.type === "PARENT" && r.relatedPersonId === personId
      );
      childRels.forEach((rel) => {
        newExpanded.add(rel.personId);
        addDescendants(rel.personId);
      });
    };

    addDescendants(currentPersonId);
    setExpandedNodes(newExpanded);
  }, [currentPersonId, relationships, expandedNodes]);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "focused" ? "full" : "focused"));
  }, []);

  const focusOnMe = useCallback(() => {
    setViewMode("focused");
    setExpandedNodes(new Set());
  }, []);

  if (persons.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-lg text-muted-foreground">
          No family members yet. Start by adding the first person!
        </p>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
      className="bg-muted/20"
    >
      <Background />
      <Controls />
      <MiniMap
        nodeColor={(node) => {
          const data = node.data as PersonNodeData;
          return data.person?.isLiving ? "#22c55e" : "#94a3b8";
        }}
        maskColor="rgb(0, 0, 0, 0.1)"
      />
      {currentPersonId && (
        <Panel
          position="top-right"
          className="flex gap-2 rounded-lg border bg-background/80 p-2"
        >
          <Button
            size="sm"
            variant={viewMode === "focused" ? "default" : "outline"}
            onClick={toggleViewMode}
          >
            {viewMode === "focused" ? "Show Full Tree" : "Show Focused View"}
          </Button>
          {viewMode === "focused" && (
            <>
              <Button size="sm" variant="outline" onClick={focusOnMe}>
                Focus on Me
              </Button>
              <Button size="sm" variant="outline" onClick={expandAllAncestors}>
                Expand Ancestors
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={expandAllDescendants}
              >
                Expand Descendants
              </Button>
            </>
          )}
        </Panel>
      )}
    </ReactFlow>
  );
}
