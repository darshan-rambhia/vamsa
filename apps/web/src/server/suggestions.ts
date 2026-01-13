import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";
import type { Prisma } from "@vamsa/api";
import {
  notifySuggestionCreated,
  notifySuggestionUpdated,
} from "./notifications";
import { requireAuth } from "./middleware/require-auth";
import { createPaginationMeta } from "@vamsa/schemas";

// Suggestion list input schema with pagination and status filter
const suggestionListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
type SuggestionListInput = z.infer<typeof suggestionListInputSchema>;

// Get suggestions with pagination
export const getSuggestions = createServerFn({ method: "GET" })
  .inputValidator((data: Partial<SuggestionListInput>) => {
    return suggestionListInputSchema.parse(data);
  })
  .handler(async ({ data }) => {
    await requireAuth();

    const { page, limit, sortOrder, status } = data;

    // Build where clause
    const where: Prisma.SuggestionWhereInput = {};
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.suggestion.count({ where });

    // Get paginated results
    const suggestions = await prisma.suggestion.findMany({
      where,
      orderBy: { submittedAt: sortOrder === "asc" ? "asc" : "desc" },
      skip: (page - 1) * limit,
      take: limit,
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

    return {
      items: suggestions.map((s) => ({
        id: s.id,
        type: s.type,
        targetPersonId: s.targetPersonId,
        suggestedData: s.suggestedData as {
          [key: string]: NonNullable<unknown>;
        },
        reason: s.reason,
        status: s.status,
        submittedAt: s.submittedAt.toISOString(),
        reviewedAt: s.reviewedAt?.toISOString() ?? null,
        reviewNote: s.reviewNote,
        targetPerson: s.targetPerson,
        submittedBy: s.submittedBy,
        reviewedBy: s.reviewedBy,
      })),
      pagination: createPaginationMeta(page, limit, total),
    };
  });

// Get pending suggestions count
export const getPendingSuggestionsCount = createServerFn({
  method: "GET",
}).handler(async () => {
  await requireAuth();

  return prisma.suggestion.count({
    where: { status: "PENDING" },
  });
});

// Create a suggestion
export const createSuggestion = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      type: "CREATE" | "UPDATE" | "DELETE" | "ADD_RELATIONSHIP";
      targetPersonId?: string | null;
      suggestedData: Prisma.JsonValue;
      reason?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const suggestion = await prisma.suggestion.create({
      data: {
        type: data.type,
        targetPersonId: data.targetPersonId ?? null,
        suggestedData: data.suggestedData ?? {},
        reason: data.reason,
        submittedById: user.id,
      },
    });

    // Send notification to admins about new suggestion
    await notifySuggestionCreated(suggestion.id);

    return {
      id: suggestion.id,
      type: suggestion.type,
      status: suggestion.status,
    };
  });

// Review a suggestion
export const reviewSuggestion = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      suggestionId: string;
      status: "APPROVED" | "REJECTED";
      reviewNote?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await requireAuth("ADMIN");

    const suggestion = await prisma.suggestion.findUnique({
      where: { id: data.suggestionId },
    });

    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    if (suggestion.status !== "PENDING") {
      throw new Error("Suggestion has already been reviewed");
    }

    // If approving, apply the suggestion
    if (data.status === "APPROVED") {
      await applySuggestion(suggestion);
    }

    // Update the suggestion
    await prisma.suggestion.update({
      where: { id: data.suggestionId },
      data: {
        status: data.status,
        reviewedById: user.id,
        reviewNote: data.reviewNote,
        reviewedAt: new Date(),
      },
    });

    // Send notification to submitter about review outcome
    await notifySuggestionUpdated(data.suggestionId, data.status);

    return { success: true };
  });

// Apply a suggestion (internal helper)
async function applySuggestion(suggestion: {
  type: string;
  targetPersonId: string | null;
  suggestedData: Prisma.JsonValue;
}) {
  const data = suggestion.suggestedData as Record<string, unknown>;

  switch (suggestion.type) {
    case "CREATE":
      await prisma.person.create({
        data: data as Parameters<typeof prisma.person.create>[0]["data"],
      });
      break;

    case "UPDATE":
      if (!suggestion.targetPersonId) {
        throw new Error("Target person required for update");
      }
      await prisma.person.update({
        where: { id: suggestion.targetPersonId },
        data: data as Parameters<typeof prisma.person.update>[0]["data"],
      });
      break;

    case "DELETE":
      if (!suggestion.targetPersonId) {
        throw new Error("Target person required for delete");
      }
      await prisma.person.delete({
        where: { id: suggestion.targetPersonId },
      });
      break;

    case "ADD_RELATIONSHIP":
      await prisma.relationship.create({
        data: data as Parameters<typeof prisma.relationship.create>[0]["data"],
      });
      break;
  }
}
