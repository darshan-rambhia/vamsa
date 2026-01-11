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
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./db";
import { z } from "zod";

const TOKEN_COOKIE_NAME = "vamsa-session";

// Auth helper function
async function requireAuth(
  requiredRole: "VIEWER" | "MEMBER" | "ADMIN" = "VIEWER"
) {
  const token = getCookie(TOKEN_COOKIE_NAME);
  if (!token) {
    throw new Error("Not authenticated");
  }

  const session = await prisma.session.findFirst({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error("Session expired");
  }

  const roleHierarchy = { VIEWER: 0, MEMBER: 1, ADMIN: 2 };
  if (roleHierarchy[session.user.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  return session.user;
}

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
