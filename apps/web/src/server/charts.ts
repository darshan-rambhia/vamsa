/**
 * Family Tree Chart Server Functions
 *
 * This module provides server-side functions for generating different genealogy chart data structures.
 * All functions return optimized data for D3.js or React Flow visualization.
 *
 * Functions:
 * - getAncestorChart: Ancestors going back N generations (max 10)
 * - getDescendantChart: Descendants going forward N generations (max 10)
 * - getHourglassChart: Both ancestors and descendants combined
 * - getFanChart: Ancestors in radial/fan layout pattern
 *
 * All functions:
 * - Require authentication (VIEWER role or higher)
 * - Validate input with Zod schemas
 * - Return ChartNode[] and ChartEdge[] for rendering
 * - Include spouse relationships where relevant
 * - Calculate generation levels for proper positioning
 * - Deduplicate edges automatically
 * - Handle edge cases (missing persons, no relationships)
 */

import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";
import { requireAuth } from "./middleware/require-auth";
import { recordChartMetrics } from "../../server/metrics/application";

// Types for chart data structures
export interface ChartNode {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  dateOfPassing: string | null;
  isLiving: boolean;
  photoUrl: string | null;
  gender: string | null;
  generation?: number;
  angle?: number; // For fan charts
}

export interface ChartEdge {
  id: string;
  source: string;
  target: string;
  type: "parent-child" | "spouse";
  isDivorced?: boolean;
}

export interface ChartLayoutResult {
  nodes: ChartNode[];
  edges: ChartEdge[];
  metadata: {
    chartType: string;
    totalGenerations: number;
    totalPeople: number;
    rootPersonId: string;
  };
}

// Timeline chart types
export interface TimelineEntry {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number | null;
  deathYear: number | null;
  isLiving: boolean;
  gender: string | null;
  photoUrl: string | null;
}

export interface TimelineChartResult {
  entries: TimelineEntry[];
  metadata: {
    chartType: "timeline";
    minYear: number;
    maxYear: number;
    totalPeople: number;
  };
}

// Relationship matrix types
export interface MatrixCell {
  personId: string;
  relatedPersonId: string;
  relationshipType: string | null;
  strength: number; // 0 = no relation, 1 = direct, 0.5 = indirect
}

export interface MatrixPerson {
  id: string;
  firstName: string;
  lastName: string;
  gender: string | null;
}

export interface RelationshipMatrixResult {
  people: MatrixPerson[];
  matrix: MatrixCell[];
  metadata: {
    chartType: "matrix";
    totalPeople: number;
    totalRelationships: number;
  };
}

// Bowtie chart types (paternal on left, maternal on right)
export interface BowtieNode extends ChartNode {
  side: "paternal" | "maternal" | "center";
}

export interface BowtieChartResult {
  nodes: BowtieNode[];
  edges: ChartEdge[];
  metadata: {
    chartType: "bowtie";
    totalGenerations: number;
    totalPeople: number;
    rootPersonId: string;
    paternalCount: number;
    maternalCount: number;
  };
}

// Compact Tree types
export interface CompactTreeNode {
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
  children: CompactTreeNode[];
  spouses: Array<{
    id: string;
    firstName: string;
    lastName: string;
    isLiving: boolean;
  }>;
}

export interface CompactTreeResult {
  root: CompactTreeNode | null;
  flatList: Array<{
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
  }>;
  metadata: {
    chartType: "compact";
    totalPeople: number;
    totalGenerations: number;
    rootPersonId: string;
  };
}

// Statistics types
export interface AgeDistribution {
  bracket: string;
  count: number;
  percentage: number;
}

export interface GenerationSize {
  generation: number;
  count: number;
  livingCount: number;
  deceasedCount: number;
}

export interface GenderDistribution {
  gender: string;
  count: number;
  percentage: number;
}

export interface GeographicDistribution {
  location: string;
  count: number;
  percentage: number;
}

export interface SurnameFrequency {
  surname: string;
  count: number;
  percentage: number;
}

export interface LifespanTrend {
  decade: string;
  averageLifespan: number;
  sampleSize: number;
}

export interface StatisticsResult {
  ageDistribution: AgeDistribution[];
  generationSizes: GenerationSize[];
  genderDistribution: GenderDistribution[];
  geographicDistribution: GeographicDistribution[];
  surnameFrequency: SurnameFrequency[];
  lifespanTrends: LifespanTrend[];
  metadata: {
    chartType: "statistics";
    totalPeople: number;
    livingCount: number;
    deceasedCount: number;
    oldestPerson: {
      id: string;
      name: string;
      age: number;
    } | null;
    youngestPerson: {
      id: string;
      name: string;
      age: number;
    } | null;
  };
}

// Validation schemas
const ancestorChartSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(3),
});

const descendantChartSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(3),
});

const hourglassChartSchema = z.object({
  personId: z.string(),
  ancestorGenerations: z.number().int().min(1).max(10).default(2),
  descendantGenerations: z.number().int().min(1).max(10).default(2),
});

const fanChartSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(4),
});

const timelineChartSchema = z.object({
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  sortBy: z.enum(["birth", "death", "name"]).default("birth"),
});

const relationshipMatrixSchema = z.object({
  personIds: z.array(z.string()).optional(), // If not provided, use all people
  maxPeople: z.number().int().min(1).max(50).default(20),
});

const bowtieChartSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(3),
});

const compactTreeSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(5),
});

const statisticsSchema = z.object({
  // Optional filters
  includeDeceased: z.boolean().default(true),
});

/**
 * Helper function to build relationship maps
 */
function buildRelationshipMaps(
  relationships: Array<{
    type: string;
    personId: string;
    relatedPersonId: string;
  }>
) {
  const parentRels = relationships.filter((r) => r.type === "PARENT");
  const spouseRels = relationships.filter((r) => r.type === "SPOUSE");

  const childToParents = new Map<string, Set<string>>();
  const parentToChildren = new Map<string, Set<string>>();
  const spouseMap = new Map<string, Set<string>>();

  parentRels.forEach((rel) => {
    const childId = rel.personId;
    const parentId = rel.relatedPersonId;

    if (!childToParents.has(childId)) childToParents.set(childId, new Set());
    childToParents.get(childId)!.add(parentId);

    if (!parentToChildren.has(parentId))
      parentToChildren.set(parentId, new Set());
    parentToChildren.get(parentId)!.add(childId);
  });

  spouseRels.forEach((rel) => {
    if (!spouseMap.has(rel.personId)) spouseMap.set(rel.personId, new Set());
    if (!spouseMap.has(rel.relatedPersonId))
      spouseMap.set(rel.relatedPersonId, new Set());
    spouseMap.get(rel.personId)!.add(rel.relatedPersonId);
    spouseMap.get(rel.relatedPersonId)!.add(rel.personId);
  });

  return {
    childToParents,
    parentToChildren,
    spouseMap,
    spouseRels,
    parentRels,
  };
}

/**
 * Helper function to build ancestor chart data
 * Recursively collects ancestors going back N generations
 */
function collectAncestors(
  personId: string,
  currentGen: number,
  maxGen: number,
  childToParents: Map<string, Set<string>>,
  personMap: Map<
    string,
    {
      id: string;
      firstName: string;
      lastName: string;
      dateOfBirth: Date | null;
      dateOfPassing: Date | null;
      isLiving: boolean;
      photoUrl: string | null;
      gender: string | null;
    }
  >,
  spouseMap: Map<string, Set<string>>,
  collected: {
    nodeIds: Set<string>;
    edges: Map<string, { source: string; target: string; type: string }>;
    generations: Map<string, number>;
  }
) {
  if (currentGen > maxGen || !personId) return;

  // Add person if not already collected
  if (!collected.nodeIds.has(personId)) {
    collected.nodeIds.add(personId);
    collected.generations.set(personId, currentGen);
  }

  // Add spouses
  const spouses = spouseMap.get(personId);
  if (spouses) {
    spouses.forEach((spouseId) => {
      if (!collected.nodeIds.has(spouseId)) {
        collected.nodeIds.add(spouseId);
        collected.generations.set(spouseId, currentGen);

        // Add spouse edge
        const edgeKey = [personId, spouseId].sort().join("-");
        collected.edges.set(edgeKey, {
          source: personId,
          target: spouseId,
          type: "spouse",
        });
      }
    });
  }

  // Get parents and recurse
  const parents = childToParents.get(personId);
  if (parents && currentGen < maxGen) {
    parents.forEach((parentId) => {
      if (personMap.has(parentId)) {
        // Add parent-child edge
        collected.edges.set(`${parentId}-${personId}`, {
          source: parentId,
          target: personId,
          type: "parent-child",
        });

        // Recurse to parent's ancestors
        collectAncestors(
          parentId,
          currentGen + 1,
          maxGen,
          childToParents,
          personMap,
          spouseMap,
          collected
        );
      }
    });
  }
}

/**
 * Helper function to build descendant chart data
 * Recursively collects descendants going forward N generations
 */
function collectDescendants(
  personId: string,
  currentGen: number,
  maxGen: number,
  parentToChildren: Map<string, Set<string>>,
  personMap: Map<
    string,
    {
      id: string;
      firstName: string;
      lastName: string;
      dateOfBirth: Date | null;
      dateOfPassing: Date | null;
      isLiving: boolean;
      photoUrl: string | null;
      gender: string | null;
    }
  >,
  spouseMap: Map<string, Set<string>>,
  collected: {
    nodeIds: Set<string>;
    edges: Map<string, { source: string; target: string; type: string }>;
    generations: Map<string, number>;
  }
) {
  if (currentGen > maxGen || !personId) return;

  // Add person if not already collected
  if (!collected.nodeIds.has(personId)) {
    collected.nodeIds.add(personId);
    collected.generations.set(personId, currentGen);
  }

  // Add spouses
  const spouses = spouseMap.get(personId);
  if (spouses) {
    spouses.forEach((spouseId) => {
      if (!collected.nodeIds.has(spouseId)) {
        collected.nodeIds.add(spouseId);
        collected.generations.set(spouseId, currentGen);

        // Add spouse edge
        const edgeKey = [personId, spouseId].sort().join("-");
        collected.edges.set(edgeKey, {
          source: personId,
          target: spouseId,
          type: "spouse",
        });
      }
    });
  }

  // Get children and recurse
  const children = parentToChildren.get(personId);
  if (children && currentGen < maxGen) {
    children.forEach((childId) => {
      if (personMap.has(childId)) {
        // Add parent-child edge
        collected.edges.set(`${personId}-${childId}`, {
          source: personId,
          target: childId,
          type: "parent-child",
        });

        // Recurse to children's descendants
        collectDescendants(
          childId,
          currentGen + 1,
          maxGen,
          parentToChildren,
          personMap,
          spouseMap,
          collected
        );
      }
    });
  }
}

/**
 * Get ancestor chart data - ancestors going back N generations
 */
export const getAncestorChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof ancestorChartSchema>) => {
    return ancestorChartSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const start = Date.now();
    await requireAuth("VIEWER");

    const { personId, generations } = data;

    // Validate person exists
    const rootPerson = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!rootPerson) {
      throw new Error("Person not found");
    }

    // Fetch all persons and relationships
    const persons = await prisma.person.findMany();
    const relationships = await prisma.relationship.findMany();

    const personMap = new Map(persons.map((p) => [p.id, p]));
    const { childToParents, spouseMap } = buildRelationshipMaps(relationships);

    // Collect ancestors
    const collected = {
      nodeIds: new Set<string>(),
      edges: new Map<
        string,
        { source: string; target: string; type: string }
      >(),
      generations: new Map<string, number>(),
    };

    collectAncestors(
      personId,
      0,
      generations,
      childToParents,
      personMap,
      spouseMap,
      collected
    );

    // Build nodes array
    const nodes: ChartNode[] = [];
    collected.nodeIds.forEach((id) => {
      const person = personMap.get(id);
      if (person) {
        nodes.push({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          dateOfBirth: person.dateOfBirth
            ? person.dateOfBirth.toISOString().split("T")[0]
            : null,
          dateOfPassing: person.dateOfPassing
            ? person.dateOfPassing.toISOString().split("T")[0]
            : null,
          isLiving: person.isLiving,
          photoUrl: person.photoUrl,
          gender: person.gender,
          generation: collected.generations.get(id) || 0,
        });
      }
    });

    // Build edges array
    const edges: ChartEdge[] = [];
    const processedEdges = new Set<string>();

    collected.edges.forEach((edgeData) => {
      const key = `${edgeData.source}-${edgeData.target}`;
      if (!processedEdges.has(key)) {
        processedEdges.add(key);
        edges.push({
          id: key,
          source: edgeData.source,
          target: edgeData.target,
          type: edgeData.type as "parent-child" | "spouse",
        });
      }
    });

    // Record metrics
    const duration = Date.now() - start;
    recordChartMetrics("ancestor", nodes.length, duration);

    return {
      nodes,
      edges,
      metadata: {
        chartType: "ancestor",
        totalGenerations: generations,
        totalPeople: nodes.length,
        rootPersonId: personId,
      },
    };
  });

/**
 * Get descendant chart data - descendants going forward N generations
 */
export const getDescendantChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof descendantChartSchema>) => {
    return descendantChartSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const start = Date.now();
    await requireAuth("VIEWER");

    const { personId, generations } = data;

    // Validate person exists
    const rootPerson = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!rootPerson) {
      throw new Error("Person not found");
    }

    // Fetch all persons and relationships
    const persons = await prisma.person.findMany();
    const relationships = await prisma.relationship.findMany();

    const personMap = new Map(persons.map((p) => [p.id, p]));
    const { parentToChildren, spouseMap } =
      buildRelationshipMaps(relationships);

    // Collect descendants
    const collected = {
      nodeIds: new Set<string>(),
      edges: new Map<
        string,
        { source: string; target: string; type: string }
      >(),
      generations: new Map<string, number>(),
    };

    collectDescendants(
      personId,
      0,
      generations,
      parentToChildren,
      personMap,
      spouseMap,
      collected
    );

    // Build nodes array
    const nodes: ChartNode[] = [];
    collected.nodeIds.forEach((id) => {
      const person = personMap.get(id);
      if (person) {
        nodes.push({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          dateOfBirth: person.dateOfBirth
            ? person.dateOfBirth.toISOString().split("T")[0]
            : null,
          dateOfPassing: person.dateOfPassing
            ? person.dateOfPassing.toISOString().split("T")[0]
            : null,
          isLiving: person.isLiving,
          photoUrl: person.photoUrl,
          gender: person.gender,
          generation: collected.generations.get(id) || 0,
        });
      }
    });

    // Build edges array
    const edges: ChartEdge[] = [];
    const processedEdges = new Set<string>();

    collected.edges.forEach((edgeData) => {
      const key = `${edgeData.source}-${edgeData.target}`;
      if (!processedEdges.has(key)) {
        processedEdges.add(key);
        edges.push({
          id: key,
          source: edgeData.source,
          target: edgeData.target,
          type: edgeData.type as "parent-child" | "spouse",
        });
      }
    });

    // Record metrics
    const duration = Date.now() - start;
    recordChartMetrics("descendant", nodes.length, duration);

    return {
      nodes,
      edges,
      metadata: {
        chartType: "descendant",
        totalGenerations: generations,
        totalPeople: nodes.length,
        rootPersonId: personId,
      },
    };
  });

/**
 * Get hourglass chart data - both ancestors and descendants
 */
export const getHourglassChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof hourglassChartSchema>) => {
    return hourglassChartSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const start = Date.now();
    await requireAuth("VIEWER");

    const { personId, ancestorGenerations, descendantGenerations } = data;

    // Validate person exists
    const rootPerson = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!rootPerson) {
      throw new Error("Person not found");
    }

    // Fetch all persons and relationships
    const persons = await prisma.person.findMany();
    const relationships = await prisma.relationship.findMany();

    const personMap = new Map(persons.map((p) => [p.id, p]));
    const { childToParents, parentToChildren, spouseMap } =
      buildRelationshipMaps(relationships);

    // Collect both ancestors and descendants
    const collected = {
      nodeIds: new Set<string>(),
      edges: new Map<
        string,
        { source: string; target: string; type: string }
      >(),
      generations: new Map<string, number>(),
    };

    // Collect ancestors
    collectAncestors(
      personId,
      0,
      ancestorGenerations,
      childToParents,
      personMap,
      spouseMap,
      collected
    );

    // Collect descendants (starting from generation 0 again for root person)
    collectDescendants(
      personId,
      0,
      descendantGenerations,
      parentToChildren,
      personMap,
      spouseMap,
      collected
    );

    // Build nodes array
    const nodes: ChartNode[] = [];
    collected.nodeIds.forEach((id) => {
      const person = personMap.get(id);
      if (person) {
        nodes.push({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          dateOfBirth: person.dateOfBirth
            ? person.dateOfBirth.toISOString().split("T")[0]
            : null,
          dateOfPassing: person.dateOfPassing
            ? person.dateOfPassing.toISOString().split("T")[0]
            : null,
          isLiving: person.isLiving,
          photoUrl: person.photoUrl,
          gender: person.gender,
          generation: collected.generations.get(id) || 0,
        });
      }
    });

    // Build edges array
    const edges: ChartEdge[] = [];
    const processedEdges = new Set<string>();

    collected.edges.forEach((edgeData) => {
      const key = `${edgeData.source}-${edgeData.target}`;
      if (!processedEdges.has(key)) {
        processedEdges.add(key);
        edges.push({
          id: key,
          source: edgeData.source,
          target: edgeData.target,
          type: edgeData.type as "parent-child" | "spouse",
        });
      }
    });

    // Record metrics
    const duration = Date.now() - start;
    recordChartMetrics("hourglass", nodes.length, duration);

    return {
      nodes,
      edges,
      metadata: {
        chartType: "hourglass",
        totalGenerations: ancestorGenerations + descendantGenerations + 1,
        totalPeople: nodes.length,
        rootPersonId: personId,
      },
    };
  });

/**
 * Helper function to calculate angle for fan chart
 * Distributes people in a radial pattern
 */
function calculateFanLayout(
  nodeIds: Set<string>,
  generations: Map<string, number>
) {
  const maxGen = Math.max(...generations.values());
  const nodesByGen = new Map<number, string[]>();

  // Group nodes by generation
  nodeIds.forEach((id) => {
    const gen = generations.get(id) || 0;
    if (!nodesByGen.has(gen)) {
      nodesByGen.set(gen, []);
    }
    nodesByGen.get(gen)!.push(id);
  });

  const angles = new Map<string, number>();

  for (let gen = maxGen; gen >= 0; gen--) {
    const nodesInGen = nodesByGen.get(gen) || [];
    const anglePerNodeInGen = 360 / Math.max(1, nodesInGen.length);

    nodesInGen.forEach((nodeId, index) => {
      angles.set(nodeId, (index * anglePerNodeInGen) % 360);
    });
  }

  return angles;
}

/**
 * Get fan chart data - radial ancestor chart
 * Shows ancestors in a fan/radial pattern
 */
export const getFanChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof fanChartSchema>) => {
    return fanChartSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const start = Date.now();
    await requireAuth("VIEWER");

    const { personId, generations } = data;

    // Validate person exists
    const rootPerson = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!rootPerson) {
      throw new Error("Person not found");
    }

    // Fetch all persons and relationships
    const persons = await prisma.person.findMany();
    const relationships = await prisma.relationship.findMany();

    const personMap = new Map(persons.map((p) => [p.id, p]));
    const { childToParents, spouseMap } = buildRelationshipMaps(relationships);

    // Collect ancestors
    const collected = {
      nodeIds: new Set<string>(),
      edges: new Map<
        string,
        { source: string; target: string; type: string }
      >(),
      generations: new Map<string, number>(),
    };

    collectAncestors(
      personId,
      0,
      generations,
      childToParents,
      personMap,
      spouseMap,
      collected
    );

    // Calculate fan layout angles
    const angles = calculateFanLayout(collected.nodeIds, collected.generations);

    // Build nodes array with angle information
    const nodes: ChartNode[] = [];
    collected.nodeIds.forEach((id) => {
      const person = personMap.get(id);
      if (person) {
        nodes.push({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          dateOfBirth: person.dateOfBirth
            ? person.dateOfBirth.toISOString().split("T")[0]
            : null,
          dateOfPassing: person.dateOfPassing
            ? person.dateOfPassing.toISOString().split("T")[0]
            : null,
          isLiving: person.isLiving,
          photoUrl: person.photoUrl,
          gender: person.gender,
          generation: collected.generations.get(id) || 0,
          angle: angles.get(id) || 0,
        });
      }
    });

    // Build edges array
    const edges: ChartEdge[] = [];
    const processedEdges = new Set<string>();

    collected.edges.forEach((edgeData) => {
      const key = `${edgeData.source}-${edgeData.target}`;
      if (!processedEdges.has(key)) {
        processedEdges.add(key);
        edges.push({
          id: key,
          source: edgeData.source,
          target: edgeData.target,
          type: edgeData.type as "parent-child" | "spouse",
        });
      }
    });

    // Record metrics
    const duration = Date.now() - start;
    recordChartMetrics("fan", nodes.length, duration);

    return {
      nodes,
      edges,
      metadata: {
        chartType: "fan",
        totalGenerations: generations,
        totalPeople: nodes.length,
        rootPersonId: personId,
      },
    };
  });

/**
 * Get timeline chart data - horizontal timeline showing lifespans
 * Shows all people with birth/death dates as horizontal bars
 */
export const getTimelineChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof timelineChartSchema>) => {
    return timelineChartSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const start = Date.now();
    await requireAuth("VIEWER");

    const { startYear, endYear, sortBy } = data;

    // Fetch all persons with dates
    const persons = await prisma.person.findMany({
      where: {
        OR: [{ dateOfBirth: { not: null } }, { dateOfPassing: { not: null } }],
      },
    });

    // Convert to timeline entries
    const entries: TimelineEntry[] = persons
      .map((person) => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        birthYear: person.dateOfBirth ? person.dateOfBirth.getFullYear() : null,
        deathYear: person.dateOfPassing
          ? person.dateOfPassing.getFullYear()
          : null,
        isLiving: person.isLiving,
        gender: person.gender,
        photoUrl: person.photoUrl,
      }))
      .filter((entry) => {
        // Filter by year range if specified
        if (startYear && entry.birthYear && entry.birthYear < startYear) {
          return false;
        }
        if (endYear && entry.deathYear && entry.deathYear > endYear) {
          return false;
        }
        return true;
      });

    // Sort entries
    entries.sort((a, b) => {
      switch (sortBy) {
        case "birth":
          return (a.birthYear ?? 9999) - (b.birthYear ?? 9999);
        case "death":
          return (a.deathYear ?? 9999) - (b.deathYear ?? 9999);
        case "name":
          return `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`
          );
        default:
          return 0;
      }
    });

    // Calculate year range
    const years = entries.flatMap((e) =>
      [e.birthYear, e.deathYear].filter((y): y is number => y !== null)
    );
    const currentYear = new Date().getFullYear();
    const minYear = years.length > 0 ? Math.min(...years) : currentYear - 100;
    const maxYear =
      years.length > 0 ? Math.max(...years, currentYear) : currentYear;

    // Record metrics
    const duration = Date.now() - start;
    recordChartMetrics("timeline", entries.length, duration);

    return {
      entries,
      metadata: {
        chartType: "timeline" as const,
        minYear,
        maxYear,
        totalPeople: entries.length,
      },
    };
  });

/**
 * Get relationship matrix data - grid showing relationships between people
 * Displays a matrix where rows/columns are people and cells show relationship type
 */
export const getRelationshipMatrix = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof relationshipMatrixSchema>) => {
    return relationshipMatrixSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const start = Date.now();
    await requireAuth("VIEWER");

    const { personIds, maxPeople } = data;

    // Fetch persons
    let persons;
    if (personIds && personIds.length > 0) {
      persons = await prisma.person.findMany({
        where: { id: { in: personIds } },
        take: maxPeople,
      });
    } else {
      persons = await prisma.person.findMany({
        take: maxPeople,
        orderBy: { lastName: "asc" },
      });
    }

    // Fetch all relationships between these people
    const personIdSet = new Set(persons.map((p) => p.id));
    const relationships = await prisma.relationship.findMany({
      where: {
        AND: [
          { personId: { in: Array.from(personIdSet) } },
          { relatedPersonId: { in: Array.from(personIdSet) } },
        ],
      },
    });

    // Build relationship lookup map
    const relMap = new Map<string, string>();
    relationships.forEach((rel) => {
      const key = `${rel.personId}-${rel.relatedPersonId}`;
      relMap.set(key, rel.type);
    });

    // Build matrix cells
    const matrix: MatrixCell[] = [];
    const people: MatrixPerson[] = persons.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
    }));

    // Generate all cell combinations
    for (const person of persons) {
      for (const relatedPerson of persons) {
        if (person.id === relatedPerson.id) {
          // Self reference
          matrix.push({
            personId: person.id,
            relatedPersonId: relatedPerson.id,
            relationshipType: "SELF",
            strength: 1,
          });
        } else {
          const key = `${person.id}-${relatedPerson.id}`;
          const relType = relMap.get(key) || null;
          matrix.push({
            personId: person.id,
            relatedPersonId: relatedPerson.id,
            relationshipType: relType,
            strength: relType ? 1 : 0,
          });
        }
      }
    }

    const totalRelationships = matrix.filter(
      (m) => m.relationshipType && m.relationshipType !== "SELF"
    ).length;

    // Record metrics
    const duration = Date.now() - start;
    recordChartMetrics("matrix", people.length, duration);

    return {
      people,
      matrix,
      metadata: {
        chartType: "matrix" as const,
        totalPeople: people.length,
        totalRelationships: totalRelationships / 2, // Divide by 2 since relationships are bidirectional
      },
    };
  });

/**
 * Helper function to collect ancestors on one side (paternal or maternal)
 */
function collectBowtieAncestors(
  personId: string,
  currentGen: number,
  maxGen: number,
  childToParents: Map<string, Set<string>>,
  personMap: Map<
    string,
    {
      id: string;
      firstName: string;
      lastName: string;
      dateOfBirth: Date | null;
      dateOfPassing: Date | null;
      isLiving: boolean;
      photoUrl: string | null;
      gender: string | null;
    }
  >,
  side: "paternal" | "maternal",
  collected: {
    nodeIds: Set<string>;
    edges: Map<string, { source: string; target: string; type: string }>;
    generations: Map<string, number>;
    sides: Map<string, "paternal" | "maternal" | "center">;
  }
) {
  if (currentGen > maxGen || !personId) return;

  // Add person if not already collected
  if (!collected.nodeIds.has(personId)) {
    collected.nodeIds.add(personId);
    collected.generations.set(personId, currentGen);
    collected.sides.set(personId, side);
  }

  // Get parents and recurse
  const parents = childToParents.get(personId);
  if (parents && currentGen < maxGen) {
    parents.forEach((parentId) => {
      if (personMap.has(parentId)) {
        // Add parent-child edge
        collected.edges.set(`${parentId}-${personId}`, {
          source: parentId,
          target: personId,
          type: "parent-child",
        });

        // Recurse to parent's ancestors
        collectBowtieAncestors(
          parentId,
          currentGen + 1,
          maxGen,
          childToParents,
          personMap,
          side,
          collected
        );
      }
    });
  }
}

/**
 * Get bowtie chart data - dual ancestry showing paternal and maternal lines
 * Paternal ancestors on the left, maternal ancestors on the right
 */
export const getBowtieChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof bowtieChartSchema>) => {
    return bowtieChartSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const start = Date.now();
    await requireAuth("VIEWER");

    const { personId, generations } = data;

    // Validate person exists
    const rootPerson = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!rootPerson) {
      throw new Error("Person not found");
    }

    // Fetch all persons and relationships
    const persons = await prisma.person.findMany();
    const relationships = await prisma.relationship.findMany();

    const personMap = new Map(persons.map((p) => [p.id, p]));
    const { childToParents } = buildRelationshipMaps(relationships);

    // Collect ancestors for bowtie layout
    const collected = {
      nodeIds: new Set<string>(),
      edges: new Map<
        string,
        { source: string; target: string; type: string }
      >(),
      generations: new Map<string, number>(),
      sides: new Map<string, "paternal" | "maternal" | "center">(),
    };

    // Add root person at center
    collected.nodeIds.add(personId);
    collected.generations.set(personId, 0);
    collected.sides.set(personId, "center");

    // Get parents of root person
    const rootParents = childToParents.get(personId);
    if (rootParents) {
      const parentList = Array.from(rootParents);

      // Determine which parent is paternal vs maternal based on gender
      // If no gender info, use first parent as paternal, second as maternal
      parentList.forEach((parentId) => {
        const parent = personMap.get(parentId);
        if (!parent) return;

        // Add parent-child edge from parent to root
        collected.edges.set(`${parentId}-${personId}`, {
          source: parentId,
          target: personId,
          type: "parent-child",
        });

        // Determine side based on gender
        const side: "paternal" | "maternal" =
          parent.gender === "MALE" ? "paternal" : "maternal";

        // Collect ancestors for this parent
        collectBowtieAncestors(
          parentId,
          1,
          generations,
          childToParents,
          personMap,
          side,
          collected
        );
      });
    }

    // Build nodes array with side information
    const nodes: BowtieNode[] = [];
    collected.nodeIds.forEach((id) => {
      const person = personMap.get(id);
      if (person) {
        nodes.push({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          dateOfBirth: person.dateOfBirth
            ? person.dateOfBirth.toISOString().split("T")[0]
            : null,
          dateOfPassing: person.dateOfPassing
            ? person.dateOfPassing.toISOString().split("T")[0]
            : null,
          isLiving: person.isLiving,
          photoUrl: person.photoUrl,
          gender: person.gender,
          generation: collected.generations.get(id) || 0,
          side: collected.sides.get(id) || "center",
        });
      }
    });

    // Build edges array
    const edges: ChartEdge[] = [];
    const processedEdges = new Set<string>();

    collected.edges.forEach((edgeData) => {
      const key = `${edgeData.source}-${edgeData.target}`;
      if (!processedEdges.has(key)) {
        processedEdges.add(key);
        edges.push({
          id: key,
          source: edgeData.source,
          target: edgeData.target,
          type: edgeData.type as "parent-child" | "spouse",
        });
      }
    });

    // Count paternal and maternal nodes
    const paternalCount = nodes.filter((n) => n.side === "paternal").length;
    const maternalCount = nodes.filter((n) => n.side === "maternal").length;

    // Record metrics
    const duration = Date.now() - start;
    recordChartMetrics("bowtie", nodes.length, duration);

    return {
      nodes,
      edges,
      metadata: {
        chartType: "bowtie" as const,
        totalGenerations: generations,
        totalPeople: nodes.length,
        rootPersonId: personId,
        paternalCount,
        maternalCount,
      },
    };
  });

/**
 * Get compact tree data - hierarchical tree structure for collapsible view
 * Returns both a nested tree and a flat list for virtual scrolling
 */
export const getCompactTreeData = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof compactTreeSchema>) => {
    return compactTreeSchema.parse(data);
  })
  .handler(async ({ data }): Promise<CompactTreeResult> => {
    const start = Date.now();
    await requireAuth("VIEWER");

    const { personId, generations } = data;

    // Validate person exists
    const rootPerson = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!rootPerson) {
      throw new Error("Person not found");
    }

    // Fetch all persons and relationships
    const persons = await prisma.person.findMany();
    const relationships = await prisma.relationship.findMany();

    const personMap = new Map(persons.map((p) => [p.id, p]));
    const { parentToChildren, spouseMap } =
      buildRelationshipMaps(relationships);

    // Build tree recursively
    function buildTreeNode(
      pId: string,
      gen: number,
      parentId: string | null
    ): CompactTreeNode | null {
      const person = personMap.get(pId);
      if (!person || gen > generations) return null;

      // Get children
      const childIds = parentToChildren.get(pId) || new Set();
      const children: CompactTreeNode[] = [];

      childIds.forEach((childId) => {
        const childNode = buildTreeNode(childId, gen + 1, pId);
        if (childNode) {
          children.push(childNode);
        }
      });

      // Sort children by birth date
      children.sort((a, b) => {
        if (!a.dateOfBirth && !b.dateOfBirth) return 0;
        if (!a.dateOfBirth) return 1;
        if (!b.dateOfBirth) return -1;
        return a.dateOfBirth.localeCompare(b.dateOfBirth);
      });

      // Get spouses
      const spouseIds = spouseMap.get(pId) || new Set();
      const spouses: CompactTreeNode["spouses"] = [];

      spouseIds.forEach((spouseId) => {
        const spouse = personMap.get(spouseId);
        if (spouse) {
          spouses.push({
            id: spouse.id,
            firstName: spouse.firstName,
            lastName: spouse.lastName,
            isLiving: spouse.isLiving,
          });
        }
      });

      return {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        dateOfBirth: person.dateOfBirth
          ? person.dateOfBirth.toISOString().split("T")[0]
          : null,
        dateOfPassing: person.dateOfPassing
          ? person.dateOfPassing.toISOString().split("T")[0]
          : null,
        isLiving: person.isLiving,
        gender: person.gender,
        photoUrl: person.photoUrl,
        generation: gen,
        parentId,
        children,
        spouses,
      };
    }

    const root = buildTreeNode(personId, 0, null);

    // Build flat list for virtual scrolling
    const flatList: CompactTreeResult["flatList"] = [];
    let maxGen = 0;

    function flattenTree(node: CompactTreeNode | null) {
      if (!node) return;

      maxGen = Math.max(maxGen, node.generation);

      flatList.push({
        id: node.id,
        firstName: node.firstName,
        lastName: node.lastName,
        dateOfBirth: node.dateOfBirth,
        dateOfPassing: node.dateOfPassing,
        isLiving: node.isLiving,
        gender: node.gender,
        photoUrl: node.photoUrl,
        generation: node.generation,
        parentId: node.parentId,
        hasChildren: node.children.length > 0,
        spouseCount: node.spouses.length,
      });

      node.children.forEach((child) => flattenTree(child));
    }

    flattenTree(root);

    // Record metrics
    const duration = Date.now() - start;
    recordChartMetrics("compact", flatList.length, duration);

    return {
      root,
      flatList,
      metadata: {
        chartType: "compact",
        totalPeople: flatList.length,
        totalGenerations: maxGen + 1,
        rootPersonId: personId,
      },
    };
  });

/**
 * Get statistics data - aggregated demographic data for charts
 * Returns 6 different statistical breakdowns
 */
export const getStatistics = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof statisticsSchema>) => {
    return statisticsSchema.parse(data);
  })
  .handler(async ({ data }): Promise<StatisticsResult> => {
    const start = Date.now();
    await requireAuth("VIEWER");

    const { includeDeceased } = data;

    // Fetch all persons
    const persons = await prisma.person.findMany({
      where: includeDeceased ? {} : { isLiving: true },
    });

    // Fetch relationships to determine generations
    const relationships = await prisma.relationship.findMany({
      where: { type: "PARENT" },
    });

    const currentYear = new Date().getFullYear();
    const total = persons.length;

    // Helper function to calculate age
    function calculateAge(
      birthDate: Date | null,
      deathDate: Date | null,
      isLiving: boolean
    ): number | null {
      if (!birthDate) return null;
      const endDate = isLiving ? new Date() : deathDate;
      if (!endDate) return null;

      let age = endDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = endDate.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && endDate.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age;
    }

    // 1. Age Distribution (by bracket)
    const ageBrackets = [
      { label: "0-9", min: 0, max: 9 },
      { label: "10-19", min: 10, max: 19 },
      { label: "20-29", min: 20, max: 29 },
      { label: "30-39", min: 30, max: 39 },
      { label: "40-49", min: 40, max: 49 },
      { label: "50-59", min: 50, max: 59 },
      { label: "60-69", min: 60, max: 69 },
      { label: "70-79", min: 70, max: 79 },
      { label: "80-89", min: 80, max: 89 },
      { label: "90+", min: 90, max: 200 },
    ];

    const ageDistribution: AgeDistribution[] = ageBrackets.map((bracket) => {
      const count = persons.filter((p) => {
        const age = calculateAge(p.dateOfBirth, p.dateOfPassing, p.isLiving);
        return age !== null && age >= bracket.min && age <= bracket.max;
      }).length;
      return {
        bracket: bracket.label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });

    // 2. Generation Sizes (based on parent-child relationships)
    // Build generation map by traversing from roots
    const childToParents = new Map<string, Set<string>>();
    relationships.forEach((rel) => {
      if (!childToParents.has(rel.personId)) {
        childToParents.set(rel.personId, new Set());
      }
      childToParents.get(rel.personId)!.add(rel.relatedPersonId);
    });

    // Find roots (people without parents)
    const personIds = new Set(persons.map((p) => p.id));
    const roots = persons.filter((p) => !childToParents.has(p.id));

    // BFS to assign generations
    const generationMap = new Map<string, number>();
    const queue: Array<{ id: string; gen: number }> = roots.map((r) => ({
      id: r.id,
      gen: 0,
    }));

    // Build parent-to-children map
    const parentToChildren = new Map<string, Set<string>>();
    relationships.forEach((rel) => {
      const parentId = rel.relatedPersonId;
      const childId = rel.personId;
      if (!parentToChildren.has(parentId)) {
        parentToChildren.set(parentId, new Set());
      }
      parentToChildren.get(parentId)!.add(childId);
    });

    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      if (generationMap.has(id)) continue;
      generationMap.set(id, gen);

      const children = parentToChildren.get(id);
      if (children) {
        children.forEach((childId) => {
          if (!generationMap.has(childId)) {
            queue.push({ id: childId, gen: gen + 1 });
          }
        });
      }
    }

    // Count by generation
    const genCounts = new Map<
      number,
      { total: number; living: number; deceased: number }
    >();
    persons.forEach((p) => {
      const gen = generationMap.get(p.id) ?? 0;
      if (!genCounts.has(gen)) {
        genCounts.set(gen, { total: 0, living: 0, deceased: 0 });
      }
      const counts = genCounts.get(gen)!;
      counts.total++;
      if (p.isLiving) {
        counts.living++;
      } else {
        counts.deceased++;
      }
    });

    const generationSizes: GenerationSize[] = Array.from(genCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([gen, counts]) => ({
        generation: gen + 1, // 1-indexed for display
        count: counts.total,
        livingCount: counts.living,
        deceasedCount: counts.deceased,
      }));

    // 3. Gender Distribution
    const genderCounts = new Map<string, number>();
    persons.forEach((p) => {
      const gender = p.gender || "Unknown";
      genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);
    });

    const genderDistribution: GenderDistribution[] = Array.from(
      genderCounts.entries()
    )
      .map(([gender, count]) => ({
        gender:
          gender === "MALE"
            ? "Male"
            : gender === "FEMALE"
              ? "Female"
              : gender === "OTHER"
                ? "Other"
                : gender === "PREFER_NOT_TO_SAY"
                  ? "Not Specified"
                  : "Unknown",
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 4. Geographic Distribution (top 10 by birthPlace)
    const locationCounts = new Map<string, number>();
    persons.forEach((p) => {
      if (p.birthPlace) {
        // Normalize location (trim and title case)
        const location = p.birthPlace.trim();
        if (location) {
          locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
        }
      }
    });

    const geographicDistribution: GeographicDistribution[] = Array.from(
      locationCounts.entries()
    )
      .map(([location, count]) => ({
        location,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Surname Frequency (top 15)
    const surnameCounts = new Map<string, number>();
    persons.forEach((p) => {
      const surname = p.lastName.trim();
      if (surname) {
        surnameCounts.set(surname, (surnameCounts.get(surname) || 0) + 1);
      }
    });

    const surnameFrequency: SurnameFrequency[] = Array.from(
      surnameCounts.entries()
    )
      .map(([surname, count]) => ({
        surname,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // 6. Lifespan Trends by Decade (for deceased persons with both dates)
    const decadeLifespans = new Map<string, number[]>();
    persons.forEach((p) => {
      if (!p.isLiving && p.dateOfBirth && p.dateOfPassing) {
        const lifespan = calculateAge(p.dateOfBirth, p.dateOfPassing, false);
        if (lifespan !== null && lifespan > 0) {
          const birthDecade = Math.floor(p.dateOfBirth.getFullYear() / 10) * 10;
          const decadeLabel = `${birthDecade}s`;
          if (!decadeLifespans.has(decadeLabel)) {
            decadeLifespans.set(decadeLabel, []);
          }
          decadeLifespans.get(decadeLabel)!.push(lifespan);
        }
      }
    });

    const lifespanTrends: LifespanTrend[] = Array.from(
      decadeLifespans.entries()
    )
      .map(([decade, lifespans]) => ({
        decade,
        averageLifespan: Math.round(
          lifespans.reduce((a, b) => a + b, 0) / lifespans.length
        ),
        sampleSize: lifespans.length,
      }))
      .sort((a, b) => a.decade.localeCompare(b.decade));

    // Calculate metadata
    const livingCount = persons.filter((p) => p.isLiving).length;
    const deceasedCount = persons.filter((p) => !p.isLiving).length;

    // Find oldest and youngest living persons
    let oldestPerson: StatisticsResult["metadata"]["oldestPerson"] = null;
    let youngestPerson: StatisticsResult["metadata"]["youngestPerson"] = null;

    const livingWithAge = persons
      .filter((p) => p.isLiving && p.dateOfBirth)
      .map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        age: calculateAge(p.dateOfBirth, null, true)!,
      }))
      .filter((p) => p.age !== null);

    if (livingWithAge.length > 0) {
      livingWithAge.sort((a, b) => b.age - a.age);
      oldestPerson = livingWithAge[0];
      youngestPerson = livingWithAge[livingWithAge.length - 1];
    }

    // Record metrics
    const duration = Date.now() - start;
    recordChartMetrics("statistics", total, duration);

    return {
      ageDistribution,
      generationSizes,
      genderDistribution,
      geographicDistribution,
      surnameFrequency,
      lifespanTrends,
      metadata: {
        chartType: "statistics",
        totalPeople: total,
        livingCount,
        deceasedCount,
        oldestPerson,
        youngestPerson,
      },
    };
  });
