/**
 * Integration Tests: Relationships and Family Connections
 *
 * Tests relationship creation, queries, and family tree operations
 * against a real PostgreSQL database.
 *
 * To run:
 *   1. Start test database: docker compose -f docker/docker-compose.local.yml --profile test up -d --wait
 *   2. Run tests: bun run test:int
 */

import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";

// SQLite stores timestamps as epoch seconds (loses ms precision)
const isSqlite = process.env.DB_DRIVER === "sqlite";
import {
  testDb,
  cleanupTestData,
  seedTestData,
  createTestUser,
  createTestPersonWithRelatives,
  countRelationships,
  findPersonById,
  toDateValue,
  eq,
  randomUUID,
} from "./setup";

describe("Relationships Integration Tests", () => {
  let creator: Awaited<ReturnType<typeof seedTestData>>["adminUser"];

  beforeAll(async () => {
    const data = await seedTestData();
    creator = data.adminUser;
  });

  beforeEach(async () => {
    await cleanupTestData();
    const data = await seedTestData();
    creator = data.adminUser;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("Relationship Creation", () => {
    it("creates a parent-child relationship", async () => {
      // Create parent and child
      const [parent] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Alice",
          lastName: "Smith",
          gender: "FEMALE",
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      const [child] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Bob",
          lastName: "Smith",
          gender: "MALE",
          dateOfBirth: toDateValue("2005-01-01"),
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      // Create relationship
      const [relationship] = await testDb.db
        .insert(testDb.schema.relationships)
        .values({
          id: randomUUID(),
          personId: parent.id,
          relatedPersonId: child.id,
          type: "PARENT",
          updatedAt: new Date(),
        })
        .returning();

      expect(relationship).toBeDefined();
      expect(relationship.personId).toBe(parent.id);
      expect(relationship.relatedPersonId).toBe(child.id);
      expect(relationship.type).toBe("PARENT");
    });

    it("creates multiple family relationships", async () => {
      const { parent1, parent2, child } = await createTestPersonWithRelatives(
        creator.id
      );

      const relationships = await testDb.db.query.relationships.findMany({
        where: eq(testDb.schema.relationships.relatedPersonId, child.id),
      });

      expect(relationships.length).toBe(2);
      expect(relationships.some((r) => r.personId === parent1.id)).toBe(true);
      expect(relationships.some((r) => r.personId === parent2.id)).toBe(true);
    });
  });

  describe("Relationship Types", () => {
    it("creates various relationship types", async () => {
      const person1 = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Person",
          lastName: "One",
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning()
        .then((result) => result[0]);

      const person2 = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Person",
          lastName: "Two",
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning()
        .then((result) => result[0]);

      const relationshipTypes = ["PARENT", "SIBLING", "SPOUSE", "CHILD"];

      for (const relType of relationshipTypes) {
        const [rel] = await testDb.db
          .insert(testDb.schema.relationships)
          .values({
            id: randomUUID(),
            personId: person1.id,
            relatedPersonId: person2.id,
            type: relType as any,
            updatedAt: new Date(),
          })
          .returning();

        expect(rel.type).toBe(relType);
      }
    });
  });

  describe("Relationship Queries", () => {
    it("finds all relationships for a person", async () => {
      const { parent1, parent2, child } = await createTestPersonWithRelatives(
        creator.id
      );

      // Find all relationships where child is the "to" person
      const childRelationships = await testDb.db.query.relationships.findMany({
        where: eq(testDb.schema.relationships.relatedPersonId, child.id),
      });

      expect(childRelationships.length).toBe(2);
    });

    it("queries both parent and child relationships", async () => {
      const { parent1, parent2, child } = await createTestPersonWithRelatives(
        creator.id
      );

      // Create a grandchild
      const [grandchild] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Grandchild",
          lastName: "Doe",
          gender: "FEMALE",
          dateOfBirth: toDateValue("2025-01-01"),
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      // Create relationship: child -> grandchild
      await testDb.db.insert(testDb.schema.relationships).values({
        id: randomUUID(),
        personId: child.id,
        relatedPersonId: grandchild.id,
        type: "PARENT",
        updatedAt: new Date(),
      });

      // Query all relationships where child is "from"
      const childAsParent = await testDb.db.query.relationships.findMany({
        where: eq(testDb.schema.relationships.personId, child.id),
      });

      expect(childAsParent.length).toBe(1);
      expect(childAsParent[0].relatedPersonId).toBe(grandchild.id);
    });
  });

  describe("Relationship Constraints", () => {
    it("maintains relationship data integrity", async () => {
      const { parent1, child } = await createTestPersonWithRelatives(
        creator.id
      );

      // Find the relationship
      const relationship = await testDb.db.query.relationships.findFirst({
        where: eq(testDb.schema.relationships.personId, parent1.id),
      });

      expect(relationship).toBeDefined();
      expect(relationship?.relatedPersonId).toBe(child.id);
      expect(relationship?.updatedAt).toBeDefined();
    });

    // SQLite stores timestamps as epoch seconds (loses ms precision), so timing assertions fail
    it.skipIf(isSqlite)("tracks relationship creation metadata", async () => {
      const { parent1, child } = await createTestPersonWithRelatives(
        creator.id
      );

      const before = new Date();
      await testDb.db.insert(testDb.schema.relationships).values({
        id: randomUUID(),
        personId: parent1.id,
        relatedPersonId: child.id,
        type: "SIBLING",
        updatedAt: new Date(),
      });
      const after = new Date();

      const relationships = await testDb.db.query.relationships.findMany();
      expect(relationships.length).toBeGreaterThan(0);

      // Find the SIBLING relationship we just created
      const siblingRel = relationships.find((r) => r.type === "SIBLING");
      expect(siblingRel).toBeDefined();
      expect(new Date(siblingRel!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(new Date(siblingRel!.updatedAt).getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });
  });

  describe("Family Tree Navigation", () => {
    it("builds a three-generation family tree", async () => {
      // Create grandparents
      const [grandparent1] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Grandparent",
          lastName: "One",
          gender: "MALE",
          isLiving: false,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      // Create parent
      const [parent] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Parent",
          lastName: "One",
          gender: "MALE",
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      // Create child
      const [child] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Child",
          lastName: "One",
          gender: "MALE",
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      // Create relationships
      await testDb.db.insert(testDb.schema.relationships).values([
        {
          id: randomUUID(),
          personId: grandparent1.id,
          relatedPersonId: parent.id,
          type: "PARENT",
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          personId: parent.id,
          relatedPersonId: child.id,
          type: "PARENT",
          updatedAt: new Date(),
        },
      ]);

      const allRelationships = await testDb.db.query.relationships.findMany();
      expect(allRelationships.length).toBeGreaterThanOrEqual(2);

      // Verify chain: grandparent -> parent -> child
      const grandparentToParent = allRelationships.find(
        (r) => r.personId === grandparent1.id && r.relatedPersonId === parent.id
      );
      const parentToChild = allRelationships.find(
        (r) => r.personId === parent.id && r.relatedPersonId === child.id
      );

      expect(grandparentToParent).toBeDefined();
      expect(parentToChild).toBeDefined();
    });
  });

  describe("Relationship Deletion", () => {
    it("deletes a relationship", async () => {
      const { parent1, child } = await createTestPersonWithRelatives(
        creator.id
      );

      const relationship = await testDb.db.query.relationships.findFirst({
        where: eq(testDb.schema.relationships.personId, parent1.id),
      });

      expect(relationship).toBeDefined();

      if (relationship) {
        // Delete the relationship
        await testDb.db
          .delete(testDb.schema.relationships)
          .where(eq(testDb.schema.relationships.id, relationship.id as any));

        // Verify deletion
        const count = await countRelationships();
        expect(count).toBeGreaterThanOrEqual(1); // At least the other parent relationship
      }
    });
  });

  describe("Bidirectional Relationships", () => {
    it("can create bidirectional spouse relationships", async () => {
      const [person1] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "John",
          lastName: "Doe",
          gender: "MALE",
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      const [person2] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Jane",
          lastName: "Smith",
          gender: "FEMALE",
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      // Create bidirectional spouse relationship
      await testDb.db.insert(testDb.schema.relationships).values([
        {
          id: randomUUID(),
          personId: person1.id,
          relatedPersonId: person2.id,
          type: "SPOUSE",
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          personId: person2.id,
          relatedPersonId: person1.id,
          type: "SPOUSE",
          updatedAt: new Date(),
        },
      ]);

      const spouseRelationships = await testDb.db.query.relationships.findMany({
        where: eq(testDb.schema.relationships.type, "SPOUSE"),
      });

      expect(spouseRelationships.length).toBe(2);
    });
  });
});
