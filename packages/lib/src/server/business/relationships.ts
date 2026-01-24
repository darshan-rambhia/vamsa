import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq, and } from "drizzle-orm";
import { logger, serializeError } from "@vamsa/lib/logger";
import type {
  RelationshipCreateInput,
  RelationshipType,
  RelationshipUpdateInput,
} from "@vamsa/schemas";

/**
 * List relationships for a person with optional filtering.
 *
 * Only fetches relationships FROM the specified person to avoid duplicates,
 * since relationships are stored bidirectionally (A->B and B->A).
 *
 * @param personId - The ID of the person to get relationships for
 * @param type - Optional relationship type filter
 * @returns Array of relationships with related person information
 * @throws Error if person not found
 */
export async function listRelationshipsData(
  personId: string,
  type?: RelationshipType
) {
  try {
    const whereConditions = [eq(drizzleSchema.relationships.personId, personId)];
    if (type) {
      whereConditions.push(eq(drizzleSchema.relationships.type, type));
    }

    const relationships = await drizzleDb.query.relationships.findMany({
      where: whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0],
      with: {
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
 * @returns Relationship with related person information
 * @throws Error if relationship not found
 */
export async function getRelationshipData(relationshipId: string) {
  try {
    const relationship = await drizzleDb.query.relationships.findFirst({
      where: eq(drizzleSchema.relationships.id, relationshipId),
      with: {
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
 * @throws Error if inverse relationship cannot be created
 */
async function ensureBidirectional(
  personId: string,
  relatedPersonId: string,
  type: string,
  marriageDate: Date | null,
  divorceDate: Date | null,
  isActive: boolean
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
    await drizzleDb.insert(drizzleSchema.relationships).values({
      id: crypto.randomUUID(),
      personId: relatedPersonId,
      relatedPersonId: personId,
      type: inverseType as RelationshipType,
      marriageDate,
      divorceDate,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
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
 * @returns Created relationship ID
 * @throws Error if validation fails (self-relationship, duplicate, persons not found)
 */
export async function createRelationshipData(input: RelationshipCreateInput) {
  try {
    // Prevent self-relationship
    if (input.personId === input.relatedPersonId) {
      throw new Error("Cannot create relationship with self");
    }

    // Check that both persons exist
    const [person, relatedPerson] = await Promise.all([
      drizzleDb.query.persons.findFirst({
        where: eq(drizzleSchema.persons.id, input.personId),
      }),
      drizzleDb.query.persons.findFirst({
        where: eq(drizzleSchema.persons.id, input.relatedPersonId),
      }),
    ]);

    if (!person || !relatedPerson) {
      throw new Error("One or both persons not found");
    }

    // Check for duplicate relationship
    const existing = await drizzleDb.query.relationships.findFirst({
      where: and(
        eq(drizzleSchema.relationships.personId, input.personId),
        eq(drizzleSchema.relationships.relatedPersonId, input.relatedPersonId),
        eq(drizzleSchema.relationships.type, input.type)
      ),
    });

    if (existing) {
      throw new Error("This relationship already exists");
    }

    // Determine isActive based on divorceDate (only for SPOUSE type)
    const isActive = input.type === "SPOUSE" ? !input.divorceDate : true;

    const relationshipId = crypto.randomUUID();
    const now = new Date();

    // Create the primary relationship
    await drizzleDb.insert(drizzleSchema.relationships).values({
      id: relationshipId,
      personId: input.personId,
      relatedPersonId: input.relatedPersonId,
      type: input.type,
      marriageDate: input.marriageDate ? new Date(input.marriageDate) : null,
      divorceDate: input.divorceDate ? new Date(input.divorceDate) : null,
      isActive,
      createdAt: now,
      updatedAt: now,
    });

    // Create the bidirectional relationship
    await ensureBidirectional(
      input.personId,
      input.relatedPersonId,
      input.type,
      input.marriageDate ? new Date(input.marriageDate) : null,
      input.divorceDate ? new Date(input.divorceDate) : null,
      isActive
    );

    return { id: relationshipId };
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
 * @returns Updated relationship ID
 * @throws Error if relationship not found
 */
export async function updateRelationshipData(
  relationshipId: string,
  input: RelationshipUpdateInput
) {
  try {
    // Find the relationship
    const relationship = await drizzleDb.query.relationships.findFirst({
      where: eq(drizzleSchema.relationships.id, relationshipId),
    });

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Determine isActive based on divorceDate (for SPOUSE type only)
    const isActive =
      relationship.type === "SPOUSE" && input.divorceDate ? false : true;

    const now = new Date();

    // Update primary relationship
    await drizzleDb
      .update(drizzleSchema.relationships)
      .set({
        marriageDate: input.marriageDate ? new Date(input.marriageDate) : null,
        divorceDate: input.divorceDate ? new Date(input.divorceDate) : null,
        isActive,
        updatedAt: now,
      })
      .where(eq(drizzleSchema.relationships.id, relationshipId));

    // BIDIRECTIONAL SYNC for SPOUSE type
    if (relationship.type === "SPOUSE") {
      await drizzleDb
        .update(drizzleSchema.relationships)
        .set({
          marriageDate: input.marriageDate
            ? new Date(input.marriageDate)
            : null,
          divorceDate: input.divorceDate ? new Date(input.divorceDate) : null,
          isActive,
          updatedAt: now,
        })
        .where(
          and(
            eq(drizzleSchema.relationships.personId, relationship.relatedPersonId),
            eq(drizzleSchema.relationships.relatedPersonId, relationship.personId),
            eq(drizzleSchema.relationships.type, "SPOUSE")
          )
        );
    }

    return { id: relationshipId };
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
 * @throws Error if relationship not found
 */
export async function deleteRelationshipData(relationshipId: string) {
  try {
    const relationship = await drizzleDb.query.relationships.findFirst({
      where: eq(drizzleSchema.relationships.id, relationshipId),
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
    await drizzleDb
      .delete(drizzleSchema.relationships)
      .where(eq(drizzleSchema.relationships.id, relationshipId));

    // Delete the reciprocal relationship if it exists
    await drizzleDb
      .delete(drizzleSchema.relationships)
      .where(
        and(
          eq(drizzleSchema.relationships.personId, relationship.relatedPersonId),
          eq(drizzleSchema.relationships.relatedPersonId, relationship.personId),
          eq(drizzleSchema.relationships.type, inverseType)
        )
      );

    return { success: true };
  } catch (error) {
    logger.error(
      { relationshipId, error: serializeError(error) },
      "Failed to delete relationship"
    );
    throw error;
  }
}
