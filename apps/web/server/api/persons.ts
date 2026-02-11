import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  cursorPaginatedResponseSchema,
  errorResponseSchema,
  personCreateSchema,
} from "@vamsa/schemas";
import {
  createPersonData as serverCreatePerson,
  deletePersonData as serverDeletePerson,
  getPersonData as serverGetPerson,
  listPersonsData as serverListPersons,
  updatePersonData as serverUpdatePerson,
} from "@vamsa/lib/server/business";
import { loggers } from "@vamsa/lib/logger";
import { paginateQuery } from "@vamsa/lib/server";

const log = loggers.api;

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

const personCreateResponseSchema = z
  .object({
    id: z.string().openapi({
      description: "Created person ID",
      example: "person_123",
    }),
  })
  .openapi("PersonCreateResponse");

const personUpdateSchema = personCreateSchema.partial();

/**
 * GET /api/v1/persons
 * List all persons with cursor-based pagination and filtering
 */
const listPersonsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Persons"],
  summary: "List all persons",
  description:
    "Get paginated list of persons with cursor-based pagination and optional filtering",
  operationId: "listPersons",
  request: {
    query: z
      .object({
        cursor: z.string().optional().openapi({
          description:
            "Cursor for the next page (from nextCursor in previous response)",
          example: "cGVyc29uXzEwMA==",
        }),
        limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
          description: "Items per page (max 100)",
          example: 20,
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
          schema: cursorPaginatedResponseSchema(personSchema),
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
    const { cursor, limit, search, sortBy, sortOrder, isLiving } =
      c.req.valid("query");

    if (limit < 1 || limit > 100) {
      return c.json(
        {
          error: "Invalid pagination parameters",
          details: "limit must be between 1 and 100",
        },
        { status: 400 }
      );
    }

    // Fetch all matching persons with filters (in production, this would use database query)
    const allPersons = await serverListPersons({
      page: 1,
      limit: 10000, // Fetch all for cursor pagination
      search,
      sortBy: sortBy,
      sortOrder: sortOrder,
      isLiving,
    });

    // Apply cursor-based pagination
    const paginated = paginateQuery(
      allPersons.items,
      limit,
      cursor,
      (item) => item.id
    );

    return c.json(paginated, { status: 200 });
  } catch (error) {
    log.withErr(error).msg("Error listing persons");
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
          schema: personCreateResponseSchema,
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
    const user = c.get("user");
    const userId = user.id;
    const result = await serverCreatePerson(data, userId);
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

    log.withErr(error).msg("Error creating person");
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

    const result = await serverGetPerson(id);

    if (!result) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    return c.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    log.withErr(error).msg("Error getting person");
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
          schema: personCreateResponseSchema,
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
    const user = c.get("user");
    const userId = user.id;
    const result = await serverUpdatePerson(id, data, userId);

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

    log.withErr(error).msg("Error updating person");
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

    const user = c.get("user");
    const userId = user.id;
    await serverDeletePerson(id, userId);

    return c.body(null, 204);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.withErr(error).msg("Error deleting person");
    return c.json({ error: "Failed to delete person" }, { status: 500 });
  }
});

export default personsRouter;
