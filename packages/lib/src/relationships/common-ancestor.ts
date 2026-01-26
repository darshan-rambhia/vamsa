/**
 * Lowest Common Ancestor (LCA) finder for family trees
 *
 * Provides algorithms to find shared ancestors between two people in a family tree.
 * Uses BFS (breadth-first search) for optimal performance.
 */

import type { RelationshipNode } from "./path-finder";

/**
 * Result of a common ancestor search
 * Contains the ancestor and distances from both people
 */
export interface AncestorResult {
  ancestor: RelationshipNode;
  distance1: number; // Generations from person1
  distance2: number; // Generations from person2
}

/**
 * Find the lowest (closest) common ancestor of two people
 *
 * Algorithm:
 * 1. Build set of all ancestors of person1 with their distances
 * 2. BFS upward from person2
 * 3. Return first intersection found (the LCA)
 *
 * Edge cases handled:
 * - Same person: returns self with distance 0
 * - Direct ancestor relationship: returns the ancestor
 * - No common ancestor: returns null
 * - Multiple paths to same ancestor: uses shortest path
 *
 * @param person1Id - ID of the first person
 * @param person2Id - ID of the second person
 * @param people - Map of person ID to RelationshipNode
 * @param parents - Map of person ID to array of parent IDs
 * @returns AncestorResult containing the LCA and distances, or null if no common ancestor
 *
 * @example
 * const lca = findCommonAncestor("person1", "person2", peopleMap, parentsMap);
 * if (lca) {
 *   console.log(`Common ancestor: ${lca.ancestor.firstName} ${lca.ancestor.lastName}`);
 *   console.log(`Distance from person1: ${lca.distance1}`);
 *   console.log(`Distance from person2: ${lca.distance2}`);
 * }
 */
export function findCommonAncestor(
  person1Id: string,
  person2Id: string,
  people: Map<string, RelationshipNode>,
  parents: Map<string, string[]>
): AncestorResult | null {
  // Handle same person case
  if (person1Id === person2Id) {
    const person = people.get(person1Id);
    if (!person) return null;
    return {
      ancestor: person,
      distance1: 0,
      distance2: 0,
    };
  }

  // Build ancestor set for person1 with distances
  const ancestors1 = new Map<string, number>();
  const queue1: Array<{ id: string; distance: number }> = [
    { id: person1Id, distance: 0 },
  ];
  ancestors1.set(person1Id, 0);

  while (queue1.length > 0) {
    const current = queue1.shift();
    if (!current) break;

    const parentIds = parents.get(current.id);
    if (!parentIds) continue;

    for (const parentId of parentIds) {
      if (!ancestors1.has(parentId)) {
        const distance = current.distance + 1;
        ancestors1.set(parentId, distance);
        queue1.push({ id: parentId, distance });
      }
    }
  }

  // BFS from person2 to find first common ancestor
  const queue2: Array<{ id: string; distance: number }> = [
    { id: person2Id, distance: 0 },
  ];
  const visited2 = new Set<string>();
  visited2.add(person2Id);

  while (queue2.length > 0) {
    const current = queue2.shift();
    if (!current) break;

    // Check if this person is a common ancestor
    if (ancestors1.has(current.id)) {
      const person = people.get(current.id);
      if (!person) return null;

      return {
        ancestor: person,
        distance1: ancestors1.get(current.id) || 0,
        distance2: current.distance,
      };
    }

    // Continue searching upward
    const parentIds = parents.get(current.id);
    if (!parentIds) continue;

    for (const parentId of parentIds) {
      if (!visited2.has(parentId)) {
        visited2.add(parentId);
        queue2.push({ id: parentId, distance: current.distance + 1 });
      }
    }
  }

  return null;
}

/**
 * Find all common ancestors of two people
 *
 * Algorithm:
 * 1. Build complete ancestor sets for both people with distances
 * 2. Find intersection of both sets
 * 3. Return all common ancestors sorted by total distance (closest first)
 *
 * Useful for understanding all possible common ancestors in complex family trees
 * (e.g., both paternal and maternal grandparents).
 *
 * @param person1Id - ID of the first person
 * @param person2Id - ID of the second person
 * @param people - Map of person ID to RelationshipNode
 * @param parents - Map of person ID to array of parent IDs
 * @returns Array of AncestorResult objects, sorted by total distance (closest first)
 *
 * @example
 * const allAncestors = findAllCommonAncestors("person1", "person2", peopleMap, parentsMap);
 * allAncestors.forEach(result => {
 *   console.log(`${result.ancestor.firstName} ${result.ancestor.lastName}`);
 *   console.log(`Total generations: ${result.distance1 + result.distance2}`);
 * });
 */
export function findAllCommonAncestors(
  person1Id: string,
  person2Id: string,
  people: Map<string, RelationshipNode>,
  parents: Map<string, string[]>
): AncestorResult[] {
  // Build complete ancestor set for person1
  const ancestors1 = new Map<string, number>();
  const queue1: Array<{ id: string; distance: number }> = [
    { id: person1Id, distance: 0 },
  ];
  ancestors1.set(person1Id, 0);

  while (queue1.length > 0) {
    const current = queue1.shift();
    if (!current) break;

    const parentIds = parents.get(current.id);
    if (!parentIds) continue;

    for (const parentId of parentIds) {
      if (!ancestors1.has(parentId)) {
        const distance = current.distance + 1;
        ancestors1.set(parentId, distance);
        queue1.push({ id: parentId, distance });
      }
    }
  }

  // Build complete ancestor set for person2
  const ancestors2 = new Map<string, number>();
  const queue2: Array<{ id: string; distance: number }> = [
    { id: person2Id, distance: 0 },
  ];
  ancestors2.set(person2Id, 0);

  while (queue2.length > 0) {
    const current = queue2.shift();
    if (!current) break;

    const parentIds = parents.get(current.id);
    if (!parentIds) continue;

    for (const parentId of parentIds) {
      if (!ancestors2.has(parentId)) {
        const distance = current.distance + 1;
        ancestors2.set(parentId, distance);
        queue2.push({ id: parentId, distance });
      }
    }
  }

  // Find all common ancestors
  const commonAncestors: AncestorResult[] = [];

  ancestors1.forEach((distance1, personId) => {
    if (ancestors2.has(personId)) {
      const person = people.get(personId);
      if (person) {
        const distance2 = ancestors2.get(personId) || 0;
        commonAncestors.push({
          ancestor: person,
          distance1,
          distance2,
        });
      }
    }
  });

  // Sort by total distance (closest ancestors first)
  // Then by distance1 as tiebreaker
  // Then by distance2 as secondary tiebreaker
  commonAncestors.sort((a, b) => {
    const totalA = a.distance1 + a.distance2;
    const totalB = b.distance1 + b.distance2;

    if (totalA !== totalB) {
      return totalA - totalB;
    }

    if (a.distance1 !== b.distance1) {
      return a.distance1 - b.distance1;
    }

    return a.distance2 - b.distance2;
  });

  return commonAncestors;
}
