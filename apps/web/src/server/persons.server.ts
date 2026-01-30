/**
 * Person server-side handlers (server-only, testable)
 *
 * This file contains the actual handler implementations for person operations.
 * These can be imported directly in tests using withStubbedServerContext.
 *
 * @fileoverview Server-only code - never import from client components
 */

import {
  createPersonData,
  deletePersonData,
  getPersonData,
  listPersonsData,
  searchPersonsData,
  updatePersonData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type {
  PersonCreateResult,
  PersonDeleteResult,
  PersonDetail,
  PersonListOptions,
  PersonListResult,
  PersonSearchResult,
  PersonUpdateResult,
} from "@vamsa/lib/server/business";
import type { PersonCreateInput, PersonUpdateInput } from "@vamsa/schemas";

// ============================================================================
// Types
// ============================================================================

export interface PersonListInput {
  page: number;
  limit: number;
  sortOrder: "asc" | "desc";
  search?: string;
  sortBy: "lastName" | "firstName" | "dateOfBirth" | "createdAt";
  isLiving?: boolean;
}

export interface PersonGetInput {
  id: string;
}

export interface PersonDeleteInput {
  id: string;
}

export interface PersonSearchInput {
  query: string;
  excludeId?: string;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * List persons with pagination and filtering
 * @requires VIEWER role or higher
 */
export async function listPersonsHandler(
  data: PersonListInput
): Promise<PersonListResult> {
  await requireAuth("VIEWER");

  const options: PersonListOptions = {
    page: data.page,
    limit: data.limit,
    sortBy: data.sortBy,
    sortOrder: data.sortOrder,
    search: data.search,
    isLiving: data.isLiving,
  };

  return listPersonsData(options);
}

/**
 * Get a single person by ID with relationships
 * @requires VIEWER role or higher
 * @throws Error if person not found
 */
export async function getPersonHandler(
  data: PersonGetInput
): Promise<PersonDetail> {
  await requireAuth("VIEWER");
  return getPersonData(data.id);
}

/**
 * Create a new person
 * @requires MEMBER role or higher
 */
export async function createPersonHandler(
  data: PersonCreateInput
): Promise<PersonCreateResult> {
  const user = await requireAuth("MEMBER");
  return createPersonData(data, user.id);
}

/**
 * Update an existing person
 * @requires MEMBER role or higher
 * @throws Error if person not found or user lacks permission
 */
export async function updatePersonHandler(
  data: PersonUpdateInput & { id: string }
): Promise<PersonUpdateResult> {
  const user = await requireAuth("MEMBER");
  const { id, ...updates } = data;
  return updatePersonData(id, updates, user.id);
}

/**
 * Delete a person
 * @requires ADMIN role
 * @throws Error if person not found
 */
export async function deletePersonHandler(
  data: PersonDeleteInput
): Promise<PersonDeleteResult> {
  const user = await requireAuth("ADMIN");
  return deletePersonData(data.id, user.id);
}

/**
 * Search persons by name
 * @requires VIEWER role or higher
 * @returns List of matching persons (max 10 results)
 */
export async function searchPersonsHandler(
  data: PersonSearchInput
): Promise<Array<PersonSearchResult>> {
  await requireAuth("VIEWER");
  return searchPersonsData(data.query, data.excludeId);
}
