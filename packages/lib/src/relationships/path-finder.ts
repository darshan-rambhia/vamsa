/**
 * Relationship path finder using BFS algorithm
 *
 * Finds the shortest path between two people in a family tree
 * and calculates human-readable relationship names.
 *
 * This module provides utilities for:
 * - Finding relationship paths between two people using BFS
 * - Calculating human-readable relationship names from paths
 * - Handling graphs with cycles (through marriages)
 * - Returning the complete path from one person to another
 */

export interface RelationshipNode {
  id: string;
  firstName: string;
  lastName: string;
  gender?: "male" | "female" | "other";
}

export interface RelationshipPath {
  path: RelationshipNode[];
  relationship: string; // Human readable: "grandfather", "2nd cousin once removed"
  distance: number;
}

/**
 * Relationship maps for efficient graph traversal
 */
export interface RelationshipMaps {
  parents: Map<string, string[]>; // person ID -> array of parent IDs
  children: Map<string, string[]>; // person ID -> array of children IDs
  spouses: Map<string, string[]>; // person ID -> array of spouse IDs
}

/**
 * Internal structure for tracking edges in the BFS traversal
 */
interface EdgeInfo {
  type: "parent" | "child" | "spouse";
  from: string;
  to: string;
}

/**
 * Find the relationship path between two people using BFS
 *
 * Algorithm:
 * 1. Handle self-relationship (same ID returns distance 0)
 * 2. BFS from person1, exploring parents, children, and spouses
 * 3. Track visited nodes to avoid cycles
 * 4. Track edge types for relationship naming
 * 5. When person2 found, calculate relationship name
 *
 * @param person1Id - ID of the starting person
 * @param person2Id - ID of the target person
 * @param people - Map of all people in the family tree (ID -> RelationshipNode)
 * @param maps - Relationship maps (parents, children, spouses)
 * @returns RelationshipPath if found, null otherwise
 *
 * @example
 * const maps = {
 *   parents: new Map([['child1', ['parent1', 'parent2']]]),
 *   children: new Map([['parent1', ['child1']]]),
 *   spouses: new Map([['person1', ['person2']]])
 * };
 * const path = findRelationshipPath('person1', 'person2', peopleMap, maps);
 * if (path) {
 *   console.log(path.relationship); // "grandfather"
 *   console.log(path.distance); // 2
 * }
 */
export function findRelationshipPath(
  person1Id: string,
  person2Id: string,
  people: Map<string, RelationshipNode>,
  maps: RelationshipMaps
): RelationshipPath | null {
  // Self-relationship
  if (person1Id === person2Id) {
    const person = people.get(person1Id);
    if (!person) return null;

    return {
      path: [person],
      relationship: "self",
      distance: 0,
    };
  }

  // Validate both people exist
  const startPerson = people.get(person1Id);
  const endPerson = people.get(person2Id);

  if (!startPerson || !endPerson) {
    return null;
  }

  // BFS to find path
  const queue: Array<{
    id: string;
    path: string[];
    edges: EdgeInfo[];
  }> = [];
  const visited = new Set<string>();

  queue.push({
    id: person1Id,
    path: [person1Id],
    edges: [],
  });
  visited.add(person1Id);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    // Check all neighbors
    const neighbors: Array<{ id: string; type: EdgeInfo["type"] }> = [];

    // Parents
    const parentIds = maps.parents.get(current.id);
    if (parentIds) {
      for (const parentId of parentIds) {
        if (people.has(parentId)) {
          neighbors.push({ id: parentId, type: "parent" });
        }
      }
    }

    // Children
    const childIds = maps.children.get(current.id);
    if (childIds) {
      for (const childId of childIds) {
        if (people.has(childId)) {
          neighbors.push({ id: childId, type: "child" });
        }
      }
    }

    // Spouses
    const spouseIds = maps.spouses.get(current.id);
    if (spouseIds) {
      for (const spouseId of spouseIds) {
        if (people.has(spouseId)) {
          neighbors.push({ id: spouseId, type: "spouse" });
        }
      }
    }

    // Process each neighbor
    for (const neighbor of neighbors) {
      if (neighbor.id === person2Id) {
        // Found the target!
        const finalPath = [...current.path, neighbor.id];
        const finalEdges = [
          ...current.edges,
          {
            type: neighbor.type,
            from: current.id,
            to: neighbor.id,
          },
        ];

        const pathNodes = finalPath
          .map((id) => people.get(id))
          .filter((node): node is RelationshipNode => node !== undefined);

        const relationshipName = calculateRelationshipName(
          pathNodes,
          people,
          maps,
          finalEdges
        );

        return {
          path: pathNodes,
          relationship: relationshipName,
          distance: finalPath.length - 1,
        };
      }

      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        queue.push({
          id: neighbor.id,
          path: [...current.path, neighbor.id],
          edges: [
            ...current.edges,
            {
              type: neighbor.type,
              from: current.id,
              to: neighbor.id,
            },
          ],
        });
      }
    }
  }

  return null;
}

/**
 * Calculate human-readable relationship name from a path
 *
 * Handles:
 * - Direct relationships (parent, child, sibling, spouse)
 * - Extended relationships (grandparent, great-grandparent, aunt/uncle, niece/nephew)
 * - Cousin relationships (to be enhanced by cousin-finder.ts)
 *
 * @param path - Array of nodes representing the relationship path
 * @param people - Map of all people in the family tree
 * @param maps - Relationship maps for parent/child lookups
 * @param edges - Array of edges showing relationship types used
 * @returns Human-readable relationship name
 *
 * @example
 * const name = calculateRelationshipName(pathNodes, peopleMap, maps, edges);
 * // Returns: "grandfather", "aunt", "cousin", etc.
 */
export function calculateRelationshipName(
  path: RelationshipNode[],
  people: Map<string, RelationshipNode>,
  maps: RelationshipMaps,
  edges?: EdgeInfo[]
): string {
  if (path.length === 0) return "unknown";
  if (path.length === 1) return "self";
  if (path.length === 2) {
    // Direct relationship
    const firstEdge = edges?.[0];
    if (!firstEdge) return "relative";

    const targetPerson = path[1];

    if (firstEdge.type === "parent") {
      return targetPerson.gender === "male" ? "father" : "mother";
    }
    if (firstEdge.type === "child") {
      return targetPerson.gender === "male" ? "son" : "daughter";
    }
    if (firstEdge.type === "spouse") {
      return targetPerson.gender === "male" ? "husband" : "wife";
    }
    return "relative";
  }

  // For paths longer than 2, analyze the structure
  if (!edges || edges.length === 0) {
    return "distant relative";
  }

  const targetPerson = path[path.length - 1];

  // Count parent/child edges in sequence to determine degree of relationship
  const upCount = countConsecutiveEdges(edges, "parent", 0);
  const downCount = countConsecutiveEdges(edges, "child", upCount);

  // Check for sibling relationship (up 1, down 1)
  if (upCount === 1 && downCount === 1 && edges.length === 2) {
    const secondEdge = edges[1];
    if (secondEdge.type === "child") {
      return targetPerson.gender === "male" ? "brother" : "sister";
    }
  }

  // Grandparent/grandchild relationships
  if (upCount === 2 && downCount === 0 && edges.length === 2) {
    return targetPerson.gender === "male" ? "grandfather" : "grandmother";
  }

  if (upCount === 0 && downCount === 2 && edges.length === 2) {
    return targetPerson.gender === "male" ? "grandson" : "granddaughter";
  }

  // Great-grandparent/great-grandchild relationships
  if (upCount === 3 && downCount === 0 && edges.length === 3) {
    return targetPerson.gender === "male"
      ? "great-grandfather"
      : "great-grandmother";
  }

  if (upCount === 0 && downCount === 3 && edges.length === 3) {
    return targetPerson.gender === "male"
      ? "great-grandson"
      : "great-granddaughter";
  }

  // Aunt/uncle relationships (up 1 to parent's sibling, then down 1)
  if (upCount === 1 && downCount === 1 && edges.length === 3) {
    return targetPerson.gender === "male" ? "uncle" : "aunt";
  }

  // Niece/nephew relationships
  if (
    edges.length === 2 &&
    edges[0].type === "parent" &&
    edges[1].type === "child"
  ) {
    const firstPerson = path[0];
    const secondPerson = path[1];

    // Check if second person is a sibling of first person by checking if they share parents
    const firstParents = maps.parents.get(firstPerson.id) || [];
    const secondParents = maps.parents.get(secondPerson.id) || [];

    const hasCommonParent = firstParents.some((p) => secondParents.includes(p));

    if (hasCommonParent) {
      return targetPerson.gender === "male" ? "nephew" : "niece";
    }
  }

  // Spouse relationship through chain
  if (edges.some((e) => e.type === "spouse")) {
    // TODO: Handle spouse and in-law relationships
    return "relative by marriage";
  }

  // Cousin relationships (to be enhanced by cousin-finder.ts)
  // For now, return generic "cousin"
  if (upCount >= 1 && downCount >= 1 && upCount === downCount) {
    return "cousin";
  }

  return "distant relative";
}

/**
 * Helper function to count consecutive edges of a specific type from a starting position
 *
 * @param edges - Array of edges
 * @param type - Type of edge to count
 * @param startIndex - Starting index in the edges array
 * @returns Count of consecutive edges of the specified type
 */
function countConsecutiveEdges(
  edges: EdgeInfo[],
  type: EdgeInfo["type"],
  startIndex: number
): number {
  let count = 0;
  for (let i = startIndex; i < edges.length; i++) {
    if (edges[i].type === type) {
      count++;
    } else {
      break;
    }
  }
  return count;
}
