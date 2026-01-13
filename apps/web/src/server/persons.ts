import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";
import type { Prisma } from "@vamsa/api";
import { logger, serializeError } from "@vamsa/lib/logger";
import { requireAuth } from "./middleware/require-auth";
import { createPaginationMeta } from "@vamsa/schemas";
import { t } from "./i18n";
import { recordSearchMetrics } from "../../server/metrics/application";

// Person list input schema with pagination, search, and filters
const personListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  sortBy: z
    .enum(["lastName", "firstName", "dateOfBirth", "createdAt"])
    .default("lastName"),
  isLiving: z.boolean().optional(),
});
type PersonListInput = z.infer<typeof personListInputSchema>;

// Audit log helper
async function logAuditAction(
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  entityId: string,
  previousData?: unknown,
  newData?: unknown
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: "Person",
        entityId,
        previousData: previousData as Prisma.InputJsonValue,
        newData: newData as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    logger.error(
      { error: serializeError(error) },
      "Failed to log audit action"
    );
  }
}

// Validation schemas
const createPersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  maidenName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfPassing: z.string().optional(),
  birthPlace: z.string().optional(),
  nativePlace: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  photoUrl: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  profession: z.string().optional(),
  employer: z.string().optional(),
  isLiving: z.boolean().default(true),
});

const updatePersonSchema = createPersonSchema.partial().extend({
  id: z.string(),
});

// List persons with pagination
export const listPersons = createServerFn({ method: "GET" })
  .inputValidator((data: Partial<PersonListInput>) => {
    return personListInputSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const start = Date.now();
    const { page, limit, sortBy, sortOrder, search, isLiving } = data;

    // Build where clause
    const where: Prisma.PersonWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isLiving !== undefined) {
      where.isLiving = isLiving;
    }

    // Build orderBy clause
    const orderBy: Prisma.PersonOrderByWithRelationInput[] = [];
    if (sortBy === "lastName") {
      orderBy.push({ lastName: sortOrder }, { firstName: sortOrder });
    } else if (sortBy === "firstName") {
      orderBy.push({ firstName: sortOrder }, { lastName: sortOrder });
    } else if (sortBy === "dateOfBirth") {
      orderBy.push({ dateOfBirth: sortOrder });
    } else if (sortBy === "createdAt") {
      orderBy.push({ createdAt: sortOrder });
    }

    // Get total count
    const total = await prisma.person.count({ where });

    // Get paginated results
    const persons = await prisma.person.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Record search metrics if search query was provided
    if (search) {
      const duration = Date.now() - start;
      recordSearchMetrics(search, total, duration, "person_list");
    }

    return {
      items: persons.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        maidenName: p.maidenName,
        dateOfBirth: p.dateOfBirth?.toISOString().split("T")[0] ?? null,
        dateOfPassing: p.dateOfPassing?.toISOString().split("T")[0] ?? null,
        birthPlace: p.birthPlace,
        nativePlace: p.nativePlace,
        gender: p.gender,
        photoUrl: p.photoUrl,
        bio: p.bio,
        email: p.email,
        phone: p.phone,
        profession: p.profession,
        employer: p.employer,
        isLiving: p.isLiving,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      pagination: createPaginationMeta(page, limit, total),
    };
  });

// Get a single person by ID
export const getPerson = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const person = await prisma.person.findUnique({
      where: { id: data.id },
      include: {
        relationshipsFrom: {
          include: { relatedPerson: true },
        },
      },
    });

    if (!person) {
      throw new Error(await t("errors:person.notFound"));
    }

    // Build relationships list
    // Only use relationshipsFrom to avoid duplicates since relationships are stored bidirectionally
    const relationships = person.relationshipsFrom.map((r) => ({
      id: r.id,
      type: r.type,
      marriageDate: r.marriageDate?.toISOString().split("T")[0] ?? null,
      divorceDate: r.divorceDate?.toISOString().split("T")[0] ?? null,
      isActive: r.isActive,
      relatedPerson: {
        id: r.relatedPerson.id,
        firstName: r.relatedPerson.firstName,
        lastName: r.relatedPerson.lastName,
      },
    }));

    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      maidenName: person.maidenName,
      dateOfBirth: person.dateOfBirth?.toISOString().split("T")[0] ?? null,
      dateOfPassing: person.dateOfPassing?.toISOString().split("T")[0] ?? null,
      birthPlace: person.birthPlace,
      nativePlace: person.nativePlace,
      gender: person.gender,
      photoUrl: person.photoUrl,
      bio: person.bio,
      email: person.email,
      phone: person.phone,
      currentAddress: person.currentAddress,
      workAddress: person.workAddress,
      profession: person.profession,
      employer: person.employer,
      socialLinks: person.socialLinks,
      isLiving: person.isLiving,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
      relationships,
    };
  });

// Create a new person
export const createPerson = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createPersonSchema>) => {
    return createPersonSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    const person = await prisma.person.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        maidenName: data.maidenName || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        dateOfPassing: data.dateOfPassing ? new Date(data.dateOfPassing) : null,
        birthPlace: data.birthPlace || null,
        nativePlace: data.nativePlace || null,
        gender: data.gender || null,
        photoUrl: data.photoUrl || null,
        bio: data.bio || null,
        email: data.email || null,
        phone: data.phone || null,
        profession: data.profession || null,
        employer: data.employer || null,
        isLiving: data.isLiving ?? true,
        createdById: user.id,
      },
    });

    await logAuditAction(user.id, "CREATE", person.id, null, data);

    return { id: person.id };
  });

// Update a person
export const updatePerson = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updatePersonSchema>) => {
    return updatePersonSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");
    const { id, ...updates } = data;

    // Get existing person
    const existing = await prisma.person.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      throw new Error(await t("errors:person.notFound"));
    }

    // Permission check: User can edit if they are an ADMIN or editing their own profile
    const linkedUser = await prisma.user.findUnique({
      where: { personId: id },
    });

    const isOwnProfile = linkedUser?.id === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwnProfile && !isAdmin) {
      throw new Error(await t("errors:person.cannotEdit"));
    }

    const person = await prisma.person.update({
      where: { id },
      data: {
        ...updates,
        dateOfBirth: updates.dateOfBirth
          ? new Date(updates.dateOfBirth)
          : undefined,
        dateOfPassing: updates.dateOfPassing
          ? new Date(updates.dateOfPassing)
          : undefined,
      },
    });

    await logAuditAction(user.id, "UPDATE", person.id, existing, updates);

    return { id: person.id };
  });

// Delete a person
export const deletePerson = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("ADMIN");

    const person = await prisma.person.findUnique({
      where: { id: data.id },
    });

    if (!person) {
      throw new Error(await t("errors:person.notFound"));
    }

    await prisma.person.delete({
      where: { id: data.id },
    });

    await logAuditAction(user.id, "DELETE", data.id, person, null);

    return { success: true };
  });

// Search persons
export const searchPersons = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string; excludeId?: string }) => data)
  .handler(async ({ data }) => {
    const start = Date.now();

    const persons = await prisma.person.findMany({
      where: {
        AND: [
          {
            OR: [
              { firstName: { contains: data.query, mode: "insensitive" } },
              { lastName: { contains: data.query, mode: "insensitive" } },
            ],
          },
          // Exclude the specified person if excludeId is provided
          ...(data.excludeId ? [{ id: { not: data.excludeId } }] : []),
        ],
      },
      take: 10,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    // Record metrics
    const duration = Date.now() - start;
    recordSearchMetrics(data.query, persons.length, duration, "person_name");

    return persons.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      photoUrl: p.photoUrl,
      isLiving: p.isLiving,
    }));
  });
