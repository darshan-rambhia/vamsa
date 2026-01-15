import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";
import { logger } from "@vamsa/lib/logger";
import { requireAuth } from "./middleware/require-auth";
import { recordRelationshipCalc } from "../../server/metrics/application";

const relationshipTypeSchema = z.enum(["PARENT", "CHILD", "SPOUSE", "SIBLING"]);

const createRelationshipSchema = z.object({
  personId: z.string(),
  relatedPersonId: z.string(),
  type: relationshipTypeSchema,
  marriageDate: z.string().optional(),
  divorceDate: z.string().optional(),
});

// Get relationships for a person
export const getRelationships = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }) => {
    // Only fetch relationships FROM this person to avoid duplicates
    // Since relationships are stored bidirectionally (A->B and B->A),
    // we only need to look at relationships where personId matches
    const relationships = await prisma.relationship.findMany({
      where: {
        personId: data.personId,
      },
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
        id: r.relatedPerson.id,
        firstName: r.relatedPerson.firstName,
        lastName: r.relatedPerson.lastName,
      },
    }));
  });

// Create a relationship
export const createRelationship = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createRelationshipSchema>) => {
    return createRelationshipSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    // Prevent self-relationship
    if (data.personId === data.relatedPersonId) {
      throw new Error("Cannot create relationship with self");
    }

    // Check for duplicate relationship
    const existing = await prisma.relationship.findFirst({
      where: {
        personId: data.personId,
        relatedPersonId: data.relatedPersonId,
        type: data.type,
      },
    });

    if (existing) {
      throw new Error("This relationship already exists");
    }

    // Set isActive based on divorceDate
    const isActive = !data.divorceDate;

    // Create the relationship
    const relationship = await prisma.relationship.create({
      data: {
        personId: data.personId,
        relatedPersonId: data.relatedPersonId,
        type: data.type,
        marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
        divorceDate: data.divorceDate ? new Date(data.divorceDate) : null,
        isActive,
      },
    });

    // Create reciprocal relationship for bidirectional types
    if (data.type === "SPOUSE" || data.type === "SIBLING") {
      await prisma.relationship.create({
        data: {
          personId: data.relatedPersonId,
          relatedPersonId: data.personId,
          type: data.type,
          marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
          divorceDate: data.divorceDate ? new Date(data.divorceDate) : null,
          isActive,
        },
      });
    } else if (data.type === "PARENT") {
      // If A is parent of B, then B is child of A
      await prisma.relationship.create({
        data: {
          personId: data.relatedPersonId,
          relatedPersonId: data.personId,
          type: "CHILD",
          isActive,
        },
      });
    } else if (data.type === "CHILD") {
      // If A is child of B, then B is parent of A
      await prisma.relationship.create({
        data: {
          personId: data.relatedPersonId,
          relatedPersonId: data.personId,
          type: "PARENT",
          isActive,
        },
      });
    }

    logger.info(
      { relationshipId: relationship.id, createdBy: user.id },
      "Created relationship"
    );

    return { id: relationship.id };
  });

const updateRelationshipSchema = z.object({
  id: z.string(),
  marriageDate: z.string().optional().nullable(),
  divorceDate: z.string().optional().nullable(),
});

// Update a relationship
export const updateRelationship = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updateRelationshipSchema>) => {
    return updateRelationshipSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    // Find the relationship
    const relationship = await prisma.relationship.findUnique({
      where: { id: data.id },
    });

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Determine isActive based on divorceDate
    const isActive = !data.divorceDate;

    // Update primary relationship
    const updated = await prisma.relationship.update({
      where: { id: data.id },
      data: {
        marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
        divorceDate: data.divorceDate ? new Date(data.divorceDate) : null,
        isActive,
      },
    });

    // BIDIRECTIONAL SYNC for SPOUSE type
    if (relationship.type === "SPOUSE") {
      await prisma.relationship.updateMany({
        where: {
          personId: relationship.relatedPersonId,
          relatedPersonId: relationship.personId,
          type: "SPOUSE",
        },
        data: {
          marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
          divorceDate: data.divorceDate ? new Date(data.divorceDate) : null,
          isActive,
        },
      });
    }

    logger.info(
      { relationshipId: data.id, updatedBy: user.id },
      "Updated relationship"
    );

    return { id: updated.id };
  });

// Delete a relationship
export const deleteRelationship = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    const relationship = await prisma.relationship.findUnique({
      where: { id: data.id },
    });

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Delete the relationship
    await prisma.relationship.delete({
      where: { id: data.id },
    });

    // Delete reciprocal relationship if it exists
    await prisma.relationship.deleteMany({
      where: {
        personId: relationship.relatedPersonId,
        relatedPersonId: relationship.personId,
        type:
          relationship.type === "PARENT"
            ? "CHILD"
            : relationship.type === "CHILD"
              ? "PARENT"
              : relationship.type,
      },
    });

    logger.info(
      { relationshipId: data.id, deletedBy: user.id },
      "Deleted relationship"
    );

    return { success: true };
  });

// Get family tree data (legacy - returns raw data)
export const getFamilyTree = createServerFn({ method: "GET" }).handler(
  async () => {
    const persons = await prisma.person.findMany();

    const relationships = await prisma.relationship.findMany();

    return {
      nodes: persons.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth?.toISOString().split("T")[0] ?? null,
        dateOfPassing: p.dateOfPassing?.toISOString().split("T")[0] ?? null,
        isLiving: p.isLiving,
        photoUrl: p.photoUrl,
      })),
      edges: relationships.map((r) => ({
        id: r.id,
        source: r.personId,
        target: r.relatedPersonId,
        type: r.type,
      })),
    };
  }
);
