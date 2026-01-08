/**
 * Server-side Family Tree Layout Algorithm
 *
 * This module computes node positions for a family tree visualization.
 * Key features:
 * - Direct lineage focus: only shows parents, spouse, children (not siblings of parents)
 * - Supports multiple parent sets (divorce/remarriage scenarios)
 * - Siblings ordered by birth date (oldest left, youngest right)
 * - Per-node expansion for granular control
 */

// Layout constants
const NODE_WIDTH = 220;
const _NODE_HEIGHT = 140;
const HORIZONTAL_SPACING = 60; // Gap between sibling subtrees
const SPOUSE_SPACING = 260; // Gap between spouses
const VERTICAL_SPACING = 220; // Gap between generations

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  dateOfBirth: string | null;
  dateOfPassing: string | null;
  isLiving: boolean;
  photoUrl: string | null;
}

export interface Relationship {
  id: string;
  personId: string;
  relatedPersonId: string;
  type: string;
  isActive: boolean;
  marriageDate?: string | null;
  divorceDate?: string | null;
}

export interface TreeNode {
  id: string;
  person: Person;
  x: number;
  y: number;
  hasHiddenChildren: boolean;
  hasHiddenParents: boolean;
  hasHiddenSpouses: boolean;
  hasHiddenSiblings: boolean;
  isCurrentUser: boolean;
}

export interface TreeEdge {
  id: string;
  source: string;
  target: string;
  type: "parent-child" | "spouse";
  isDivorced?: boolean;
}

export interface TreeLayoutResult {
  nodes: TreeNode[];
  edges: TreeEdge[];
  viewport: {
    centerX: number;
    centerY: number;
    zoom: number;
  };
}

export interface LayoutOptions {
  focusedPersonId: string;
  view: "focused" | "full";
  expandedNodes: string[];
  generationDepth: number;
}

/**
 * Build relationship lookup maps
 */
function buildRelationshipMaps(relationships: Relationship[]) {
  const parentRels = relationships.filter((r) => r.type === "PARENT");
  const spouseRels = relationships.filter((r) => r.type === "SPOUSE");

  // childId -> parentIds
  const childToParents = new Map<string, Set<string>>();
  // parentId -> childIds
  const parentToChildren = new Map<string, Set<string>>();
  // personId -> spouseIds
  const spouseMap = new Map<string, Set<string>>();
  // personId -> siblingIds (same parents)
  const siblingMap = new Map<string, Set<string>>();

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

  // Build sibling map (people who share at least one parent)
  childToParents.forEach((parents, childId) => {
    parents.forEach((parentId) => {
      const siblings = parentToChildren.get(parentId) ?? new Set();
      siblings.forEach((siblingId) => {
        if (siblingId !== childId) {
          if (!siblingMap.has(childId)) siblingMap.set(childId, new Set());
          siblingMap.get(childId)!.add(siblingId);
        }
      });
    });
  });

  return { childToParents, parentToChildren, spouseMap, siblingMap, spouseRels };
}

/**
 * Filter visible persons for focused view
 * Only shows: focused person, their spouse(s), their parents, their children
 * Expanded nodes add their immediate relatives
 */
function filterVisiblePersons(
  persons: Person[],
  relationships: Relationship[],
  focusedPersonId: string,
  expandedNodes: string[]
): Set<string> {
  const { childToParents, parentToChildren, spouseMap, siblingMap } =
    buildRelationshipMaps(relationships);

  const visible = new Set<string>();

  // Helper to add a person and their visible spouse(s)
  const addWithSpouse = (personId: string) => {
    visible.add(personId);
    const spouses = spouseMap.get(personId);
    if (spouses) {
      spouses.forEach((spouseId) => visible.add(spouseId));
    }
  };

  // 1. Add focused person and their spouse(s)
  addWithSpouse(focusedPersonId);

  // 2. Add focused person's parents (and their spouses)
  const focusedParents = childToParents.get(focusedPersonId);
  if (focusedParents) {
    focusedParents.forEach((parentId) => addWithSpouse(parentId));
  }

  // 3. Add focused person's children (with their spouses)
  const focusedChildren = parentToChildren.get(focusedPersonId);
  if (focusedChildren) {
    focusedChildren.forEach((childId) => addWithSpouse(childId));
  }

  // 4. Also add children of focused person's spouse (step-children)
  const focusedSpouses = spouseMap.get(focusedPersonId);
  if (focusedSpouses) {
    focusedSpouses.forEach((spouseId) => {
      const spouseChildren = parentToChildren.get(spouseId);
      if (spouseChildren) {
        spouseChildren.forEach((childId) => addWithSpouse(childId));
      }
    });
  }

  // 5. Handle expanded nodes - add their immediate relatives
  expandedNodes.forEach((nodeId) => {
    if (!persons.find((p) => p.id === nodeId)) return;

    visible.add(nodeId);

    // Add parents
    const parents = childToParents.get(nodeId);
    if (parents) {
      parents.forEach((parentId) => addWithSpouse(parentId));
    }

    // Add children
    const children = parentToChildren.get(nodeId);
    if (children) {
      children.forEach((childId) => addWithSpouse(childId));
    }

    // Add siblings
    const siblings = siblingMap.get(nodeId);
    if (siblings) {
      siblings.forEach((siblingId) => addWithSpouse(siblingId));
    }

    // Add spouse(s)
    const spouses = spouseMap.get(nodeId);
    if (spouses) {
      spouses.forEach((spouseId) => addWithSpouse(spouseId));
    }
  });

  return visible;
}

/**
 * Calculate generation for each person (relative to focused person = 0)
 */
function calculateGenerations(
  _persons: Person[],
  relationships: Relationship[],
  focusedPersonId: string
): Map<string, number> {
  const { childToParents, parentToChildren } = buildRelationshipMaps(relationships);
  const generations = new Map<string, number>();
  const visited = new Set<string>();

  // BFS from focused person
  const queue: { personId: string; gen: number }[] = [{ personId: focusedPersonId, gen: 0 }];

  while (queue.length > 0) {
    const { personId, gen } = queue.shift()!;
    if (visited.has(personId)) continue;
    visited.add(personId);
    generations.set(personId, gen);

    // Parents are one generation up
    const parents = childToParents.get(personId);
    if (parents) {
      parents.forEach((parentId) => {
        if (!visited.has(parentId)) {
          queue.push({ personId: parentId, gen: gen - 1 });
        }
      });
    }

    // Children are one generation down
    const children = parentToChildren.get(personId);
    if (children) {
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          queue.push({ personId: childId, gen: gen + 1 });
        }
      });
    }
  }

  return generations;
}

/**
 * Position nodes in a clean hierarchical layout
 * For focused view: centered on focused person with immediate family
 * For full view: proper tree layout with all couples together
 */
function positionNodes(
  persons: Person[],
  relationships: Relationship[],
  visiblePersonIds: Set<string>,
  focusedPersonId: string,
  isFullView: boolean
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const { childToParents, parentToChildren, spouseMap } =
    buildRelationshipMaps(relationships);

  const personMap = new Map(persons.map((p) => [p.id, p]));

  // Helper to sort by birth date
  const sortByBirthDate = (ids: string[]) => {
    return [...ids].sort((a, b) => {
      const personA = personMap.get(a);
      const personB = personMap.get(b);
      const dateA = personA?.dateOfBirth
        ? new Date(personA.dateOfBirth).getTime()
        : Infinity;
      const dateB = personB?.dateOfBirth
        ? new Date(personB.dateOfBirth).getTime()
        : Infinity;
      return dateA - dateB;
    });
  };

  // Get visible spouse of a person
  const getVisibleSpouse = (personId: string): string | null => {
    const spouses = spouseMap.get(personId);
    if (!spouses) return null;
    for (const spouseId of spouses) {
      if (visiblePersonIds.has(spouseId)) return spouseId;
    }
    return null;
  };

  // Get visible children of a person (or couple)
  const getVisibleChildren = (personId: string): string[] => {
    const children = new Set<string>();
    const myChildren = parentToChildren.get(personId);
    if (myChildren) {
      myChildren.forEach((childId) => {
        if (visiblePersonIds.has(childId)) children.add(childId);
      });
    }
    // Also include spouse's children
    const spouse = getVisibleSpouse(personId);
    if (spouse) {
      const spouseChildren = parentToChildren.get(spouse);
      if (spouseChildren) {
        spouseChildren.forEach((childId) => {
          if (visiblePersonIds.has(childId)) children.add(childId);
        });
      }
    }
    return sortByBirthDate([...children]);
  };

  // Get visible parents of a person
  const getVisibleParents = (personId: string): string[] => {
    const parents = childToParents.get(personId);
    if (!parents) return [];
    return [...parents].filter((parentId) => visiblePersonIds.has(parentId));
  };

  if (isFullView) {
    // Full tree view - use generation-based layout
    const generations = calculateGenerations(persons, relationships, focusedPersonId);

    // Group visible people by generation
    const byGeneration = new Map<number, string[]>();
    visiblePersonIds.forEach((personId) => {
      const gen = generations.get(personId) ?? 0;
      if (!byGeneration.has(gen)) byGeneration.set(gen, []);
      byGeneration.get(gen)!.push(personId);
    });

    // Sort generations
    const sortedGens = [...byGeneration.keys()].sort((a, b) => a - b);

    // Position each generation
    sortedGens.forEach((gen) => {
      const peopleInGen = byGeneration.get(gen)!;
      const y = gen * VERTICAL_SPACING;

      // Group people into couples (spouse pairs)
      const couples: { primary: string; spouse: string | null }[] = [];
      const processed = new Set<string>();

      // Sort by birth date first
      const sortedPeople = sortByBirthDate(peopleInGen);

      sortedPeople.forEach((personId) => {
        if (processed.has(personId)) return;
        processed.add(personId);

        const spouse = getVisibleSpouse(personId);
        if (spouse && peopleInGen.includes(spouse) && !processed.has(spouse)) {
          processed.add(spouse);
          couples.push({ primary: personId, spouse });
        } else {
          couples.push({ primary: personId, spouse: null });
        }
      });

      // Calculate total width
      const coupleWidths = couples.map((c) =>
        c.spouse ? NODE_WIDTH + SPOUSE_SPACING : NODE_WIDTH
      );
      const totalWidth =
        coupleWidths.reduce((sum, w) => sum + w, 0) +
        (couples.length - 1) * HORIZONTAL_SPACING;

      // Center the generation
      let x = -totalWidth / 2;

      couples.forEach((couple, i) => {
        const width = coupleWidths[i];
        if (couple.spouse) {
          positions.set(couple.primary, { x: x + NODE_WIDTH / 2, y });
          positions.set(couple.spouse, { x: x + NODE_WIDTH / 2 + SPOUSE_SPACING, y });
        } else {
          positions.set(couple.primary, { x: x + width / 2, y });
        }
        x += width + HORIZONTAL_SPACING;
      });
    });
  } else {
    // Focused view - simpler layout centered on focused person
    const focusedSpouse = getVisibleSpouse(focusedPersonId);

    if (focusedSpouse) {
      positions.set(focusedPersonId, { x: -SPOUSE_SPACING / 2, y: 0 });
      positions.set(focusedSpouse, { x: SPOUSE_SPACING / 2, y: 0 });
    } else {
      positions.set(focusedPersonId, { x: 0, y: 0 });
    }

    // Parents
    const focusedParents = getVisibleParents(focusedPersonId);
    if (focusedParents.length > 0) {
      const parent1 = focusedParents[0];
      const parent1Spouse = getVisibleSpouse(parent1);

      if (parent1Spouse && focusedParents.includes(parent1Spouse)) {
        const parentCenterX = positions.get(focusedPersonId)!.x;
        positions.set(parent1, {
          x: parentCenterX - SPOUSE_SPACING / 2,
          y: -VERTICAL_SPACING,
        });
        positions.set(parent1Spouse, {
          x: parentCenterX + SPOUSE_SPACING / 2,
          y: -VERTICAL_SPACING,
        });
      } else {
        let parentX =
          positions.get(focusedPersonId)!.x -
          ((focusedParents.length - 1) * SPOUSE_SPACING) / 2;
        focusedParents.forEach((parentId) => {
          if (!positions.has(parentId)) {
            positions.set(parentId, { x: parentX, y: -VERTICAL_SPACING });
            parentX += SPOUSE_SPACING;
          }
        });
      }
    }

    // Children
    const focusedChildren = getVisibleChildren(focusedPersonId);
    if (focusedChildren.length > 0) {
      const childrenWithSpouses = focusedChildren.map((childId) => {
        const spouse = getVisibleSpouse(childId);
        return {
          childId,
          spouse,
          width: spouse ? NODE_WIDTH + SPOUSE_SPACING : NODE_WIDTH,
        };
      });

      const totalWidth = childrenWithSpouses.reduce(
        (sum, c) => sum + c.width + HORIZONTAL_SPACING,
        -HORIZONTAL_SPACING
      );

      const parentCenterX = focusedSpouse
        ? (positions.get(focusedPersonId)!.x + positions.get(focusedSpouse)!.x) / 2
        : positions.get(focusedPersonId)!.x;

      let childX = parentCenterX - totalWidth / 2;

      childrenWithSpouses.forEach(({ childId, spouse, width }) => {
        if (spouse) {
          positions.set(childId, { x: childX + NODE_WIDTH / 2, y: VERTICAL_SPACING });
          positions.set(spouse, {
            x: childX + NODE_WIDTH / 2 + SPOUSE_SPACING,
            y: VERTICAL_SPACING,
          });
        } else {
          positions.set(childId, { x: childX + NODE_WIDTH / 2, y: VERTICAL_SPACING });
        }
        childX += width + HORIZONTAL_SPACING;
      });
    }

    // Handle expanded nodes
    const positioned = new Set(positions.keys());
    const unpositioned = [...visiblePersonIds].filter((id) => !positioned.has(id));

    if (unpositioned.length > 0) {
      const generations = calculateGenerations(persons, relationships, focusedPersonId);

      // Group by generation
      const byGen = new Map<number, string[]>();
      unpositioned.forEach((personId) => {
        const gen = generations.get(personId) ?? 0;
        if (!byGen.has(gen)) byGen.set(gen, []);
        byGen.get(gen)!.push(personId);
      });

      byGen.forEach((peopleInGen, gen) => {
        const y = gen * VERTICAL_SPACING;

        let maxX = -Infinity;
        positions.forEach((pos) => {
          if (Math.abs(pos.y - y) < 10) {
            maxX = Math.max(maxX, pos.x);
          }
        });

        let x = maxX === -Infinity ? 0 : maxX + SPOUSE_SPACING + HORIZONTAL_SPACING;

        const processed = new Set<string>();
        const sortedPeople = sortByBirthDate(peopleInGen);

        sortedPeople.forEach((personId) => {
          if (processed.has(personId)) return;
          processed.add(personId);

          const spouse = getVisibleSpouse(personId);
          if (spouse && peopleInGen.includes(spouse) && !processed.has(spouse)) {
            processed.add(spouse);
            positions.set(personId, { x, y });
            positions.set(spouse, { x: x + SPOUSE_SPACING, y });
            x += SPOUSE_SPACING + NODE_WIDTH + HORIZONTAL_SPACING;
          } else if (!positions.has(personId)) {
            positions.set(personId, { x, y });
            x += NODE_WIDTH + HORIZONTAL_SPACING;
          }
        });
      });
    }
  }

  return positions;
}

/**
 * Main function to compute family tree layout
 */
export function computeTreeLayout(
  persons: Person[],
  relationships: Relationship[],
  options: LayoutOptions
): TreeLayoutResult {
  const { focusedPersonId, view, expandedNodes } = options;

  // Filter visible persons
  let visiblePersonIds: Set<string>;
  if (view === "full") {
    visiblePersonIds = new Set(persons.map((p) => p.id));
  } else {
    visiblePersonIds = filterVisiblePersons(
      persons,
      relationships,
      focusedPersonId,
      expandedNodes
    );
  }

  // Compute positions
  const positions = positionNodes(
    persons,
    relationships,
    visiblePersonIds,
    focusedPersonId,
    view === "full"
  );

  // Build relationship maps for hidden detection
  const { childToParents, parentToChildren, spouseMap, siblingMap } =
    buildRelationshipMaps(relationships);

  // Build nodes
  const nodes: TreeNode[] = persons
    .filter((p) => visiblePersonIds.has(p.id))
    .map((person) => {
      const pos = positions.get(person.id) ?? { x: 0, y: 0 };

      // Check for hidden relatives
      const allChildren = parentToChildren.get(person.id) ?? new Set();
      const hasHiddenChildren = [...allChildren].some(
        (childId) => !visiblePersonIds.has(childId)
      );

      const allParents = childToParents.get(person.id) ?? new Set();
      const hasHiddenParents = [...allParents].some(
        (parentId) => !visiblePersonIds.has(parentId)
      );

      const allSpouses = spouseMap.get(person.id) ?? new Set();
      const hasHiddenSpouses = [...allSpouses].some(
        (spouseId) => !visiblePersonIds.has(spouseId)
      );

      const allSiblings = siblingMap.get(person.id) ?? new Set();
      const hasHiddenSiblings = [...allSiblings].some(
        (siblingId) => !visiblePersonIds.has(siblingId)
      );

      return {
        id: person.id,
        person,
        x: pos.x,
        y: pos.y,
        hasHiddenChildren,
        hasHiddenParents,
        hasHiddenSpouses,
        hasHiddenSiblings,
        isCurrentUser: person.id === focusedPersonId,
      };
    });

  // Build edges
  const edges: TreeEdge[] = [];
  const processedEdges = new Set<string>();

  const parentRels = relationships.filter((r) => r.type === "PARENT");
  const spouseRels = relationships.filter((r) => r.type === "SPOUSE");

  // Parent-child edges
  parentRels.forEach((rel) => {
    if (
      visiblePersonIds.has(rel.personId) &&
      visiblePersonIds.has(rel.relatedPersonId)
    ) {
      const edgeKey = `parent-${rel.relatedPersonId}-${rel.personId}`;
      if (!processedEdges.has(edgeKey)) {
        processedEdges.add(edgeKey);
        edges.push({
          id: edgeKey,
          source: rel.relatedPersonId,
          target: rel.personId,
          type: "parent-child",
        });
      }
    }
  });

  // Spouse edges (deduplicated, ensuring left-to-right direction)
  spouseRels.forEach((rel) => {
    if (
      visiblePersonIds.has(rel.personId) &&
      visiblePersonIds.has(rel.relatedPersonId)
    ) {
      const key = [rel.personId, rel.relatedPersonId].sort().join("-");
      if (!processedEdges.has(`spouse-${key}`)) {
        processedEdges.add(`spouse-${key}`);

        // Determine which person is on the left (source) and right (target)
        const pos1 = positions.get(rel.personId);
        const pos2 = positions.get(rel.relatedPersonId);
        const leftPerson = (pos1?.x ?? 0) < (pos2?.x ?? 0) ? rel.personId : rel.relatedPersonId;
        const rightPerson = leftPerson === rel.personId ? rel.relatedPersonId : rel.personId;

        edges.push({
          id: `spouse-${key}`,
          source: leftPerson,
          target: rightPerson,
          type: "spouse",
          isDivorced: rel.divorceDate != null,
        });
      }
    }
  });

  // Calculate viewport center
  const focusedPos = positions.get(focusedPersonId) ?? { x: 0, y: 0 };

  return {
    nodes,
    edges,
    viewport: {
      centerX: focusedPos.x,
      centerY: focusedPos.y,
      zoom: 0.9,
    },
  };
}
