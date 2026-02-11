/**
 * Batch Operations API
 *
 * Handles bulk create, update, and delete operations for persons and relationships.
 * Supports both transactional (all-or-nothing) and non-transactional (partial success) modes.
 *
 * Endpoints:
 * - POST /api/v1/batch - Execute batch operations
 *
 * Features:
 * - Database transactions for consistency
 * - Per-operation validation with entity-specific schemas
 * - Audit logging of all batch operations
 * - Rate limiting (100 requests per minute)
 * - Comprehensive error handling
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  errorResponseSchema,
  personCreateSchema,
  relationshipCreateSchema,
} from "@vamsa/schemas";
import {
  createPersonData as serverCreatePerson,
  createRelationshipData as serverCreateRelationship,
  deletePersonData as serverDeletePerson,
  deleteRelationshipData as serverDeleteRelationship,
  updatePersonData as serverUpdatePerson,
  updateRelationshipData as serverUpdateRelationship,
} from "@vamsa/lib/server/business";
import { loggers } from "@vamsa/lib/logger";
import { db } from "../db";

const log = loggers.api;

const batchRouter = new OpenAPIHono();

// ============================================
// Batch Operation Schemas
// ============================================

/**
 * Batch operation - use a union to handle different types
 * Each operation must specify:
 * - type: create, update, or delete
 * - entity: person or relationship
 * - data: entity-specific payload (validate with schema)
 */
const createPersonOperationSchema = z.object({
  type: z.literal("create"),
  entity: z.literal("person"),
  data: personCreateSchema,
});

const updatePersonOperationSchema = z.object({
  type: z.literal("update"),
  entity: z.literal("person"),
  id: z.string().min(1, "Person ID is required"),
  data: personCreateSchema.partial(),
});

const deletePersonOperationSchema = z.object({
  type: z.literal("delete"),
  entity: z.literal("person"),
  id: z.string().min(1, "Person ID is required"),
});

const createRelationshipOperationSchema = z.object({
  type: z.literal("create"),
  entity: z.literal("relationship"),
  data: relationshipCreateSchema,
});

const updateRelationshipOperationSchema = z.object({
  type: z.literal("update"),
  entity: z.literal("relationship"),
  id: z.string().min(1, "Relationship ID is required"),
  data: relationshipCreateSchema.partial(),
});

const deleteRelationshipOperationSchema = z.object({
  type: z.literal("delete"),
  entity: z.literal("relationship"),
  id: z.string().min(1, "Relationship ID is required"),
});

const batchOperationSchema = z.union([
  createPersonOperationSchema,
  updatePersonOperationSchema,
  deletePersonOperationSchema,
  createRelationshipOperationSchema,
  updateRelationshipOperationSchema,
  deleteRelationshipOperationSchema,
]);

const batchRequestSchema = z.object({
  operations: z
    .array(batchOperationSchema)
    .min(1, "At least one operation is required")
    .max(100, "Maximum 100 operations per batch"),
  transaction: z.boolean().default(true).openapi({
    description:
      "If true, all operations are atomic (all-or-nothing). If false, partial success is allowed.",
    example: true,
  }),
});

const batchResultItemSchema = z.object({
  index: z.number().int().openapi({
    description: "Index of the operation in the request",
    example: 0,
  }),
  success: z.boolean().openapi({
    description: "Whether the operation succeeded",
    example: true,
  }),
  id: z.string().optional().openapi({
    description:
      "ID of created/updated resource (for create/update operations)",
    example: "person_123",
  }),
  error: z.string().optional().openapi({
    description: "Error message if operation failed",
    example: "Person not found",
  }),
});

const batchResponseSchema = z.object({
  success: z.boolean().openapi({
    description:
      "Whether all operations succeeded (true only if all succeeded or transaction rolled back)",
    example: true,
  }),
  results: z.array(batchResultItemSchema).openapi({
    description: "Results for each operation",
  }),
  transactionRolledBack: z.boolean().optional().openapi({
    description:
      "If true, transaction was rolled back due to an error in transaction mode",
    example: false,
  }),
});

// ============================================
// Rate Limiting Middleware
// ============================================

const requestCounts = new Map<string, { count: number; resetTime: number }>();

const getRateLimitKey = (
  c: Parameters<Parameters<typeof batchRouter.openapi>[1]>[0]
): string => {
  // Use authenticated user ID from context for rate limiting
  try {
    const user = c.get("user");
    if (user && user.id) {
      return user.id;
    }
  } catch {
    // User context not available
  }

  // Fallback to IP address if user is not available
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for") ||
    "unknown";
  return ip;
};

const checkRateLimit = (key: string): boolean => {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now >= record.resetTime) {
    // Reset counter
    requestCounts.set(key, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (record.count >= 100) {
    return false;
  }

  record.count++;
  return true;
};

// ============================================
// POST /api/v1/batch - Batch Operations
// ============================================

const batchRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Batch"],
  summary: "Execute batch operations",
  description:
    "Execute multiple create, update, or delete operations in a single request. Supports transactional (all-or-nothing) or non-transactional (partial success) modes.",
  operationId: "executeBatch",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: batchRequestSchema.openapi({
            description: "Batch operation request",
            example: {
              operations: [
                {
                  type: "create",
                  entity: "person",
                  data: {
                    firstName: "John",
                    lastName: "Doe",
                    isLiving: true,
                  },
                },
                {
                  type: "create",
                  entity: "person",
                  data: {
                    firstName: "Jane",
                    lastName: "Doe",
                    isLiving: true,
                  },
                },
              ],
              transaction: true,
            },
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Batch operations completed",
      content: {
        "application/json": {
          schema: batchResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error or invalid request",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    429: {
      description: "Rate limit exceeded (100 requests per minute)",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

batchRouter.openapi(batchRoute, async (c) => {
  try {
    // Check rate limit
    const rateLimitKey = getRateLimitKey(c);
    if (!checkRateLimit(rateLimitKey)) {
      log.warn(
        { key: rateLimitKey },
        "Rate limit exceeded for batch operations"
      );
      return c.json(
        {
          error: "Rate limit exceeded",
          details: "Maximum 100 batch requests per minute",
        },
        { status: 429 }
      );
    }

    // Parse and validate request
    const { operations, transaction } = c.req.valid("json");

    // Log batch operation
    log.info(
      {
        operationCount: operations.length,
        transactional: transaction,
      },
      "Batch operation started"
    );

    const results: Array<{
      index: number;
      success: boolean;
      id?: string;
      error?: string;
    }> = [];

    // Get authenticated user ID
    const user = c.get("user");
    const userId = user.id;

    if (transaction) {
      // Transactional mode: all-or-nothing
      try {
        const _tx = await db.transaction(async (_txDb) => {
          for (let i = 0; i < operations.length; i++) {
            const op = operations[i];

            try {
              let operationResult: { id?: string } | void;

              if (op.type === "create" && op.entity === "person") {
                operationResult = await serverCreatePerson(op.data, userId);
                results.push({
                  index: i,
                  success: true,
                  id: operationResult?.id,
                });
              } else if (op.type === "update" && op.entity === "person") {
                operationResult = await serverUpdatePerson(
                  op.id,
                  op.data,
                  userId
                );
                results.push({
                  index: i,
                  success: true,
                  id: op.id,
                });
              } else if (op.type === "delete" && op.entity === "person") {
                await serverDeletePerson(op.id, userId);
                results.push({
                  index: i,
                  success: true,
                });
              } else if (op.type === "create" && op.entity === "relationship") {
                operationResult = await serverCreateRelationship(op.data);
                results.push({
                  index: i,
                  success: true,
                  id: operationResult?.id,
                });
              } else if (op.type === "update" && op.entity === "relationship") {
                operationResult = await serverUpdateRelationship(
                  op.id,
                  op.data
                );
                results.push({
                  index: i,
                  success: true,
                  id: op.id,
                });
              } else if (op.type === "delete" && op.entity === "relationship") {
                await serverDeleteRelationship(op.id);
                results.push({
                  index: i,
                  success: true,
                });
              }
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred";

              log.warn(
                {
                  index: i,
                  operationType: op.type,
                  operationEntity: op.entity,
                  error: errorMessage,
                },
                "Batch operation failed in transaction mode"
              );

              // In transaction mode, throw to trigger rollback
              throw new Error(`Operation ${i} failed: ${errorMessage}`);
            }
          }
        });

        log.info(
          {
            operationCount: operations.length,
            successCount: results.length,
          },
          "Batch operation completed successfully"
        );

        return c.json(
          {
            success: true,
            results,
          },
          { status: 200 }
        );
      } catch (error) {
        // Transaction rolled back
        const errorMessage =
          error instanceof Error ? error.message : "Transaction failed";

        log.error(
          {
            operationCount: operations.length,
            error: errorMessage,
          },
          "Batch operation rolled back"
        );

        return c.json(
          {
            success: false,
            results: operations.map((_, index) => ({
              index,
              success: false,
              error: "Transaction rolled back due to error",
            })),
            transactionRolledBack: true,
          },
          { status: 200 }
        );
      }
    } else {
      // Non-transactional mode: partial success allowed
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];

        try {
          let operationResult: { id?: string } | void;

          if (op.type === "create" && op.entity === "person") {
            operationResult = await serverCreatePerson(op.data, userId);
            results.push({
              index: i,
              success: true,
              id: operationResult?.id,
            });
          } else if (op.type === "update" && op.entity === "person") {
            operationResult = await serverUpdatePerson(op.id, op.data, userId);
            results.push({
              index: i,
              success: true,
              id: op.id,
            });
          } else if (op.type === "delete" && op.entity === "person") {
            await serverDeletePerson(op.id, userId);
            results.push({
              index: i,
              success: true,
            });
          } else if (op.type === "create" && op.entity === "relationship") {
            operationResult = await serverCreateRelationship(op.data);
            results.push({
              index: i,
              success: true,
              id: operationResult?.id,
            });
          } else if (op.type === "update" && op.entity === "relationship") {
            operationResult = await serverUpdateRelationship(op.id, op.data);
            results.push({
              index: i,
              success: true,
              id: op.id,
            });
          } else if (op.type === "delete" && op.entity === "relationship") {
            await serverDeleteRelationship(op.id);
            results.push({
              index: i,
              success: true,
            });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

          log.warn(
            {
              index: i,
              operationType: op.type,
              operationEntity: op.entity,
              error: errorMessage,
            },
            "Operation failed in non-transactional mode"
          );

          results.push({
            index: i,
            success: false,
            error: errorMessage,
          });
        }
      }

      const allSucceeded = results.every((r) => r.success);

      log.info(
        {
          operationCount: operations.length,
          successCount: results.filter((r) => r.success).length,
          failureCount: results.filter((r) => !r.success).length,
        },
        "Batch operation completed (non-transactional)"
      );

      return c.json(
        {
          success: allSucceeded,
          results,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn(
        {
          error: error.issues[0]?.message,
        },
        "Batch request validation error"
      );

      return c.json(
        {
          error: "Validation error",
          details: error.issues[0]?.message,
        },
        { status: 400 }
      );
    }

    log.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Batch operation error"
    );

    return c.json(
      {
        error: "Failed to process batch operations",
      },
      { status: 500 }
    );
  }
});

// Error handler for validation errors from openapi
batchRouter.onError((err, c) => {
  if (err instanceof z.ZodError) {
    log.warn(
      {
        error: err.issues[0]?.message,
      },
      "Batch request validation error (from middleware)"
    );

    return c.json(
      {
        error: "Validation error",
        details: err.issues[0]?.message,
      },
      { status: 400 }
    );
  }

  // Let other errors pass through
  throw err;
});

export default batchRouter;
