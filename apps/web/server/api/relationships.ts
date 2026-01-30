/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  errorResponseSchema,
  paginatedResponseSchema,
  relationshipCreateSchema,
} from "@vamsa/schemas";
import {
  createRelationshipData as serverCreateRelationship,
  deleteRelationshipData as serverDeleteRelationship,
  listRelationshipsData as serverGetRelationships,
  updateRelationshipData as serverUpdateRelationship,
} from "@vamsa/lib/server/business";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.api;

const relationshipsRouter = new OpenAPIHono();

// Response schema for relationship
const relationshipSchema = z
  .object({
    id: z.string().openapi({
      description: "Relationship ID",
      example: "rel_123",
    }),
    personId: z.string().openapi({
      description: "Primary person ID",
      example: "person_123",
    }),
    relatedPersonId: z.string().openapi({
      description: "Related person ID",
      example: "person_456",
    }),
    type: z.enum(["PARENT", "CHILD", "SPOUSE", "SIBLING"]).openapi({
      description: "Type of relationship",
      example: "PARENT",
    }),
    marriageDate: z.string().nullable().optional().openapi({
      description: "Marriage date for SPOUSE relationships",
      example: "2010-06-15",
    }),
    divorceDate: z.string().nullable().optional().openapi({
      description: "Divorce date if applicable",
      example: "2015-03-20",
    }),
    createdAt: z.string().openapi({
      description: "Creation timestamp",
      example: "2024-01-14T10:00:00Z",
    }),
    updatedAt: z.string().openapi({
      description: "Last update timestamp",
      example: "2024-01-14T15:30:00Z",
    }),
  })
  .openapi("Relationship");

const relationshipUpdateSchema = z.object({
  marriageDate: z.string().optional().nullable().openapi({
    description: "Marriage date",
    example: "2010-06-15",
  }),
  divorceDate: z.string().optional().nullable().openapi({
    description: "Divorce date",
    example: "2015-03-20",
  }),
});

/**
 * GET /api/v1/relationships
 * List relationships with optional filtering
 */
const listRelationshipsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Relationships"],
  summary: "List relationships",
  description: "Get relationships for a person with optional filtering",
  operationId: "listRelationships",
  request: {
    query: z
      .object({
        personId: z.string().optional().openapi({
          description: "Filter by person ID",
          example: "person_123",
        }),
        type: z
          .enum(["PARENT", "CHILD", "SPOUSE", "SIBLING"])
          .optional()
          .openapi({
            description: "Filter by relationship type",
            example: "PARENT",
          }),
        page: z.coerce.number().int().min(1).default(1).openapi({
          description: "Page number (1-indexed)",
          example: 1,
        }),
        limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
          description: "Items per page (max 100)",
          example: 50,
        }),
      })
      .openapi({
        description: "Query parameters for listing relationships",
      }),
  },
  responses: {
    200: {
      description: "Relationships list retrieved successfully",
      content: {
        "application/json": {
          schema: paginatedResponseSchema(relationshipSchema),
        },
      },
    },
    400: {
      description: "Invalid pagination parameters",
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

// @ts-expect-error Hono's strict openapi handler typing doesn't support multiple status code returns; handler implementation is correct
relationshipsRouter.openapi(listRelationshipsRoute, async (c) => {
  try {
    const { personId, type, page, limit } = c.req.valid("query");

    if (page < 1 || limit < 1 || limit > 100) {
      return c.json(
        {
          error: "Invalid pagination parameters",
          details: "page must be >= 1, limit must be between 1 and 100",
        },
        { status: 400 as const }
      );
    }

    if (personId) {
      const result = await serverGetRelationships(personId, type);

      const items = result || [];

      const total = items.length;
      const start = (page - 1) * limit;
      const paginatedItems = items.slice(start, start + limit);

      return c.json(
        {
          items: paginatedItems,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        { status: 200 as const }
      );
    }

    return c.json(
      {
        items: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      },
      { status: 200 as const }
    );
  } catch (error) {
    log.withErr(error).msg("Error listing relationships");
    return c.json(
      { error: "Failed to list relationships" },
      { status: 500 as const }
    );
  }
});

/**
 * POST /api/v1/relationships
 * Create a new relationship
 */
const createRelationshipRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Relationships"],
  summary: "Create a new relationship",
  description: "Add a relationship between two persons",
  operationId: "createRelationship",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: relationshipCreateSchema.openapi({
            description: "Relationship creation data",
            example: {
              personId: "person_123",
              relatedPersonId: "person_456",
              type: "PARENT",
            },
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Relationship created successfully",
      content: {
        "application/json": {
          schema: relationshipSchema,
        },
      },
    },
    400: {
      description: "Validation error or invalid relationship",
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

relationshipsRouter.openapi(createRelationshipRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const result = await serverCreateRelationship(data);
    return c.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.issues[0]?.message,
        },
        { status: 400 }
      ) as any;
    }

    if (error instanceof Error) {
      if (error.message.includes("self")) {
        return c.json(
          { error: "Cannot create relationship with self" },
          { status: 400 }
        ) as any;
      }

      if (error.message.includes("already exists")) {
        return c.json(
          { error: "This relationship already exists" },
          { status: 400 }
        ) as any;
      }

      if (error.message.includes("Unauthorized")) {
        return c.json({ error: "Unauthorized" }, { status: 401 }) as any;
      }
    }

    log.withErr(error).msg("Error creating relationship");
    return c.json(
      { error: "Failed to create relationship" },
      { status: 500 }
    ) as any;
  }
}) as any;

/**
 * GET /api/v1/relationships/:id
 * Get a specific relationship by ID
 */
const getRelationshipRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Relationships"],
  summary: "Get a relationship by ID",
  description: "Retrieve a specific relationship's details",
  operationId: "getRelationship",
  request: {
    params: z
      .object({
        id: z.string().openapi({
          description: "Relationship ID",
          example: "rel_123",
        }),
      })
      .openapi({
        description: "Path parameters for relationship endpoint",
      }),
  },
  responses: {
    200: {
      description: "Relationship found",
      content: {
        "application/json": {
          schema: relationshipSchema,
        },
      },
    },
    400: {
      description: "Invalid relationship ID",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Relationship not found",
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
    501: {
      description:
        "Not Implemented - Get individual relationship not yet supported",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

relationshipsRouter.openapi(getRelationshipRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");

    if (!id) {
      return c.json({ error: "Relationship ID is required" }, { status: 400 });
    }

    return c.json({ error: "Not implemented" }, { status: 501 });
  } catch (error) {
    log.withErr(error).msg("Error getting relationship");
    return c.json({ error: "Failed to get relationship" }, { status: 500 });
  }
});

/**
 * PUT /api/v1/relationships/:id
 * Update a relationship
 */
const updateRelationshipRoute = createRoute({
  method: "put",
  path: "/:id",
  tags: ["Relationships"],
  summary: "Update a relationship",
  description: "Update relationship dates",
  operationId: "updateRelationship",
  request: {
    params: z
      .object({
        id: z.string().openapi({
          description: "Relationship ID",
          example: "rel_123",
        }),
      })
      .openapi({
        description: "Path parameters for relationship endpoint",
      }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: relationshipUpdateSchema.openapi({
            description: "Updated relationship data",
            example: {
              marriageDate: "2010-06-15",
            },
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Relationship updated successfully",
      content: {
        "application/json": {
          schema: relationshipSchema,
        },
      },
    },
    400: {
      description: "Validation error or invalid ID",
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
    404: {
      description: "Relationship not found",
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

relationshipsRouter.openapi(updateRelationshipRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");

    if (!id) {
      return c.json(
        { error: "Relationship ID is required" },
        { status: 400 }
      ) as any;
    }

    const data = c.req.valid("json");
    // Convert string dates to Date objects for database
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (
        (key === "marriageDate" || key === "divorceDate") &&
        typeof value === "string"
      ) {
        updateData[key] = new Date(value);
      } else {
        updateData[key] = value;
      }
    }

    const result = await serverUpdateRelationship(id, updateData as any);

    return c.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.issues[0]?.message,
        },
        { status: 400 }
      ) as any;
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return c.json(
        { error: "Relationship not found" },
        { status: 404 }
      ) as any;
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return c.json({ error: "Unauthorized" }, { status: 401 }) as any;
    }

    log.withErr(error).msg("Error updating relationship");
    return c.json(
      { error: "Failed to update relationship" },
      { status: 500 }
    ) as any;
  }
}) as any;

/**
 * DELETE /api/v1/relationships/:id
 * Delete a relationship
 */
const deleteRelationshipRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Relationships"],
  summary: "Delete a relationship",
  description: "Remove a relationship between two persons",
  operationId: "deleteRelationship",
  request: {
    params: z
      .object({
        id: z.string().openapi({
          description: "Relationship ID",
          example: "rel_123",
        }),
      })
      .openapi({
        description: "Path parameters for relationship endpoint",
      }),
  },
  responses: {
    204: {
      description: "Relationship deleted successfully",
    },
    400: {
      description: "Invalid relationship ID",
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
    404: {
      description: "Relationship not found",
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

relationshipsRouter.openapi(deleteRelationshipRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");

    if (!id) {
      return c.json({ error: "Relationship ID is required" }, { status: 400 });
    }

    await serverDeleteRelationship(id);

    return c.body(null, 204);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Relationship not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.withErr(error).msg("Error deleting relationship");
    return c.json({ error: "Failed to delete relationship" }, { status: 500 });
  }
});

export default relationshipsRouter;
