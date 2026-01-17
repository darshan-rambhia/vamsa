import { prisma as defaultPrisma } from "../db";
import type { Prisma, PrismaClient } from "@vamsa/api";
import { logger, serializeError } from "@vamsa/lib/logger";
import { createPaginationMeta } from "@vamsa/schemas";
import { t } from "../i18n";
import { recordSearchMetrics } from "../metrics";
import type {
  PersonCreateInput,
  PersonUpdateInput,
  Address,
  SocialLinks,
  Gender,
} from "@vamsa/schemas";

/**
 * Type for the database client used by person functions.
 * This allows dependency injection for testing.
 */
export type PersonDb = Pick<PrismaClient, "person" | "user" | "auditLog">;

/**
 * Audit log entry for Person entity mutations
 * @param userId - User performing the action
 * @param action - Type of action (CREATE, UPDATE, DELETE)
 * @param entityId - ID of the person record
 * @param previousData - Previous state of the record (for UPDATE/DELETE)
 * @param newData - New state of the record (for CREATE/UPDATE)
 */
export async function logAuditAction(
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  entityId: string,
  previousData?: unknown,
  newData?: unknown,
  db: PersonDb = defaultPrisma
) {
  try {
    await db.auditLog.create({
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

/**
 * Build Prisma where clause from search and filter parameters
 * @param search - Optional search string (searches firstName and lastName)
 * @param isLiving - Optional filter for living status
 * @returns Prisma PersonWhereInput clause
 */
export function buildPersonWhereClause(
  search?: string,
  isLiving?: boolean
): Prisma.PersonWhereInput {
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

  return where;
}

export interface PersonListOptions {
  page: number;
  limit: number;
  sortBy: "lastName" | "firstName" | "dateOfBirth" | "createdAt";
  sortOrder: "asc" | "desc";
  search?: string;
  isLiving?: boolean;
}

export interface PersonListResult {
  items: Array<{
    id: string;
    firstName: string;
    lastName: string;
    maidenName: string | null;
    dateOfBirth: string | null;
    dateOfPassing: string | null;
    birthPlace: string | null;
    nativePlace: string | null;
    gender: string | null;
    photoUrl: string | null;
    bio: string | null;
    email: string | null;
    phone: string | null;
    profession: string | null;
    employer: string | null;
    isLiving: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: ReturnType<typeof createPaginationMeta>;
}

/**
 * Query persons with pagination, filtering, and sorting
 * @param options - List options including page, limit, sorting, filtering
 * @returns Paginated list of persons
 */
export async function listPersonsData(
  options: PersonListOptions,
  db: PersonDb = defaultPrisma
): Promise<PersonListResult> {
  const start = Date.now();
  const { page, limit, sortBy, sortOrder, search, isLiving } = options;

  // Build where clause
  const where = buildPersonWhereClause(search, isLiving);

  // Build orderBy clause with multi-field sorting
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

  // Get total count for pagination
  const total = await db.person.count({ where });

  // Get paginated results
  const persons = await db.person.findMany({
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
}

export interface PersonDetail {
  id: string;
  firstName: string;
  lastName: string;
  maidenName: string | null;
  dateOfBirth: string | null;
  dateOfPassing: string | null;
  birthPlace: string | null;
  nativePlace: string | null;
  gender: Gender | null;
  photoUrl: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  currentAddress: Address | null;
  workAddress: Address | null;
  profession: string | null;
  employer: string | null;
  socialLinks: SocialLinks | null;
  isLiving: boolean;
  createdAt: string;
  updatedAt: string;
  relationships: Array<{
    id: string;
    type: string;
    marriageDate: string | null;
    divorceDate: string | null;
    isActive: boolean;
    relatedPerson: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

/**
 * Retrieve a single person by ID with all relationships
 * @param personId - ID of the person to retrieve
 * @returns Person detail with relationships
 * @throws Error if person not found
 */
export async function getPersonData(
  personId: string,
  db: PersonDb = defaultPrisma
): Promise<PersonDetail> {
  const person = await db.person.findUnique({
    where: { id: personId },
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
    currentAddress: (person.currentAddress ?? null) as Address | null,
    workAddress: (person.workAddress ?? null) as Address | null,
    profession: person.profession,
    employer: person.employer,
    socialLinks: (person.socialLinks ?? null) as SocialLinks | null,
    isLiving: person.isLiving,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
    relationships,
  };
}

export interface PersonCreateResult {
  id: string;
}

/**
 * Create a new person with audit trail
 * @param data - Person creation data
 * @param userId - ID of user creating the person
 * @returns Created person ID
 */
export async function createPersonData(
  data: PersonCreateInput,
  userId: string,
  db: PersonDb = defaultPrisma
): Promise<PersonCreateResult> {
  const person = await db.person.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      maidenName: data.maidenName || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      dateOfPassing: data.dateOfPassing ? new Date(data.dateOfPassing) : null,
      birthPlace: data.birthPlace || null,
      nativePlace: data.nativePlace || null,
      gender: data.gender || null,
      bio: data.bio || null,
      email: data.email || null,
      phone: data.phone || null,
      currentAddress: data.currentAddress ?? undefined,
      workAddress: data.workAddress ?? undefined,
      profession: data.profession || null,
      employer: data.employer || null,
      socialLinks: data.socialLinks ?? undefined,
      isLiving: data.isLiving ?? true,
      createdById: userId,
    },
  });

  await logAuditAction(userId, "CREATE", person.id, null, data, db);

  return { id: person.id };
}

export interface PersonUpdateResult {
  id: string;
}

/**
 * Update an existing person with audit trail
 * @param personId - ID of person to update
 * @param data - Partial person update data
 * @param userId - ID of user performing the update
 * @param linkedUserId - ID of user linked to this person (for permission check)
 * @returns Updated person ID
 * @throws Error if person not found or user lacks permission
 */
export async function updatePersonData(
  personId: string,
  data: PersonUpdateInput,
  userId: string,
  linkedUserId?: string,
  db: PersonDb = defaultPrisma
): Promise<PersonUpdateResult> {
  // Get existing person
  const existing = await db.person.findUnique({
    where: { id: personId },
    include: { user: true },
  });

  if (!existing) {
    throw new Error(await t("errors:person.notFound"));
  }

  // Get linked user if not provided
  let linkedUserIdForCheck = linkedUserId;
  if (!linkedUserIdForCheck) {
    const linkedUser = await db.user.findUnique({
      where: { personId },
    });
    linkedUserIdForCheck = linkedUser?.id;
  }

  // Permission check: check if person already linked to a user
  if (linkedUserIdForCheck) {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    const isOwnProfile = linkedUserIdForCheck === userId;
    const isAdmin = user?.role === "ADMIN";

    if (!isOwnProfile && !isAdmin) {
      throw new Error(await t("errors:person.cannotEdit"));
    }
  }

  // Build update data, handling dates and JSON fields specially
  const updateData: Prisma.PersonUpdateInput = {
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    dateOfPassing: data.dateOfPassing
      ? new Date(data.dateOfPassing)
      : undefined,
  };

  // Add other fields, excluding JSON fields that need special handling
  for (const [key, value] of Object.entries(data)) {
    if (
      key !== "dateOfBirth" &&
      key !== "dateOfPassing" &&
      key !== "currentAddress" &&
      key !== "workAddress" &&
      key !== "socialLinks"
    ) {
      (updateData as Record<string, unknown>)[key] = value;
    }
  }

  // Handle JSON fields with proper null handling
  if ("currentAddress" in data) {
    updateData.currentAddress = data.currentAddress ?? undefined;
  }
  if ("workAddress" in data) {
    updateData.workAddress = data.workAddress ?? undefined;
  }
  if ("socialLinks" in data) {
    updateData.socialLinks = data.socialLinks ?? undefined;
  }

  const person = await db.person.update({
    where: { id: personId },
    data: updateData,
  });

  await logAuditAction(userId, "UPDATE", person.id, existing, data, db);

  return { id: person.id };
}

export interface PersonDeleteResult {
  success: boolean;
}

/**
 * Delete a person (hard delete) with audit trail
 * @param personId - ID of person to delete
 * @param userId - ID of user performing the deletion
 * @returns Success status
 * @throws Error if person not found
 */
export async function deletePersonData(
  personId: string,
  userId: string,
  db: PersonDb = defaultPrisma
): Promise<PersonDeleteResult> {
  const person = await db.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new Error(await t("errors:person.notFound"));
  }

  await db.person.delete({
    where: { id: personId },
  });

  await logAuditAction(userId, "DELETE", personId, person, null, db);

  return { success: true };
}

export interface PersonSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  isLiving: boolean;
}

/**
 * Search persons by name with optional exclusion
 * @param query - Search query string
 * @param excludeId - Optional person ID to exclude from results
 * @returns List of matching persons (max 10 results)
 */
export async function searchPersonsData(
  query: string,
  excludeId?: string,
  db: PersonDb = defaultPrisma
): Promise<PersonSearchResult[]> {
  const start = Date.now();

  const persons = await db.person.findMany({
    where: {
      AND: [
        {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
        },
        // Exclude the specified person if excludeId is provided
        ...(excludeId ? [{ id: { not: excludeId } }] : []),
      ],
    },
    take: 10,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Record metrics
  const duration = Date.now() - start;
  recordSearchMetrics(query, persons.length, duration, "person_name");

  return persons.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    photoUrl: p.photoUrl,
    isLiving: p.isLiving,
  }));
}
