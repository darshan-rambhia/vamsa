import { Hono } from "hono";
import { z } from "zod";
import {
  getRelationships as serverGetRelationships,
  createRelationship as serverCreateRelationship,
  updateRelationship as serverUpdateRelationship,
  deleteRelationship as serverDeleteRelationship,
} from "../../src/server/relationships";
import { logger } from "@vamsa/lib/logger";

const relationshipsRouter = new Hono();

// Validation schemas
const relationshipTypeEnum = z.enum(["PARENT", "CHILD", "SPOUSE", "SIBLING"]);

const createRelationshipSchema = z.object({
  personId: z.string().min(1, "Person ID is required"),
  relatedPersonId: z.string().min(1, "Related person ID is required"),
  type: relationshipTypeEnum,
  marriageDate: z.string().optional(),
  divorceDate: z.string().optional(),
});

const updateRelationshipSchema = z.object({
  marriageDate: z.string().optional().nullable(),
  divorceDate: z.string().optional().nullable(),
});

/**
 * GET /api/v1/relationships
 * List relationships with optional filtering
 */
relationshipsRouter.get("/", async (c) => {
  try {
    const personId = c.req.query("personId");
    const type = c.req.query("type") as
      | "PARENT"
      | "CHILD"
      | "SPOUSE"
      | "SIBLING"
      | undefined;
    const page = Number(c.req.query("page")) || 1;
    const limit = Number(c.req.query("limit")) || 50;

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

    // If personId is provided, get relationships for that person
    if (personId) {
      const result = await serverGetRelationships({ data: { personId } });

      // Filter by type if provided
      let items = result || [];
      if (type) {
        items = items.filter((r) => r.type === type);
      }

      // Simple pagination of results
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
        { status: 200 }
      );
    }

    // If no personId, return empty list
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
      { status: 200 }
    );
  } catch (error) {
    logger.error({ error }, "Error listing relationships");
    return c.json({ error: "Failed to list relationships" }, { status: 500 });
  }
});

/**
 * POST /api/v1/relationships
 * Create a new relationship
 */
relationshipsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const data = createRelationshipSchema.parse(body);

    // Use server function
    const result = await serverCreateRelationship({ data });

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

    if (error instanceof Error) {
      // Check for specific error messages
      if (error.message.includes("self")) {
        return c.json(
          { error: "Cannot create relationship with self" },
          { status: 400 }
        );
      }

      if (error.message.includes("already exists")) {
        return c.json(
          { error: "This relationship already exists" },
          { status: 400 }
        );
      }

      if (error.message.includes("Unauthorized")) {
        return c.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    logger.error({ error }, "Error creating relationship");
    return c.json({ error: "Failed to create relationship" }, { status: 500 });
  }
});

/**
 * GET /api/v1/relationships/:id
 * Get a specific relationship by ID
 */
relationshipsRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Relationship ID is required" }, { status: 400 });
    }

    // Note: getRelationship endpoint doesn't exist in server functions
    // This endpoint would need additional implementation
    // For now, return a placeholder
    return c.json({ error: "Not implemented" }, { status: 501 });
  } catch (error) {
    logger.error({ error }, "Error getting relationship");
    return c.json({ error: "Failed to get relationship" }, { status: 500 });
  }
});

/**
 * PUT /api/v1/relationships/:id
 * Update a relationship
 */
relationshipsRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Relationship ID is required" }, { status: 400 });
    }

    const body = await c.req.json();
    const data = updateRelationshipSchema.parse(body);

    // Use server function
    const result = await serverUpdateRelationship({
      data: { id, ...data },
    });

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
      return c.json({ error: "Relationship not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.error({ error }, "Error updating relationship");
    return c.json({ error: "Failed to update relationship" }, { status: 500 });
  }
});

/**
 * DELETE /api/v1/relationships/:id
 * Delete a relationship
 */
relationshipsRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Relationship ID is required" }, { status: 400 });
    }

    // Use server function
    await serverDeleteRelationship({ data: { id } });

    return c.text("", 204);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Relationship not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.error({ error }, "Error deleting relationship");
    return c.json({ error: "Failed to delete relationship" }, { status: 500 });
  }
});

export default relationshipsRouter;
