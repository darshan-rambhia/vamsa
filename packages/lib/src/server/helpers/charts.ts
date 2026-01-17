/**
 * Chart Helper Functions - Pure Functions for Data Collection and Layout
 *
 * This module contains pure helper functions with no side effects, database access,
 * or server context dependencies. All functions are fully testable and reusable.
 *
 * Exported Functions:
 * - buildRelationshipMaps: Extracts parent/child/spouse maps from relationships
 * - collectAncestors: Recursively collects ancestors going back N generations
 * - collectDescendants: Recursively collects descendants going forward N generations
 * - calculateFanLayout: Calculates angle positions for fan/radial chart layout
 * - collectBowtieAncestors: Collects ancestors on one side (paternal/maternal)
 * - collectTreeAncestors: Collects ancestors with negative generation numbering
 * - collectTreeDescendants: Collects descendants with positive generation numbering
 */

/**
 * Person data structure used throughout helper functions
 */
export interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  dateOfPassing: Date | null;
  isLiving: boolean;
  photoUrl: string | null;
  gender: string | null;
}

/**
 * Collected data structure tracking nodes, edges, and generations
 */
export interface CollectionState {
  nodeIds: Set<string>;
  edges: Map<string, { source: string; target: string; type: string }>;
  generations: Map<string, number>;
  sides?: Map<string, "paternal" | "maternal" | "center">;
}

/**
 * Relationship data structure
 */
export interface RelationshipData {
  type: string;
  personId: string;
  relatedPersonId: string;
}

/**
 * Relationship maps extracted from relationship array
 */
export interface RelationshipMaps {
  childToParents: Map<string, Set<string>>;
  parentToChildren: Map<string, Set<string>>;
  spouseMap: Map<string, Set<string>>;
  spouseRels: RelationshipData[];
  parentRels: RelationshipData[];
}

/**
 * Builds three separate maps from relationship data for efficient lookup
 *
 * Takes a flat array of relationships and creates three optimized maps:
 * - childToParents: Maps each child to their parent(s)
 * - parentToChildren: Maps each parent to their child(ren)
 * - spouseMap: Maps each spouse to their spouse(s)
 *
 * @param relationships - Array of relationship objects with type, personId, relatedPersonId
 * @returns Object containing childToParents, parentToChildren, and spouseMap
 *
 * @example
 * const rels = [
 *   { type: 'PARENT', personId: 'child1', relatedPersonId: 'parent1' },
 *   { type: 'SPOUSE', personId: 'person1', relatedPersonId: 'person2' }
 * ]
 * const maps = buildRelationshipMaps(rels)
 * // maps.childToParents.get('child1') => Set(['parent1'])
 * // maps.spouseMap.get('person1') => Set(['person2'])
 */
export function buildRelationshipMaps(
  relationships: RelationshipData[]
): RelationshipMaps {
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
 * Recursively collects ancestors going back N generations
 *
 * Starting from a given person, traverses parent relationships backwards to collect
 * all ancestors up to a specified generation limit. Includes spouses at each level.
 * Handles edge cases like missing persons or circular references.
 *
 * Generation numbering: 0 = root person, 1 = parents, 2 = grandparents, etc.
 *
 * @param personId - ID of person to start collection from
 * @param currentGen - Current generation (typically starts at 0)
 * @param maxGen - Maximum generation to collect (stops when reached)
 * @param childToParents - Map of child->parents relationships
 * @param personMap - Map of all persons by ID
 * @param spouseMap - Map of spouse relationships
 * @param collected - Mutable state object to accumulate results
 *
 * @example
 * collectAncestors('person1', 0, 3, childToParents, personMap, spouseMap, collected)
 * // collected now contains all ancestors up to 3 generations
 */
export function collectAncestors(
  personId: string,
  currentGen: number,
  maxGen: number,
  childToParents: Map<string, Set<string>>,
  personMap: Map<string, PersonData>,
  spouseMap: Map<string, Set<string>>,
  collected: CollectionState
): void {
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
 * Recursively collects descendants going forward N generations
 *
 * Starting from a given person, traverses child relationships forward to collect
 * all descendants up to a specified generation limit. Includes spouses at each level.
 * Handles edge cases like missing persons or circular references.
 *
 * Generation numbering: 0 = root person, 1 = children, 2 = grandchildren, etc.
 *
 * @param personId - ID of person to start collection from
 * @param currentGen - Current generation (typically starts at 0)
 * @param maxGen - Maximum generation to collect (stops when reached)
 * @param parentToChildren - Map of parent->children relationships
 * @param personMap - Map of all persons by ID
 * @param spouseMap - Map of spouse relationships
 * @param collected - Mutable state object to accumulate results
 *
 * @example
 * collectDescendants('person1', 0, 3, parentToChildren, personMap, spouseMap, collected)
 * // collected now contains all descendants up to 3 generations
 */
export function collectDescendants(
  personId: string,
  currentGen: number,
  maxGen: number,
  parentToChildren: Map<string, Set<string>>,
  personMap: Map<string, PersonData>,
  spouseMap: Map<string, Set<string>>,
  collected: CollectionState
): void {
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
 * Calculates angle positions for fan/radial chart layout
 *
 * Distributes people in a radial pattern by generation. Each generation gets
 * an equal angular space divided among its members. Angles are in degrees (0-360).
 *
 * @param nodeIds - Set of all node IDs to position
 * @param generations - Map of node ID to generation number
 * @returns Map of node ID to angle in degrees (0-360)
 *
 * @example
 * const angles = calculateFanLayout(
 *   new Set(['person1', 'person2', 'person3']),
 *   new Map([['person1', 0], ['person2', 1], ['person3', 1]])
 * )
 * // Returns: Map { 'person1' => 0, 'person2' => 0, 'person3' => 180 }
 */
export function calculateFanLayout(
  nodeIds: Set<string>,
  generations: Map<string, number>
): Map<string, number> {
  const maxGen = Math.max(...Array.from(generations.values()));
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
 * Recursively collects ancestors on one side (paternal or maternal)
 *
 * Similar to collectAncestors but marks each person with a side indicator
 * (paternal/maternal). Used for bowtie chart layouts that show dual ancestry.
 *
 * @param personId - ID of person to start collection from
 * @param currentGen - Current generation
 * @param maxGen - Maximum generation to collect
 * @param childToParents - Map of child->parents relationships
 * @param personMap - Map of all persons by ID
 * @param side - Which side to mark: "paternal" or "maternal"
 * @param collected - Mutable state object with sides Map for tracking sides
 *
 * @example
 * collectBowtieAncestors('person1', 0, 3, childToParents, personMap, 'paternal', collected)
 */
export function collectBowtieAncestors(
  personId: string,
  currentGen: number,
  maxGen: number,
  childToParents: Map<string, Set<string>>,
  personMap: Map<string, PersonData>,
  side: "paternal" | "maternal",
  collected: CollectionState
): void {
  if (currentGen > maxGen || !personId) return;

  // Add person if not already collected
  if (!collected.nodeIds.has(personId)) {
    collected.nodeIds.add(personId);
    collected.generations.set(personId, currentGen);
    collected.sides?.set(personId, side);
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
 * Collects ancestors with negative generation numbering for tree charts
 *
 * Used specifically for tree charts where ancestors have negative generation
 * numbers: -1 = parents, -2 = grandparents, etc. Root person is at 0.
 *
 * @param personId - ID of person to start collection from
 * @param currentGen - Current generation (should start negative, e.g., -1)
 * @param maxGen - Maximum generation limit (should be negative, e.g., -3)
 * @param childToParents - Map of child->parents relationships
 * @param personMap - Map of all persons by ID
 * @param spouseMap - Map of spouse relationships
 * @param collected - Mutable state object to accumulate results
 *
 * @example
 * collectTreeAncestors('person1', -1, -3, childToParents, personMap, spouseMap, collected)
 * // collected now has ancestors at generations -1, -2, -3
 */
export function collectTreeAncestors(
  personId: string,
  currentGen: number,
  maxGen: number,
  childToParents: Map<string, Set<string>>,
  personMap: Map<string, PersonData>,
  spouseMap: Map<string, Set<string>>,
  collected: CollectionState
): void {
  if (currentGen < maxGen || !personId) return;

  // Add person if not already collected
  if (!collected.nodeIds.has(personId)) {
    collected.nodeIds.add(personId);
    collected.generations.set(personId, currentGen);
  }

  // Add spouses at same generation
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

  // Get parents and recurse (going more negative)
  const parents = childToParents.get(personId);
  if (parents && currentGen > maxGen) {
    parents.forEach((parentId) => {
      if (personMap.has(parentId)) {
        // Add parent-child edge (parent at top, child at bottom)
        collected.edges.set(`${parentId}-${personId}`, {
          source: parentId,
          target: personId,
          type: "parent-child",
        });

        // Recurse to parent's ancestors (more negative generation)
        collectTreeAncestors(
          parentId,
          currentGen - 1,
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
 * Collects descendants with positive generation numbering for tree charts
 *
 * Used specifically for tree charts where descendants have positive generation
 * numbers: 1 = children, 2 = grandchildren, etc. Root person is at 0.
 *
 * @param personId - ID of person to start collection from
 * @param currentGen - Current generation (should start positive, e.g., 1)
 * @param maxGen - Maximum generation limit (should be positive, e.g., 3)
 * @param parentToChildren - Map of parent->children relationships
 * @param personMap - Map of all persons by ID
 * @param spouseMap - Map of spouse relationships
 * @param collected - Mutable state object to accumulate results
 *
 * @example
 * collectTreeDescendants('person1', 1, 3, parentToChildren, personMap, spouseMap, collected)
 * // collected now has descendants at generations 1, 2, 3
 */
export function collectTreeDescendants(
  personId: string,
  currentGen: number,
  maxGen: number,
  parentToChildren: Map<string, Set<string>>,
  personMap: Map<string, PersonData>,
  spouseMap: Map<string, Set<string>>,
  collected: CollectionState
): void {
  if (currentGen > maxGen || !personId) return;

  // Add person if not already collected
  if (!collected.nodeIds.has(personId)) {
    collected.nodeIds.add(personId);
    collected.generations.set(personId, currentGen);
  }

  // Add spouses at same generation
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

  // Get children and recurse (going more positive)
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

        // Recurse to children's descendants (more positive generation)
        collectTreeDescendants(
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
