/**
 * Query Router - Main entry point for natural language search
 *
 * Routes search queries to appropriate handlers based on intent classification.
 * Integrates:
 * - Intent classification (pattern-based)
 * - Relationship path finding (BFS)
 * - Common ancestor finding (LCA)
 * - Cousin finding (Nth degree)
 * - Ancestor/descendant queries
 * - Full-text search (fallback for person search)
 *
 * Features:
 * - Automatic intent detection
 * - Entity extraction from queries
 * - Performance timing
 * - Natural language explanations for results
 * - Unified result format across all query types
 */

import { findRelationshipPath } from "../relationships/path-finder";
import { findCommonAncestor } from "../relationships/common-ancestor";
import { findCousins } from "../relationships/cousin-finder";
import { findAncestors } from "../relationships/ancestors";
import { findDescendants } from "../relationships/descendants";
import { classifyIntent } from "./intent-classifier";
import type {
  RelationshipMaps,
  RelationshipNode,
  RelationshipPath,
} from "../relationships/path-finder";
import type { AncestorResult } from "../relationships/common-ancestor";
import type { CousinResult } from "../relationships/cousin-finder";
import type { AncestorQueryResult } from "../relationships/ancestors";
import type { DescendantQueryResult } from "../relationships/descendants";
import type { SearchIntent } from "./intent-classifier";

/**
 * Unified search result type covering all query types
 */
export interface SearchResult {
  /** The classified intent of the query */
  type: SearchIntent;
  /** Raw results from the handler (type varies by intent) */
  results: Array<unknown>;
  /** Query execution duration in milliseconds */
  duration: number;
  /** Natural language explanation of the results */
  explanation?: string;
  /** Extracted entities from the query (for debugging/transparency) */
  extractedEntities?: Record<string, unknown>;
  /** Confidence score of the intent classification (0-1) */
  confidence?: number;
}

/**
 * Extended relationship maps required for all relationship queries
 */
export interface RelationshipDataMaps {
  people: Map<string, RelationshipNode>;
  maps: RelationshipMaps;
  childToParents?: Map<string, Set<string>>;
  parentToChildren?: Map<string, Set<string>>;
}

/**
 * Convert relationship maps from Sets to arrays
 * Some modules expect Sets, others expect arrays
 */
function mapsSetToArray(
  mapsSet: Map<string, Set<string> | Array<string>>
): Map<string, Array<string>> {
  const result = new Map<string, Array<string>>();
  mapsSet.forEach((val, key) => {
    if (val instanceof Set) {
      result.set(key, Array.from(val));
    } else {
      result.set(key, val);
    }
  });
  return result;
}

/**
 * Convert relationship maps from arrays to Sets
 */
function mapsArrayToSet(
  mapsArray: Map<string, Set<string> | Array<string>>
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  mapsArray.forEach((val, key) => {
    if (val instanceof Set) {
      result.set(key, val);
    } else {
      result.set(key, new Set(val));
    }
  });
  return result;
}

/**
 * Generate a natural language explanation for relationship path results
 */
function explainRelationshipPath(
  result: RelationshipPath | null,
  person1?: string,
  person2?: string
): string {
  if (!result) {
    if (person1 && person2) {
      return `No relationship found between ${person1} and ${person2}.`;
    }
    return "No relationship path found.";
  }

  if (result.relationship === "self") {
    return `${person1} is the same person.`;
  }

  const pathNames = result.path
    .map((p) => `${p.firstName} ${p.lastName}`)
    .join(" → ");

  return `${person1} is ${person2}'s ${result.relationship} (${result.distance} step${result.distance !== 1 ? "s" : ""}).\nPath: ${pathNames}`;
}

/**
 * Generate a natural language explanation for common ancestor results
 */
function explainCommonAncestor(
  result: AncestorResult | null,
  person1?: string,
  person2?: string
): string {
  if (!result) {
    return `No common ancestor found between ${person1} and ${person2}.`;
  }

  const ancestorName = `${result.ancestor.firstName} ${result.ancestor.lastName}`;

  return `${ancestorName} is the closest common ancestor of ${person1} and ${person2} (${result.distance1} generations from ${person1}, ${result.distance2} from ${person2}).`;
}

/**
 * Generate a natural language explanation for cousin finder results
 */
function explainCousins(
  results: Array<CousinResult>,
  degree?: number,
  person?: string
): string {
  if (results.length === 0) {
    const degreeLabel = degree
      ? `${degree}${["", "st", "nd", "rd"][degree % 10] || "th"} `
      : "";
    return `No ${degreeLabel}cousins found for ${person}.`;
  }

  const cousinNames = results
    .map((c) => `${c.person.firstName} ${c.person.lastName}`)
    .join(", ");
  const count = results.length;
  const degreeLabel = degree
    ? `${degree}${["", "st", "nd", "rd"][degree % 10] || "th"} `
    : "";

  if (count === 1) {
    const removal =
      results[0].removal > 0 ? ` (${results[0].removal}x removed)` : "";
    return `${cousinNames} is a ${degreeLabel}cousin${removal} of ${person}.`;
  }

  return `Found ${count} ${degreeLabel}cousin${count !== 1 ? "s" : ""} of ${person}: ${cousinNames}`;
}

/**
 * Generate a natural language explanation for ancestor results
 */
function explainAncestors(
  results: Array<AncestorQueryResult>,
  person?: string
): string {
  if (results.length === 0) {
    return `No ancestors found for ${person}.`;
  }

  // Group by generation for summary
  const byGeneration = new Map<number, Array<AncestorQueryResult>>();
  results.forEach((result) => {
    if (!byGeneration.has(result.generation)) {
      byGeneration.set(result.generation, []);
    }
    byGeneration.get(result.generation)!.push(result);
  });

  const generationSummaries: Array<string> = [];
  byGeneration.forEach((items, gen) => {
    const names = items
      .map((r) => `${r.person.firstName} ${r.person.lastName}`)
      .join(", ");
    const genLabel =
      [
        "",
        "parents",
        "grandparents",
        "great-grandparents",
        "great-great-grandparents",
      ][gen] || `${gen}x ancestors`;
    generationSummaries.push(`${genLabel}: ${names}`);
  });

  return `Ancestors of ${person}:\n${generationSummaries.join("\n")}`;
}

/**
 * Generate a natural language explanation for descendant results
 */
function explainDescendants(
  results: Array<DescendantQueryResult>,
  person?: string
): string {
  if (results.length === 0) {
    return `No descendants found for ${person}.`;
  }

  // Group by generation for summary
  const byGeneration = new Map<number, Array<DescendantQueryResult>>();
  results.forEach((result) => {
    if (!byGeneration.has(result.generation)) {
      byGeneration.set(result.generation, []);
    }
    byGeneration.get(result.generation)!.push(result);
  });

  const generationSummaries: Array<string> = [];
  byGeneration.forEach((items, gen) => {
    const names = items
      .map((r) => `${r.person.firstName} ${r.person.lastName}`)
      .join(", ");
    const genLabel =
      [
        "",
        "children",
        "grandchildren",
        "great-grandchildren",
        "great-great-grandchildren",
      ][gen] || `${gen}x descendants`;
    generationSummaries.push(`${genLabel}: ${names}`);
  });

  return `Descendants of ${person}:\n${generationSummaries.join("\n")}`;
}

/**
 * Execute a search query by classifying intent and routing to appropriate handler
 *
 * Algorithm:
 * 1. Classify the query intent and extract entities
 * 2. Based on intent, route to the appropriate handler:
 *    - RELATIONSHIP_PATH: Use path-finder
 *    - COMMON_ANCESTOR: Use common-ancestor
 *    - COUSIN_FINDER: Use cousin-finder
 *    - ANCESTOR_QUERY: Use ancestors
 *    - DESCENDANT_QUERY: Use descendants
 *    - PERSON_SEARCH: Return results with explanation needed
 * 3. Execute handler with extracted entities
 * 4. Format results with explanation and timing
 *
 * @param query - Natural language search query
 * @param relationships - Relationship data maps (people, parent maps, etc.)
 * @returns Unified search result with type, results, duration, and explanation
 *
 * @example
 * ```typescript
 * const relationships = {
 *   people: new Map([['person1', { id: 'person1', firstName: 'John', lastName: 'Doe' }]]),
 *   maps: { parents: new Map(), children: new Map(), spouses: new Map() }
 * };
 * const result = await executeSearch("how am i related to jane?", relationships);
 * console.log(result.explanation); // "John is Jane's brother..."
 * ```
 */
export async function executeSearch(
  query: string,
  relationships: RelationshipDataMaps
): Promise<SearchResult> {
  const startTime = Date.now();

  try {
    // Step 1: Classify intent and extract entities
    const classification = classifyIntent(query);

    // Step 2: Route to handler based on intent
    let results: Array<unknown> = [];
    let explanation: string | undefined;

    switch (classification.intent) {
      case "RELATIONSHIP_PATH": {
        const person1Id = extractPersonIdByName(
          classification.entities.person1,
          relationships.people
        );
        const person2Id = extractPersonIdByName(
          classification.entities.person2,
          relationships.people
        );

        if (!person1Id || !person2Id) {
          explanation = "Could not find one or both people in the database.";
          break;
        }

        // Convert Sets to arrays for path-finder (it expects arrays)
        const mapsForPathFinder: RelationshipMaps = {
          parents: mapsSetToArray(relationships.maps.parents),
          children: mapsSetToArray(relationships.maps.children),
          spouses: mapsSetToArray(relationships.maps.spouses),
        };

        const pathResult = findRelationshipPath(
          person1Id,
          person2Id,
          relationships.people,
          mapsForPathFinder
        );

        results = pathResult ? [pathResult] : [];
        explanation = explainRelationshipPath(
          pathResult,
          classification.entities.person1,
          classification.entities.person2
        );
        break;
      }

      case "COMMON_ANCESTOR": {
        const person1Id = extractPersonIdByName(
          classification.entities.person1,
          relationships.people
        );
        const person2Id = extractPersonIdByName(
          classification.entities.person2,
          relationships.people
        );

        if (!person1Id || !person2Id) {
          explanation = "Could not find one or both people in the database.";
          break;
        }

        // Convert Set or array to array for common ancestor finder
        const parentsMap = mapsSetToArray(relationships.maps.parents);

        const ancestorResult = findCommonAncestor(
          person1Id,
          person2Id,
          relationships.people,
          parentsMap
        );

        results = ancestorResult ? [ancestorResult] : [];
        explanation = explainCommonAncestor(
          ancestorResult,
          classification.entities.person1,
          classification.entities.person2
        );
        break;
      }

      case "COUSIN_FINDER": {
        const personId = extractPersonIdByName(
          classification.entities.person1,
          relationships.people
        );

        if (!personId) {
          explanation = "Could not find the person in the database.";
          break;
        }

        const degree = classification.entities.degree || 1;

        // Prepare required maps for cousin finder (already in Sets format from buildRelationshipMaps)
        const childToParents =
          relationships.childToParents ||
          mapsArrayToSet(relationships.maps.parents);
        const parentToChildren =
          relationships.parentToChildren ||
          mapsArrayToSet(relationships.maps.children);

        const cousinResults = findCousins(
          personId,
          degree,
          relationships.people,
          childToParents,
          parentToChildren
        );

        results = cousinResults;
        explanation = explainCousins(
          cousinResults,
          degree,
          classification.entities.person1
        );
        break;
      }

      case "ANCESTOR_QUERY": {
        const personId = extractPersonIdByName(
          classification.entities.person1,
          relationships.people
        );

        if (!personId) {
          explanation = "Could not find the person in the database.";
          break;
        }

        // Prepare maps for ancestor query (ensure they're in Sets format)
        const childToParents =
          relationships.childToParents ||
          mapsArrayToSet(relationships.maps.parents);
        const spouseMap = mapsArrayToSet(relationships.maps.spouses);

        const ancestorResults = findAncestors(personId, relationships.people, {
          childToParents,
          spouseMap,
        });

        results = ancestorResults;
        explanation = explainAncestors(
          ancestorResults,
          classification.entities.person1
        );
        break;
      }

      case "DESCENDANT_QUERY": {
        const personId = extractPersonIdByName(
          classification.entities.person1,
          relationships.people
        );

        if (!personId) {
          explanation = "Could not find the person in the database.";
          break;
        }

        // Prepare maps for descendant query (ensure they're in Sets format)
        const childToParents =
          relationships.childToParents ||
          mapsArrayToSet(relationships.maps.parents);
        const parentToChildren =
          relationships.parentToChildren ||
          mapsArrayToSet(relationships.maps.children);
        const spouseMap = mapsArrayToSet(relationships.maps.spouses);

        const descendantResults = findDescendants(
          personId,
          relationships.people,
          {
            childToParents,
            spouseMap,
            parentToChildren,
          }
        );

        results = descendantResults;
        explanation = explainDescendants(
          descendantResults,
          classification.entities.person1
        );
        break;
      }

      case "PERSON_SEARCH":
      default: {
        // For person search, we return a placeholder explanation
        // The actual FTS search happens in the server function
        explanation = `Searching for people matching "${classification.entities.person1}"...`;
        break;
      }
    }

    const duration = Date.now() - startTime;

    return {
      type: classification.intent,
      results,
      duration,
      explanation: explanation || "Search completed successfully.",
      extractedEntities: classification.entities,
      confidence: classification.confidence,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      type: "PERSON_SEARCH", // Default fallback
      results: [],
      duration,
      explanation: `Search failed: ${errorMessage}`,
      confidence: 0,
    };
  }
}

/**
 * Helper function to extract a person's database ID by their name
 * This is a placeholder that would be implemented to search the people map
 *
 * In a real implementation, this would:
 * 1. Search the people map for exact matches
 * 2. Use fuzzy matching for partial matches
 * 3. Return the best match or null
 *
 * @param name - Person's name (first name, last name, or full name)
 * @param people - Map of person ID to RelationshipNode
 * @returns Person ID if found, null otherwise
 */
function extractPersonIdByName(
  name: string | undefined,
  people: Map<string, RelationshipNode>
): string | null {
  if (!name) return null;

  const lowerName = name.toLowerCase().trim();
  const parts = lowerName.split(/\s+/);

  // Try exact match on full name
  for (const [id, person] of people) {
    const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
    if (fullName === lowerName) {
      return id;
    }
  }

  // Try matching last name and first name separately
  if (parts.length >= 2) {
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");

    for (const [id, person] of people) {
      if (
        person.firstName.toLowerCase() === firstName &&
        person.lastName.toLowerCase() === lastName
      ) {
        return id;
      }
    }
  }

  // Try matching by any part of the name
  for (const [id, person] of people) {
    const personFirstLower = person.firstName.toLowerCase();
    const personLastLower = person.lastName.toLowerCase();

    if (
      parts.some(
        (part) =>
          personFirstLower.includes(part) || personLastLower.includes(part)
      )
    ) {
      return id;
    }
  }

  return null;
}
