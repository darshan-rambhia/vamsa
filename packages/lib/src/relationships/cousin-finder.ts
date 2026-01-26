/**
 * Cousin Finder - Algorithm for finding Nth degree cousins
 *
 * This module provides utilities for:
 * - Finding all Nth degree cousins of a person
 * - Calculating the cousin relationship (degree and removal) between two people
 * - Handling edge cases like siblings, direct ancestors/descendants
 *
 * Cousin Terminology:
 * - Degree: The number of ancestral generations shared (1st, 2nd, 3rd cousins)
 * - Removal: Generation difference from "true" cousin position (0 = same gen, 1 = once removed, etc.)
 *
 * @example
 * // Find all first cousins
 * const cousins = findCousins('person1', 1, people, relationships);
 *
 * @example
 * // Calculate cousin relationship
 * const result = calculateCousinDegree('person1', 'person2', relationships);
 * // { degree: 1, removal: 0 } => 1st cousin
 * // { degree: 2, removal: 1 } => 2nd cousin once removed
 */

import type { RelationshipNode } from "./ancestors";

/**
 * Result of finding a cousin relationship
 */
export interface CousinResult {
  person: RelationshipNode;
  degree: number; // 1st, 2nd, 3rd cousin, etc.
  removal: number; // 0 = same generation, 1 = once removed, etc.
}

/**
 * Find all Nth degree cousins of a person
 *
 * Algorithm:
 * 1. Collect all ancestors at (degree + 1) generations up
 * 2. From each ancestor, collect all descendants at (degree + 1) generations down
 * 3. Exclude direct ancestors/descendants and the person themselves
 * 4. Return people at the target generation level
 *
 * @param personId - The ID of the person to find cousins for
 * @param degree - The cousin degree (1 for first cousins, 2 for second, etc.)
 * @param people - Map of person IDs to person data
 * @param childToParents - Map of child IDs to parent IDs
 * @param parentToChildren - Map of parent IDs to child IDs
 * @returns Array of cousin results with degree and removal information
 *
 * @example
 * // Find all first cousins
 * const cousins = findCousins('person1', 1, people, childToParents, parentToChildren);
 * // Returns: [{ person: {...}, degree: 1, removal: 0 }, ...]
 *
 * @example
 * // Find all second cousins
 * const cousins = findCousins('person1', 2, people, childToParents, parentToChildren);
 */
export function findCousins(
  personId: string,
  degree: number,
  people: Map<string, RelationshipNode>,
  childToParents: Map<string, Set<string>>,
  parentToChildren: Map<string, Set<string>>
): CousinResult[] {
  if (degree < 1) {
    return [];
  }

  const results: CousinResult[] = [];
  const visited = new Set<string>();
  visited.add(personId);

  // Step 1: Find all ancestors at (degree + 1) generations up
  const ancestors = new Set<string>();

  function collectAncestorsAtLevel(currentId: string, level: number): void {
    if (level === 0) {
      ancestors.add(currentId);
      return;
    }

    const parents = childToParents.get(currentId);
    if (parents && parents.size > 0) {
      parents.forEach((parentId: string) => {
        collectAncestorsAtLevel(parentId, level - 1);
      });
    }
  }

  // Go up (degree + 1) generations to find common ancestors
  collectAncestorsAtLevel(personId, degree + 1);

  // Step 2: From each ancestor, go down (degree + 1) generations
  // to collect all descendants, but exclude direct line descendants
  ancestors.forEach((ancestorId) => {
    const descendants = new Set<string>();

    function collectDescendantsAtLevel(currentId: string, level: number): void {
      if (level >= 0) {
        descendants.add(currentId);
      }

      if (level > 0) {
        const children = parentToChildren.get(currentId);
        if (children && children.size > 0) {
          children.forEach((childId: string) => {
            collectDescendantsAtLevel(childId, level - 1);
          });
        }
      }
    }

    // Go down (degree + 1) generations from this ancestor
    collectDescendantsAtLevel(ancestorId, degree + 1);

    // Step 3: Filter out the original person and direct ancestors/descendants
    descendants.forEach((descendantId) => {
      if (descendantId === personId || visited.has(descendantId)) {
        return;
      }

      // Check if this person is a direct ancestor or descendant of personId
      if (
        isDirectLineage(
          personId,
          descendantId,
          childToParents,
          parentToChildren
        )
      ) {
        return;
      }

      const distanceFromPerson = calculateDistance(
        personId,
        descendantId,
        childToParents,
        parentToChildren
      );

      if (distanceFromPerson === null) {
        return;
      }

      const [personUpDist, personDownDist] = distanceFromPerson;

      // Calculate degree and removal
      const minDistance = Math.min(personUpDist, personDownDist);
      const cousinDegree = minDistance - 1;
      const removal = Math.abs(personUpDist - personDownDist);

      // Only include if degree matches
      if (cousinDegree === degree) {
        const person = people.get(descendantId);
        if (person) {
          results.push({
            person,
            degree: cousinDegree,
            removal,
          });
          visited.add(descendantId);
        }
      }
    });
  });

  // Sort results by removal and then by name for consistent ordering
  results.sort((a, b) => {
    if (a.removal !== b.removal) {
      return a.removal - b.removal;
    }
    const nameA = `${a.person.firstName} ${a.person.lastName}`;
    const nameB = `${b.person.firstName} ${b.person.lastName}`;
    return nameA.localeCompare(nameB);
  });

  return results;
}

/**
 * Calculate the cousin relationship between two people
 *
 * Algorithm:
 * 1. Find the path from person1 to their common ancestor with person2
 * 2. Count generations from each person to the common ancestor
 * 3. degree = min(distance1, distance2) - 1
 * 4. removal = abs(distance1 - distance2)
 * 5. Return null if:
 *    - No common ancestor found
 *    - One person is a direct ancestor/descendant (not cousins)
 *    - They are siblings (degree would be 0, which is not a cousin relationship)
 *
 * @param person1Id - ID of the first person
 * @param person2Id - ID of the second person
 * @param childToParents - Map of child IDs to parent IDs
 * @param parentToChildren - Map of parent IDs to child IDs
 * @returns Object with degree and removal, or null if not cousins
 *
 * @example
 * const result = calculateCousinDegree('person1', 'person2', childToParents, parentToChildren);
 * if (result) {
 *   console.log(`${result.degree}st cousin ${result.removal > 0 ? 'once removed' : ''}`);
 * }
 *
 * @example
 * // Siblings (not cousins)
 * const result = calculateCousinDegree('sibling1', 'sibling2', childToParents, parentToChildren);
 * // returns null
 */
export function calculateCousinDegree(
  person1Id: string,
  person2Id: string,
  childToParents: Map<string, Set<string>>,
  parentToChildren: Map<string, Set<string>>
): { degree: number; removal: number } | null {
  // Cannot be cousins with yourself
  if (person1Id === person2Id) {
    return null;
  }

  // Find the distances from each person to their common ancestor
  const distancePair = calculateDistance(
    person1Id,
    person2Id,
    childToParents,
    parentToChildren
  );

  if (distancePair === null) {
    // No common ancestor found
    return null;
  }

  const [dist1, dist2] = distancePair;

  // If one distance is 0, they are in direct ancestor/descendant relationship
  if (dist1 === 0 || dist2 === 0) {
    return null;
  }

  // Calculate cousin degree and removal
  const minDistance = Math.min(dist1, dist2);
  const cousinDegree = minDistance - 1;

  // Siblings have a minimum distance of 1 (to parent) on each side
  // That would give degree = 1 - 1 = 0, which is not a valid cousin relationship
  if (cousinDegree < 1) {
    return null;
  }

  const removal = Math.abs(dist1 - dist2);

  return {
    degree: cousinDegree,
    removal,
  };
}

/**
 * Check if person2 is in the direct lineage (ancestor or descendant) of person1
 *
 * @param person1Id - The reference person
 * @param person2Id - The person to check
 * @param childToParents - Map of child IDs to parent IDs
 * @param parentToChildren - Map of parent IDs to child IDs
 * @returns true if person2 is a direct ancestor or descendant of person1
 */
function isDirectLineage(
  person1Id: string,
  person2Id: string,
  childToParents: Map<string, Set<string>>,
  parentToChildren: Map<string, Set<string>>
): boolean {
  // Check if person2 is an ancestor of person1
  let current: string | null = person1Id;
  while (current) {
    const parents = childToParents.get(current);
    if (parents && parents.has(person2Id)) {
      return true;
    }
    if (parents && parents.size > 0) {
      // Move to first parent (could check all parents in complex cases)
      current = Array.from(parents)[0];
    } else {
      break;
    }
  }

  // Check if person2 is a descendant of person1
  current = person1Id;
  const visited = new Set<string>();
  const toVisit = [current];

  while (toVisit.length > 0) {
    const nodeId = toVisit.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const children = parentToChildren.get(nodeId);
    if (children && children.size > 0) {
      if (children.has(person2Id)) {
        return true;
      }
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          toVisit.push(childId);
        }
      });
    }
  }

  return false;
}

/**
 * Calculate the distance from person1 to person2 through their common ancestor
 *
 * Returns a tuple [distance1, distance2] where:
 * - distance1 = generations from person1 up to the common ancestor
 * - distance2 = generations from person2 up to the common ancestor
 *
 * @param person1Id - First person
 * @param person2Id - Second person
 * @param childToParents - Map of child IDs to parent IDs
 * @param parentToChildren - Map of parent IDs to child IDs (not used, for API consistency)
 * @returns Tuple of [distanceToCommonAncestor1, distanceToCommonAncestor2], or null if no common ancestor
 */
function calculateDistance(
  person1Id: string,
  person2Id: string,
  childToParents: Map<string, Set<string>>,
  _parentToChildren?: Map<string, Set<string>>
): [number, number] | null {
  // Find all ancestors of person1
  const ancestors1 = new Map<string, number>();
  let current: string | null = person1Id;
  let distance = 0;

  while (current) {
    ancestors1.set(current, distance);
    const parents = childToParents.get(current);
    if (parents && parents.size > 0) {
      // For simplicity, follow first parent (assumes single parent in most cases)
      current = Array.from(parents)[0];
      distance++;
    } else {
      break;
    }
  }

  // Find first ancestor of person2 that is also an ancestor of person1
  current = person2Id;
  distance = 0;

  while (current) {
    if (ancestors1.has(current)) {
      // Found common ancestor
      const dist1 = ancestors1.get(current)!;
      return [dist1, distance];
    }
    const parents = childToParents.get(current);
    if (parents && parents.size > 0) {
      current = Array.from(parents)[0];
      distance++;
    } else {
      break;
    }
  }

  return null;
}
