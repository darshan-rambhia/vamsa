/**
 * Chart Data Fixtures
 *
 * Mock data generators for chart components, stories, and tests.
 * Provides factory functions and pre-built datasets for consistent test data.
 *
 * @example
 * import { createMockNodes, SMALL_FAMILY } from "@vamsa/lib/fixtures";
 *
 * // Create custom data
 * const nodes = createMockNodes(10, { generations: 3 });
 * const edges = createMockEdges(nodes);
 *
 * // Use presets
 * const { nodes, edges } = SMALL_FAMILY;
 */

import type {
  ChartNode,
  ChartEdge,
  BowtieNode,
  TimelineEntry,
  MatrixPerson,
  MatrixCell,
  CompactTreeResult,
  StatisticsResult,
} from "../server/business/charts";

// Helper to generate unique IDs
let idCounter = 0;
const generateId = () => `person-${++idCounter}`;

// Reset counter for consistent test data
export const resetIdCounter = () => {
  idCounter = 0;
};

export interface MockPersonOptions {
  id?: string;
  firstName?: string;
  lastName?: string;
  gender?: "MALE" | "FEMALE" | null;
  isLiving?: boolean;
  generation?: number;
  dateOfBirth?: string | null;
  dateOfPassing?: string | null;
}

export function createMockPerson(options: MockPersonOptions = {}): ChartNode {
  const id = options.id ?? generateId();
  return {
    id,
    firstName: options.firstName ?? "John",
    lastName: options.lastName ?? "Doe",
    gender: options.gender ?? "MALE",
    isLiving: options.isLiving ?? true,
    generation: options.generation ?? 0,
    dateOfBirth: options.dateOfBirth ?? "1980-01-01",
    dateOfPassing: options.dateOfPassing ?? null,
    photoUrl: null,
  };
}

export interface MockNodesOptions {
  generations?: number;
  peoplePerGeneration?: number;
  includeSpouses?: boolean;
  longNames?: boolean;
}

export function createMockNodes(
  count: number,
  options: MockNodesOptions = {}
): ChartNode[] {
  resetIdCounter();
  const nodes: ChartNode[] = [];
  const generations = options.generations ?? 3;
  const perGen = Math.ceil(count / generations);

  const firstNames = options.longNames
    ? ["Alexander", "Bartholomew", "Christopher", "Maximilian", "Nathaniel"]
    : ["John", "Jane", "Bob", "Alice", "Tom"];
  const lastNames = options.longNames
    ? ["Vanderbilt-Rothschild", "Montgomery-Wellington", "Fitzgerald-Kennedy"]
    : ["Doe", "Smith", "Johnson"];

  for (let gen = 0; gen < generations && nodes.length < count; gen++) {
    for (let i = 0; i < perGen && nodes.length < count; i++) {
      nodes.push(
        createMockPerson({
          firstName: firstNames[i % firstNames.length],
          lastName: lastNames[gen % lastNames.length],
          gender: i % 2 === 0 ? "MALE" : "FEMALE",
          generation: gen,
          isLiving: gen < 2,
          dateOfBirth: `${1920 + gen * 25}-01-01`,
          dateOfPassing: gen >= 2 ? `${2000 + gen * 5}-01-01` : null,
        })
      );
    }
  }
  return nodes;
}

export function createMockEdges(nodes: ChartNode[]): ChartEdge[] {
  const edges: ChartEdge[] = [];
  const byGen = new Map<number, ChartNode[]>();

  nodes.forEach((n) => {
    const gen = n.generation ?? 0;
    if (!byGen.has(gen)) byGen.set(gen, []);
    byGen.get(gen)!.push(n);
  });

  // Parent-child edges between generations
  const gens = Array.from(byGen.keys()).sort((a, b) => a - b);
  for (let i = 0; i < gens.length - 1; i++) {
    const parents = byGen.get(gens[i]) ?? [];
    const children = byGen.get(gens[i + 1]) ?? [];

    children.forEach((child, idx) => {
      const parent = parents[idx % parents.length];
      if (parent) {
        edges.push({
          id: `${parent.id}-${child.id}`,
          source: parent.id,
          target: child.id,
          type: "parent-child",
        });
      }
    });
  }

  // Spouse edges within generations
  gens.forEach((gen) => {
    const people = byGen.get(gen) ?? [];
    for (let i = 0; i < people.length - 1; i += 2) {
      if (people[i + 1]) {
        edges.push({
          id: `${people[i].id}-${people[i + 1].id}-spouse`,
          source: people[i].id,
          target: people[i + 1].id,
          type: "spouse",
        });
      }
    }
  });

  return edges;
}

// Specialized mock data creators

export function createBowtieNodes(
  rootPerson: ChartNode,
  paternalCount: number,
  maternalCount: number
): { nodes: BowtieNode[]; edges: ChartEdge[] } {
  const nodes: BowtieNode[] = [];
  const edges: ChartEdge[] = [];

  // Add root as center
  nodes.push({ ...rootPerson, side: "center" });

  // Create paternal side
  for (let i = 0; i < paternalCount; i++) {
    const gen = Math.floor(i / 2) + 1;
    const person = createMockPerson({
      firstName: i % 2 === 0 ? "PaternalFather" : "PaternalMother",
      lastName: "Paternal",
      gender: i % 2 === 0 ? "MALE" : "FEMALE",
      generation: gen,
      isLiving: false,
      dateOfBirth: `${1940 - gen * 25}-01-01`,
      dateOfPassing: `${2010 - gen * 10}-01-01`,
    });
    nodes.push({ ...person, side: "paternal" });

    // Add edge to root or parent
    if (i < 2) {
      edges.push({
        id: `${person.id}-${rootPerson.id}`,
        source: person.id,
        target: rootPerson.id,
        type: "parent-child",
      });
    }
  }

  // Create maternal side
  for (let i = 0; i < maternalCount; i++) {
    const gen = Math.floor(i / 2) + 1;
    const person = createMockPerson({
      firstName: i % 2 === 0 ? "MaternalFather" : "MaternalMother",
      lastName: "Maternal",
      gender: i % 2 === 0 ? "MALE" : "FEMALE",
      generation: gen,
      isLiving: false,
      dateOfBirth: `${1940 - gen * 25}-01-01`,
      dateOfPassing: `${2010 - gen * 10}-01-01`,
    });
    nodes.push({ ...person, side: "maternal" });

    // Add edge to root or parent
    if (i < 2) {
      edges.push({
        id: `${person.id}-${rootPerson.id}`,
        source: person.id,
        target: rootPerson.id,
        type: "parent-child",
      });
    }
  }

  return { nodes, edges };
}

export function createTimelineEntries(count: number): TimelineEntry[] {
  resetIdCounter();
  const entries: TimelineEntry[] = [];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < count; i++) {
    const birthYear = 1900 + i * 10;
    const isLiving = birthYear > currentYear - 80;
    entries.push({
      id: generateId(),
      firstName: ["John", "Jane", "Bob", "Alice", "Tom"][i % 5],
      lastName: ["Doe", "Smith", "Johnson"][i % 3],
      birthYear,
      deathYear: isLiving ? null : birthYear + 70,
      isLiving,
      gender: i % 2 === 0 ? "MALE" : "FEMALE",
      photoUrl: null,
    });
  }

  return entries;
}

export function createMatrixData(count: number): {
  people: MatrixPerson[];
  matrix: MatrixCell[];
} {
  resetIdCounter();
  const people: MatrixPerson[] = [];

  // Create people
  for (let i = 0; i < count; i++) {
    people.push({
      id: generateId(),
      firstName: ["John", "Jane", "Bob", "Alice", "Tom"][i % 5],
      lastName: ["Doe", "Smith", "Johnson"][i % 3],
      gender: i % 2 === 0 ? "MALE" : "FEMALE",
    });
  }

  // Create matrix cells (relationships)
  const matrix: MatrixCell[] = [];
  const relationshipTypes = [
    "PARENT",
    "CHILD",
    "SPOUSE",
    "SIBLING",
    "PARENT_IN_LAW",
    "CHILD_IN_LAW",
  ];

  // Use deterministic random based on indices for consistent test data
  const seededRandom = (i: number, j: number) => {
    const seed = (i * 1000 + j) % 100;
    return seed / 100;
  };

  people.forEach((person, i) => {
    people.forEach((relatedPerson, j) => {
      if (person.id === relatedPerson.id) {
        matrix.push({
          personId: person.id,
          relatedPersonId: relatedPerson.id,
          relationshipType: "SELF",
          strength: 1,
        });
      } else if (seededRandom(i, j) > 0.7) {
        // 30% chance of relationship
        matrix.push({
          personId: person.id,
          relatedPersonId: relatedPerson.id,
          relationshipType:
            relationshipTypes[
              Math.floor(seededRandom(i, j) * 10) % relationshipTypes.length
            ],
          strength: seededRandom(i, j) > 0.85 ? 1 : 0.5,
        });
      } else {
        matrix.push({
          personId: person.id,
          relatedPersonId: relatedPerson.id,
          relationshipType: null,
          strength: 0,
        });
      }
    });
  });

  return { people, matrix };
}

export function createCompactTreeData(
  generations: number,
  peoplePerGen: number
): CompactTreeResult {
  resetIdCounter();
  const nodes = createMockNodes(generations * peoplePerGen, {
    generations,
    peoplePerGeneration: peoplePerGen,
  });

  const flatList = nodes.map((node, idx) => ({
    id: node.id,
    firstName: node.firstName,
    lastName: node.lastName,
    dateOfBirth: node.dateOfBirth,
    dateOfPassing: node.dateOfPassing,
    isLiving: node.isLiving,
    gender: node.gender,
    photoUrl: null,
    generation: node.generation ?? 0,
    parentId: idx > 0 ? nodes[Math.floor(idx / 2)].id : null,
    hasChildren: idx < nodes.length / 2,
    spouseCount: idx % 3 === 0 ? 1 : 0,
  }));

  // Create root node with proper structure
  const rootNode = flatList[0]
    ? {
        ...flatList[0],
        children: [],
        spouses: [],
      }
    : null;

  return {
    root: rootNode,
    flatList,
    metadata: {
      chartType: "compact",
      totalPeople: nodes.length,
      totalGenerations: generations,
      rootPersonId: nodes[0]?.id || "",
    },
  };
}

export function createStatisticsData(
  partial: boolean = false
): StatisticsResult {
  return {
    ageDistribution: partial
      ? [
          { bracket: "0-10", count: 5, percentage: 10 },
          { bracket: "11-20", count: 0, percentage: 0 },
        ]
      : [
          { bracket: "0-10", count: 5, percentage: 10 },
          { bracket: "11-20", count: 8, percentage: 16 },
          { bracket: "21-30", count: 12, percentage: 24 },
          { bracket: "31-40", count: 10, percentage: 20 },
          { bracket: "41-50", count: 8, percentage: 16 },
          { bracket: "51-60", count: 4, percentage: 8 },
          { bracket: "61-70", count: 2, percentage: 4 },
          { bracket: "71-80", count: 1, percentage: 2 },
        ],
    generationSizes: partial
      ? [
          { generation: 0, livingCount: 1, deceasedCount: 0, count: 1 },
          { generation: 1, livingCount: 2, deceasedCount: 0, count: 2 },
        ]
      : [
          { generation: 0, livingCount: 1, deceasedCount: 0, count: 1 },
          { generation: 1, livingCount: 2, deceasedCount: 1, count: 3 },
          { generation: 2, livingCount: 5, deceasedCount: 3, count: 8 },
          { generation: 3, livingCount: 10, deceasedCount: 5, count: 15 },
        ],
    genderDistribution: partial
      ? [
          { gender: "Male", count: 25, percentage: 50 },
          { gender: "Female", count: 25, percentage: 50 },
        ]
      : [
          { gender: "Male", count: 25, percentage: 50 },
          { gender: "Female", count: 22, percentage: 44 },
          { gender: "Other", count: 2, percentage: 4 },
          { gender: "Not Specified", count: 1, percentage: 2 },
        ],
    geographicDistribution: partial
      ? []
      : [
          { location: "New York, USA", count: 15, percentage: 30 },
          { location: "London, UK", count: 10, percentage: 20 },
          { location: "Mumbai, India", count: 8, percentage: 16 },
          { location: "Sydney, Australia", count: 7, percentage: 14 },
        ],
    surnameFrequency: [
      { surname: "Smith", count: 12, percentage: 24 },
      { surname: "Johnson", count: 10, percentage: 20 },
      { surname: "Doe", count: 8, percentage: 16 },
      { surname: "Brown", count: 6, percentage: 12 },
    ],
    lifespanTrends: partial
      ? []
      : [
          { decade: "1900s", averageLifespan: 55, sampleSize: 10 },
          { decade: "1920s", averageLifespan: 62, sampleSize: 15 },
          { decade: "1940s", averageLifespan: 68, sampleSize: 20 },
          { decade: "1960s", averageLifespan: 75, sampleSize: 12 },
        ],
    metadata: {
      chartType: "statistics",
      totalPeople: 50,
      livingCount: 30,
      deceasedCount: 20,
      oldestPerson: {
        id: "person-1",
        name: "John Doe",
        age: 95,
      },
      youngestPerson: {
        id: "person-2",
        name: "Jane Smith",
        age: 2,
      },
    },
  };
}

// ==========================================
// Presets - Pre-built datasets
// ==========================================

export const EMPTY_DATA = {
  nodes: [] as ChartNode[],
  edges: [] as ChartEdge[],
};

export const SINGLE_PERSON = (() => {
  resetIdCounter();
  const nodes = [createMockPerson({ firstName: "Solo", lastName: "Person" })];
  return { nodes, edges: [] as ChartEdge[] };
})();

export const SMALL_FAMILY = (() => {
  resetIdCounter();
  const nodes = createMockNodes(5, { generations: 2 });
  const edges = createMockEdges(nodes);
  return { nodes, edges };
})();

export const LARGE_FAMILY = (() => {
  resetIdCounter();
  const nodes = createMockNodes(50, { generations: 5 });
  const edges = createMockEdges(nodes);
  return { nodes, edges };
})();

export const DEEP_ANCESTRY = (() => {
  resetIdCounter();
  const nodes = createMockNodes(30, {
    generations: 10,
    peoplePerGeneration: 3,
  });
  const edges = createMockEdges(nodes);
  return { nodes, edges };
})();

export const LONG_NAMES = (() => {
  resetIdCounter();
  const nodes = createMockNodes(10, { generations: 3, longNames: true });
  const edges = createMockEdges(nodes);
  return { nodes, edges };
})();
