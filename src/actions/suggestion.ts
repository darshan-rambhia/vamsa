"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import {
  suggestionCreateSchema,
  suggestionReviewSchema,
  type SuggestionCreateInput,
  type SuggestionReviewInput,
} from "@/schemas/suggestion";
import type { Prisma } from "@prisma/client";

export async function getSuggestions(status?: "PENDING" | "APPROVED" | "REJECTED") {
  await requireAuth();

  const where = status ? { status } : {};

  return db.suggestion.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    include: {
      targetPerson: {
        select: { id: true, firstName: true, lastName: true },
      },
      submittedBy: {
        select: { id: true, name: true, email: true },
      },
      reviewedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function getSuggestion(id: string) {
  await requireAuth();

  return db.suggestion.findUnique({
    where: { id },
    include: {
      targetPerson: true,
      submittedBy: {
        select: { id: true, name: true, email: true },
      },
      reviewedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function createSuggestion(input: SuggestionCreateInput) {
  const user = await requireAuth();
  const validated = suggestionCreateSchema.parse(input);

  const suggestion = await db.suggestion.create({
    data: {
      type: validated.type,
      targetPersonId: validated.targetPersonId,
      suggestedData: validated.suggestedData as Prisma.InputJsonValue,
      reason: validated.reason,
      submittedById: user.id,
    },
  });

  revalidatePath("/suggestions");
  revalidatePath("/admin/suggestions");

  return { success: true, suggestion };
}

export async function reviewSuggestion(
  id: string,
  input: SuggestionReviewInput
) {
  const user = await requireAdmin();
  const validated = suggestionReviewSchema.parse(input);

  const suggestion = await db.suggestion.findUnique({
    where: { id },
  });

  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  if (suggestion.status !== "PENDING") {
    throw new Error("Suggestion has already been reviewed");
  }

  if (validated.status === "APPROVED") {
    await applySuggestion(suggestion);
  }

  await db.suggestion.update({
    where: { id },
    data: {
      status: validated.status,
      reviewedById: user.id,
      reviewNote: validated.reviewNote,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/suggestions");
  revalidatePath("/admin/suggestions");
  revalidatePath("/people");
  revalidatePath("/tree");

  return { success: true };
}

async function applySuggestion(suggestion: {
  type: string;
  targetPersonId: string | null;
  suggestedData: unknown;
}) {
  const data = suggestion.suggestedData as Record<string, unknown>;

  switch (suggestion.type) {
    case "CREATE":
      await db.person.create({ data: data as Parameters<typeof db.person.create>[0]["data"] });
      break;

    case "UPDATE":
      if (!suggestion.targetPersonId) {
        throw new Error("Target person required for update");
      }
      await db.person.update({
        where: { id: suggestion.targetPersonId },
        data: data as Parameters<typeof db.person.update>[0]["data"],
      });
      break;

    case "DELETE":
      if (!suggestion.targetPersonId) {
        throw new Error("Target person required for delete");
      }
      await db.person.delete({
        where: { id: suggestion.targetPersonId },
      });
      break;

    case "ADD_RELATIONSHIP":
      await db.relationship.create({
        data: data as Parameters<typeof db.relationship.create>[0]["data"],
      });
      break;
  }
}

export async function getPendingSuggestionsCount() {
  return db.suggestion.count({
    where: { status: "PENDING" },
  });
}
