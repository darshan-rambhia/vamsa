import { z } from '@hono/zod-openapi';

/**
 * Standard error response schema for all API errors
 * Used for all error responses across the API
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
}).openapi({
  description: "Error response",
});

/**
 * Success response wrapper for mutations
 */
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
}).openapi({
  description: "Success response",
});

/**
 * Pagination metadata
 */
export const paginationMetadataSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  pages: z.number().int(),
}).openapi({
  description: "Pagination metadata",
});

/**
 * Factory function to create a paginated response schema
 * @example
 * const personListSchema = paginatedResponseSchema(personSchema);
 */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: paginationMetadataSchema,
  }).openapi({
    description: "Paginated response",
  });
}

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type PaginationMetadata = z.infer<typeof paginationMetadataSchema>;
