import { Hono } from "hono";
import { z } from "zod";
import {
  listPersons as serverListPersons,
  getPerson as serverGetPerson,
  createPerson as serverCreatePerson,
  updatePerson as serverUpdatePerson,
  deletePerson as serverDeletePerson,
} from "../../src/server/persons";
import { logger } from "@vamsa/lib/logger";

const personsRouter = new Hono();

// Validation schemas
const personCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  maidenName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfPassing: z.string().optional(),
  birthPlace: z.string().optional(),
  nativePlace: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  bio: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  profession: z.string().optional(),
  employer: z.string().optional(),
  isLiving: z.boolean().default(true),
});

const personUpdateSchema = personCreateSchema.partial();

/**
 * GET /api/v1/persons
 * List all persons with pagination and filtering
 */
personsRouter.get("/", async (c) => {
  try {
    const page = Number(c.req.query("page")) || 1;
    const limit = Number(c.req.query("limit")) || 50;
    const search = c.req.query("search");
    const sortBy = c.req.query("sortBy") || "lastName";
    const sortOrder = c.req.query("sortOrder") || "asc";
    const isLiving =
      c.req.query("isLiving") === "true"
        ? true
        : c.req.query("isLiving") === "false"
          ? false
          : undefined;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return c.json(
        {
          error: "Invalid pagination parameters",
          details: "page must be >= 1, limit must be between 1 and 100",
        },
        { status: 400 }
      );
    }

    // Use server function
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
personsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const data = personCreateSchema.parse(body);

    // Use server function
    const result = await serverCreatePerson({ data });

    return c.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.errors[0]?.message,
        },
        { status: 400 }
      );
    }

    // Check for authentication error
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
personsRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Person ID is required" }, { status: 400 });
    }

    // Use server function
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
personsRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Person ID is required" }, { status: 400 });
    }

    const body = await c.req.json();
    const data = personUpdateSchema.parse(body);

    // Use server function
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
          details: error.errors[0]?.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    // Check for authentication error
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
personsRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Person ID is required" }, { status: 400 });
    }

    // Use server function
    await serverDeletePerson({ data: { id } });

    return c.text("", 204);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Person not found" }, { status: 404 });
    }

    // Check for authentication error
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.error({ error }, "Error deleting person");
    return c.json({ error: "Failed to delete person" }, { status: 500 });
  }
});

export default personsRouter;
