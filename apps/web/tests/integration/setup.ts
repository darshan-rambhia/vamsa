/**
 * Integration Test Setup
 *
 * Uses the existing Drizzle database from @vamsa/api for integration tests.
 * Requires a running PostgreSQL test database.
 *
 * Setup:
 *   docker-compose -f docker/docker-compose.test.yml up -d
 *
 * Run tests:
 *   TEST_DATABASE_URL=postgresql://... bun run test:int
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { sql, eq } from "drizzle-orm";

// Override DATABASE_URL if TEST_DATABASE_URL is provided
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

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
  // Delete in order respecting foreign keys
  await db.execute(sql`TRUNCATE TABLE media_objects CASCADE`);
  await db.execute(sql`TRUNCATE TABLE events CASCADE`);
  await db.execute(sql`TRUNCATE TABLE relationships CASCADE`);
  await db.execute(sql`TRUNCATE TABLE persons CASCADE`);
  await db.execute(sql`TRUNCATE TABLE places CASCADE`);
  await db.execute(sql`TRUNCATE TABLE sources CASCADE`);
  await db.execute(sql`TRUNCATE TABLE invites CASCADE`);
  await db.execute(sql`TRUNCATE TABLE sessions CASCADE`);
  await db.execute(sql`TRUNCATE TABLE accounts CASCADE`);
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
}

/**
 * Seed minimal test data for integration tests
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
      email: "admin@test.local",
      name: "Test Admin",
      role: "ADMIN",
      emailVerified: true,
    })
    .returning();

  // Create test person
  const [testPerson] = await db
    .insert(drizzleSchema.persons)
    .values({
      firstName: "Test",
      lastName: "Person",
      isLiving: true,
      createdById: adminUser.id,
      updatedById: adminUser.id,
    })
    .returning();

  return { adminUser, testPerson };
}

export { eq, sql };
