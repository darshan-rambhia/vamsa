import { prisma as defaultPrisma } from "../db";
import { logger, serializeError } from "@vamsa/lib/logger";
import type { Prisma, PrismaClient } from "@vamsa/api";
import type {
  RelationshipCreateInput,
  RelationshipType,
  RelationshipUpdateInput,
} from "@vamsa/schemas";

/**
 * Type for the database client used by relationship functions.
 * This allows dependency injection for testing.
 */
export type RelationshipDb = Pick<PrismaClient, "relationship" | "person">;

/**
 * List relationships for a person with optional filtering.
 *
 * Only fetches relationships FROM the specified person to avoid duplicates,
 * since relationships are stored bidirectionally (A->B and B->A).
 *
 * @param personId - The ID of the person to get relationships for
 * @param type - Optional relationship type filter
 * @param db - Optional database client (defaults to prisma)
 * @returns Array of relationships with related person information
 * @throws Error if person not found
 */
export async function listRelationshipsData(
  personId: string,
  type?: RelationshipType,
  db: RelationshipDb = defaultPrisma
) {
  try {
    const where: Prisma.RelationshipWhereInput = {
      personId,
    };

    if (type) {
      where.type = type;
    }

    const relationships = await db.relationship.findMany({
      where,
      include: {
        relatedPerson: true,
      },
    });

    return relationships.map((r) => ({
      id: r.id,
      type: r.type,
      isActive: r.isActive,
      marriageDate: r.marriageDate?.toISOString().split("T")[0] ?? null,
      divorceDate: r.divorceDate?.toISOString().split("T")[0] ?? null,
      relatedPerson: {
        id: r.relatedPersonId,
        firstName: r.relatedPerson.firstName,
        lastName: r.relatedPerson.lastName,
      },
    }));
  } catch (error) {
    logger.error(
      { personId, type, error: serializeError(error) },
      "Failed to list relationships"
    );
    throw error;
  }
}

/**
 * Get a single relationship by ID.
 *
 * @param relationshipId - The ID of the relationship
 * @param db - Optional database client (defaults to prisma)
 * @returns Relationship with related person information
 * @throws Error if relationship not found
 */
export async function getRelationshipData(
  relationshipId: string,
  db: RelationshipDb = defaultPrisma
) {
  try {
    const relationship = await db.relationship.findUnique({
      where: { id: relationshipId },
      include: {
        relatedPerson: true,
      },
    });

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    return {
      id: relationship.id,
      personId: relationship.personId,
      relatedPersonId: relationship.relatedPersonId,
      type: relationship.type,
      isActive: relationship.isActive,
      marriageDate:
        relationship.marriageDate?.toISOString().split("T")[0] ?? null,
      divorceDate:
        relationship.divorceDate?.toISOString().split("T")[0] ?? null,
      relatedPerson: {
        id: relationship.relatedPerson.id,
        firstName: relationship.relatedPerson.firstName,
        lastName: relationship.relatedPerson.lastName,
      },
    };
  } catch (error) {
    logger.error(
      { relationshipId, error: serializeError(error) },
      "Failed to get relationship"
    );
    throw error;
  }
}

/**
 * Helper function to create the inverse relationship for bidirectional types.
 *
 * For PARENT/CHILD types: A->B becomes B->A with inverted type
 * For SPOUSE/SIBLING types: A->B becomes B->A with same type
 *
 * @param personId - The person creating the relationship
 * @param relatedPersonId - The related person
 * @param type - The relationship type
 * @param marriageDate - Optional marriage date
 * @param divorceDate - Optional divorce date
 * @param isActive - Whether the relationship is active
 * @param db - Database client
 * @throws Error if inverse relationship cannot be created
 */
async function ensureBidirectional(
  personId: string,
  relatedPersonId: string,
  type: string,
  marriageDate: Date | null,
  divorceDate: Date | null,
  isActive: boolean,
  db: RelationshipDb
) {
  try {
    // Determine inverse type and target type
    let inverseType = type;

    if (type === "PARENT") {
      inverseType = "CHILD";
    } else if (type === "CHILD") {
      inverseType = "PARENT";
    }
    // SPOUSE and SIBLING are symmetric

    // Create the inverse relationship
    await db.relationship.create({
      data: {
        personId: relatedPersonId,
        relatedPersonId: personId,
        type: inverseType as RelationshipType,
        marriageDate,
        divorceDate,
        isActive,
      },
    });
  } catch (error) {
    logger.error(
      {
        personId,
        relatedPersonId,
        type,
        error: serializeError(error),
      },
      "Failed to ensure bidirectional relationship"
    );
    throw error;
  }
}

/**
 * Create a new relationship with bidirectional syncing.
 *
 * Automatically creates the inverse relationship based on the type:
 * - PARENT -> creates inverse CHILD relationship
 * - CHILD -> creates inverse PARENT relationship
 * - SPOUSE/SIBLING -> creates inverse with same type
 *
 * @param input - Relationship creation input with personId, relatedPersonId, type, and optional dates
 * @param db - Optional database client (defaults to prisma)
 * @returns Created relationship ID
 * @throws Error if validation fails (self-relationship, duplicate, persons not found)
 */
export async function createRelationshipData(
  input: RelationshipCreateInput,
  db: RelationshipDb = defaultPrisma
) {
  try {
    // Prevent self-relationship
    if (input.personId === input.relatedPersonId) {
      throw new Error("Cannot create relationship with self");
    }

    // Check that both persons exist
    const [person, relatedPerson] = await Promise.all([
      db.person.findUnique({ where: { id: input.personId } }),
      db.person.findUnique({ where: { id: input.relatedPersonId } }),
    ]);

    if (!person || !relatedPerson) {
      throw new Error("One or both persons not found");
    }

    // Check for duplicate relationship
    const existing = await db.relationship.findFirst({
      where: {
        personId: input.personId,
        relatedPersonId: input.relatedPersonId,
        type: input.type,
      },
    });

    if (existing) {
      throw new Error("This relationship already exists");
    }

    // Determine isActive based on divorceDate (only for SPOUSE type)
    const isActive = input.type === "SPOUSE" ? !input.divorceDate : true;

    // Create the primary relationship
    const relationship = await db.relationship.create({
      data: {
        personId: input.personId,
        relatedPersonId: input.relatedPersonId,
        type: input.type,
        marriageDate: input.marriageDate ? new Date(input.marriageDate) : null,
        divorceDate: input.divorceDate ? new Date(input.divorceDate) : null,
        isActive,
      },
    });

    // Create the bidirectional relationship
    await ensureBidirectional(
      input.personId,
      input.relatedPersonId,
      input.type,
      input.marriageDate ? new Date(input.marriageDate) : null,
      input.divorceDate ? new Date(input.divorceDate) : null,
      isActive,
      db
    );

    return { id: relationship.id };
  } catch (error) {
    logger.error(
      { input, error: serializeError(error) },
      "Failed to create relationship"
    );
    throw error;
  }
}

/**
 * Update a relationship with bidirectional syncing for SPOUSE relationships.
 *
 * For SPOUSE relationships, also updates the inverse relationship to keep dates synchronized.
 * For other types, only updates the specified relationship.
 *
 * @param relationshipId - The ID of the relationship to update
 * @param input - Update input with optional marriageDate and divorceDate
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated relationship ID
 * @throws Error if relationship not found
 */
export async function updateRelationshipData(
  relationshipId: string,
  input: RelationshipUpdateInput,
  db: RelationshipDb = defaultPrisma
) {
  try {
    // Find the relationship
    const relationship = await db.relationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Determine isActive based on divorceDate (for SPOUSE type only)
    const isActive =
      relationship.type === "SPOUSE" && input.divorceDate ? false : true;

    // Update primary relationship
    const updated = await db.relationship.update({
      where: { id: relationshipId },
      data: {
        marriageDate: input.marriageDate ? new Date(input.marriageDate) : null,
        divorceDate: input.divorceDate ? new Date(input.divorceDate) : null,
        isActive,
      },
    });

    // BIDIRECTIONAL SYNC for SPOUSE type
    if (relationship.type === "SPOUSE") {
      await db.relationship.updateMany({
        where: {
          personId: relationship.relatedPersonId,
          relatedPersonId: relationship.personId,
          type: "SPOUSE",
        },
        data: {
          marriageDate: input.marriageDate
            ? new Date(input.marriageDate)
            : null,
          divorceDate: input.divorceDate ? new Date(input.divorceDate) : null,
          isActive,
        },
      });
    }

    return { id: updated.id };
  } catch (error) {
    logger.error(
      { relationshipId, input, error: serializeError(error) },
      "Failed to update relationship"
    );
    throw error;
  }
}

/**
 * Delete a relationship with bidirectional cleanup.
 *
 * Also deletes the inverse relationship to maintain bidirectional consistency:
 * - PARENT relationships also delete their CHILD inverse
 * - CHILD relationships also delete their PARENT inverse
 * - SPOUSE/SIBLING relationships also delete their inverse with same type
 *
 * @param relationshipId - The ID of the relationship to delete
 * @param db - Optional database client (defaults to prisma)
 * @throws Error if relationship not found
 */
export async function deleteRelationshipData(
  relationshipId: string,
  db: RelationshipDb = defaultPrisma
) {
  try {
    const relationship = await db.relationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Determine the inverse type
    let inverseType = relationship.type as RelationshipType;

    if (relationship.type === "PARENT") {
      inverseType = "CHILD";
    } else if (relationship.type === "CHILD") {
      inverseType = "PARENT";
    }
    // SPOUSE and SIBLING are symmetric

    // Delete the primary relationship
    await db.relationship.delete({
      where: { id: relationshipId },
    });

    // Delete the reciprocal relationship if it exists
    await db.relationship.deleteMany({
      where: {
        personId: relationship.relatedPersonId,
        relatedPersonId: relationship.personId,
        type: inverseType,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error(
      { relationshipId, error: serializeError(error) },
      "Failed to delete relationship"
    );
    throw error;
  }
}
