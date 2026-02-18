/**
 * Integration Test Setup
 *
 * Uses the existing Drizzle database from @vamsa/api for integration tests.
 * Requires a running PostgreSQL test database.
 *
 * Setup:
 *   docker compose -f docker/docker-compose.local.yml --profile test up -d --wait
 *   bun run test:int
 *
 * Environment Variables:
 *   TEST_DATABASE_URL=postgresql://vamsa_test:vamsa_test_password@localhost:5433/vamsa_test
 */

import { drizzleDb, drizzleSchema, getDbDriver } from "@vamsa/api";
import { sql, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import path from "path";

// Override DATABASE_URL if TEST_DATABASE_URL is provided
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// Set default test database URL if not provided
if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://vamsa_test:vamsa_test_password@localhost:5433/vamsa_test";
}

/**
 * Initialize test database with migrations
 * Called automatically on module load
 */
async function initializeTestDatabase(): Promise<void> {
  try {
    const driver = getDbDriver();
    const migrationsDir = driver === "sqlite" ? "drizzle-sqlite" : "drizzle";
    const migrationsPath = path.resolve(
      import.meta.dir,
      "../../..",
      `packages/api/${migrationsDir}`
    );

    if (driver === "sqlite") {
      const { migrate: sqliteMigrate } =
        await import("drizzle-orm/bun-sqlite/migrator");
      await sqliteMigrate(drizzleDb as Parameters<typeof sqliteMigrate>[0], {
        migrationsFolder: migrationsPath,
      });
    } else {
      const { migrate: pgMigrate } =
        await import("drizzle-orm/node-postgres/migrator");
      await pgMigrate(drizzleDb, {
        migrationsFolder: migrationsPath,
      });
    }
  } catch (error) {
    // Migrations may already be applied or table structure may differ
    // Log but don't fail - the schema might already exist
    if (error instanceof Error) {
      console.debug(`Migration note: ${error.message}`);
    }
  }
}

// Initialize database on module load
await initializeTestDatabase();

export const testDb = {
  db: drizzleDb,
  schema: drizzleSchema,
};

/**
 * Clean up all test data from the database
 * Call in beforeEach() to ensure test isolation
 */
export async function cleanupTestData(): Promise<void> {
  const db = drizzleDb;
  const driver = getDbDriver();

  // Tables ordered by dependency: children first, parents last
  const tables = [
    "PersonMedia",
    "EventMedia",
    "MediaObject",
    "EventParticipant",
    "EventSource",
    "Event",
    "Relationship",
    "PlacePersonLink",
    "ResearchNote",
    "Suggestion",
    "Invite",
    "AuditLog",
    "EmailLog",
    "Source",
    "Person",
    "Place",
    "CalendarToken",
    "DashboardPreferences",
    "DeviceToken",
    "Notification",
    "Session",
    "Account",
    "Verification",
    "User",
  ];

  if (driver === "sqlite") {
    // SQLite: ordered DELETE FROM (no CASCADE support on TRUNCATE)
    for (const table of tables) {
      await db.execute(sql.raw(`DELETE FROM "${table}"`));
    }
  } else {
    // PostgreSQL: TRUNCATE with CASCADE for speed
    for (const table of tables) {
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
    }
  }
}

/**
 * Seed minimal test data for integration tests
 * Creates an admin user and returns it for use in tests
 */
export async function seedTestData(): Promise<{
  adminUser: typeof drizzleSchema.users.$inferSelect;
  testPerson: typeof drizzleSchema.persons.$inferSelect;
}> {
  const db = drizzleDb;

  // Create admin user
  const [adminUser] = await db
    .insert(drizzleSchema.users)
    .values({
      id: randomUUID(),
      email: `admin+${randomUUID()}@test.local`,
      name: "Test Admin",
      role: "ADMIN",
      emailVerified: true,
      updatedAt: new Date(),
    })
    .returning();

  if (!adminUser) {
    throw new Error("Failed to create admin user");
  }

  // Create test person
  const [testPerson] = await db
    .insert(drizzleSchema.persons)
    .values({
      id: randomUUID(),
      firstName: "Test",
      lastName: "Person",
      isLiving: true,
      createdById: adminUser.id,
      updatedAt: new Date(),
    })
    .returning();

  if (!testPerson) {
    throw new Error("Failed to create test person");
  }

  return { adminUser, testPerson };
}

/**
 * Create a test user with a specific role
 */
export async function createTestUser(
  role: "ADMIN" | "MEMBER" | "GUEST" = "MEMBER"
): Promise<typeof drizzleSchema.users.$inferSelect> {
  const db = drizzleDb;

  const [user] = await db
    .insert(drizzleSchema.users)
    .values({
      id: randomUUID(),
      email: `user+${randomUUID()}@test.local`,
      name: "Test User",
      role,
      emailVerified: true,
      updatedAt: new Date(),
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create test user");
  }

  return user;
}

/**
 * Create test persons with relationships
 */
export async function createTestPersonWithRelatives(
  creatorId: string
): Promise<{
  parent1: typeof drizzleSchema.persons.$inferSelect;
  parent2: typeof drizzleSchema.persons.$inferSelect;
  child: typeof drizzleSchema.persons.$inferSelect;
}> {
  const db = drizzleDb;

  // Create two parents
  const [parent1] = await db
    .insert(drizzleSchema.persons)
    .values({
      id: randomUUID(),
      firstName: "John",
      lastName: "Doe",
      gender: "MALE",
      isLiving: true,
      createdById: creatorId,
      updatedAt: new Date(),
    })
    .returning();

  const [parent2] = await db
    .insert(drizzleSchema.persons)
    .values({
      id: randomUUID(),
      firstName: "Jane",
      lastName: "Doe",
      gender: "FEMALE",
      isLiving: true,
      createdById: creatorId,
      updatedAt: new Date(),
    })
    .returning();

  // Create a child
  const [child] = await db
    .insert(drizzleSchema.persons)
    .values({
      id: randomUUID(),
      firstName: "Jack",
      lastName: "Doe",
      gender: "MALE",
      dateOfBirth: new Date("2000-01-01"),
      isLiving: true,
      createdById: creatorId,
      updatedAt: new Date(),
    })
    .returning();

  if (!parent1 || !parent2 || !child) {
    throw new Error("Failed to create test persons with relatives");
  }

  // Create relationships
  await db.insert(drizzleSchema.relationships).values([
    {
      id: randomUUID(),
      personFromId: parent1.id,
      personToId: child.id,
      relationshipType: "PARENT",
      createdById: creatorId,
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      personFromId: parent2.id,
      personToId: child.id,
      relationshipType: "PARENT",
      createdById: creatorId,
      updatedAt: new Date(),
    },
  ]);

  return { parent1, parent2, child };
}

/**
 * Helper to find a person by ID
 */
export async function findPersonById(
  id: string
): Promise<typeof drizzleSchema.persons.$inferSelect | undefined> {
  return testDb.db.query.persons.findFirst({
    where: eq(testDb.schema.persons.id, id),
  });
}

/**
 * Helper to find a user by ID
 */
export async function findUserById(
  id: string
): Promise<typeof drizzleSchema.users.$inferSelect | undefined> {
  return testDb.db.query.users.findFirst({
    where: eq(testDb.schema.users.id, id),
  });
}

/**
 * Helper to count relationships
 */
export async function countRelationships(): Promise<number> {
  const result = await testDb.db.execute(
    sql`SELECT COUNT(*) as count FROM relationships`
  );
  return (result[0] as { count: number }).count;
}

export { eq, sql, randomUUID };
