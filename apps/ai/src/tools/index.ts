/**
 * All available AI tools
 *
 * Each tool is a Vercel AI SDK tool with:
 * - Zod schema for parameters
 * - Description for the LLM to understand when to use it
 * - Dual-mode execution (direct DB or HTTP API)
 */

import { searchPeopleTool } from "./search";
import { getPersonDetailsTool } from "./person";
import { findAncestorsTool } from "./ancestors";
import { findDescendantsTool } from "./descendants";
import {
  findCommonAncestorTool,
  findRelationshipPathTool,
} from "./relationships";

export { searchPeopleTool } from "./search";
export { getPersonDetailsTool } from "./person";
export { findAncestorsTool } from "./ancestors";
export { findDescendantsTool } from "./descendants";
export {
  findRelationshipPathTool,
  findCommonAncestorTool,
} from "./relationships";

/**
 * All tools available to the chat agent
 */
export const chatTools = {
  search_people: searchPeopleTool,
  get_person_details: getPersonDetailsTool,
  find_ancestors: findAncestorsTool,
  find_descendants: findDescendantsTool,
  find_relationship_path: findRelationshipPathTool,
  find_common_ancestor: findCommonAncestorTool,
};

/**
 * Tools available to the story generation agent (read-only subset)
 */
export const storyTools = {
  search_people: searchPeopleTool,
  get_person_details: getPersonDetailsTool,
  find_ancestors: findAncestorsTool,
  find_descendants: findDescendantsTool,
};

/**
 * Tools available to the suggestion agent (read-only subset)
 */
export const suggestTools = {
  get_person_details: getPersonDetailsTool,
  find_ancestors: findAncestorsTool,
  find_descendants: findDescendantsTool,
  search_people: searchPeopleTool,
};
