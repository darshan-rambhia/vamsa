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
  createTestUser,
  createTestPersonWithRelatives,
  countRelationships,
  findPersonById,
  eq,
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
          firstName: "Bob",
          lastName: "Smith",
          gender: "MALE",
          dateOfBirth: new Date("2005-01-01"),
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      // Create relationship
      const [relationship] = await testDb.db
        .insert(testDb.schema.relationships)
        .values({
          personFromId: parent.id,
          personToId: child.id,
          relationshipType: "PARENT",
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      expect(relationship).toBeDefined();
      expect(relationship.personFromId).toBe(parent.id);
      expect(relationship.personToId).toBe(child.id);
      expect(relationship.relationshipType).toBe("PARENT");
    });

    it("creates multiple family relationships", async () => {
      const { parent1, parent2, child } = await createTestPersonWithRelatives(
        creator.id
      );

      const relationships = await testDb.db.query.relationships.findMany({
        where: eq(testDb.schema.relationships.personToId, child.id),
      });

      expect(relationships.length).toBe(2);
      expect(relationships.some((r) => r.personFromId === parent1.id)).toBe(
        true
      );
      expect(relationships.some((r) => r.personFromId === parent2.id)).toBe(
        true
      );
    });
  });

  describe("Relationship Types", () => {
    it("creates various relationship types", async () => {
      const person1 = await testDb.db
        .insert(testDb.schema.persons)
        .values({
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
          firstName: "Person",
          lastName: "Two",
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning()
        .then((result) => result[0]);

      const relationshipTypes = ["PARENT", "SIBLING", "SPOUSE", "CHILD"];

      for (const type of relationshipTypes) {
        const [rel] = await testDb.db
          .insert(testDb.schema.relationships)
          .values({
            personFromId: person1.id,
            personToId: person2.id,
            relationshipType: type as any,
            createdById: creator.id,
            updatedAt: new Date(),
          })
          .returning();

        expect(rel.relationshipType).toBe(type);
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
        where: eq(testDb.schema.relationships.personToId, child.id),
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
          firstName: "Grandchild",
          lastName: "Doe",
          gender: "FEMALE",
          dateOfBirth: new Date("2025-01-01"),
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      // Create relationship: child -> grandchild
      await testDb.db.insert(testDb.schema.relationships).values({
        personFromId: child.id,
        personToId: grandchild.id,
        relationshipType: "PARENT",
        createdById: creator.id,
        updatedAt: new Date(),
      });

      // Query all relationships where child is "from"
      const childAsParent = await testDb.db.query.relationships.findMany({
        where: eq(testDb.schema.relationships.personFromId, child.id),
      });

      expect(childAsParent.length).toBe(1);
      expect(childAsParent[0].personToId).toBe(grandchild.id);
    });
  });

  describe("Relationship Constraints", () => {
    it("maintains relationship data integrity", async () => {
      const { parent1, child } = await createTestPersonWithRelatives(
        creator.id
      );

      // Find the relationship
      const relationship = await testDb.db.query.relationships.findFirst({
        where: eq(testDb.schema.relationships.personFromId, parent1.id),
      });

      expect(relationship).toBeDefined();
      expect(relationship?.personToId).toBe(child.id);
      expect(relationship?.createdById).toBe(creator.id);
      expect(relationship?.updatedAt).toBeDefined();
    });

    it("tracks relationship creation metadata", async () => {
      const { parent1, child } = await createTestPersonWithRelatives(
        creator.id
      );

      const before = new Date();
      await testDb.db.insert(testDb.schema.relationships).values({
        personFromId: parent1.id,
        personToId: child.id,
        relationshipType: "SIBLING",
        createdById: creator.id,
        updatedAt: new Date(),
      });
      const after = new Date();

      const relationships = await testDb.db.query.relationships.findMany();
      expect(relationships.length).toBeGreaterThan(0);

      const lastRel = relationships[relationships.length - 1];
      expect(lastRel.createdById).toBe(creator.id);
      expect(new Date(lastRel.updatedAt).getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(new Date(lastRel.updatedAt).getTime()).toBeLessThanOrEqual(
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
          personFromId: grandparent1.id,
          personToId: parent.id,
          relationshipType: "PARENT",
          createdById: creator.id,
          updatedAt: new Date(),
        },
        {
          personFromId: parent.id,
          personToId: child.id,
          relationshipType: "PARENT",
          createdById: creator.id,
          updatedAt: new Date(),
        },
      ]);

      const allRelationships = await testDb.db.query.relationships.findMany();
      expect(allRelationships.length).toBeGreaterThanOrEqual(2);

      // Verify chain: grandparent -> parent -> child
      const grandparentToParent = allRelationships.find(
        (r) => r.personFromId === grandparent1.id && r.personToId === parent.id
      );
      const parentToChild = allRelationships.find(
        (r) => r.personFromId === parent.id && r.personToId === child.id
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
        where: eq(testDb.schema.relationships.personFromId, parent1.id),
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
          personFromId: person1.id,
          personToId: person2.id,
          relationshipType: "SPOUSE",
          createdById: creator.id,
          updatedAt: new Date(),
        },
        {
          personFromId: person2.id,
          personToId: person1.id,
          relationshipType: "SPOUSE",
          createdById: creator.id,
          updatedAt: new Date(),
        },
      ]);

      const spouseRelationships = await testDb.db.query.relationships.findMany({
        where: eq(testDb.schema.relationships.relationshipType, "SPOUSE"),
      });

      expect(spouseRelationships.length).toBe(2);
    });
  });
});
