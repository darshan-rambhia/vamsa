import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { personCreateSchema, personUpdateSchema } from "@vamsa/schemas";
import { requireAuth } from "./middleware/require-auth";
import {
  listPersonsData,
  getPersonData,
  createPersonData,
  updatePersonData,
  deletePersonData,
  searchPersonsData,
  type PersonListOptions,
  type PersonListResult,
  type PersonDetail,
  type PersonCreateResult,
  type PersonUpdateResult,
  type PersonDeleteResult,
  type PersonSearchResult,
} from "@vamsa/lib/server/business";

// Person list input schema with pagination, search, and filters
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

type PersonListInput = z.infer<typeof personListInputSchema>;

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
    await requireAuth("VIEWER");

    const options: PersonListOptions = {
      page: data.page,
      limit: data.limit,
      sortBy: data.sortBy as PersonListOptions["sortBy"],
      sortOrder: data.sortOrder as PersonListOptions["sortOrder"],
      search: data.search,
      isLiving: data.isLiving,
    };

    return listPersonsData(options);
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
    await requireAuth("VIEWER");
    return getPersonData(data.id);
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
    const user = await requireAuth("MEMBER");
    return createPersonData(data, user.id);
  });

/**
 * Server function: Update an existing person
 * @returns Updated person ID
 * @requires MEMBER role or higher
 * @throws Error if person not found or user lacks permission
 */
export const updatePerson = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return personUpdateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<PersonUpdateResult> => {
    const user = await requireAuth("MEMBER");
    const { id, ...updates } = data as { id: string } & Record<string, unknown>;

    return updatePersonData(id, updates as typeof data, user.id);
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
    const user = await requireAuth("ADMIN");
    return deletePersonData(data.id, user.id);
  });

/**
 * Server function: Search persons by name
 * @returns List of matching persons (max 10 results)
 * @requires VIEWER role or higher
 */
export const searchPersons = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string; excludeId?: string }) => data)
  .handler(async ({ data }): Promise<PersonSearchResult[]> => {
    await requireAuth("VIEWER");
    return searchPersonsData(data.query, data.excludeId);
  });
