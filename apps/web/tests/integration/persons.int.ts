/**
 * Integration Tests: Person CRUD Operations
 *
 * Tests person operations against a real PostgreSQL database.
 *
 * To run:
 *   1. Start test database: docker-compose -f docker/docker-compose.test.yml up -d
 *   2. Run tests: bun run test:int
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  beforeAll,
} from "bun:test";
import {
  testDb,
  cleanupTestData,
  seedTestData,
  findPersonById,
  eq,
  randomUUID,
} from "./setup";

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
        id: randomUUID(),
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
        createdById: adminUser.id,
        updatedAt: new Date(),
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
      const found = await findPersonById(created.id);

      expect(found).toBeDefined();
      expect(found?.firstName).toBe("John");
    });

    it("creates a person with complete personal information", async () => {
      const personData = {
        id: randomUUID(),
        firstName: "Jane",
        lastName: "Smith",
        maidenName: "Johnson",
        dateOfBirth: new Date("1990-05-15"),
        birthPlace: "New York",
        gender: "FEMALE" as const,
        email: "jane@example.com",
        phone: "555-1234",
        profession: "Engineer",
        isLiving: true,
        createdById: adminUser.id,
        updatedAt: new Date(),
      };

      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values(personData)
        .returning();

      expect(created.id).toBeDefined();
      expect(created.maidenName).toBe("Johnson");
      expect(created.dateOfBirth?.toISOString().split("T")[0]).toBe(
        "1990-05-15"
      );
      expect(created.profession).toBe("Engineer");
      expect(created.gender).toBe("FEMALE");
    });

    it("stores biographical information correctly", async () => {
      const bio = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
      const currentAddress = {
        street: "123 Main St",
        city: "Springfield",
        state: "IL",
        zip: "62701",
      };

      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Bio",
          lastName: "Test",
          bio,
          currentAddress,
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        })
        .returning();

      const found = await findPersonById(created.id);
      expect(found?.bio).toBe(bio);
      expect(found?.currentAddress).toEqual(currentAddress);
    });

    it("tracks created/updated timestamps", async () => {
      const before = new Date();
      before.setMilliseconds(before.getMilliseconds() - 10);

      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Timestamp",
          lastName: "Test",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        })
        .returning();

      const after = new Date();
      after.setMilliseconds(after.getMilliseconds() + 10);

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
    it("updates person basic information", async () => {
      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Original",
          lastName: "Name",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        })
        .returning();

      const [updated] = await testDb.db
        .update(testDb.schema.persons)
        .set({
          firstName: "Updated",
          updatedAt: new Date(),
        })
        .where(eq(testDb.schema.persons.id, created.id))
        .returning();

      expect(updated.firstName).toBe("Updated");
      expect(updated.lastName).toBe("Name");
    });

    it("updates personal details", async () => {
      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Test",
          lastName: "Person",
          dateOfBirth: new Date("1990-01-01"),
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        })
        .returning();

      const newBio = "Updated biography";
      const newProfession = "Doctor";

      const [updated] = await testDb.db
        .update(testDb.schema.persons)
        .set({
          bio: newBio,
          profession: newProfession,
          updatedAt: new Date(),
        })
        .where(eq(testDb.schema.persons.id, created.id))
        .returning();

      expect(updated.bio).toBe(newBio);
      expect(updated.profession).toBe(newProfession);
    });

    it("updates isLiving status", async () => {
      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Living",
          lastName: "Person",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        })
        .returning();

      const [updated] = await testDb.db
        .update(testDb.schema.persons)
        .set({
          isLiving: false,
          dateOfPassing: new Date("2023-01-01"),
          updatedAt: new Date(),
        })
        .where(eq(testDb.schema.persons.id, created.id))
        .returning();

      expect(updated.isLiving).toBe(false);
      expect(updated.dateOfPassing).toBeDefined();
    });
  });

  describe("Delete Person", () => {
    it("deletes person from database", async () => {
      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "ToDelete",
          lastName: "Person",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        })
        .returning();

      await testDb.db
        .delete(testDb.schema.persons)
        .where(eq(testDb.schema.persons.id, created.id));

      const found = await findPersonById(created.id);

      expect(found).toBeUndefined();
    });

    it("supports soft delete with deletedAt timestamp", async () => {
      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "SoftDelete",
          lastName: "Person",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        })
        .returning();

      const deletedAt = new Date();
      const [updated] = await testDb.db
        .update(testDb.schema.persons)
        .set({ deletedAt, updatedAt: new Date() })
        .where(eq(testDb.schema.persons.id, created.id))
        .returning();

      expect(updated.deletedAt).toBeDefined();
      expect(updated.deletedAt?.getTime()).toBeLessThanOrEqual(
        new Date().getTime()
      );
    });
  });

  describe("Query Persons", () => {
    it("finds persons by last name", async () => {
      await testDb.db.insert(testDb.schema.persons).values([
        {
          id: randomUUID(),
          firstName: "Alice",
          lastName: "Johnson",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          firstName: "Bob",
          lastName: "Johnson",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          firstName: "Charlie",
          lastName: "Smith",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
      ]);

      const johnsons = await testDb.db.query.persons.findMany({
        where: eq(testDb.schema.persons.lastName, "Johnson"),
      });

      expect(johnsons.length).toBeGreaterThanOrEqual(2);
      expect(
        johnsons.map((p: { firstName: string }) => p.firstName).sort()
      ).toContain("Alice");
      expect(
        johnsons.map((p: { firstName: string }) => p.firstName).sort()
      ).toContain("Bob");
    });

    it("finds persons by isLiving status", async () => {
      await testDb.db.insert(testDb.schema.persons).values([
        {
          id: randomUUID(),
          firstName: "Living",
          lastName: "Person1",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          firstName: "Living",
          lastName: "Person2",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          firstName: "Deceased",
          lastName: "Person",
          isLiving: false,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
      ]);

      const living = await testDb.db.query.persons.findMany({
        where: eq(testDb.schema.persons.isLiving, true),
      });

      expect(living.length).toBeGreaterThanOrEqual(2);
      expect(living.every((p) => p.isLiving === true)).toBe(true);
    });

    it("finds persons by date of birth", async () => {
      const dob = new Date("1990-05-15");

      await testDb.db.insert(testDb.schema.persons).values([
        {
          id: randomUUID(),
          firstName: "Person",
          lastName: "OneDOB",
          dateOfBirth: dob,
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          firstName: "Different",
          lastName: "DOB",
          dateOfBirth: new Date("1995-01-01"),
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
      ]);

      const matching = await testDb.db.query.persons.findMany({
        where: eq(testDb.schema.persons.dateOfBirth, dob),
      });

      expect(matching.length).toBeGreaterThanOrEqual(1);
    });

    it("counts total persons", async () => {
      const initialCount = await testDb.db.query.persons.findMany();

      await testDb.db.insert(testDb.schema.persons).values([
        {
          id: randomUUID(),
          firstName: "Count",
          lastName: "Test1",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          firstName: "Count",
          lastName: "Test2",
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        },
      ]);

      const finalCount = await testDb.db.query.persons.findMany();
      expect(finalCount.length).toBeGreaterThan(initialCount.length);
    });
  });

  describe("Person Data Validation", () => {
    it("stores JSON data in jsonb fields", async () => {
      const socialLinks = {
        twitter: "@john_doe",
        linkedin: "john-doe",
        github: "johndoe",
      };

      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Social",
          lastName: "Links",
          socialLinks,
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        })
        .returning();

      const found = await findPersonById(created.id);
      expect(found?.socialLinks).toEqual(socialLinks);
    });

    it("maintains data types for dates", async () => {
      const dob = new Date("1990-05-15");

      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Date",
          lastName: "Types",
          dateOfBirth: dob,
          isLiving: true,
          createdById: adminUser.id,
          updatedAt: new Date(),
        })
        .returning();

      const found = await findPersonById(created.id);
      expect(found?.dateOfBirth).toBeInstanceOf(Date);
    });
  });
});
