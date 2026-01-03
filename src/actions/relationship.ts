"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { toDateOnly } from "@/lib/utils";
import {
  relationshipCreateSchema,
  relationshipUpdateSchema,
  type RelationshipCreateInput,
  type RelationshipUpdateInput,
} from "@/schemas/relationship";
import type { RelationshipType } from "@prisma/client";

export async function getRelationships(personId: string) {
  return db.relationship.findMany({
    where: {
      OR: [{ personId }, { relatedPersonId: personId }],
    },
    include: {
      person: true,
      relatedPerson: true,
    },
  });
}

export async function createRelationship(input: RelationshipCreateInput) {
  await requireMember();
  const validated = relationshipCreateSchema.parse(input);

  if (validated.personId === validated.relatedPersonId) {
    throw new Error("Cannot create relationship with self");
  }

  const existing = await db.relationship.findFirst({
    where: {
      personId: validated.personId,
      relatedPersonId: validated.relatedPersonId,
      type: validated.type,
    },
  });

  if (existing) {
    throw new Error("Relationship already exists");
  }

  const relationship = await db.relationship.create({
    data: {
      ...validated,
      marriageDate: validated.marriageDate
        ? toDateOnly(validated.marriageDate)
        : null,
      divorceDate: validated.divorceDate
        ? toDateOnly(validated.divorceDate)
        : null,
    },
  });

  if (validated.type === "PARENT") {
    await db.relationship.create({
      data: {
        personId: validated.relatedPersonId,
        relatedPersonId: validated.personId,
        type: "CHILD",
      },
    });
  } else if (validated.type === "CHILD") {
    await db.relationship.create({
      data: {
        personId: validated.relatedPersonId,
        relatedPersonId: validated.personId,
        type: "PARENT",
      },
    });
  } else if (validated.type === "SPOUSE") {
    await db.relationship.create({
      data: {
        personId: validated.relatedPersonId,
        relatedPersonId: validated.personId,
        type: "SPOUSE",
        marriageDate: validated.marriageDate
          ? toDateOnly(validated.marriageDate)
          : null,
        divorceDate: validated.divorceDate
          ? toDateOnly(validated.divorceDate)
          : null,
        isActive: validated.isActive,
      },
    });
  } else if (validated.type === "SIBLING") {
    await db.relationship.create({
      data: {
        personId: validated.relatedPersonId,
        relatedPersonId: validated.personId,
        type: "SIBLING",
      },
    });
  }

  revalidatePath("/people");
  revalidatePath(`/people/${validated.personId}`);
  revalidatePath(`/people/${validated.relatedPersonId}`);
  revalidatePath("/tree");

  return { success: true, relationship };
}

export async function updateRelationship(
  id: string,
  input: RelationshipUpdateInput
) {
  await requireMember();
  const validated = relationshipUpdateSchema.parse(input);

  const relationship = await db.relationship.findUnique({ where: { id } });
  if (!relationship) {
    throw new Error("Relationship not found");
  }

  const updated = await db.relationship.update({
    where: { id },
    data: {
      marriageDate: validated.marriageDate
        ? toDateOnly(validated.marriageDate)
        : null,
      divorceDate: validated.divorceDate
        ? toDateOnly(validated.divorceDate)
        : null,
      isActive: validated.isActive,
    },
  });

  if (relationship.type === "SPOUSE") {
    await db.relationship.updateMany({
      where: {
        personId: relationship.relatedPersonId,
        relatedPersonId: relationship.personId,
        type: "SPOUSE",
      },
      data: {
        marriageDate: validated.marriageDate
          ? toDateOnly(validated.marriageDate)
          : null,
        divorceDate: validated.divorceDate
          ? toDateOnly(validated.divorceDate)
          : null,
        isActive: validated.isActive,
      },
    });
  }

  revalidatePath("/people");
  revalidatePath(`/people/${relationship.personId}`);
  revalidatePath(`/people/${relationship.relatedPersonId}`);
  revalidatePath("/tree");

  return { success: true, relationship: updated };
}

export async function deleteRelationship(id: string) {
  await requireMember();

  const relationship = await db.relationship.findUnique({ where: { id } });
  if (!relationship) {
    throw new Error("Relationship not found");
  }

  await db.relationship.deleteMany({
    where: {
      OR: [
        { id },
        {
          personId: relationship.relatedPersonId,
          relatedPersonId: relationship.personId,
          type: getInverseType(relationship.type),
        },
      ],
    },
  });

  revalidatePath("/people");
  revalidatePath(`/people/${relationship.personId}`);
  revalidatePath(`/people/${relationship.relatedPersonId}`);
  revalidatePath("/tree");

  return { success: true };
}

function getInverseType(type: RelationshipType): RelationshipType {
  switch (type) {
    case "PARENT":
      return "CHILD";
    case "CHILD":
      return "PARENT";
    case "SPOUSE":
      return "SPOUSE";
    case "SIBLING":
      return "SIBLING";
  }
}
