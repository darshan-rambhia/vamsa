/**
 * Descendant Query Handlers
 *
 * Provides utilities for finding and analyzing descendants with generation tracking
 * and optional filtering for living persons.
 */

import type { RelationshipMapSet, RelationshipNode } from "./ancestors";
import { findAncestors } from "./ancestors";

/**
 * Result of a descendant query including generation information
 */
export interface DescendantQueryResult {
  person: RelationshipNode;
  generation: number; // 1 = child, 2 = grandchild, etc.
}

/**
 * Options for descendant queries
 */
export interface DescendantQueryOptions {
  /** Maximum number of generations to traverse (unlimited if not specified) */
  maxGenerations?: number;
  /** Include living persons only */
  includeLiving?: boolean;
  /** Include deceased persons only */
  includeDeceased?: boolean;
}

/**
 * Internal state for descendant collection
 */
interface DescendantCollectionState {
  results: Map<string, DescendantQueryResult>;
  visited: Set<string>;
}

/**
 * Recursively collects descendants using BFS (breadth-first search)
 *
 * Traverses the child relationships to find all descendants up to a specified
 * generation limit.
 *
 * @param personId - ID of the person to start from
 * @param generation - Current generation level (starts at 1 for children)
 * @param maxGenerations - Maximum generations to traverse (unlimited if not specified)
 * @param parentToChildren - Map of parent->children relationships
 * @param people - Map of all persons by ID
 * @param state - Mutable state for accumulating results
 */
function collectDescendantsRecursive(
  personId: string,
  generation: number,
  maxGenerations: number | undefined,
  parentToChildren: Map<string, Set<string>>,
  people: Map<string, RelationshipNode>,
  state: DescendantCollectionState
): void {
  // Check depth limit
  if (maxGenerations !== undefined && generation > maxGenerations) {
    return;
  }

  // Get children
  const childIds = parentToChildren.get(personId);
  if (!childIds || childIds.size === 0) {
    return;
  }

  // Process each child
  childIds.forEach((childId) => {
    if (state.visited.has(childId)) {
      return; // Already processed this person
    }

    const childPerson = people.get(childId);
    if (!childPerson) {
      return; // Person not in map
    }

    state.visited.add(childId);

    // Add new descendant
    state.results.set(childId, {
      person: childPerson,
      generation,
    });

    // Recurse to child's children
    collectDescendantsRecursive(
      childId,
      generation + 1,
      maxGenerations,
      parentToChildren,
      people,
      state
    );
  });
}

/**
 * Find all descendants of a person up to a specified generation limit
 *
 * Uses breadth-first search to efficiently traverse the descendant tree.
 * Results are sorted by generation (closest descendants first).
 *
 * @param personId - The ID of the person to find descendants for
 * @param people - Map of all persons by ID
 * @param relationships - Maps of relationship data (must include parentToChildren)
 * @param options - Optional query parameters for limiting depth and filtering
 * @returns Array of descendant results sorted by generation
 *
 * @example
 * const descendants = findDescendants('person123', peopleMap, relationshipMaps, {
 *   maxGenerations: 5,
 *   includeLiving: true
 * });
 * // Returns all living descendants up to 5 generations down
 */
export function findDescendants(
  personId: string,
  people: Map<string, RelationshipNode>,
  relationships: RelationshipMapSet & {
    parentToChildren: Map<string, Set<string>>;
  },
  options?: DescendantQueryOptions
): DescendantQueryResult[] {
  const state: DescendantCollectionState = {
    results: new Map(),
    visited: new Set(),
  };

  // Start collection from the root person
  collectDescendantsRecursive(
    personId,
    1,
    options?.maxGenerations,
    relationships.parentToChildren,
    people,
    state
  );

  // Convert results to array
  let results = Array.from(state.results.values());

  // Filter by living/deceased status if specified
  if (options?.includeLiving === true && options?.includeDeceased !== true) {
    results = results.filter((result) => result.person.isLiving);
  } else if (
    options?.includeDeceased === true &&
    options?.includeLiving !== true
  ) {
    results = results.filter((result) => !result.person.isLiving);
  }

  // Sort by generation (closest first)
  results.sort((a, b) => a.generation - b.generation);

  return results;
}

/**
 * Get descendants at a specific generation level
 *
 * Returns only the descendants at exactly the specified generation.
 * Generation 1 = children, 2 = grandchildren, etc.
 *
 * @param personId - The ID of the person
 * @param generation - The generation to retrieve (1-indexed)
 * @param people - Map of all persons by ID
 * @param relationships - Maps of relationship data
 * @returns Array of persons at the specified generation
 *
 * @example
 * const grandchildren = getDescendantsAtGeneration('person123', 2, peopleMap, relationshipMaps);
 * // Returns all grandchildren of person123
 */
export function getDescendantsAtGeneration(
  personId: string,
  generation: number,
  people: Map<string, RelationshipNode>,
  relationships: RelationshipMapSet & {
    parentToChildren: Map<string, Set<string>>;
  }
): RelationshipNode[] {
  const results = findDescendants(personId, people, relationships, {
    maxGenerations: generation,
  });

  return results
    .filter((result) => result.generation === generation)
    .map((result) => result.person);
}

/**
 * Count total descendants up to a maximum generation
 *
 * Returns the number of unique descendants found, useful for statistics
 * and performance monitoring.
 *
 * @param personId - The ID of the person
 * @param people - Map of all persons by ID
 * @param relationships - Maps of relationship data
 * @param maxGenerations - Maximum generations to count
 * @returns Total number of descendants found
 *
 * @example
 * const count = countDescendants('person123', peopleMap, relationshipMaps, 5);
 * // Returns number of descendants up to 5 generations down
 */
export function countDescendants(
  personId: string,
  people: Map<string, RelationshipNode>,
  relationships: RelationshipMapSet & {
    parentToChildren: Map<string, Set<string>>;
  },
  maxGenerations?: number
): number {
  const results = findDescendants(personId, people, relationships, {
    maxGenerations,
  });
  return results.length;
}

/**
 * Get descendants grouped by generation
 *
 * Organizes descendant results by generation level for easy iteration
 * and analysis.
 *
 * @param personId - The ID of the person
 * @param people - Map of all persons by ID
 * @param relationships - Maps of relationship data
 * @param options - Optional query parameters
 * @returns Map of generation number to array of persons at that generation
 *
 * @example
 * const byGen = getDescendantsByGeneration('person123', peopleMap, relationshipMaps);
 * const children = byGen.get(1);
 * const grandchildren = byGen.get(2);
 */
export function getDescendantsByGeneration(
  personId: string,
  people: Map<string, RelationshipNode>,
  relationships: RelationshipMapSet & {
    parentToChildren: Map<string, Set<string>>;
  },
  options?: DescendantQueryOptions
): Map<number, RelationshipNode[]> {
  const results = findDescendants(personId, people, relationships, options);
  const grouped = new Map<number, RelationshipNode[]>();

  results.forEach((result) => {
    if (!grouped.has(result.generation)) {
      grouped.set(result.generation, []);
    }
    grouped.get(result.generation)!.push(result.person);
  });

  return grouped;
}

/**
 * Get all relatives of a person (both ancestors and descendants)
 *
 * Combines ancestor and descendant queries to return all relatives.
 *
 * @param personId - The ID of the person
 * @param people - Map of all persons by ID
 * @param relationships - Maps of relationship data
 * @param ancestorGenerations - Maximum ancestor generations to include
 * @param descendantGenerations - Maximum descendant generations to include
 * @returns Object containing ancestors and descendants arrays
 *
 * @example
 * const relatives = getAllRelatives('person123', peopleMap, relationshipMaps, 5, 5);
 * const allAncestors = relatives.ancestors;
 * const allDescendants = relatives.descendants;
 */
export function getAllRelatives(
  personId: string,
  people: Map<string, RelationshipNode>,
  relationships: RelationshipMapSet & {
    parentToChildren: Map<string, Set<string>>;
  },
  ancestorGenerations?: number,
  descendantGenerations?: number
): {
  ancestors: DescendantQueryResult[];
  descendants: DescendantQueryResult[];
  totalCount: number;
} {
  const ancestorResults = findAncestors(personId, people, relationships, {
    maxGenerations: ancestorGenerations,
  });

  const descendantResults = findDescendants(personId, people, relationships, {
    maxGenerations: descendantGenerations,
  });

  // Convert ancestor results to descendant format for consistency
  const ancestorsAsDescendants = ancestorResults.map((result) => ({
    person: result.person,
    generation: result.generation,
  }));

  return {
    ancestors: ancestorsAsDescendants,
    descendants: descendantResults,
    totalCount: ancestorResults.length + descendantResults.length,
  };
}
