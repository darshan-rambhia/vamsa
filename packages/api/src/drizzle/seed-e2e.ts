#!/usr/bin/env bun
/**
 * E2E Test Database Seed Script
 *
 * Creates minimal data needed for E2E tests:
 * - Family settings
 * - Admin user (admin@test.vamsa.local / TestAdmin123!)
 * - Member user (member@test.vamsa.local / TestMember123!)
 * - A few test persons for relationship tests
 *
 * For development with full test data, use seed-dev.ts instead.
 */

import { config } from "dotenv";
import path from "path";

// Load .env from monorepo root
config({ path: path.resolve(__dirname, "../../../../.env") });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { hashPassword } from "./password";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.seed;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

async function main() {
  log.info({ script: "seed-e2e.ts" }, "Starting E2E database seed");

  const now = new Date();

  // Create family settings
  const existingSettings = await db
    .select()
    .from(schema.familySettings)
    .limit(1);

  if (existingSettings.length === 0) {
    await db.insert(schema.familySettings).values({
      id: crypto.randomUUID(),
      familyName: "E2E Test Family",
      allowSelfRegistration: true,
      requireApprovalForEdits: false,
      updatedAt: now,
    });
    log.info({ entity: "familySettings" }, "E2E family settings created");
  }

  // Create test persons for the users to claim
  const personIds = {
    adminPerson: crypto.randomUUID(),
    memberPerson: crypto.randomUUID(),
    testPerson1: crypto.randomUUID(),
    testPerson2: crypto.randomUUID(),
  };

  const persons = [
    {
      id: personIds.adminPerson,
      firstName: "Test",
      lastName: "Admin",
      isLiving: true,
    },
    {
      id: personIds.memberPerson,
      firstName: "Test",
      lastName: "Member",
      isLiving: true,
    },
    {
      id: personIds.testPerson1,
      firstName: "John",
      lastName: "Doe",
      sex: "MALE" as const,
      isLiving: true,
      dateOfBirth: new Date("1980-01-15"),
    },
    {
      id: personIds.testPerson2,
      firstName: "Jane",
      lastName: "Doe",
      sex: "FEMALE" as const,
      isLiving: true,
      dateOfBirth: new Date("1982-05-20"),
    },
  ];

  for (const person of persons) {
    await db.insert(schema.persons).values({
      ...person,
      updatedAt: now,
    });
  }
  log.info({ count: persons.length }, "Test persons created");

  // Create a spouse relationship between John and Jane
  await db.insert(schema.relationships).values([
    {
      id: crypto.randomUUID(),
      personId: personIds.testPerson1,
      relatedPersonId: personIds.testPerson2,
      type: "SPOUSE",
      isActive: true,
      marriageDate: new Date("2005-06-15"),
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      personId: personIds.testPerson2,
      relatedPersonId: personIds.testPerson1,
      type: "SPOUSE",
      isActive: true,
      marriageDate: new Date("2005-06-15"),
      updatedAt: now,
    },
  ]);
  log.info({}, "Test relationships created");

  // Create E2E test users
  const testUsers = [
    {
      email: "admin@test.vamsa.local",
      name: "Test Admin",
      password: "TestAdmin123!",
      role: "ADMIN" as const,
      personId: personIds.adminPerson,
    },
    {
      email: "member@test.vamsa.local",
      name: "Test Member",
      password: "TestMember123!",
      role: "MEMBER" as const,
      personId: personIds.memberPerson,
    },
  ];

  for (const user of testUsers) {
    const hash = await hashPassword(user.password);
    const [createdUser] = await db
      .insert(schema.users)
      .values({
        id: crypto.randomUUID(),
        email: user.email,
        name: user.name,
        passwordHash: hash,
        role: user.role,
        isActive: true,
        emailVerified: true,
        personId: user.personId,
        updatedAt: now,
      })
      .returning();

    await db.insert(schema.accounts).values({
      id: crypto.randomUUID(),
      userId: createdUser.id,
      accountId: user.email,
      providerId: "credential",
      password: hash,
      updatedAt: now,
    });

    log.info({ email: user.email, role: user.role }, "E2E test user created");
  }

  log.info(
    {
      success: true,
      users: testUsers.map((u) => u.email),
      persons: persons.length,
    },
    "E2E seed completed successfully"
  );

  await pool.end();
}

main().catch((e) => {
  log.withErr(e).msg("E2E seed failed");
  process.exit(1);
});
