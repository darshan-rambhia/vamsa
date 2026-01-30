import { createServerFn } from "@tanstack/react-start";
import { loggers } from "@vamsa/lib/logger";
import {
  relationshipCreateSchema,
  relationshipTypeEnum,
  relationshipUpdateSchema,
} from "@vamsa/schemas";
import { z } from "zod";
import { drizzleDb, drizzleSchema } from "@vamsa/lib/server";
import {
  createRelationshipData,
  deleteRelationshipData,
  getRelationshipData,
  listRelationshipsData,
  updateRelationshipData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type {
  RelationshipCreateInput,
  RelationshipUpdateInput,
} from "@vamsa/schemas";

const log = loggers.db;

/**
 * List relationships for a person.
 *
 * Server function that fetches all relationships for a specific person.
 * Optionally filters by relationship type.
 *
 * Method: GET
 * Input: { personId: string, type?: RelationshipType }
 * Output: Array of relationships with related person information
 */
export const listRelationships = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string; type?: string }) => {
    const schema = z.object({
      personId: z.string().min(1),
      type: relationshipTypeEnum.optional(),
    });
    return schema.parse(data);
  })
  .handler(async ({ data }) => {
    try {
      const relationships = await listRelationshipsData(
        data.personId,
        data.type
      );
      return relationships;
    } catch (error) {
      log
        .withErr(error)
        .ctx({ personId: data.personId })
        .msg("listRelationships failed");
      throw error;
    }
  });

/**
 * Get a single relationship by ID.
 *
 * Server function that fetches a specific relationship with full details.
 *
 * Method: GET
 * Input: { id: string }
 * Output: Relationship with related person information
 */
export const getRelationship = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    const schema = z.object({
      id: z.string().min(1),
    });
    return schema.parse(data);
  })
  .handler(async ({ data }) => {
    try {
      const relationship = await getRelationshipData(data.id);
      return relationship;
    } catch (error) {
      log
        .withErr(error)
        .ctx({ relationshipId: data.id })
        .msg("getRelationship failed");
      throw error;
    }
  });

/**
 * Create a new relationship.
 *
 * Server function that creates a relationship with automatic bidirectional syncing.
 * Validates input using the relationshipCreateSchema from @vamsa/schemas.
 *
 * Requires MEMBER role.
 *
 * Method: POST
 * Input: RelationshipCreateInput
 * Output: { id: string }
 */
export const createRelationship = createServerFn({ method: "POST" })
  .inputValidator((data: RelationshipCreateInput) => {
    return relationshipCreateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    try {
      const result = await createRelationshipData(data);

      log.info(
        { relationshipId: result.id, createdBy: user.id, type: data.type },
        "Created relationship"
      );

      return result;
    } catch (error) {
      log
        .withErr(error)
        .ctx({ userId: user.id, input: data })
        .msg("createRelationship failed");
      throw error;
    }
  });

/**
 * Update a relationship.
 *
 * Server function that updates a relationship's dates.
 * For SPOUSE relationships, also syncs the inverse relationship.
 *
 * Requires MEMBER role.
 *
 * Method: POST
 * Input: RelationshipUpdateInput with id
 * Output: { id: string }
 */
export const updateRelationship = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string } & RelationshipUpdateInput) => {
    const schema = z
      .object({
        id: z.string().min(1),
      })
      .merge(relationshipUpdateSchema);

    return schema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    try {
      const { id, ...updateInput } = data;
      const result = await updateRelationshipData(id, updateInput);

      log.info(
        { relationshipId: id, updatedBy: user.id },
        "Updated relationship"
      );

      return result;
    } catch (error) {
      log
        .withErr(error)
        .ctx({ userId: user.id, relationshipId: data.id })
        .msg("updateRelationship failed");
      throw error;
    }
  });

/**
 * Delete a relationship.
 *
 * Server function that deletes a relationship and its inverse.
 * Maintains bidirectional consistency by also deleting the inverse relationship.
 *
 * Requires MEMBER role.
 *
 * Method: POST
 * Input: { id: string }
 * Output: { success: boolean }
 */
export const deleteRelationship = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    const schema = z.object({
      id: z.string().min(1),
    });
    return schema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    try {
      const result = await deleteRelationshipData(data.id);

      log.info(
        { relationshipId: data.id, deletedBy: user.id },
        "Deleted relationship"
      );

      return result;
    } catch (error) {
      log
        .withErr(error)
        .ctx({ userId: user.id, relationshipId: data.id })
        .msg("deleteRelationship failed");
      throw error;
    }
  });

/**
 * Get family tree data (legacy endpoint).
 *
 * Returns raw person and relationship data for family tree visualization.
 *
 * Method: GET
 * Input: none
 * Output: { nodes: Person[], edges: Relationship[] }
 */
export const getFamilyTree = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const [persons, relationships] = await Promise.all([
        drizzleDb.select().from(drizzleSchema.persons),
        drizzleDb.select().from(drizzleSchema.relationships),
      ]);

      return {
        nodes: persons.map((p: typeof drizzleSchema.persons.$inferSelect) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          dateOfBirth: p.dateOfBirth?.toISOString().split("T")[0] ?? null,
          dateOfPassing: p.dateOfPassing?.toISOString().split("T")[0] ?? null,
          isLiving: p.isLiving,
          photoUrl: p.photoUrl,
        })),
        edges: relationships.map(
          (r: typeof drizzleSchema.relationships.$inferSelect) => ({
            id: r.id,
            source: r.personId,
            target: r.relatedPersonId,
            type: r.type,
          })
        ),
      };
    } catch (error) {
      log.withErr(error).msg("getFamilyTree failed");
      throw error;
    }
  }
);
