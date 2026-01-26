/**
 * Ancestor Query Handlers
 *
 * Provides utilities for finding and analyzing ancestors with generation tracking
 * and optional paternal/maternal lineage filtering.
 */

import type { RelationshipNode as PathFinderNode } from "./path-finder";

/**
 * Extended relationship node with additional properties for query results
 */
export interface RelationshipNode extends PathFinderNode {
  dateOfBirth?: Date | null;
  dateOfPassing?: Date | null;
  isLiving?: boolean;
  photoUrl?: string | null;
}

/**
 * Result of an ancestor query including generation and lineage information
 */
export interface AncestorQueryResult {
  person: RelationshipNode;
  generation: number; // 1 = parent, 2 = grandparent, etc.
  lineage: "paternal" | "maternal" | "both";
}

/**
 * Options for ancestor queries
 */
export interface AncestorQueryOptions {
  /** Maximum number of generations to traverse (unlimited if not specified) */
  maxGenerations?: number;
  /** Filter by lineage type */
  lineage?: "paternal" | "maternal" | "all";
}

/**
 * Relationship map for efficient lookups
 */
export interface RelationshipMapSet {
  /** Maps child ID to their parent IDs */
  childToParents: Map<string, Set<string>>;
  /** Maps spouse relationships */
  spouseMap: Map<string, Set<string>>;
}

/**
 * Internal state for ancestor collection
 */
interface AncestorCollectionState {
  results: Map<string, AncestorQueryResult>;
  visited: Set<string>;
}

/**
 * Determines the lineage (paternal/maternal) based on parent gender
 *
 * @param parentGender - The gender of the parent ('male', 'female', etc.)
 * @returns 'paternal' for males, 'maternal' for females, 'both' if gender unknown
 */
function determineLineage(
  parentGender: string | undefined | null
): "paternal" | "maternal" | "both" {
  if (!parentGender) return "both";
  return parentGender === "male" ? "paternal" : "maternal";
}

/**
 * Merges lineage information when both paternal and maternal ancestors exist
 */
function mergeLineage(
  existing: "paternal" | "maternal" | "both",
  incoming: "paternal" | "maternal" | "both"
): "paternal" | "maternal" | "both" {
  if (existing === "both" || incoming === "both") return "both";
  if (existing !== incoming) return "both";
  return existing;
}

/**
 * Recursively collects ancestors using BFS (breadth-first search)
 *
 * Traverses the parent relationships to find all ancestors up to a specified
 * generation limit. Tracks lineage information to distinguish paternal vs maternal lines.
 *
 * @param personId - ID of the person to start from
 * @param generation - Current generation level (starts at 1 for parents)
 * @param maxGenerations - Maximum generations to traverse (unlimited if not specified)
 * @param childToParents - Map of child->parents relationships
 * @param people - Map of all persons by ID
 * @param spouseMap - Map of spouse relationships
 * @param state - Mutable state for accumulating results
 * @param parentLineage - Lineage inherited from parent (paternal/maternal)
 */
function collectAncestorsRecursive(
  personId: string,
  generation: number,
  maxGenerations: number | undefined,
  childToParents: Map<string, Set<string>>,
  people: Map<string, RelationshipNode>,
  spouseMap: Map<string, Set<string>>,
  state: AncestorCollectionState
): void {
  // Check depth limit
  if (maxGenerations !== undefined && generation > maxGenerations) {
    return;
  }

  // Get parents
  const parentIds = childToParents.get(personId);
  if (!parentIds || parentIds.size === 0) {
    return;
  }

  // Process each parent
  parentIds.forEach((parentId) => {
    if (state.visited.has(parentId)) {
      return; // Already processed this person
    }

    const parentPerson = people.get(parentId);
    if (!parentPerson) {
      return; // Person not in map
    }

    state.visited.add(parentId);

    // Determine lineage from parent's gender
    const lineage = determineLineage(parentPerson.gender);

    // Check if we already have this person with different lineage
    const existing = state.results.get(parentId);
    if (existing) {
      // Merge lineage information
      existing.lineage = mergeLineage(existing.lineage, lineage);
    } else {
      // Add new ancestor
      state.results.set(parentId, {
        person: parentPerson,
        generation,
        lineage,
      });
    }

    // Recurse to parent's parents
    collectAncestorsRecursive(
      parentId,
      generation + 1,
      maxGenerations,
      childToParents,
      people,
      spouseMap,
      state
    );
  });
}

/**
 * Find all ancestors of a person up to a specified generation limit
 *
 * Uses breadth-first search to efficiently traverse the ancestor tree.
 * Results are sorted by generation (closest ancestors first).
 *
 * @param personId - The ID of the person to find ancestors for
 * @param people - Map of all persons by ID
 * @param relationships - Maps of relationship data (childToParents, spouseMap)
 * @param options - Optional query parameters for limiting depth and filtering lineage
 * @returns Array of ancestor results sorted by generation
 *
 * @example
 * const ancestors = findAncestors('person123', peopleMap, relationshipMaps, {
 *   maxGenerations: 5,
 *   lineage: 'paternal'
 * });
 * // Returns all paternal ancestors up to 5 generations back
 */
export function findAncestors(
  personId: string,
  people: Map<string, RelationshipNode>,
  relationships: RelationshipMapSet,
  options?: AncestorQueryOptions
): AncestorQueryResult[] {
  const state: AncestorCollectionState = {
    results: new Map(),
    visited: new Set(),
  };

  // Start collection from the root person
  collectAncestorsRecursive(
    personId,
    1,
    options?.maxGenerations,
    relationships.childToParents,
    people,
    relationships.spouseMap,
    state
  );

  // Convert results to array and filter by lineage if specified
  let results = Array.from(state.results.values());

  if (options?.lineage && options.lineage !== "all") {
    results = results.filter(
      (result) =>
        result.lineage === options.lineage || result.lineage === "both"
    );
  }

  // Sort by generation (closest first)
  results.sort((a, b) => a.generation - b.generation);

  return results;
}

/**
 * Get ancestors at a specific generation level
 *
 * Returns only the ancestors at exactly the specified generation.
 * Generation 1 = parents, 2 = grandparents, etc.
 *
 * @param personId - The ID of the person
 * @param generation - The generation to retrieve (1-indexed)
 * @param people - Map of all persons by ID
 * @param relationships - Maps of relationship data
 * @returns Array of persons at the specified generation
 *
 * @example
 * const grandparents = getAncestorsAtGeneration('person123', 2, peopleMap, relationshipMaps);
 * // Returns all grandparents of person123
 */
export function getAncestorsAtGeneration(
  personId: string,
  generation: number,
  people: Map<string, RelationshipNode>,
  relationships: RelationshipMapSet
): RelationshipNode[] {
  const results = findAncestors(personId, people, relationships, {
    maxGenerations: generation,
  });

  return results
    .filter((result) => result.generation === generation)
    .map((result) => result.person);
}

/**
 * Count total ancestors up to a maximum generation
 *
 * Returns the number of unique ancestors found, useful for statistics
 * and performance monitoring.
 *
 * @param personId - The ID of the person
 * @param people - Map of all persons by ID
 * @param relationships - Maps of relationship data
 * @param maxGenerations - Maximum generations to count
 * @returns Total number of ancestors found
 *
 * @example
 * const count = countAncestors('person123', peopleMap, relationshipMaps, 5);
 * // Returns number of ancestors up to 5 generations back
 */
export function countAncestors(
  personId: string,
  people: Map<string, RelationshipNode>,
  relationships: RelationshipMapSet,
  maxGenerations?: number
): number {
  const results = findAncestors(personId, people, relationships, {
    maxGenerations,
  });
  return results.length;
}

/**
 * Get ancestors grouped by generation
 *
 * Organizes ancestor results by generation level for easy iteration
 * and analysis.
 *
 * @param personId - The ID of the person
 * @param people - Map of all persons by ID
 * @param relationships - Maps of relationship data
 * @param options - Optional query parameters
 * @returns Map of generation number to array of persons at that generation
 *
 * @example
 * const byGen = getAncestorsByGeneration('person123', peopleMap, relationshipMaps);
 * const parents = byGen.get(1);
 * const grandparents = byGen.get(2);
 */
export function getAncestorsByGeneration(
  personId: string,
  people: Map<string, RelationshipNode>,
  relationships: RelationshipMapSet,
  options?: AncestorQueryOptions
): Map<number, RelationshipNode[]> {
  const results = findAncestors(personId, people, relationships, options);
  const grouped = new Map<number, RelationshipNode[]>();

  results.forEach((result) => {
    if (!grouped.has(result.generation)) {
      grouped.set(result.generation, []);
    }
    grouped.get(result.generation)!.push(result.person);
  });

  return grouped;
}
