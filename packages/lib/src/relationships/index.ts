/**
 * Relationship Query Handlers
 *
 * Exports utilities for querying ancestors, descendants, and other
 * relationship traversal operations.
 */

// Export functions and types from path-finder (excluding RelationshipNode to avoid conflicts)
export {
  findRelationshipPath,
  calculateRelationshipName,
  type RelationshipPath,
  type RelationshipMaps,
} from "./path-finder";

// Export ancestor/descendant query handlers (re-exported selectively to avoid name conflicts)
export {
  type AncestorQueryResult,
  type AncestorQueryOptions,
  type RelationshipMapSet,
  findAncestors,
  getAncestorsAtGeneration,
  countAncestors,
  getAncestorsByGeneration,
} from "./ancestors";

export {
  type DescendantQueryResult,
  type DescendantQueryOptions,
  findDescendants,
  getDescendantsAtGeneration,
  countDescendants,
  getDescendantsByGeneration,
  getAllRelatives,
} from "./descendants";

// Export common ancestor functions
export * from "./common-ancestor";

// Export cousin finder functions (selective to avoid name conflicts with RelationshipNode)
export {
  type CousinResult,
  findCousins,
  calculateCousinDegree,
} from "./cousin-finder";
