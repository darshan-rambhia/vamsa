/**
 * Integration Tests: Person CRUD Operations
 *
 * Tests person operations against a real PostgreSQL database.
 *
 * To run:
 *   1. Start test database: docker-compose -f docker/docker-compose.test.yml up -d
 *   2. Run tests: TEST_DATABASE_URL=postgresql://vamsa_test:vamsa_test@localhost:5433/vamsa_test bun run test:int
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  beforeAll,
} from "bun:test";
import { testDb, cleanupTestData, seedTestData, eq } from "./setup";

describe("Person Integration Tests", () => {
  let adminUser: Awaited<ReturnType<typeof seedTestData>>["adminUser"];

  beforeAll(async () => {
    const data = await seedTestData();
    adminUser = data.adminUser;
  });

  beforeEach(async () => {
    await cleanupTestData();
    const data = await seedTestData();
    adminUser = data.adminUser;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("Create Person", () => {
    it("creates a person with all fields stored correctly", async () => {
      const personData = {
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      };

      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values(personData)
        .returning();

      expect(created.id).toBeDefined();
      expect(created.firstName).toBe("John");
      expect(created.lastName).toBe("Doe");
      expect(created.isLiving).toBe(true);

      // Verify in database
      const found = await testDb.db.query.persons.findFirst({
        where: eq(testDb.schema.persons.id, created.id),
      });

      expect(found).toBeDefined();
      expect(found?.firstName).toBe("John");
    });

    it("tracks created/updated timestamps", async () => {
      const before = new Date();

      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          firstName: "Timestamp",
          lastName: "Test",
          isLiving: true,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        })
        .returning();

      const after = new Date();

      expect(created.createdAt).toBeDefined();
      expect(new Date(created.createdAt).getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(new Date(created.createdAt).getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });
  });

  describe("Update Person", () => {
    it("updates person fields", async () => {
      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          firstName: "Original",
          lastName: "Name",
          isLiving: true,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        })
        .returning();

      const [updated] = await testDb.db
        .update(testDb.schema.persons)
        .set({
          firstName: "Updated",
          updatedById: adminUser.id,
        })
        .where(eq(testDb.schema.persons.id, created.id))
        .returning();

      expect(updated.firstName).toBe("Updated");
      expect(updated.lastName).toBe("Name");
    });
  });

  describe("Delete Person", () => {
    it("deletes person from database", async () => {
      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          firstName: "ToDelete",
          lastName: "Person",
          isLiving: true,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        })
        .returning();

      await testDb.db
        .delete(testDb.schema.persons)
        .where(eq(testDb.schema.persons.id, created.id));

      const found = await testDb.db.query.persons.findFirst({
        where: eq(testDb.schema.persons.id, created.id),
      });

      expect(found).toBeUndefined();
    });
  });

  describe("Query Persons", () => {
    it("finds persons by last name", async () => {
      await testDb.db.insert(testDb.schema.persons).values([
        {
          firstName: "Alice",
          lastName: "Johnson",
          isLiving: true,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
        {
          firstName: "Bob",
          lastName: "Johnson",
          isLiving: true,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
        {
          firstName: "Charlie",
          lastName: "Smith",
          isLiving: true,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      ]);

      const johnsons = await testDb.db.query.persons.findMany({
        where: eq(testDb.schema.persons.lastName, "Johnson"),
      });

      expect(johnsons).toHaveLength(2);
      expect(
        johnsons.map((p: { firstName: string }) => p.firstName).sort()
      ).toEqual(["Alice", "Bob"]);
    });
  });
});
