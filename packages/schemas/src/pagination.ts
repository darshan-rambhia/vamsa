import { z } from "zod";

/**
 * Common sort order options
 */
export const sortOrderEnum = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof sortOrderEnum>;

/**
 * Base pagination input schema
 * - page: 1-indexed page number
 * - limit: items per page (max 100)
 * - sortOrder: ascending or descending
 */
export const paginationInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortOrder: sortOrderEnum.default("asc"),
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;

/**
 * Pagination input with optional search term
 */
export const paginationWithSearchSchema = paginationInputSchema.extend({
  search: z.string().optional(),
});

export type PaginationWithSearchInput = z.infer<
  typeof paginationWithSearchSchema
>;

/**
 * Pagination metadata returned with paginated results
 */
export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Helper to create pagination metadata from query results
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Paginated response wrapper type
 */
export interface PaginatedResponse<T> {
  items: Array<T>;
  pagination: PaginationMeta;
}

/**
 * Person list specific pagination
 */
export const personListInputSchema = paginationWithSearchSchema.extend({
  sortBy: z
    .enum(["lastName", "firstName", "dateOfBirth", "createdAt"])
    .default("lastName"),
  isLiving: z.boolean().optional(),
});

export type PersonListInput = z.infer<typeof personListInputSchema>;

/**
 * Suggestion list specific pagination
 */
export const suggestionListInputSchema = paginationInputSchema.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export type SuggestionListInput = z.infer<typeof suggestionListInputSchema>;

/**
 * Audit log list specific pagination
 */
export const auditLogListInputSchema = paginationInputSchema.extend({
  userId: z.string().optional(),
  action: z
    .enum([
      "CREATE",
      "UPDATE",
      "DELETE",
      "LOGIN",
      "LOGOUT",
      "APPROVE",
      "REJECT",
    ])
    .optional(),
  entityType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type AuditLogListInput = z.infer<typeof auditLogListInputSchema>;
