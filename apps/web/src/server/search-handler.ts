/**
 * Search handler implementation (server-only)
 *
 * This module contains the heavy server-side search logic including:
 * - Database queries (Drizzle ORM)
 * - NLP intent classification and query routing
 * - Relationship map building
 * - FTS search execution
 *
 * It is dynamically imported by the server function in search.ts
 * to prevent these dependencies from leaking into the client bundle.
 */

import { drizzleDb } from "@vamsa/api";
import {
  buildCombinedSearchQuery,
  buildPersonSearchCountQuery,
  classifyIntent,
  executeSearch,
  sanitizeQuery,
} from "@vamsa/lib";
import { loggers } from "@vamsa/lib/logger";
import { requireAuth } from "./middleware/require-auth";
import type { RelationshipDataMaps, SearchResults } from "@vamsa/lib";
import type { PersonSearchResultItem, SearchPeopleInput } from "./search";

/** Type for the database instance (for DI) */
export type SearchDb = typeof drizzleDb;

const log = loggers.db;

/**
 * Convert a Map<string, Set<string>> to Map<string, string[]>
 */
function convertSetMapToArrayMap(
  setMap: Map<string, Set<string>>
): Map<string, Array<string>> {
  const result = new Map<string, Array<string>>();
  setMap.forEach((set, key) => {
    result.set(key, Array.from(set));
  });
  return result;
}

/**
 * Build relationship data maps from database for use by relationship handlers
 * Fetches all persons and creates parent/child/spouse maps
 *
 * @param db Database instance to use (for DI)
 * @returns RelationshipDataMaps with people map and relationship maps
 */
export async function buildRelationshipMaps(
  db: SearchDb = drizzleDb
): Promise<RelationshipDataMaps> {
  try {
    // Fetch all persons
    const persons = await db.query.persons.findMany();

    // Create people map
    const people = new Map(
      persons.map((p) => [
        p.id,
        {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender as "male" | "female" | "other" | undefined,
          dateOfBirth: p.dateOfBirth,
          dateOfPassing: p.dateOfPassing,
          isLiving: p.isLiving,
          photoUrl: p.photoUrl,
        },
      ])
    );

    // Fetch all relationships
    const rels = await db.query.relationships.findMany();

    // Create parent/child/spouse maps (using Sets as required by relationship modules)
    const parents = new Map<string, Set<string>>();
    const children = new Map<string, Set<string>>();
    const spouses = new Map<string, Set<string>>();

    for (const rel of rels) {
      // Parent relationship
      if (rel.type === "PARENT") {
        if (!parents.has(rel.personId)) {
          parents.set(rel.personId, new Set());
        }
        parents.get(rel.personId)!.add(rel.relatedPersonId);
      }

      // Child relationship (inverse of parent)
      if (rel.type === "CHILD") {
        if (!children.has(rel.personId)) {
          children.set(rel.personId, new Set());
        }
        children.get(rel.personId)!.add(rel.relatedPersonId);
      }

      // Spouse relationships
      if (rel.type === "SPOUSE") {
        if (!spouses.has(rel.personId)) {
          spouses.set(rel.personId, new Set());
        }
        spouses.get(rel.personId)!.add(rel.relatedPersonId);
      }
    }

    return {
      people,
      maps: {
        parents: convertSetMapToArrayMap(parents),
        children: convertSetMapToArrayMap(children),
        spouses: convertSetMapToArrayMap(spouses),
      },
      parentToChildren: children,
      childToParents: parents,
    };
  } catch (error) {
    log.withErr(error).msg("Failed to build relationship maps");
    // Return empty maps as fallback
    return {
      people: new Map(),
      maps: {
        parents: new Map(),
        children: new Map(),
        spouses: new Map(),
      },
    };
  }
}

/**
 * Determine if a query is likely a natural language relationship query
 * vs a simple person name search.
 *
 * Only routes to NLP when the classifier detects a specific intent
 * (ancestor, descendant, cousin, path, common ancestor) with decent confidence.
 * Single-word and simple name searches stay on the FTS path.
 */
function isNLPQuery(query: string): {
  isNLP: boolean;
  intent: string;
  confidence: number;
} {
  const classification = classifyIntent(query);
  const isNLP =
    classification.intent !== "PERSON_SEARCH" &&
    classification.confidence > 0.5;
  return {
    isNLP,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

/**
 * Person data as stored in the relationship people map at runtime.
 * buildRelationshipMaps() adds these fields beyond the RelationshipNode type.
 */
interface RuntimePersonData {
  id: string;
  firstName: string;
  lastName: string;
  gender?: "male" | "female" | "other";
  dateOfBirth?: Date | string | null;
  dateOfPassing?: Date | string | null;
  isLiving: boolean;
  photoUrl?: string | null;
}

/**
 * Extract PersonSearchResultItem entries from NLP handler results.
 *
 * NLP handlers return different shapes (arrays of RelationshipNode, path objects, etc.).
 * This walks the results, extracts person IDs, and looks them up in the people map
 * to get the full data needed for the search result UI.
 *
 * Note: buildRelationshipMaps() stores RuntimePersonData in the people map,
 * but the type is narrowed to RelationshipNode. We cast to access the extra fields.
 */
function extractPersonsFromNLPResults(
  results: Array<unknown>,
  people: Map<string, unknown>
): Array<PersonSearchResultItem> {
  const seen = new Set<string>();
  const persons: Array<PersonSearchResultItem> = [];

  function addPerson(item: unknown) {
    if (!item || typeof item !== "object") return;

    const obj = item as Record<string, unknown>;

    // If it has an id, look it up in the people map for full data
    if (typeof obj.id === "string" && !seen.has(obj.id)) {
      seen.add(obj.id);
      const raw = people.get(obj.id);
      if (raw) {
        // buildRelationshipMaps stores full person data beyond RelationshipNode type
        const person = raw as RuntimePersonData;
        persons.push({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          photoUrl: person.photoUrl ?? null,
          dateOfBirth: person.dateOfBirth
            ? new Date(person.dateOfBirth as string | number)
            : null,
          dateOfPassing: person.dateOfPassing
            ? new Date(person.dateOfPassing as string | number)
            : null,
          isLiving: person.isLiving ?? true,
        });
      }
    }

    // Handle RelationshipPath objects with a path array
    if (Array.isArray(obj.path)) {
      for (const node of obj.path) {
        addPerson(node);
      }
    }
  }

  for (const result of results) {
    if (Array.isArray(result)) {
      for (const item of result) {
        addPerson(item);
      }
    } else {
      addPerson(result);
    }
  }

  return persons;
}

/**
 * Search people by name and bio using PostgreSQL FTS
 * Returns results ranked by relevance with query timing information.
 *
 * @requires VIEWER role or higher
 * @throws Error if database query fails
 */
export async function searchPeopleHandler(
  data: SearchPeopleInput
): Promise<SearchResults<PersonSearchResultItem>> {
  await requireAuth("VIEWER");

  const startTime = Date.now();

  try {
    const sanitized = sanitizeQuery(data.query);

    // Return empty results for empty queries
    if (!sanitized) {
      return {
        results: [],
        total: 0,
        queryTime: Date.now() - startTime,
      };
    }

    // Check if this is likely a natural language relationship query
    const nlpCheck = isNLPQuery(data.query);
    if (nlpCheck.isNLP) {
      try {
        // Build relationship maps for NLP handlers
        const relationships = await buildRelationshipMaps();

        // Execute NLP search
        const nlpResult = await executeSearch(data.query, relationships);

        const queryTime = Date.now() - startTime;

        // Extract person results from NLP handler output
        // people map has RuntimePersonData at runtime (wider than RelationshipNode type)
        const personResults = extractPersonsFromNLPResults(
          nlpResult.results,
          relationships.people as Map<string, unknown>
        );

        log.info(
          {
            query: data.query,
            intentType: nlpResult.type,
            resultCount: personResults.length,
            queryTime,
            explanation: nlpResult.explanation,
          },
          "NLP search executed"
        );

        return {
          results: personResults.map((item, index) => ({
            item,
            rank: personResults.length - index, // preserve handler ordering
          })),
          total: personResults.length,
          queryTime,
          explanation: nlpResult.explanation,
          intentType: nlpResult.type,
        };
      } catch (nlpError) {
        log
          .withErr(nlpError)
          .ctx({ query: data.query })
          .msg("NLP search failed, falling back to FTS");
        // Fall through to FTS search as fallback
      }
    }

    // Use traditional FTS search as fallback or for person name queries
    const { sql: searchSql, params: searchParams } = buildCombinedSearchQuery(
      data.query,
      {
        limit: data.limit,
        offset: data.offset,
        fuzzy: true,
      }
    );

    // Build count query to get total results
    const { sql: countSql, params: countParams } = buildPersonSearchCountQuery(
      data.query,
      { language: "english" }
    );

    // Execute both queries in parallel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = drizzleDb.$client as any;
    const [rawResults, countResult] = await Promise.all([
      client.query(searchSql, searchParams),
      client.query(countSql, countParams),
    ]);

    const total = (countResult.rows[0]?.total as number) || 0;

    // Transform results to include rank and proper typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = rawResults.rows.map((row: any) => ({
      item: {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        maidenName: row.maidenName,
        photoUrl: row.photoUrl,
        dateOfBirth: row.dateOfBirth,
        dateOfPassing: row.dateOfPassing,
        isLiving: row.isLiving,
      },
      rank: row.rank || row.similarity_score || 0,
    }));

    const queryTime = Date.now() - startTime;

    log.info(
      { query: data.query, resultCount: results.length, queryTime, total },
      "FTS search executed"
    );

    return {
      results,
      total,
      queryTime,
    };
  } catch (error) {
    const queryTime = Date.now() - startTime;
    log
      .withErr(error)
      .ctx({ query: data.query, queryTime })
      .msg("Search query failed");

    throw error;
  }
}
