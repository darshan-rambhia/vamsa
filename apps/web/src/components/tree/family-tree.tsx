import { useCallback, useRef, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@vamsa/ui";
import {
  PersonNode,
  type PersonNodeType,
  type PersonNodeData,
} from "./person-node";
import type { TreeLayoutResult } from "~/server/tree-layout";

interface FamilyTreeProps {
  layout: TreeLayoutResult;
  viewMode: "focused" | "full";
  onViewModeChange: (mode: "focused" | "full") => void;
  onFocusOnMe: () => void;
  onExpandAncestors: () => void;
  onExpandDescendants: () => void;
  hasCurrentUser: boolean;
}

const nodeTypes = {
  person: PersonNode,
};

// Layout constants (must match server)
const NODE_WIDTH = 220;
const NODE_HEIGHT = 140;

// Edge colors
const PARENT_CHILD_COLOR = "#6B7280"; // gray-500
const SPOUSE_COLOR = "#4A7C4E"; // moss green
const DIVORCED_COLOR = "#9CA3AF"; // gray-400

export function FamilyTree({
  layout,
  viewMode,
  onViewModeChange,
  onFocusOnMe,
  onExpandAncestors,
  onExpandDescendants,
  hasCurrentUser,
}: FamilyTreeProps) {
  const navigate = useNavigate();
  const reactFlowInstance = useReactFlow();
  const initialFitDone = useRef(false);

  // Transform server nodes to React Flow nodes - memoized to prevent infinite loops
  const reactFlowNodes: PersonNodeType[] = useMemo(
    () =>
      layout.nodes.map((node) => ({
        id: node.id,
        type: "person" as const,
        position: { x: node.x, y: node.y },
        data: {
          person: node.person,
          onClick: () =>
            navigate({ to: "/people/$personId", params: { personId: node.id } }),
          hasHiddenChildren: node.hasHiddenChildren,
          hasHiddenParents: node.hasHiddenParents,
          hasHiddenSpouses: node.hasHiddenSpouses,
          isCurrentUser: node.isCurrentUser,
        },
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      })),
    [layout.nodes, navigate]
  );

  // Transform server edges to React Flow edges - memoized to prevent infinite loops
  const reactFlowEdges: Edge[] = useMemo(
    () =>
      layout.edges.map((edge) => {
        if (edge.type === "spouse") {
          const color = edge.isDivorced ? DIVORCED_COLOR : SPOUSE_COLOR;
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: "spouse-right",
            targetHandle: "spouse-left",
            type: "straight",
            style: {
              stroke: color,
              strokeWidth: 2,
              strokeDasharray: edge.isDivorced ? "3,3" : "5,5",
            },
            label: edge.isDivorced ? "ex" : "spouse",
            labelStyle: { fontSize: 11, fill: color, fontWeight: 500 },
            labelBgStyle: { fill: "white", fillOpacity: 0.8 },
          };
        } else {
          // parent-child edge
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: "smoothstep",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: PARENT_CHILD_COLOR,
            },
            style: { stroke: PARENT_CHILD_COLOR, strokeWidth: 2 },
          };
        }
      }),
    [layout.edges]
  );

  const [nodes, _setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  // Center on viewport when layout changes
  useEffect(() => {
    if (!initialFitDone.current && layout.nodes.length > 0) {
      // Use setTimeout to ensure React Flow has rendered
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.2,
          minZoom: 0.4,
          maxZoom: 1.2,
        });
        initialFitDone.current = true;
      }, 100);
    }
  }, [layout, reactFlowInstance]);

  // Update nodes/edges when layout changes (only when memoized values actually change)
  useEffect(() => {
    _setNodes(reactFlowNodes);
    _setEdges(reactFlowEdges);
  }, [reactFlowNodes, reactFlowEdges, _setNodes, _setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: PersonNodeType) => {
      if (node.data.onClick) {
        node.data.onClick();
      }
    },
    []
  );

  const handleFocusOnMe = useCallback(() => {
    onFocusOnMe();
    // Re-fit view after state updates
    setTimeout(() => {
      reactFlowInstance.fitView({
        padding: 0.2,
        minZoom: 0.4,
        maxZoom: 1.2,
      });
    }, 100);
  }, [onFocusOnMe, reactFlowInstance]);

  const toggleViewMode = useCallback(() => {
    onViewModeChange(viewMode === "focused" ? "full" : "focused");
  }, [viewMode, onViewModeChange]);

  if (layout.nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-muted-foreground text-lg">
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
      fitViewOptions={{ padding: 0.2, minZoom: 0.4, maxZoom: 1.2 }}
      minZoom={0.2}
      maxZoom={2.5}
      defaultEdgeOptions={{ animated: false }}
      className="bg-muted/20"
    >
      <Background gap={20} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(node) => {
          const data = node.data as PersonNodeData;
          return data.person?.isLiving ? "#4A7C4E" : "#9CA3AF";
        }}
        maskColor="rgba(0, 0, 0, 0.1)"
        pannable
        zoomable
      />
      {hasCurrentUser && (
        <Panel
          position="top-right"
          className="bg-background/80 flex gap-2 rounded-lg border p-2 backdrop-blur"
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
              <Button size="sm" variant="outline" onClick={handleFocusOnMe}>
                Focus on Me
              </Button>
              <Button size="sm" variant="outline" onClick={onExpandAncestors}>
                Expand Ancestors
              </Button>
              <Button size="sm" variant="outline" onClick={onExpandDescendants}>
                Expand Descendants
              </Button>
            </>
          )}
        </Panel>
      )}
    </ReactFlow>
  );
}
