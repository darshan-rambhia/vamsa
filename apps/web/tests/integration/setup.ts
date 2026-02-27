/**
 * Integration Test Setup
 *
 * Creates database connections for integration tests.
 * - SQLite: uses better-sqlite3 (works in Node.js / Vitest workers)
 * - PostgreSQL: uses pg + drizzle-orm/node-postgres
 *
 * Run:
 *   bun run test:int           # SQLite (default, no Docker needed)
 *   bun run test:int:postgres  # PostgreSQL (requires Docker test DB)
 *
 * Start test DB for Postgres:
 *   docker compose -f docker/docker-compose.local.yml --profile test up -d --wait
 */

import { sql, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import path from "path";

import type * as pgSchemaTypes from "../../../../packages/api/src/drizzle/schema/index";

// Override DATABASE_URL if TEST_DATABASE_URL is provided
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

/**
 * Detect the database driver from environment variables.
 * Mirrors the logic in @vamsa/api's getDbDriver().
 */
function getDriver(): "sqlite" | "postgres" {
  if (process.env.DB_DRIVER === "postgres") return "postgres";
  if (process.env.DB_DRIVER === "sqlite") return "sqlite";
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://"))
    return "postgres";
  return "sqlite";
}

const driver = getDriver();

// Mutable references set during initialization below
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any;
let _schema: typeof pgSchemaTypes;

if (driver === "sqlite") {
  const { default: Database } = await import("better-sqlite3");
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const sqliteSchema =
    await import("../../../../packages/api/src/drizzle/schema-sqlite/index");

  const dbPath = process.env.DATABASE_URL || ":memory:";
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema: sqliteSchema });
  _schema = sqliteSchema as unknown as typeof pgSchemaTypes;

  // Run SQLite migrations (synchronous in better-sqlite3)
  try {
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    const migrationsPath = path.resolve(
      import.meta.dirname,
      "../../../../packages/api/drizzle-sqlite"
    );
    migrate(_db, { migrationsFolder: migrationsPath });
  } catch (error) {
    if (error instanceof Error) {
      console.debug(`Migration note: ${error.message}`);
    }
  }
} else {
  // Set default test database URL if not provided
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      "postgresql://vamsa_test:vamsa_test@localhost:5433/vamsa_test";
  }

  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const pgSchema =
    await import("../../../../packages/api/src/drizzle/schema/index");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzle(pool, { schema: pgSchema });
  _schema = pgSchema;

  // Run PostgreSQL migrations
  try {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const migrationsPath = path.resolve(
      import.meta.dirname,
      "../../../../packages/api/drizzle"
    );
    await migrate(_db, { migrationsFolder: migrationsPath });
  } catch (error) {
    if (error instanceof Error) {
      console.debug(`Migration note: ${error.message}`);
    }
  }
}

export const testDb = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  db: _db,
  schema: _schema,
};

/**
 * Clean up all test data from the database
 * Call in beforeEach() to ensure test isolation
 */
export async function cleanupTestData(): Promise<void> {
  const db = _db;

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
    // drizzle/better-sqlite3 uses db.run() for DML without results
    for (const table of tables) {
      db.run(sql.raw(`DELETE FROM "${table}"`));
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
  adminUser: typeof pgSchemaTypes.users.$inferSelect;
  testPerson: typeof pgSchemaTypes.persons.$inferSelect;
}> {
  const db = _db;
  const schema = _schema;

  // Create admin user
  const [adminUser] = await db
    .insert(schema.users)
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
    .insert(schema.persons)
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
  role: "ADMIN" | "MEMBER" | "VIEWER" = "MEMBER"
): Promise<typeof pgSchemaTypes.users.$inferSelect> {
  const db = _db;
  const schema = _schema;

  const [user] = await db
    .insert(schema.users)
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
  parent1: typeof pgSchemaTypes.persons.$inferSelect;
  parent2: typeof pgSchemaTypes.persons.$inferSelect;
  child: typeof pgSchemaTypes.persons.$inferSelect;
}> {
  const db = _db;
  const schema = _schema;

  const [parent1] = await db
    .insert(schema.persons)
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
    .insert(schema.persons)
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

  const [child] = await db
    .insert(schema.persons)
    .values({
      id: randomUUID(),
      firstName: "Jack",
      lastName: "Doe",
      gender: "MALE",
      // Use ISO string — works for both Postgres date columns and SQLite text columns
      dateOfBirth: "2000-01-01",
      isLiving: true,
      createdById: creatorId,
      updatedAt: new Date(),
    })
    .returning();

  if (!parent1 || !parent2 || !child) {
    throw new Error("Failed to create test persons with relatives");
  }

  await db.insert(schema.relationships).values([
    {
      id: randomUUID(),
      personId: parent1.id,
      relatedPersonId: child.id,
      type: "PARENT",
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      personId: parent2.id,
      relatedPersonId: child.id,
      type: "PARENT",
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
): Promise<typeof pgSchemaTypes.persons.$inferSelect | undefined> {
  return testDb.db.query.persons.findFirst({
    where: eq(testDb.schema.persons.id, id),
  });
}

/**
 * Helper to find a user by ID
 */
export async function findUserById(
  id: string
): Promise<typeof pgSchemaTypes.users.$inferSelect | undefined> {
  return testDb.db.query.users.findFirst({
    where: eq(testDb.schema.users.id, id),
  });
}

/**
 * Helper to count relationships
 */
export async function countRelationships(): Promise<number> {
  if (driver === "sqlite") {
    // drizzle/better-sqlite3: db.all() for queries returning rows (synchronous)
    const rows = testDb.db.all(
      sql`SELECT COUNT(*) as count FROM "Relationship"`
    );
    return Number((rows as { count: unknown }[])[0]?.count ?? 0);
  }
  // Postgres: db.execute() returns QueryResult; rows are in result.rows
  const result = await testDb.db.execute(
    sql`SELECT COUNT(*) as count FROM "Relationship"`
  );
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows: unknown[] }).rows ?? []);
  return Number((rows[0] as { count: unknown })?.count ?? 0);
}

export { eq, sql, randomUUID };
