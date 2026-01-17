/**
 * Chart Server Functions - Business Logic for Chart Data Generation
 *
 * This module contains the business logic orchestration layer for all chart
 * data generation. Each function:
 * - Performs authentication and authorization checks
 * - Queries database for persons and relationships
 * - Delegates data collection to helper functions
 * - Formats results for visualization
 * - Records metrics
 *
 * Exported Functions:
 * - getAncestorChartData: Ancestors going back N generations
 * - getDescendantChartData: Descendants going forward N generations
 * - getHourglassChartData: Both ancestors and descendants combined
 * - getFanChartData: Ancestors in radial/fan layout pattern
 * - getBowtieChartData: Dual ancestry showing paternal and maternal lines
 * - getTimelineChartData: Horizontal timeline showing lifespans
 * - getRelationshipMatrixData: Grid showing relationships between people
 * - getCompactTreeData: Hierarchical tree structure for collapsible view
 * - getStatisticsData: Aggregated demographic data
 * - getTreeChartData: Full family tree with ancestors and descendants
 * - exportChartAsPDF: PDF export orchestration
 * - exportChartAsSVG: SVG export orchestration
 */

import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import { recordChartMetrics } from "../metrics";
import {
  buildRelationshipMaps,
  collectAncestors,
  collectDescendants,
  calculateFanLayout,
  collectBowtieAncestors,
  collectTreeAncestors,
  collectTreeDescendants,
  type PersonData,
  type CollectionState,
} from "../helpers/charts";

/**
 * Type for the database client used by chart functions.
 * This allows dependency injection for testing.
 */
export type ChartsDb = Pick<PrismaClient, "person" | "relationship">;

// Re-export types from the original file
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
  angle?: number;
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

export interface MatrixCell {
  personId: string;
  relatedPersonId: string;
  relationshipType: string | null;
  strength: number;
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

/**
 * Helper to convert Date to ISO date string
 */
function dateToISOString(date: Date | null): string | null {
  return date ? date.toISOString().split("T")[0] : null;
}

/**
 * Generates ancestor chart data - ancestors going back N generations
 *
 * Orchestrates ancestor chart generation by:
 * 1. Validating the root person exists
 * 2. Fetching all persons and relationships
 * 3. Delegating collection to helper functions
 * 4. Formatting nodes and edges for visualization
 * 5. Recording metrics
 *
 * @param personId - ID of the root person
 * @param generations - Number of generations to include (1-10)
 * @param db - Optional database client (defaults to prisma)
 * @returns ChartLayoutResult with nodes, edges, and metadata
 * @throws Error if person not found
 *
 * @example
 * const result = await getAncestorChartData('person123', 3)
 */
export async function getAncestorChartData(
  personId: string,
  generations: number,
  db: ChartsDb = defaultPrisma
): Promise<ChartLayoutResult> {
  const start = Date.now();

  // Validate person exists
  const rootPerson = await db.person.findUnique({
    where: { id: personId },
  });

  if (!rootPerson) {
    throw new Error("Person not found");
  }

  // Fetch all persons and relationships
  const persons = await db.person.findMany();
  const relationships = await db.relationship.findMany();

  const personMap = new Map(
    persons.map((p) => [p.id, p as unknown as PersonData])
  );
  const { childToParents, spouseMap } = buildRelationshipMaps(relationships);

  // Collect ancestors
  const collected: CollectionState = {
    nodeIds: new Set<string>(),
    edges: new Map<string, { source: string; target: string; type: string }>(),
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
        dateOfBirth: dateToISOString(person.dateOfBirth),
        dateOfPassing: dateToISOString(person.dateOfPassing),
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
}

/**
 * Generates descendant chart data - descendants going forward N generations
 *
 * Orchestrates descendant chart generation by:
 * 1. Validating the root person exists
 * 2. Fetching all persons and relationships
 * 3. Delegating collection to helper functions
 * 4. Formatting nodes and edges for visualization
 * 5. Recording metrics
 *
 * @param personId - ID of the root person
 * @param generations - Number of generations to include (1-10)
 * @param db - Optional database client (defaults to prisma)
 * @returns ChartLayoutResult with nodes, edges, and metadata
 * @throws Error if person not found
 *
 * @example
 * const result = await getDescendantChartData('person123', 3)
 */
export async function getDescendantChartData(
  personId: string,
  generations: number,
  db: ChartsDb = defaultPrisma
): Promise<ChartLayoutResult> {
  const start = Date.now();

  // Validate person exists
  const rootPerson = await db.person.findUnique({
    where: { id: personId },
  });

  if (!rootPerson) {
    throw new Error("Person not found");
  }

  // Fetch all persons and relationships
  const persons = await db.person.findMany();
  const relationships = await db.relationship.findMany();

  const personMap = new Map(
    persons.map((p) => [p.id, p as unknown as PersonData])
  );
  const { parentToChildren, spouseMap } = buildRelationshipMaps(relationships);

  // Collect descendants
  const collected: CollectionState = {
    nodeIds: new Set<string>(),
    edges: new Map<string, { source: string; target: string; type: string }>(),
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
        dateOfBirth: dateToISOString(person.dateOfBirth),
        dateOfPassing: dateToISOString(person.dateOfPassing),
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
}

/**
 * Generates hourglass chart data - both ancestors and descendants combined
 *
 * @param personId - ID of the root person
 * @param ancestorGenerations - Number of ancestor generations (1-10)
 * @param descendantGenerations - Number of descendant generations (1-10)
 * @param db - Optional database client (defaults to prisma)
 * @returns ChartLayoutResult with nodes, edges, and metadata
 * @throws Error if person not found
 *
 * @example
 * const result = await getHourglassChartData('person123', 2, 2)
 */
export async function getHourglassChartData(
  personId: string,
  ancestorGenerations: number,
  descendantGenerations: number,
  db: ChartsDb = defaultPrisma
): Promise<ChartLayoutResult> {
  const start = Date.now();

  // Validate person exists
  const rootPerson = await db.person.findUnique({
    where: { id: personId },
  });

  if (!rootPerson) {
    throw new Error("Person not found");
  }

  // Fetch all persons and relationships
  const persons = await db.person.findMany();
  const relationships = await db.relationship.findMany();

  const personMap = new Map(
    persons.map((p) => [p.id, p as unknown as PersonData])
  );
  const { childToParents, parentToChildren, spouseMap } =
    buildRelationshipMaps(relationships);

  // Collect both ancestors and descendants
  const collected: CollectionState = {
    nodeIds: new Set<string>(),
    edges: new Map<string, { source: string; target: string; type: string }>(),
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
        dateOfBirth: dateToISOString(person.dateOfBirth),
        dateOfPassing: dateToISOString(person.dateOfPassing),
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
}

/**
 * Generates fan chart data - ancestors in radial/fan layout pattern
 *
 * @param personId - ID of the root person
 * @param generations - Number of generations to include (1-10)
 * @param db - Optional database client (defaults to prisma)
 * @returns ChartLayoutResult with nodes (including angles), edges, and metadata
 * @throws Error if person not found
 *
 * @example
 * const result = await getFanChartData('person123', 4)
 */
export async function getFanChartData(
  personId: string,
  generations: number,
  db: ChartsDb = defaultPrisma
): Promise<ChartLayoutResult> {
  const start = Date.now();

  // Validate person exists
  const rootPerson = await db.person.findUnique({
    where: { id: personId },
  });

  if (!rootPerson) {
    throw new Error("Person not found");
  }

  // Fetch all persons and relationships
  const persons = await db.person.findMany();
  const relationships = await db.relationship.findMany();

  const personMap = new Map(
    persons.map((p) => [p.id, p as unknown as PersonData])
  );
  const { childToParents, spouseMap } = buildRelationshipMaps(relationships);

  // Collect ancestors
  const collected: CollectionState = {
    nodeIds: new Set<string>(),
    edges: new Map<string, { source: string; target: string; type: string }>(),
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
        dateOfBirth: dateToISOString(person.dateOfBirth),
        dateOfPassing: dateToISOString(person.dateOfPassing),
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
}

/**
 * Generates timeline chart data - horizontal timeline showing lifespans
 *
 * @param startYear - Optional start year filter
 * @param endYear - Optional end year filter
 * @param sortBy - Sort order: "birth", "death", or "name"
 * @param db - Optional database client (defaults to prisma)
 * @returns TimelineChartResult with entries and metadata
 *
 * @example
 * const result = await getTimelineChartData(undefined, undefined, 'birth')
 */
export async function getTimelineChartData(
  startYear: number | undefined,
  endYear: number | undefined,
  sortBy: "birth" | "death" | "name",
  db: ChartsDb = defaultPrisma
): Promise<TimelineChartResult> {
  const start = Date.now();

  // Fetch all persons with dates
  const persons = await db.person.findMany({
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
}

/**
 * Generates relationship matrix data - grid showing relationships between people
 *
 * @param personIds - Optional specific person IDs to include
 * @param maxPeople - Maximum number of people to include (1-50)
 * @param db - Optional database client (defaults to prisma)
 * @returns RelationshipMatrixResult with people, matrix, and metadata
 *
 * @example
 * const result = await getRelationshipMatrixData(undefined, 20)
 */
export async function getRelationshipMatrixData(
  personIds: string[] | undefined,
  maxPeople: number,
  db: ChartsDb = defaultPrisma
): Promise<RelationshipMatrixResult> {
  const start = Date.now();

  // Fetch persons
  let persons;
  if (personIds && personIds.length > 0) {
    persons = await db.person.findMany({
      where: { id: { in: personIds } },
      take: maxPeople,
    });
  } else {
    persons = await db.person.findMany({
      take: maxPeople,
      orderBy: { lastName: "asc" },
    });
  }

  // Fetch all relationships between these people
  const personIdSet = new Set(persons.map((p) => p.id));
  const personIdArray = Array.from(personIdSet) as string[];
  const relationships = await db.relationship.findMany({
    where: {
      AND: [
        { personId: { in: personIdArray } },
        { relatedPersonId: { in: personIdArray } },
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
      totalRelationships: totalRelationships / 2,
    },
  };
}

/**
 * Generates bowtie chart data - dual ancestry showing paternal and maternal lines
 *
 * @param personId - ID of the root person
 * @param generations - Number of generations to include (1-10)
 * @param db - Optional database client (defaults to prisma)
 * @returns BowtieChartResult with nodes, edges, and metadata
 * @throws Error if person not found
 *
 * @example
 * const result = await getBowtieChartData('person123', 3)
 */
export async function getBowtieChartData(
  personId: string,
  generations: number,
  db: ChartsDb = defaultPrisma
): Promise<BowtieChartResult> {
  const start = Date.now();

  // Validate person exists
  const rootPerson = await db.person.findUnique({
    where: { id: personId },
  });

  if (!rootPerson) {
    throw new Error("Person not found");
  }

  // Fetch all persons and relationships
  const persons = await db.person.findMany();
  const relationships = await db.relationship.findMany();

  const personMap = new Map(
    persons.map((p) => [p.id, p as unknown as PersonData])
  );
  const { childToParents } = buildRelationshipMaps(relationships);

  // Collect ancestors for bowtie layout
  const collected: CollectionState = {
    nodeIds: new Set<string>(),
    edges: new Map<string, { source: string; target: string; type: string }>(),
    generations: new Map<string, number>(),
    sides: new Map<string, "paternal" | "maternal" | "center">(),
  };

  // Add root person at center
  collected.nodeIds.add(personId);
  collected.generations.set(personId, 0);
  collected.sides!.set(personId, "center");

  // Get parents of root person
  const rootParents = childToParents.get(personId);
  if (rootParents) {
    const parentList = Array.from(rootParents);

    // Determine which parent is paternal vs maternal based on gender
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
        dateOfBirth: dateToISOString(person.dateOfBirth),
        dateOfPassing: dateToISOString(person.dateOfPassing),
        isLiving: person.isLiving,
        photoUrl: person.photoUrl,
        gender: person.gender,
        generation: collected.generations.get(id) || 0,
        side: collected.sides?.get(id) || "center",
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
}

/**
 * Generates compact tree data - hierarchical tree structure for collapsible view
 *
 * @param personId - ID of the root person
 * @param generations - Number of generations to include (1-10)
 * @param db - Optional database client (defaults to prisma)
 * @returns CompactTreeResult with nested tree and flat list
 * @throws Error if person not found
 *
 * @example
 * const result = await getCompactTreeData('person123', 5)
 */
export async function getCompactTreeData(
  personId: string,
  generations: number,
  db: ChartsDb = defaultPrisma
): Promise<CompactTreeResult> {
  const start = Date.now();

  // Validate person exists
  const rootPerson = await db.person.findUnique({
    where: { id: personId },
  });

  if (!rootPerson) {
    throw new Error("Person not found");
  }

  // Fetch all persons and relationships
  const persons = await db.person.findMany();
  const relationships = await db.relationship.findMany();

  const personMap = new Map(
    persons.map((p) => [p.id, p as unknown as PersonData])
  );
  const { parentToChildren, spouseMap } = buildRelationshipMaps(relationships);

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
      dateOfBirth: dateToISOString(person.dateOfBirth),
      dateOfPassing: dateToISOString(person.dateOfPassing),
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
}

/**
 * Generates statistics data - aggregated demographic data for charts
 *
 * Returns 6 different statistical breakdowns:
 * 1. Age distribution by bracket
 * 2. Generation sizes
 * 3. Gender distribution
 * 4. Geographic distribution (top 10)
 * 5. Surname frequency (top 15)
 * 6. Lifespan trends by decade
 *
 * @param includeDeceased - Whether to include deceased persons
 * @param db - Optional database client (defaults to prisma)
 * @returns StatisticsResult with various statistical breakdowns
 *
 * @example
 * const result = await getStatisticsData(true)
 */
export async function getStatisticsData(
  includeDeceased: boolean,
  db: ChartsDb = defaultPrisma
): Promise<StatisticsResult> {
  const start = Date.now();

  // Fetch all persons
  const persons = await db.person.findMany({
    where: includeDeceased ? {} : { isLiving: true },
  });

  // Fetch relationships to determine generations
  const relationships = await db.relationship.findMany({
    where: { type: "PARENT" },
  });

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
  const childToParents = new Map<string, Set<string>>();
  relationships.forEach((rel) => {
    if (!childToParents.has(rel.personId)) {
      childToParents.set(rel.personId, new Set());
    }
    childToParents.get(rel.personId)!.add(rel.relatedPersonId);
  });

  // Find roots (people without parents)
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
      generation: gen + 1,
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

  const lifespanTrends: LifespanTrend[] = Array.from(decadeLifespans.entries())
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
}

/**
 * Generates tree chart data - full family tree with both ancestors and descendants
 *
 * Center person is at generation 0, ancestors have negative generation numbers,
 * descendants have positive generation numbers.
 *
 * @param personId - ID of the root person
 * @param ancestorGenerations - Number of ancestor generations (1-10)
 * @param descendantGenerations - Number of descendant generations (1-10)
 * @param db - Optional database client (defaults to prisma)
 * @returns ChartLayoutResult with nodes, edges, and metadata
 * @throws Error if person not found
 *
 * @example
 * const result = await getTreeChartData('person123', 2, 2)
 */
export async function getTreeChartData(
  personId: string,
  ancestorGenerations: number,
  descendantGenerations: number,
  db: ChartsDb = defaultPrisma
): Promise<ChartLayoutResult> {
  const start = Date.now();

  // Validate person exists
  const rootPerson = await db.person.findUnique({
    where: { id: personId },
  });

  if (!rootPerson) {
    throw new Error("Person not found");
  }

  // Fetch all persons and relationships
  const persons = await db.person.findMany();
  const relationships = await db.relationship.findMany();

  const personMap = new Map(
    persons.map((p) => [p.id, p as unknown as PersonData])
  );
  const { childToParents, parentToChildren, spouseMap } =
    buildRelationshipMaps(relationships);

  // Initialize collection
  const collected: CollectionState = {
    nodeIds: new Set<string>(),
    edges: new Map<string, { source: string; target: string; type: string }>(),
    generations: new Map<string, number>(),
  };

  // Add root person at generation 0
  collected.nodeIds.add(personId);
  collected.generations.set(personId, 0);

  // Add root person's spouses
  const rootSpouses = spouseMap.get(personId);
  if (rootSpouses) {
    rootSpouses.forEach((spouseId) => {
      if (!collected.nodeIds.has(spouseId)) {
        collected.nodeIds.add(spouseId);
        collected.generations.set(spouseId, 0);

        const edgeKey = [personId, spouseId].sort().join("-");
        collected.edges.set(edgeKey, {
          source: personId,
          target: spouseId,
          type: "spouse",
        });
      }
    });
  }

  // Collect ancestors (negative generations)
  const rootParents = childToParents.get(personId);
  if (rootParents) {
    rootParents.forEach((parentId) => {
      if (personMap.has(parentId)) {
        collected.edges.set(`${parentId}-${personId}`, {
          source: parentId,
          target: personId,
          type: "parent-child",
        });

        collectTreeAncestors(
          parentId,
          -1,
          -ancestorGenerations,
          childToParents,
          personMap,
          spouseMap,
          collected
        );
      }
    });
  }

  // Collect descendants (positive generations)
  const rootChildren = parentToChildren.get(personId);
  if (rootChildren) {
    rootChildren.forEach((childId) => {
      if (personMap.has(childId)) {
        collected.edges.set(`${personId}-${childId}`, {
          source: personId,
          target: childId,
          type: "parent-child",
        });

        collectTreeDescendants(
          childId,
          1,
          descendantGenerations,
          parentToChildren,
          personMap,
          spouseMap,
          collected
        );
      }
    });
  }

  // Also collect descendants from root's spouses (step-children)
  if (rootSpouses) {
    rootSpouses.forEach((spouseId) => {
      const spouseChildren = parentToChildren.get(spouseId);
      if (spouseChildren) {
        spouseChildren.forEach((childId) => {
          if (personMap.has(childId) && !collected.nodeIds.has(childId)) {
            collected.edges.set(`${spouseId}-${childId}`, {
              source: spouseId,
              target: childId,
              type: "parent-child",
            });

            collectTreeDescendants(
              childId,
              1,
              descendantGenerations,
              parentToChildren,
              personMap,
              spouseMap,
              collected
            );
          }
        });
      }
    });
  }

  // Build nodes array
  const nodes: ChartNode[] = [];
  collected.nodeIds.forEach((id) => {
    const person = personMap.get(id);
    if (person) {
      nodes.push({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        dateOfBirth: dateToISOString(person.dateOfBirth),
        dateOfPassing: dateToISOString(person.dateOfPassing),
        isLiving: person.isLiving,
        photoUrl: person.photoUrl,
        gender: person.gender,
        generation: collected.generations.get(id) ?? 0,
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
  recordChartMetrics("tree", nodes.length, duration);

  // Calculate actual generation count
  const minGen = Math.min(...Array.from(collected.generations.values()));
  const maxGen = Math.max(...Array.from(collected.generations.values()));
  const totalGens = maxGen - minGen + 1;

  return {
    nodes,
    edges,
    metadata: {
      chartType: "tree",
      totalGenerations: totalGens,
      totalPeople: nodes.length,
      rootPersonId: personId,
    },
  };
}

/**
 * Exports chart as PDF
 *
 * Placeholder for PDF export orchestration logic
 *
 * @param chartType - Type of chart to export
 * @param chartData - Chart data to export
 * @returns Buffer containing PDF data
 *
 * @example
 * const pdf = await exportChartAsPDF('ancestor', chartData)
 */
export async function exportChartAsPDF(
  _chartType: string,
  _chartData: unknown
): Promise<Buffer> {
  // TODO: Implement PDF export
  throw new Error("PDF export not yet implemented");
}

/**
 * Exports chart as SVG
 *
 * Placeholder for SVG export orchestration logic
 *
 * @param chartType - Type of chart to export
 * @param chartData - Chart data to export
 * @returns String containing SVG data
 *
 * @example
 * const svg = await exportChartAsSVG('ancestor', chartData)
 */
export async function exportChartAsSVG(
  _chartType: string,
  _chartData: unknown
): Promise<string> {
  // TODO: Implement SVG export
  throw new Error("SVG export not yet implemented");
}
