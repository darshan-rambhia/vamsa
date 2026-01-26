/**
 * Natural Language Search Module
 *
 * Provides intent classification, query routing, and unified search API
 * for genealogy queries including relationship finding, ancestor/descendant
 * queries, and full-text search fallback.
 *
 * Exports:
 * - Intent classification with entity extraction
 * - Query router for routing to appropriate handlers
 * - All relationship query types
 * - Full-text search utilities
 */

// Intent classification
export {
  classifyIntent,
  type SearchIntent,
  type ClassificationResult,
} from "./intent-classifier";

// Query router
export {
  executeSearch,
  type SearchResult,
  type RelationshipDataMaps,
} from "./query-router";
