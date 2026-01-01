"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { PersonNode, type PersonNodeType, type PersonNodeData } from "./person-node";
import type { Person, Relationship } from "@prisma/client";

interface FamilyTreeProps {
  persons: Person[];
  relationships: Relationship[];
}

const nodeTypes = {
  person: PersonNode,
};

export function FamilyTree({ persons, relationships }: FamilyTreeProps) {
  const router = useRouter();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodeMap = new Map<string, { level: number; index: number }>();
    const levels: Map<number, string[]> = new Map();

    const parentChildRels = relationships.filter((r) => r.type === "PARENT");
    const spouseRels = relationships.filter((r) => r.type === "SPOUSE");

    const roots = persons.filter(
      (p) => !parentChildRels.some((r) => r.personId === p.id)
    );

    function assignLevel(personId: string, level: number) {
      if (nodeMap.has(personId)) return;

      if (!levels.has(level)) levels.set(level, []);
      const levelNodes = levels.get(level)!;
      levelNodes.push(personId);

      nodeMap.set(personId, { level, index: levelNodes.length - 1 });

      const children = parentChildRels
        .filter((r) => r.relatedPersonId === personId)
        .map((r) => r.personId);

      children.forEach((childId) => assignLevel(childId, level + 1));
    }

    roots.forEach((root) => assignLevel(root.id, 0));

    persons.forEach((p) => {
      if (!nodeMap.has(p.id)) {
        assignLevel(p.id, 0);
      }
    });

    const nodeWidth = 180;
    const nodeHeight = 100;
    const horizontalSpacing = 220;
    const verticalSpacing = 150;

    const nodes: PersonNodeType[] = persons.map((person) => {
      const pos = nodeMap.get(person.id) || { level: 0, index: 0 };
      const levelWidth = (levels.get(pos.level)?.length || 1) * horizontalSpacing;
      const startX = -levelWidth / 2 + horizontalSpacing / 2;

      return {
        id: person.id,
        type: "person" as const,
        position: {
          x: startX + pos.index * horizontalSpacing,
          y: pos.level * verticalSpacing,
        },
        data: {
          person,
          onClick: () => router.push(`/people/${person.id}`),
        },
        style: { width: nodeWidth, height: nodeHeight },
      };
    });

    const edges: Edge[] = [];

    parentChildRels.forEach((rel) => {
      edges.push({
        id: `${rel.relatedPersonId}-${rel.personId}`,
        source: rel.relatedPersonId,
        target: rel.personId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#64748b" },
      });
    });

    const processedSpouses = new Set<string>();
    spouseRels.forEach((rel) => {
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
    });

    return { nodes, edges };
  }, [persons, relationships, router]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: PersonNodeType) => {
      if (node.data.onClick) {
        node.data.onClick();
      }
    },
    []
  );

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
    </ReactFlow>
  );
}
