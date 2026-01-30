/**
 * Person server functions (client-importable)
 *
 * This file exports createServerFn wrappers that can be safely imported
 * from client components. The actual handler logic lives in persons.server.ts.
 *
 * @fileoverview Client-safe server function exports
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { personCreateSchema, personUpdateSchema } from "@vamsa/schemas";
import {
  createPersonHandler,
  deletePersonHandler,
  getPersonHandler,
  listPersonsHandler,
  searchPersonsHandler,
  updatePersonHandler,
} from "./persons.server";
import type { PersonListInput } from "./persons.server";
import type {
  PersonCreateResult,
  PersonDeleteResult,
  PersonDetail,
  PersonListResult,
  PersonSearchResult,
  PersonUpdateResult,
} from "@vamsa/lib/server/business";

// Re-export types for use by route loaders
export type { PersonDetail };

// ============================================================================
// Input Schemas
// ============================================================================

const personListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  sortBy: z
    .enum(["lastName", "firstName", "dateOfBirth", "createdAt"])
    .default("lastName"),
  isLiving: z.boolean().optional(),
});

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Server function: List persons with pagination and filtering
 * @returns Paginated list of persons
 * @requires VIEWER role or higher
 */
export const listPersons = createServerFn({ method: "GET" })
  .inputValidator((data: Partial<PersonListInput>) => {
    return personListInputSchema.parse(data);
  })
  .handler(async ({ data }): Promise<PersonListResult> => {
    return listPersonsHandler(data);
  });

/**
 * Server function: Get a single person by ID with relationships
 * @returns Person detail with relationships
 * @requires VIEWER role or higher
 * @throws Error if person not found
 */
export const getPerson = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<PersonDetail> => {
    return getPersonHandler(data);
  });

/**
 * Server function: Create a new person
 * @returns Created person ID
 * @requires MEMBER role or higher
 */
export const createPerson = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return personCreateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<PersonCreateResult> => {
    return createPersonHandler(data);
  });

/**
 * Server function: Update an existing person
 * @returns Updated person ID
 * @requires MEMBER role or higher
 * @throws Error if person not found or user lacks permission
 */
export const updatePerson = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return personUpdateSchema.extend({ id: z.string() }).parse(data);
  })
  .handler(async ({ data }): Promise<PersonUpdateResult> => {
    return updatePersonHandler(data);
  });

/**
 * Server function: Delete a person
 * @returns Success status
 * @requires ADMIN role
 * @throws Error if person not found
 */
export const deletePerson = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<PersonDeleteResult> => {
    return deletePersonHandler(data);
  });

/**
 * Server function: Search persons by name
 * @returns List of matching persons (max 10 results)
 * @requires VIEWER role or higher
 */
export const searchPersons = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string; excludeId?: string }) => data)
  .handler(async ({ data }): Promise<Array<PersonSearchResult>> => {
    return searchPersonsHandler(data);
  });
