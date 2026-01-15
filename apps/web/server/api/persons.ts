import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  personCreateSchema,
  errorResponseSchema,
  paginatedResponseSchema,
  successResponseSchema,
} from "@vamsa/schemas";
import {
  listPersons as serverListPersons,
  getPerson as serverGetPerson,
  createPerson as serverCreatePerson,
  updatePerson as serverUpdatePerson,
  deletePerson as serverDeletePerson,
} from "../../src/server/persons";
import { logger } from "@vamsa/lib/logger";

const personsRouter = new OpenAPIHono();

// Response schema for person
const personSchema = z
  .object({
    id: z.string().openapi({
      description: "Person ID",
      example: "person_123",
    }),
    firstName: z.string().openapi({
      description: "Person's first name",
      example: "John",
    }),
    lastName: z.string().openapi({
      description: "Person's last name",
      example: "Doe",
    }),
    maidenName: z.string().nullable().optional().openapi({
      description: "Person's maiden name if applicable",
      example: "Smith",
    }),
    dateOfBirth: z.string().nullable().optional().openapi({
      description: "Date of birth in ISO format",
      example: "1980-01-15",
    }),
    dateOfPassing: z.string().nullable().optional().openapi({
      description: "Date of death in ISO format",
      example: "2020-05-20",
    }),
    birthPlace: z.string().nullable().optional().openapi({
      description: "Place of birth",
      example: "New York, NY",
    }),
    gender: z.string().nullable().optional().openapi({
      description: "Person's gender",
      example: "MALE",
    }),
    bio: z.string().nullable().optional().openapi({
      description: "Person's biography",
      example: "A brief bio...",
    }),
    email: z.string().nullable().optional().openapi({
      description: "Email address",
      example: "john@example.com",
    }),
    phone: z.string().nullable().optional().openapi({
      description: "Phone number",
      example: "+1-555-0123",
    }),
    profession: z.string().nullable().optional().openapi({
      description: "Person's profession",
      example: "Engineer",
    }),
    isLiving: z.boolean().openapi({
      description: "Whether person is currently living",
      example: true,
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
  .openapi("Person");

const personUpdateSchema = personCreateSchema.partial();

/**
 * GET /api/v1/persons
 * List all persons with pagination and filtering
 */
const listPersonsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Persons"],
  summary: "List all persons",
  description: "Get paginated list of persons with optional filtering",
  operationId: "listPersons",
  request: {
    query: z
      .object({
        page: z.coerce.number().int().min(1).default(1).openapi({
          description: "Page number (1-indexed)",
          example: 1,
        }),
        limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
          description: "Items per page (max 100)",
          example: 50,
        }),
        search: z.string().optional().openapi({
          description: "Search term for name",
          example: "John",
        }),
        sortBy: z
          .enum(["lastName", "firstName", "dateOfBirth", "createdAt"])
          .default("lastName")
          .openapi({
            description: "Field to sort by",
            example: "lastName",
          }),
        sortOrder: z.enum(["asc", "desc"]).default("asc").openapi({
          description: "Sort order",
          example: "asc",
        }),
        isLiving: z.coerce.boolean().optional().openapi({
          description: "Filter by living status",
          example: true,
        }),
      })
      .openapi({
        description: "Query parameters for listing persons",
      }),
  },
  responses: {
    200: {
      description: "Persons list retrieved successfully",
      content: {
        "application/json": {
          schema: paginatedResponseSchema(personSchema),
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

personsRouter.openapi(listPersonsRoute, async (c) => {
  try {
    const { page, limit, search, sortBy, sortOrder, isLiving } =
      c.req.valid("query");

    if (page < 1 || limit < 1 || limit > 100) {
      return c.json(
        {
          error: "Invalid pagination parameters",
          details: "page must be >= 1, limit must be between 1 and 100",
        },
        { status: 400 }
      );
    }

    const result = await serverListPersons({
      data: {
        page,
        limit,
        search,
        sortBy: sortBy as
          | "lastName"
          | "firstName"
          | "dateOfBirth"
          | "createdAt",
        sortOrder: sortOrder as "asc" | "desc",
        isLiving,
      },
    });

    return c.json(result, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Error listing persons");
    return c.json({ error: "Failed to list persons" }, { status: 500 });
  }
});

/**
 * POST /api/v1/persons
 * Create a new person
 */
const createPersonRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Persons"],
  summary: "Create a new person",
  description: "Add a new person to the family tree",
  operationId: "createPerson",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: personCreateSchema.openapi({
            description: "Person creation data",
            example: {
              firstName: "John",
              lastName: "Doe",
              dateOfBirth: "1980-01-15",
              isLiving: true,
            },
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Person created successfully",
      content: {
        "application/json": {
          schema: personSchema,
        },
      },
    },
    400: {
      description: "Validation error",
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

personsRouter.openapi(createPersonRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const result = await serverCreatePerson({ data });
    return c.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.issues[0]?.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.error({ error }, "Error creating person");
    return c.json({ error: "Failed to create person" }, { status: 500 });
  }
});

/**
 * GET /api/v1/persons/:id
 * Get a specific person by ID
 */
const getPersonRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Persons"],
  summary: "Get a person by ID",
  description: "Retrieve a specific person's details",
  operationId: "getPerson",
  request: {
    params: z
      .object({
        id: z.string().openapi({
          description: "Person ID",
          example: "person_123",
        }),
      })
      .openapi({
        description: "Path parameters for person endpoint",
      }),
  },
  responses: {
    200: {
      description: "Person found",
      content: {
        "application/json": {
          schema: personSchema,
        },
      },
    },
    400: {
      description: "Invalid person ID",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Person not found",
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

personsRouter.openapi(getPersonRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");

    if (!id) {
      return c.json({ error: "Person ID is required" }, { status: 400 });
    }

    const result = await serverGetPerson({ data: { id } });

    if (!result) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    return c.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    logger.error({ error }, "Error getting person");
    return c.json({ error: "Failed to get person" }, { status: 500 });
  }
});

/**
 * PUT /api/v1/persons/:id
 * Update a person
 */
const updatePersonRoute = createRoute({
  method: "put",
  path: "/:id",
  tags: ["Persons"],
  summary: "Update a person",
  description: "Update person details",
  operationId: "updatePerson",
  request: {
    params: z
      .object({
        id: z.string().openapi({
          description: "Person ID",
          example: "person_123",
        }),
      })
      .openapi({
        description: "Path parameters for person endpoint",
      }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: personUpdateSchema.openapi({
            description: "Updated person data",
            example: {
              firstName: "Jane",
            },
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Person updated successfully",
      content: {
        "application/json": {
          schema: personSchema,
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
      description: "Person not found",
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

personsRouter.openapi(updatePersonRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");

    if (!id) {
      return c.json({ error: "Person ID is required" }, { status: 400 });
    }

    const data = c.req.valid("json");
    const result = await serverUpdatePerson({
      data: { id, ...data },
    });

    if (!result) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    return c.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.issues[0]?.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.error({ error }, "Error updating person");
    return c.json({ error: "Failed to update person" }, { status: 500 });
  }
});

/**
 * DELETE /api/v1/persons/:id
 * Delete a person
 */
const deletePersonRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Persons"],
  summary: "Delete a person",
  description: "Remove a person from the family tree",
  operationId: "deletePerson",
  request: {
    params: z
      .object({
        id: z.string().openapi({
          description: "Person ID",
          example: "person_123",
        }),
      })
      .openapi({
        description: "Path parameters for person endpoint",
      }),
  },
  responses: {
    204: {
      description: "Person deleted successfully",
    },
    400: {
      description: "Invalid person ID",
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
      description: "Person not found",
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

personsRouter.openapi(deletePersonRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");

    if (!id) {
      return c.json({ error: "Person ID is required" }, { status: 400 });
    }

    await serverDeletePerson({ data: { id } });

    return c.body(null, 204);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.error({ error }, "Error deleting person");
    return c.json({ error: "Failed to delete person" }, { status: 500 });
  }
});

export default personsRouter;
