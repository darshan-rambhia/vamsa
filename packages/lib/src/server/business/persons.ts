import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq, and, or, ilike, desc, asc, sql, SQL } from "drizzle-orm";
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
 * This module uses Drizzle ORM as the default database client.
 */
export type PersonDb = typeof drizzleDb;

/**
 * Log audit action using Drizzle
 * @param userId - User performing the action
 * @param action - Type of action (CREATE, UPDATE, DELETE)
 * @param entityId - ID of the person record
 * @param previousData - Previous state of the record (for UPDATE/DELETE)
 * @param newData - New state of the record (for CREATE/UPDATE)
 * @param db - Drizzle database instance
 */
export async function logAuditAction(
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  entityId: string,
  previousData?: unknown,
  newData?: unknown,
  db: PersonDb = drizzleDb
) {
  try {
    await db.insert(drizzleSchema.auditLogs).values({
      id: crypto.randomUUID(),
      userId,
      action,
      entityType: "Person",
      entityId,
      previousData: previousData as Record<string, unknown> | null,
      newData: newData as Record<string, unknown> | null,
    });
  } catch (error) {
    logger.error(
      { error: serializeError(error) },
      "Failed to log audit action"
    );
  }
}

/**
 * Build Drizzle where clause from search and filter parameters
 * @param search - Optional search string (searches firstName and lastName)
 * @param isLiving - Optional filter for living status
 * @returns Drizzle where condition
 */
export function buildPersonWhereClause(search?: string, isLiving?: boolean) {
  const conditions: SQL<unknown>[] = [];

  if (search) {
    conditions.push(
      or(
        ilike(drizzleSchema.persons.firstName, `%${search}%`),
        ilike(drizzleSchema.persons.lastName, `%${search}%`)
      )!
    );
  }

  if (isLiving !== undefined) {
    conditions.push(eq(drizzleSchema.persons.isLiving, isLiving));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
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
 * @param db - Drizzle database instance
 * @returns Paginated list of persons
 */
export async function listPersonsData(
  options: PersonListOptions,
  db: PersonDb = drizzleDb
): Promise<PersonListResult> {
  const start = Date.now();
  const { page, limit, sortBy, sortOrder, search, isLiving } = options;

  // Build where clause
  const where = buildPersonWhereClause(search, isLiving);

  // Get total count for pagination
  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(drizzleSchema.persons)
    .where(where);

  // Build order by clause
  const orderByConditions: SQL<unknown>[] = [];
  if (sortBy === "lastName") {
    orderByConditions.push(
      sortOrder === "asc"
        ? asc(drizzleSchema.persons.lastName)
        : desc(drizzleSchema.persons.lastName)
    );
    orderByConditions.push(
      sortOrder === "asc"
        ? asc(drizzleSchema.persons.firstName)
        : desc(drizzleSchema.persons.firstName)
    );
  } else if (sortBy === "firstName") {
    orderByConditions.push(
      sortOrder === "asc"
        ? asc(drizzleSchema.persons.firstName)
        : desc(drizzleSchema.persons.firstName)
    );
    orderByConditions.push(
      sortOrder === "asc"
        ? asc(drizzleSchema.persons.lastName)
        : desc(drizzleSchema.persons.lastName)
    );
  } else if (sortBy === "dateOfBirth") {
    orderByConditions.push(
      sortOrder === "asc"
        ? asc(drizzleSchema.persons.dateOfBirth)
        : desc(drizzleSchema.persons.dateOfBirth)
    );
  } else if (sortBy === "createdAt") {
    orderByConditions.push(
      sortOrder === "asc"
        ? asc(drizzleSchema.persons.createdAt)
        : desc(drizzleSchema.persons.createdAt)
    );
  }

  // Get paginated results
  const persons = await db
    .select()
    .from(drizzleSchema.persons)
    .where(where)
    .orderBy(...orderByConditions)
    .limit(limit)
    .offset((page - 1) * limit);

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
 * Internal type for relationship query result with nested relatedPerson
 */
interface RelationshipWithRelatedPerson {
  id: string;
  type: string;
  marriageDate: Date | null;
  divorceDate: Date | null;
  isActive: boolean;
  relatedPerson: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Internal type for person query result with relationships
 */
interface PersonWithRelationships {
  id: string;
  firstName: string;
  lastName: string;
  maidenName: string | null;
  dateOfBirth: Date | null;
  dateOfPassing: Date | null;
  birthPlace: string | null;
  nativePlace: string | null;
  gender: string | null;
  photoUrl: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  currentAddress: unknown;
  workAddress: unknown;
  profession: string | null;
  employer: string | null;
  socialLinks: unknown;
  isLiving: boolean;
  createdAt: Date;
  updatedAt: Date;
  relationshipsFrom: RelationshipWithRelatedPerson[];
}

/**
 * Retrieve a single person by ID with all relationships
 * @param personId - ID of the person to retrieve
 * @param db - Drizzle database instance
 * @returns Person detail with relationships
 * @throws Error if person not found
 */
export async function getPersonData(
  personId: string,
  db: PersonDb = drizzleDb
): Promise<PersonDetail> {
  // Query person with relationships
  // Type assertion needed because drizzle's inferred type doesn't include the nested relation
  const person = (await db.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, personId),
    with: {
      relationshipsFrom: {
        with: { relatedPerson: true } as Record<string, boolean>,
      },
    },
  })) as unknown as PersonWithRelationships | undefined;

  if (!person) {
    throw new Error(await t("errors:person.notFound"));
  }

  // Build relationships list
  // Only use relationshipsFrom to avoid duplicates since relationships are stored bidirectionally
  const relationships = (person.relationshipsFrom || []).map(
    (r: RelationshipWithRelatedPerson) => ({
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
    })
  );

  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    maidenName: person.maidenName,
    dateOfBirth: person.dateOfBirth?.toISOString().split("T")[0] ?? null,
    dateOfPassing: person.dateOfPassing?.toISOString().split("T")[0] ?? null,
    birthPlace: person.birthPlace,
    nativePlace: person.nativePlace,
    gender: person.gender as Gender | null,
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
 * @param db - Drizzle database instance
 * @returns Created person ID
 */
export async function createPersonData(
  data: PersonCreateInput,
  userId: string,
  db: PersonDb = drizzleDb
): Promise<PersonCreateResult> {
  const personId = crypto.randomUUID();

  const [person] = await db
    .insert(drizzleSchema.persons)
    .values({
      id: personId,
      firstName: data.firstName,
      lastName: data.lastName,
      maidenName: data.maidenName || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      dateOfPassing: data.dateOfPassing ? new Date(data.dateOfPassing) : null,
      birthPlace: data.birthPlace || null,
      nativePlace: data.nativePlace || null,
      gender: data.gender || null,
      photoUrl: null,
      bio: data.bio || null,
      email: data.email || null,
      phone: data.phone || null,
      currentAddress: data.currentAddress ?? null,
      workAddress: data.workAddress ?? null,
      profession: data.profession || null,
      employer: data.employer || null,
      socialLinks: data.socialLinks ?? null,
      isLiving: data.isLiving ?? true,
      createdById: userId,
      updatedAt: new Date(),
    })
    .returning();

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
 * @param db - Drizzle database instance
 * @returns Updated person ID
 * @throws Error if person not found or user lacks permission
 */
export async function updatePersonData(
  personId: string,
  data: PersonUpdateInput,
  userId: string,
  linkedUserId?: string,
  db: PersonDb = drizzleDb
): Promise<PersonUpdateResult> {
  // Get existing person with user relationship
  const existing = await db.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, personId),
  });

  if (!existing) {
    throw new Error(await t("errors:person.notFound"));
  }

  // Get linked user if not provided
  let linkedUserIdForCheck = linkedUserId;
  if (!linkedUserIdForCheck) {
    const linkedUser = await db.query.users.findFirst({
      where: eq(drizzleSchema.users.personId, personId),
    });
    linkedUserIdForCheck = linkedUser?.id;
  }

  // Permission check: check if person already linked to a user
  if (linkedUserIdForCheck) {
    const user = await db.query.users.findFirst({
      where: eq(drizzleSchema.users.id, userId),
    });

    const isOwnProfile = linkedUserIdForCheck === userId;
    const isAdmin = user?.role === "ADMIN";

    if (!isOwnProfile && !isAdmin) {
      throw new Error(await t("errors:person.cannotEdit"));
    }
  }

  // Build update data, handling dates and JSON fields specially
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.dateOfBirth !== undefined) {
    updateData.dateOfBirth = data.dateOfBirth
      ? new Date(data.dateOfBirth)
      : null;
  }

  if (data.dateOfPassing !== undefined) {
    updateData.dateOfPassing = data.dateOfPassing
      ? new Date(data.dateOfPassing)
      : null;
  }

  // Add other fields, excluding date and JSON fields that need special handling
  for (const [key, value] of Object.entries(data)) {
    if (
      key !== "dateOfBirth" &&
      key !== "dateOfPassing" &&
      key !== "currentAddress" &&
      key !== "workAddress" &&
      key !== "socialLinks"
    ) {
      updateData[key] = value;
    }
  }

  // Handle JSON fields with proper null handling
  if ("currentAddress" in data) {
    updateData.currentAddress = data.currentAddress ?? null;
  }
  if ("workAddress" in data) {
    updateData.workAddress = data.workAddress ?? null;
  }
  if ("socialLinks" in data) {
    updateData.socialLinks = data.socialLinks ?? null;
  }

  const [person] = await db
    .update(drizzleSchema.persons)
    .set(updateData)
    .where(eq(drizzleSchema.persons.id, personId))
    .returning();

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
 * @param db - Drizzle database instance
 * @returns Success status
 * @throws Error if person not found
 */
export async function deletePersonData(
  personId: string,
  userId: string,
  db: PersonDb = drizzleDb
): Promise<PersonDeleteResult> {
  const person = await db.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, personId),
  });

  if (!person) {
    throw new Error(await t("errors:person.notFound"));
  }

  await db
    .delete(drizzleSchema.persons)
    .where(eq(drizzleSchema.persons.id, personId));

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
 * @param db - Drizzle database instance
 * @returns List of matching persons (max 10 results)
 */
export async function searchPersonsData(
  query: string,
  excludeId?: string,
  db: PersonDb = drizzleDb
): Promise<PersonSearchResult[]> {
  const start = Date.now();

  const conditions: SQL<unknown>[] = [
    or(
      ilike(drizzleSchema.persons.firstName, `%${query}%`),
      ilike(drizzleSchema.persons.lastName, `%${query}%`)
    )!,
  ];

  if (excludeId) {
    conditions.push(sql`${drizzleSchema.persons.id} != ${excludeId}`);
  }

  const persons = await db
    .select()
    .from(drizzleSchema.persons)
    .where(and(...conditions))
    .orderBy(
      asc(drizzleSchema.persons.lastName),
      asc(drizzleSchema.persons.firstName)
    )
    .limit(10);

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
