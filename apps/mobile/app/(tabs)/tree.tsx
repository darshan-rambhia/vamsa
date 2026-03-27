import { useMemo, useState } from "react";
import { cluster, hierarchy, max, scaleBand, scaleLinear, tree } from "d3";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import type { PersonSummary } from "@/src/features/people/types";
import { calculateBoundingBox } from "@/src/lib/chart-utils";

import {
  PEOPLE_FIXTURE,
  RELATIONSHIP_FIXTURE,
} from "@/src/features/people/data";
import { getDisplayName } from "@/src/features/people/types";

type TreeDatum = {
  id: string;
  name: string;
  birthYear?: number;
  children?: Array<TreeDatum>;
};

type GraphLayout = ReturnType<typeof layoutTreeGraph>;

type ChartMode =
  | "tree"
  | "ancestor"
  | "descendant"
  | "hourglass"
  | "fan"
  | "timeline"
  | "matrix"
  | "bowtie"
  | "compact"
  | "statistics"
  | "list";

const NODE_W = 132;
const NODE_H = 58;
const PAD_X = 100;
const PAD_Y = 90;

const CHART_NAMES: Record<ChartMode, string> = {
  tree: "Interactive Tree",
  ancestor: "Ancestor Chart",
  descendant: "Descendant Chart",
  hourglass: "Hourglass Chart",
  fan: "Fan Chart",
  timeline: "Timeline Chart",
  matrix: "Relationship Matrix",
  bowtie: "Bowtie Chart",
  compact: "Compact Tree",
  statistics: "Statistics",
  list: "List View (Accessible)",
};

const relationToGeneration = (relation: string): number => {
  const normalized = relation.toLowerCase();

  if (normalized.includes("great-great-grand")) return 0;
  if (normalized.includes("great-grand")) return 1;
  if (normalized.includes("grand")) return 2;
  if (normalized.includes("parent")) return 3;
  if (normalized.includes("child")) return 4;

  return 5;
};

const generationLabel = (generation: number): string => {
  const labels: Record<number, string> = {
    0: "Great-Great Grand",
    1: "Great Grand",
    2: "Grand",
    3: "Parent",
    4: "Child",
    5: "Other",
  };

  return labels[generation] ?? "Other";
};

function buildChildrenMap() {
  const childrenByParent = new Map<string, Set<string>>();

  RELATIONSHIP_FIXTURE.forEach((relationship) => {
    if (relationship.type !== "PARENT") {
      return;
    }

    const parentId = relationship.relatedPersonId;
    const childId = relationship.personId;
    const children = childrenByParent.get(parentId) ?? new Set<string>();
    children.add(childId);
    childrenByParent.set(parentId, children);
  });

  return childrenByParent;
}

function buildParentMap() {
  const parentsByChild = new Map<string, Set<string>>();

  RELATIONSHIP_FIXTURE.forEach((relationship) => {
    if (relationship.type !== "PARENT") {
      return;
    }

    const childId = relationship.personId;
    const parentId = relationship.relatedPersonId;
    const parents = parentsByChild.get(childId) ?? new Set<string>();
    parents.add(parentId);
    parentsByChild.set(childId, parents);
  });

  return parentsByChild;
}

function buildTree(
  rootId: string,
  peopleById: Map<string, PersonSummary>,
  childrenByParent: Map<string, Set<string>>,
  maxDepth = 5,
  visited = new Set<string>()
): TreeDatum | undefined {
  const person = peopleById.get(rootId);
  if (!person) {
    return undefined;
  }

  const nextVisited = new Set(visited);
  nextVisited.add(rootId);

  let children: Array<TreeDatum> | undefined;
  if (maxDepth > 0) {
    const childIds = Array.from(childrenByParent.get(rootId) ?? []).filter(
      (id) => !nextVisited.has(id)
    );
    const childNodes = childIds
      .map((id) =>
        buildTree(id, peopleById, childrenByParent, maxDepth - 1, nextVisited)
      )
      .filter((node): node is TreeDatum => Boolean(node));
    children = childNodes.length > 0 ? childNodes : undefined;
  }

  return {
    id: person.id,
    name: getDisplayName(person),
    birthYear: person.birthYear,
    children,
  };
}

function layoutTreeGraph(rootData: TreeDatum, nodeW = NODE_W, nodeH = NODE_H) {
  const root = hierarchy(rootData);
  const layout = tree<TreeDatum>().nodeSize([180, 120]);
  const positioned = layout(root);

  const nodes = positioned.descendants();
  const links = positioned.links();
  const bounds = calculateBoundingBox(
    nodes.map((node) => ({ x: node.x, y: node.y }))
  );

  return {
    width: bounds.width + PAD_X * 2 + nodeW,
    height: bounds.height + PAD_Y * 2 + nodeH,
    shiftX: PAD_X - bounds.minX,
    shiftY: PAD_Y - bounds.minY,
    nodes,
    links,
  };
}

function findBestInitialPersonId(): string {
  const parentSide = new Set<string>();
  const childSide = new Set<string>();

  RELATIONSHIP_FIXTURE.forEach((relationship) => {
    if (relationship.type === "PARENT") {
      parentSide.add(relationship.personId);
      childSide.add(relationship.relatedPersonId);
    }
  });

  const balanced = PEOPLE_FIXTURE.find(
    (person) => parentSide.has(person.id) && childSide.has(person.id)
  );
  return balanced?.id ?? PEOPLE_FIXTURE[0]?.id ?? "";
}

function GraphNodes({
  graph,
  selectedPersonId,
  onSelectPerson,
  palette,
  nodeWidth = NODE_W,
  nodeHeight = NODE_H,
}: {
  graph: GraphLayout;
  selectedPersonId: string;
  onSelectPerson: (id: string) => void;
  palette: {
    selectedFill: string;
    selectedStroke: string;
    fill: string;
    stroke: string;
    text: string;
    textMuted: string;
  };
  nodeWidth?: number;
  nodeHeight?: number;
}) {
  return (
    <>
      {graph.nodes.map((node) => {
        const selected = node.data.id === selectedPersonId;
        return (
          <G
            key={`node-${node.data.id}`}
            x={node.x + graph.shiftX - nodeWidth / 2}
            y={node.y + graph.shiftY - nodeHeight / 2}
          >
            <Rect
              width={nodeWidth}
              height={nodeHeight}
              rx={10}
              ry={10}
              fill={selected ? palette.selectedFill : palette.fill}
              stroke={selected ? palette.selectedStroke : palette.stroke}
              strokeWidth={selected ? 2 : 1}
            />
            <SvgText
              x={10}
              y={24}
              fill={palette.text}
              fontSize={13}
              fontWeight="700"
            >
              {node.data.name.length > 14
                ? `${node.data.name.slice(0, 14)}…`
                : node.data.name}
            </SvgText>
            <SvgText x={10} y={42} fill={palette.textMuted} fontSize={12}>
              {node.data.birthYear ? `b. ${node.data.birthYear}` : "Family"}
            </SvgText>
          </G>
        );
      })}

      {graph.nodes.map((node) => (
        <Pressable
          key={`hitbox-node-${node.data.id}`}
          onPress={() => onSelectPerson(node.data.id)}
          style={{
            position: "absolute",
            left: node.x + graph.shiftX - nodeWidth / 2,
            top: node.y + graph.shiftY - nodeHeight / 2,
            width: nodeWidth,
            height: nodeHeight,
            backgroundColor: "transparent",
          }}
          accessibilityRole="button"
          accessibilityLabel={`Focus ${node.data.name}`}
        />
      ))}
    </>
  );
}

export default function TreeTabScreen() {
  const router = useRouter();
  const [selectedPersonId, setSelectedPersonId] = useState<string>(() =>
    findBestInitialPersonId()
  );
  const [chartMode, setChartMode] = useState<ChartMode>("tree");
  const peopleById = useMemo(
    () => new Map(PEOPLE_FIXTURE.map((person) => [person.id, person])),
    []
  );
  const selectedPerson = peopleById.get(selectedPersonId) ?? PEOPLE_FIXTURE[0];

  const descendantGraph = useMemo(() => {
    if (!selectedPerson?.id) {
      return null;
    }

    const childrenByParent = buildChildrenMap();
    const rootData = buildTree(
      selectedPerson.id,
      peopleById,
      childrenByParent,
      5
    );
    if (!rootData) {
      return null;
    }

    return layoutTreeGraph(rootData);
  }, [peopleById, selectedPerson?.id]);

  const ancestorGraph = useMemo(() => {
    if (!selectedPerson?.id) {
      return null;
    }

    const parentsByChild = buildParentMap();
    const rootData = buildTree(
      selectedPerson.id,
      peopleById,
      parentsByChild,
      5
    );
    if (!rootData) {
      return null;
    }

    return layoutTreeGraph(rootData);
  }, [peopleById, selectedPerson?.id]);

  const bowtieGraphs = useMemo(() => {
    if (!selectedPerson?.id) {
      return null;
    }

    const parentsByChild = buildParentMap();
    const parentIds = Array.from(parentsByChild.get(selectedPerson.id) ?? []);

    const leftRoot = parentIds[0]
      ? buildTree(parentIds[0], peopleById, parentsByChild, 4)
      : undefined;
    const rightRoot = parentIds[1]
      ? buildTree(parentIds[1], peopleById, parentsByChild, 4)
      : undefined;

    return {
      left: leftRoot ? layoutTreeGraph(leftRoot, 112, 52) : null,
      right: rightRoot ? layoutTreeGraph(rightRoot, 112, 52) : null,
    };
  }, [peopleById, selectedPerson?.id]);

  const fanChart = useMemo(() => {
    if (!selectedPerson?.id) {
      return null;
    }

    const parentsByChild = buildParentMap();
    const rootData = buildTree(
      selectedPerson.id,
      peopleById,
      parentsByChild,
      4
    );
    if (!rootData) {
      return null;
    }

    const radialRoot = hierarchy(rootData);
    const radial = cluster<TreeDatum>().size([Math.PI, 260]);
    const positioned = radial(radialRoot);
    const nodes = positioned.descendants();
    const nodePositions = nodes.map((node) => {
      const theta = node.x - Math.PI / 2;
      return {
        id: node.data.id,
        name: node.data.name,
        birthYear: node.data.birthYear,
        x: node.y * Math.cos(theta),
        y: node.y * Math.sin(theta),
      };
    });
    const nodeById = new Map(nodePositions.map((item) => [item.id, item]));
    const linkPositions = positioned.links().flatMap((link) => {
      const source = nodeById.get(link.source.data.id);
      const target = nodeById.get(link.target.data.id);
      if (!source || !target) {
        return [];
      }

      return [
        {
          id: `${link.source.data.id}:${link.target.data.id}`,
          source,
          target,
        },
      ];
    });

    const bounds = calculateBoundingBox(
      nodePositions.map((node) => ({ x: node.x, y: node.y }))
    );

    return {
      nodes: nodePositions,
      links: linkPositions,
      width: bounds.width + 180,
      height: bounds.height + 180,
      shiftX: 90 - bounds.minX,
      shiftY: 90 - bounds.minY,
    };
  }, [peopleById, selectedPerson?.id]);

  const compactRows = useMemo(() => {
    if (!selectedPerson?.id) {
      return [] as Array<{
        id: string;
        depth: number;
        name: string;
        birthYear?: number;
      }>;
    }

    const childrenByParent = buildChildrenMap();
    const rootData = buildTree(
      selectedPerson.id,
      peopleById,
      childrenByParent,
      6
    );
    if (!rootData) {
      return [];
    }

    const root = hierarchy(rootData);
    const rows: Array<{
      id: string;
      depth: number;
      name: string;
      birthYear?: number;
    }> = [];
    root.each((node) => {
      rows.push({
        id: node.data.id,
        depth: node.depth,
        name: node.data.name,
        birthYear: node.data.birthYear,
      });
    });

    return rows;
  }, [peopleById, selectedPerson?.id]);

  const generationDistribution = useMemo(() => {
    const counts = new Map<number, number>();

    PEOPLE_FIXTURE.forEach((person) => {
      const generation = relationToGeneration(person.relation);
      counts.set(generation, (counts.get(generation) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([generation, count]) => ({
        generation,
        label: generationLabel(generation),
        count,
      }));
  }, []);

  const generationChart = useMemo(() => {
    const width = Math.max(560, generationDistribution.length * 120);
    const height = 320;
    const margin = { top: 28, right: 20, bottom: 72, left: 48 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const x = scaleBand<string>()
      .domain(generationDistribution.map((item) => item.label))
      .range([margin.left, margin.left + plotWidth])
      .padding(0.3);

    const y = scaleLinear()
      .domain([0, max(generationDistribution, (item) => item.count) ?? 1])
      .nice()
      .range([margin.top + plotHeight, margin.top]);

    return {
      width,
      height,
      x,
      y,
      margin,
      ticks: y.ticks(5),
    };
  }, [generationDistribution]);

  const timelineChart = useMemo(() => {
    const peopleWithBirth = PEOPLE_FIXTURE.filter(
      (person) => typeof person.birthYear === "number"
    ).sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0));

    if (peopleWithBirth.length === 0) {
      return null;
    }

    const minYear = (peopleWithBirth[0]?.birthYear ?? 1900) - 2;
    const maxYear =
      (peopleWithBirth[peopleWithBirth.length - 1]?.birthYear ?? minYear) + 2;

    const width = 1100;
    const height = Math.max(380, peopleWithBirth.length * 24 + 80);
    const margin = { top: 24, right: 24, bottom: 24, left: 170 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const x = scaleLinear()
      .domain([minYear, maxYear])
      .range([margin.left, margin.left + plotWidth]);
    const y = scaleBand<string>()
      .domain(peopleWithBirth.map((person) => person.id))
      .range([margin.top, margin.top + plotHeight])
      .padding(0.35);

    return {
      width,
      height,
      x,
      y,
      people: peopleWithBirth,
      ticks: x.ticks(8),
      margin,
    };
  }, []);

  const matrixChart = useMemo(() => {
    const people = PEOPLE_FIXTURE.slice(0, 14);
    const ids = people.map((person) => person.id);

    const relationships = new Map<string, string>();
    RELATIONSHIP_FIXTURE.forEach((relationship) => {
      const key = `${relationship.personId}:${relationship.relatedPersonId}`;
      relationships.set(key, relationship.type);
    });

    const size = 34;
    const margin = 130;
    return {
      people,
      ids,
      relationships,
      size,
      width: margin + ids.length * size + 40,
      height: margin + ids.length * size + 40,
      margin,
    };
  }, []);

  const statistics = useMemo(() => {
    const byRelation = new Map<string, number>();
    PEOPLE_FIXTURE.forEach((person) => {
      byRelation.set(
        person.relation,
        (byRelation.get(person.relation) ?? 0) + 1
      );
    });

    const relationStats = Array.from(byRelation.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));

    const livingEstimate = PEOPLE_FIXTURE.filter(
      (person) => (person.birthYear ?? 0) >= 1960
    ).length;
    const deceasedEstimate = PEOPLE_FIXTURE.length - livingEstimate;

    return {
      totalPeople: PEOPLE_FIXTURE.length,
      totalRelationships: RELATIONSHIP_FIXTURE.length,
      livingEstimate,
      deceasedEstimate,
      relationStats,
    };
  }, []);

  const metadata = useMemo(() => {
    const years = PEOPLE_FIXTURE.map((person) => person.birthYear).filter(
      (year): year is number => typeof year === "number"
    );
    const generationSet = new Set(
      PEOPLE_FIXTURE.map((person) => relationToGeneration(person.relation))
    );

    return {
      chartType: CHART_NAMES[chartMode],
      totalPeople: PEOPLE_FIXTURE.length,
      totalGenerations: generationSet.size,
      minYear: years.length > 0 ? Math.min(...years) : undefined,
      maxYear: years.length > 0 ? Math.max(...years) : undefined,
      totalRelationships: RELATIONSHIP_FIXTURE.length,
      paternalCount: bowtieGraphs?.left?.nodes.length ?? 0,
      maternalCount: bowtieGraphs?.right?.nodes.length ?? 0,
    };
  }, [
    bowtieGraphs?.left?.nodes.length,
    bowtieGraphs?.right?.nodes.length,
    chartMode,
  ]);

  const legendItems = useMemo(() => {
    if (chartMode === "timeline") {
      return [
        { color: "#2563eb", label: "Selected person marker" },
        { color: "#64748b", label: "Family member marker" },
        { color: "#cbd5e1", label: "Birth line" },
      ];
    }

    if (chartMode === "matrix") {
      return [
        { color: "#60a5fa", label: "Parent" },
        { color: "#34d399", label: "Child" },
        { color: "#f59e0b", label: "Spouse" },
        { color: "#a78bfa", label: "Sibling" },
      ];
    }

    if (chartMode === "bowtie") {
      return [
        { color: "#fb7185", label: "Paternal side" },
        { color: "#3b82f6", label: "Maternal side" },
      ];
    }

    if (chartMode === "statistics") {
      return [{ color: "#38bdf8", label: "Top relation bars" }];
    }

    if (chartMode === "list" || chartMode === "compact") {
      return [];
    }

    return [
      { color: "#2563eb", label: "Selected person node" },
      { color: "#93c5fd", label: "Parent-child edge" },
      { color: "#ffffff", label: "Family node" },
    ];
  }, [chartMode]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: 16,
        backgroundColor: "#f9fafb",
        gap: 12,
      }}
    >
      <Text
        selectable
        style={{ fontSize: 28, fontWeight: "700", color: "#111827" }}
      >
        Family tree
      </Text>
      <Text selectable style={{ color: "#6b7280" }}>
        D3-powered family tree using the seeded dataset for larger rendering
        experiments.
      </Text>
      <Text selectable style={{ color: "#6b7280" }}>
        Source: local seeded fixture (30 people, 100+ relationships) • shared
        chart utils enabled
      </Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {(
          [
            { key: "tree", label: "Tree" },
            { key: "ancestor", label: "Ancestor" },
            { key: "descendant", label: "Descendant" },
            { key: "hourglass", label: "Hourglass" },
            { key: "fan", label: "Fan" },
            { key: "timeline", label: "Timeline" },
            { key: "matrix", label: "Matrix" },
            { key: "bowtie", label: "Bowtie" },
            { key: "compact", label: "Compact" },
            { key: "statistics", label: "Statistics" },
            { key: "list", label: "List" },
          ] as const
        ).map((item) => {
          const selected = chartMode === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setChartMode(item.key)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selected ? "#1d4ed8" : "#d1d5db",
                backgroundColor: selected ? "#dbeafe" : "#fff",
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text
                selectable
                style={{
                  color: selected ? "#1d4ed8" : "#374151",
                  fontWeight: "700",
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: "#111827", fontWeight: "700" }}>
          Focus person
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8, paddingRight: 8 }}>
            {PEOPLE_FIXTURE.map((person) => {
              const selected = person.id === selectedPerson?.id;
              return (
                <Pressable
                  key={person.id}
                  onPress={() => setSelectedPersonId(person.id)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? "#1d4ed8" : "#d1d5db",
                    backgroundColor: selected ? "#dbeafe" : "#fff",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    selectable
                    style={{
                      color: selected ? "#1d4ed8" : "#374151",
                      fontWeight: selected ? "700" : "600",
                    }}
                  >
                    {getDisplayName(person)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {selectedPerson ? (
        <View style={{ gap: 10 }}>
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#d1d5db",
              backgroundColor: "#fff",
              padding: 14,
              gap: 8,
            }}
          >
            <Text selectable style={{ color: "#6b7280" }}>
              Current node
            </Text>
            <Text
              selectable
              style={{ color: "#111827", fontSize: 20, fontWeight: "700" }}
            >
              {getDisplayName(selectedPerson)}
            </Text>
            <Text selectable style={{ color: "#6b7280" }}>
              {selectedPerson.relation}
              {selectedPerson.birthYear
                ? ` • Born ${selectedPerson.birthYear}`
                : ""}
              {selectedPerson.city ? ` • ${selectedPerson.city}` : ""}
            </Text>
            <Pressable
              onPress={() => router.push(`/person/${selectedPerson.id}`)}
              style={{
                alignSelf: "flex-start",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: "#2563eb",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Open profile
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#d1d5db",
              backgroundColor: "#fff",
              padding: 14,
              gap: 10,
            }}
          >
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                backgroundColor: "#f8fafc",
                padding: 10,
                gap: 8,
              }}
            >
              <Text selectable style={{ color: "#111827", fontWeight: "700" }}>
                Chart stats
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <Text selectable style={{ color: "#475569" }}>
                  Type: {metadata.chartType}
                </Text>
                <Text selectable style={{ color: "#475569" }}>
                  People: {metadata.totalPeople}
                </Text>
                <Text selectable style={{ color: "#475569" }}>
                  Generations: {metadata.totalGenerations}
                </Text>
                {chartMode === "timeline" &&
                metadata.minYear &&
                metadata.maxYear ? (
                  <Text selectable style={{ color: "#475569" }}>
                    Year range: {metadata.minYear} - {metadata.maxYear}
                  </Text>
                ) : null}
                {chartMode === "matrix" ? (
                  <Text selectable style={{ color: "#475569" }}>
                    Relationships: {metadata.totalRelationships}
                  </Text>
                ) : null}
                {chartMode === "bowtie" ? (
                  <Text selectable style={{ color: "#475569" }}>
                    Paternal/Maternal: {metadata.paternalCount}/
                    {metadata.maternalCount}
                  </Text>
                ) : null}
              </View>
            </View>

            {legendItems.length > 0 ? (
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  backgroundColor: "#ffffff",
                  padding: 10,
                  gap: 8,
                }}
              >
                <Text
                  selectable
                  style={{ color: "#111827", fontWeight: "700" }}
                >
                  Legend
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  {legendItems.map((item) => (
                    <View
                      key={item.label}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: item.color,
                          borderWidth: 1,
                          borderColor: "#cbd5e1",
                        }}
                      />
                      <Text
                        selectable
                        style={{ color: "#475569", fontSize: 12 }}
                      >
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <Text
              selectable
              style={{ color: "#111827", fontSize: 18, fontWeight: "700" }}
            >
              {chartMode === "tree"
                ? "Tree graph"
                : chartMode === "ancestor"
                  ? "Ancestor chart"
                  : chartMode === "descendant"
                    ? "Descendant chart"
                    : chartMode === "hourglass"
                      ? "Hourglass chart"
                      : chartMode === "fan"
                        ? "Fan chart"
                        : chartMode === "timeline"
                          ? "Timeline chart"
                          : chartMode === "matrix"
                            ? "Relationship matrix"
                            : chartMode === "bowtie"
                              ? "Bowtie chart"
                              : chartMode === "compact"
                                ? "Compact tree"
                                : chartMode === "statistics"
                                  ? "Statistics"
                                  : "List view"}
            </Text>
            <Text selectable style={{ color: "#6b7280" }}>
              Web-chart parity modes for mobile using seeded genealogy data.
            </Text>

            {(chartMode === "tree" || chartMode === "descendant") &&
            descendantGraph ? (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <ScrollView showsVerticalScrollIndicator>
                  <View
                    style={{
                      width: descendantGraph.width,
                      height: descendantGraph.height,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      backgroundColor: "#f8fafc",
                      overflow: "hidden",
                    }}
                  >
                    <Svg
                      width={descendantGraph.width}
                      height={descendantGraph.height}
                    >
                      {descendantGraph.links.map((link, index) => (
                        <Line
                          key={`link-${index}`}
                          x1={link.source.x + descendantGraph.shiftX}
                          y1={
                            link.source.y + descendantGraph.shiftY + NODE_H / 2
                          }
                          x2={link.target.x + descendantGraph.shiftX}
                          y2={
                            link.target.y + descendantGraph.shiftY - NODE_H / 2
                          }
                          stroke="#93c5fd"
                          strokeWidth={2}
                        />
                      ))}

                      {descendantGraph.nodes.map((node) => {
                        const selected = node.data.id === selectedPerson.id;

                        return (
                          <G
                            key={node.data.id}
                            x={node.x + descendantGraph.shiftX - NODE_W / 2}
                            y={node.y + descendantGraph.shiftY - NODE_H / 2}
                          >
                            <Rect
                              width={NODE_W}
                              height={NODE_H}
                              rx={10}
                              ry={10}
                              fill={selected ? "#dbeafe" : "#ffffff"}
                              stroke={selected ? "#2563eb" : "#cbd5e1"}
                              strokeWidth={selected ? 2 : 1}
                            />
                            <SvgText
                              x={10}
                              y={24}
                              fill={selected ? "#1d4ed8" : "#111827"}
                              fontSize={14}
                              fontWeight="700"
                            >
                              {node.data.name.length > 14
                                ? `${node.data.name.slice(0, 14)}…`
                                : node.data.name}
                            </SvgText>
                            <SvgText x={10} y={42} fill="#64748b" fontSize={12}>
                              {node.data.birthYear
                                ? `b. ${node.data.birthYear}`
                                : "Family"}
                            </SvgText>
                          </G>
                        );
                      })}
                    </Svg>
                    {descendantGraph.nodes.map((node) => (
                      <Pressable
                        key={`hitbox-${node.data.id}`}
                        onPress={() => setSelectedPersonId(node.data.id)}
                        style={{
                          position: "absolute",
                          left: node.x + descendantGraph.shiftX - NODE_W / 2,
                          top: node.y + descendantGraph.shiftY - NODE_H / 2,
                          width: NODE_W,
                          height: NODE_H,
                          backgroundColor: "transparent",
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Focus ${node.data.name}`}
                      />
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>
            ) : null}

            {chartMode === "ancestor" && ancestorGraph ? (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View
                  style={{
                    width: ancestorGraph.width,
                    height: ancestorGraph.height,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    backgroundColor: "#f8fafc",
                    overflow: "hidden",
                  }}
                >
                  <Svg
                    width={ancestorGraph.width}
                    height={ancestorGraph.height}
                  >
                    {ancestorGraph.links.map((link, index) => (
                      <Line
                        key={`ancestor-link-${index}`}
                        x1={link.source.x + ancestorGraph.shiftX}
                        y1={link.source.y + ancestorGraph.shiftY + NODE_H / 2}
                        x2={link.target.x + ancestorGraph.shiftX}
                        y2={link.target.y + ancestorGraph.shiftY - NODE_H / 2}
                        stroke="#f59e0b"
                        strokeWidth={2}
                      />
                    ))}
                    <GraphNodes
                      graph={ancestorGraph}
                      selectedPersonId={selectedPerson.id}
                      onSelectPerson={setSelectedPersonId}
                      palette={{
                        selectedFill: "#fde68a",
                        selectedStroke: "#d97706",
                        fill: "#fffbeb",
                        stroke: "#fbbf24",
                        text: "#92400e",
                        textMuted: "#b45309",
                      }}
                    />
                  </Svg>
                </View>
              </ScrollView>
            ) : null}

            {chartMode === "hourglass" ? (
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    alignSelf: "center",
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#2563eb",
                    backgroundColor: "#dbeafe",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    selectable
                    style={{ color: "#1d4ed8", fontWeight: "700" }}
                  >
                    Focus: {getDisplayName(selectedPerson)}
                  </Text>
                </View>
                <Text
                  selectable
                  style={{ color: "#475569", fontWeight: "700" }}
                >
                  Ancestors
                </Text>
                {ancestorGraph ? (
                  <ScrollView horizontal>
                    <View
                      style={{
                        width: ancestorGraph.width,
                        height: ancestorGraph.height,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <Svg
                        width={ancestorGraph.width}
                        height={ancestorGraph.height}
                      >
                        {ancestorGraph.links.map((link, index) => (
                          <Line
                            key={`h-a-${index}`}
                            x1={link.source.x + ancestorGraph.shiftX}
                            y1={
                              link.source.y + ancestorGraph.shiftY + NODE_H / 2
                            }
                            x2={link.target.x + ancestorGraph.shiftX}
                            y2={
                              link.target.y + ancestorGraph.shiftY - NODE_H / 2
                            }
                            stroke="#fb923c"
                            strokeWidth={2}
                          />
                        ))}
                        <GraphNodes
                          graph={ancestorGraph}
                          selectedPersonId={selectedPerson.id}
                          onSelectPerson={setSelectedPersonId}
                          palette={{
                            selectedFill: "#fed7aa",
                            selectedStroke: "#ea580c",
                            fill: "#fff7ed",
                            stroke: "#fdba74",
                            text: "#9a3412",
                            textMuted: "#c2410c",
                          }}
                        />
                      </Svg>
                    </View>
                  </ScrollView>
                ) : null}
                <Text
                  selectable
                  style={{ color: "#475569", fontWeight: "700" }}
                >
                  Descendants
                </Text>
                {descendantGraph ? (
                  <ScrollView horizontal>
                    <View
                      style={{
                        width: descendantGraph.width,
                        height: descendantGraph.height,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <Svg
                        width={descendantGraph.width}
                        height={descendantGraph.height}
                      >
                        {descendantGraph.links.map((link, index) => (
                          <Line
                            key={`h-d-${index}`}
                            x1={link.source.x + descendantGraph.shiftX}
                            y1={
                              link.source.y +
                              descendantGraph.shiftY +
                              NODE_H / 2
                            }
                            x2={link.target.x + descendantGraph.shiftX}
                            y2={
                              link.target.y +
                              descendantGraph.shiftY -
                              NODE_H / 2
                            }
                            stroke="#38bdf8"
                            strokeWidth={2}
                          />
                        ))}
                        <GraphNodes
                          graph={descendantGraph}
                          selectedPersonId={selectedPerson.id}
                          onSelectPerson={setSelectedPersonId}
                          palette={{
                            selectedFill: "#dbeafe",
                            selectedStroke: "#2563eb",
                            fill: "#eff6ff",
                            stroke: "#93c5fd",
                            text: "#1e3a8a",
                            textMuted: "#1d4ed8",
                          }}
                        />
                      </Svg>
                    </View>
                  </ScrollView>
                ) : null}
              </View>
            ) : null}

            {chartMode === "fan" && fanChart ? (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    backgroundColor: "#f8fafc",
                    overflow: "hidden",
                  }}
                >
                  <Svg width={fanChart.width} height={fanChart.height}>
                    {fanChart.links.map((link, index) => {
                      return (
                        <Line
                          key={`fan-link-${index}`}
                          x1={link.source.x + fanChart.shiftX}
                          y1={link.source.y + fanChart.shiftY}
                          x2={link.target.x + fanChart.shiftX}
                          y2={link.target.y + fanChart.shiftY}
                          stroke="#a78bfa"
                          strokeWidth={1.8}
                        />
                      );
                    })}
                    {fanChart.nodes.map((node) => {
                      return (
                        <G
                          key={`fan-node-${node.id}`}
                          x={node.x + fanChart.shiftX - 6}
                          y={node.y + fanChart.shiftY - 6}
                        >
                          <Rect
                            width={12}
                            height={12}
                            rx={6}
                            ry={6}
                            fill={
                              node.id === selectedPerson.id
                                ? "#7c3aed"
                                : "#c4b5fd"
                            }
                          />
                        </G>
                      );
                    })}
                  </Svg>
                  {fanChart.nodes.map((node) => (
                    <Pressable
                      key={`fan-hit-${node.id}`}
                      onPress={() => setSelectedPersonId(node.id)}
                      style={{
                        position: "absolute",
                        left: node.x + fanChart.shiftX - 12,
                        top: node.y + fanChart.shiftY - 12,
                        width: 24,
                        height: 24,
                        backgroundColor: "transparent",
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Focus ${node.name}`}
                    />
                  ))}
                </View>
              </ScrollView>
            ) : null}

            {chartMode === "statistics" ? (
              <View style={{ gap: 10 }}>
                <View
                  style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}
                >
                  <View
                    style={{
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                      backgroundColor: "#f8fafc",
                      padding: 10,
                    }}
                  >
                    <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                      Total people
                    </Text>
                    <Text
                      selectable
                      style={{
                        color: "#0f172a",
                        fontSize: 20,
                        fontWeight: "700",
                      }}
                    >
                      {statistics.totalPeople}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                      backgroundColor: "#f8fafc",
                      padding: 10,
                    }}
                  >
                    <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                      Relationships
                    </Text>
                    <Text
                      selectable
                      style={{
                        color: "#0f172a",
                        fontSize: 20,
                        fontWeight: "700",
                      }}
                    >
                      {statistics.totalRelationships}
                    </Text>
                  </View>
                </View>

                <ScrollView horizontal>
                  <Svg
                    width={generationChart.width}
                    height={generationChart.height}
                  >
                    {generationChart.ticks.map((tick) => {
                      const y = generationChart.y(tick);
                      return (
                        <Line
                          key={`stats-tick-${tick}`}
                          x1={generationChart.margin.left}
                          y1={y}
                          x2={
                            generationChart.width - generationChart.margin.right
                          }
                          y2={y}
                          stroke="#e5e7eb"
                          strokeWidth={1}
                        />
                      );
                    })}
                    {statistics.relationStats.map((item, idx) => {
                      const x = generationChart.margin.left + idx * 90;
                      const y = generationChart.y(item.count);
                      const barHeight = generationChart.y(0) - y;
                      return (
                        <G key={`stats-bar-${item.label}`}>
                          <Rect
                            x={x}
                            y={y}
                            width={64}
                            height={barHeight}
                            rx={8}
                            fill="#38bdf8"
                          />
                          <SvgText
                            x={x + 32}
                            y={y - 6}
                            textAnchor="middle"
                            fill="#0c4a6e"
                            fontSize={11}
                          >
                            {item.count}
                          </SvgText>
                        </G>
                      );
                    })}
                  </Svg>
                </ScrollView>
              </View>
            ) : null}

            {chartMode === "timeline" ? (
              timelineChart ? (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <ScrollView showsVerticalScrollIndicator>
                    <View
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        backgroundColor: "#f8fafc",
                        overflow: "hidden",
                      }}
                    >
                      <Svg
                        width={timelineChart.width}
                        height={timelineChart.height}
                      >
                        {timelineChart.ticks.map((tick) => {
                          const x = timelineChart.x(tick);
                          return (
                            <G key={`timeline-tick-${tick}`}>
                              <Line
                                x1={x}
                                y1={timelineChart.margin.top}
                                x2={x}
                                y2={
                                  timelineChart.height -
                                  timelineChart.margin.bottom
                                }
                                stroke="#e2e8f0"
                                strokeWidth={1}
                              />
                              <SvgText
                                x={x}
                                y={timelineChart.margin.top - 6}
                                fill="#64748b"
                                fontSize={10}
                                textAnchor="middle"
                              >
                                {Math.round(tick)}
                              </SvgText>
                            </G>
                          );
                        })}

                        {timelineChart.people.map((person) => {
                          const y =
                            (timelineChart.y(person.id) ?? 0) +
                            timelineChart.y.bandwidth() / 2;
                          const x = timelineChart.x(person.birthYear ?? 0);
                          const selected = selectedPerson?.id === person.id;

                          return (
                            <G key={`timeline-person-${person.id}`}>
                              <Line
                                x1={timelineChart.margin.left}
                                y1={y}
                                x2={x}
                                y2={y}
                                stroke={selected ? "#60a5fa" : "#cbd5e1"}
                                strokeWidth={selected ? 2.5 : 1.2}
                              />
                              <Rect
                                x={x - 5}
                                y={y - 5}
                                width={10}
                                height={10}
                                rx={5}
                                fill={selected ? "#2563eb" : "#64748b"}
                              />
                              <SvgText
                                x={timelineChart.margin.left - 8}
                                y={y + 4}
                                fill={selected ? "#1d4ed8" : "#334155"}
                                fontSize={11}
                                textAnchor="end"
                              >
                                {getDisplayName(person)}
                              </SvgText>
                            </G>
                          );
                        })}
                      </Svg>

                      {timelineChart.people.map((person) => {
                        const y = timelineChart.y(person.id) ?? 0;
                        return (
                          <Pressable
                            key={`timeline-hitbox-${person.id}`}
                            onPress={() => setSelectedPersonId(person.id)}
                            style={{
                              position: "absolute",
                              left: 0,
                              top: y,
                              width: timelineChart.width,
                              height: timelineChart.y.bandwidth(),
                              backgroundColor: "transparent",
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Focus ${getDisplayName(person)}`}
                          />
                        );
                      })}
                    </View>
                  </ScrollView>
                </ScrollView>
              ) : (
                <Text selectable style={{ color: "#6b7280" }}>
                  No timeline data available.
                </Text>
              )
            ) : null}

            {chartMode === "matrix" ? (
              <View style={{ gap: 8 }}>
                <ScrollView horizontal>
                  <ScrollView>
                    <Svg width={matrixChart.width} height={matrixChart.height}>
                      {matrixChart.people.map((row, r) =>
                        matrixChart.people.map((col, c) => {
                          const x = matrixChart.margin + c * matrixChart.size;
                          const y = matrixChart.margin + r * matrixChart.size;
                          const rel = matrixChart.relationships.get(
                            `${row.id}:${col.id}`
                          );
                          const fill =
                            rel === "PARENT"
                              ? "#60a5fa"
                              : rel === "CHILD"
                                ? "#34d399"
                                : rel === "SPOUSE"
                                  ? "#f59e0b"
                                  : rel === "SIBLING"
                                    ? "#a78bfa"
                                    : "#f1f5f9";
                          return (
                            <Rect
                              key={`m-${row.id}-${col.id}`}
                              x={x}
                              y={y}
                              width={matrixChart.size - 2}
                              height={matrixChart.size - 2}
                              fill={fill}
                            />
                          );
                        })
                      )}
                      {matrixChart.people.map((person, i) => (
                        <SvgText
                          key={`m-row-${person.id}`}
                          x={matrixChart.margin - 8}
                          y={matrixChart.margin + i * matrixChart.size + 22}
                          textAnchor="end"
                          fill="#475569"
                          fontSize={10}
                        >
                          {person.firstName}
                        </SvgText>
                      ))}
                      {matrixChart.people.map((person, i) => (
                        <SvgText
                          key={`m-col-${person.id}`}
                          x={matrixChart.margin + i * matrixChart.size + 16}
                          y={matrixChart.margin - 8}
                          textAnchor="start"
                          fill="#475569"
                          fontSize={10}
                          transform={`rotate(-45 ${matrixChart.margin + i * matrixChart.size + 16} ${matrixChart.margin - 8})`}
                        >
                          {person.firstName}
                        </SvgText>
                      ))}
                    </Svg>
                  </ScrollView>
                </ScrollView>
                <Text selectable style={{ color: "#6b7280", fontSize: 12 }}>
                  Matrix compares each visible person pair. Color indicates
                  relationship type.
                </Text>
              </View>
            ) : null}

            {chartMode === "compact" || chartMode === "list" ? (
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  backgroundColor: "#f8fafc",
                  padding: 10,
                  gap: 6,
                }}
              >
                {compactRows.map((row) => (
                  <Pressable
                    key={`${chartMode}-${row.id}`}
                    onPress={() => setSelectedPersonId(row.id)}
                    style={{
                      paddingLeft: row.depth * 14 + 8,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor:
                        row.id === selectedPerson.id
                          ? "#dbeafe"
                          : "transparent",
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        color:
                          row.id === selectedPerson.id ? "#1d4ed8" : "#334155",
                        fontWeight: row.depth === 0 ? "700" : "500",
                      }}
                    >
                      {row.name} {row.birthYear ? `(${row.birthYear})` : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {chartMode === "bowtie" ? (
              <View style={{ gap: 8 }}>
                <Text selectable style={{ color: "#6b7280", fontSize: 12 }}>
                  Left = paternal ancestry, right = maternal ancestry.
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}
                >
                  {bowtieGraphs?.left ? (
                    <ScrollView horizontal>
                      <View
                        style={{
                          width: bowtieGraphs.left.width,
                          height: bowtieGraphs.left.height,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#fca5a5",
                          backgroundColor: "#fff1f2",
                          overflow: "hidden",
                        }}
                      >
                        <Svg
                          width={bowtieGraphs.left.width}
                          height={bowtieGraphs.left.height}
                        >
                          {bowtieGraphs.left.links.map((link, idx) => (
                            <Line
                              key={`bow-l-${idx}`}
                              x1={link.source.x + bowtieGraphs.left!.shiftX}
                              y1={
                                link.source.y + bowtieGraphs.left!.shiftY + 26
                              }
                              x2={link.target.x + bowtieGraphs.left!.shiftX}
                              y2={
                                link.target.y + bowtieGraphs.left!.shiftY - 26
                              }
                              stroke="#fb7185"
                              strokeWidth={1.8}
                            />
                          ))}
                          <GraphNodes
                            graph={bowtieGraphs.left}
                            selectedPersonId={selectedPerson.id}
                            onSelectPerson={setSelectedPersonId}
                            nodeWidth={112}
                            nodeHeight={52}
                            palette={{
                              selectedFill: "#fecdd3",
                              selectedStroke: "#e11d48",
                              fill: "#fff1f2",
                              stroke: "#fda4af",
                              text: "#9f1239",
                              textMuted: "#be123c",
                            }}
                          />
                        </Svg>
                      </View>
                    </ScrollView>
                  ) : null}
                  {bowtieGraphs?.right ? (
                    <ScrollView horizontal>
                      <View
                        style={{
                          width: bowtieGraphs.right.width,
                          height: bowtieGraphs.right.height,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#93c5fd",
                          backgroundColor: "#eff6ff",
                          overflow: "hidden",
                        }}
                      >
                        <Svg
                          width={bowtieGraphs.right.width}
                          height={bowtieGraphs.right.height}
                        >
                          {bowtieGraphs.right.links.map((link, idx) => (
                            <Line
                              key={`bow-r-${idx}`}
                              x1={link.source.x + bowtieGraphs.right!.shiftX}
                              y1={
                                link.source.y + bowtieGraphs.right!.shiftY + 26
                              }
                              x2={link.target.x + bowtieGraphs.right!.shiftX}
                              y2={
                                link.target.y + bowtieGraphs.right!.shiftY - 26
                              }
                              stroke="#3b82f6"
                              strokeWidth={1.8}
                            />
                          ))}
                          <GraphNodes
                            graph={bowtieGraphs.right}
                            selectedPersonId={selectedPerson.id}
                            onSelectPerson={setSelectedPersonId}
                            nodeWidth={112}
                            nodeHeight={52}
                            palette={{
                              selectedFill: "#bfdbfe",
                              selectedStroke: "#1d4ed8",
                              fill: "#eff6ff",
                              stroke: "#93c5fd",
                              text: "#1e3a8a",
                              textMuted: "#1d4ed8",
                            }}
                          />
                        </Svg>
                      </View>
                    </ScrollView>
                  ) : null}
                </View>
                {!bowtieGraphs?.left && !bowtieGraphs?.right ? (
                  <Text selectable style={{ color: "#6b7280" }}>
                    No parent branches found for this person yet.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {(["tree", "descendant"] as const).includes(
              chartMode as "tree" | "descendant"
            ) && !descendantGraph ? (
              <Text selectable style={{ color: "#6b7280" }}>
                Could not build tree data for this person.
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#d1d5db",
            backgroundColor: "#fff",
            padding: 14,
          }}
        >
          <Text selectable style={{ color: "#6b7280" }}>
            No people available to visualize.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
