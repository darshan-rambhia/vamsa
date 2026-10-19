/**
 * Integration Tests: Case-insensitive person search
 *
 * Covers the add-relationship search path (searchPersonsData), which uses
 * caseInsensitiveLike. SQLite has no ILIKE, so this guards the dialect branch.
 *
 * To run:
 *   pnpm test:int:sqlite
 *   pnpm test:int:postgres (requires Docker test DB)
 */

import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import { searchPersonsData } from "@vamsa/lib/server/business";
import { testDb, cleanupTestData, seedTestData, randomUUID } from "./setup";

describe("Person search (case-insensitive LIKE)", () => {
  let creatorId: string;

  beforeAll(async () => {
    const data = await seedTestData();
    creatorId = data.adminUser.id;
  });

  beforeEach(async () => {
    await cleanupTestData();
    const data = await seedTestData();
    creatorId = data.adminUser.id;

    await testDb.db.insert(testDb.schema.persons).values([
      {
        id: randomUUID(),
        firstName: "Alice",
        lastName: "Ogilvie",
        isLiving: true,
        createdById: creatorId,
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        firstName: "Bob",
        lastName: "Smith",
        isLiving: true,
        createdById: creatorId,
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        firstName: "Carol",
        lastName: "50% Off",
        isLiving: true,
        createdById: creatorId,
        updatedAt: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("matches lowercase query against capitalized names", async () => {
    const results = await searchPersonsData("ali", undefined, testDb.db);
    expect(results.map((p) => p.firstName)).toEqual(["Alice"]);
  });

  it("matches uppercase query against lastName", async () => {
    const results = await searchPersonsData("SMITH", undefined, testDb.db);
    expect(results.map((p) => p.lastName)).toEqual(["Smith"]);
  });

  it("returns no rows for a non-matching query", async () => {
    const results = await searchPersonsData("zzz", undefined, testDb.db);
    expect(results).toEqual([]);
  });

  it("treats % in user input as a literal character", async () => {
    // Unescaped, "%" would match every row. Escaped, only "50% Off" matches.
    const results = await searchPersonsData("50%", undefined, testDb.db);
    expect(results.map((p) => p.lastName)).toEqual(["50% Off"]);
  });
});
