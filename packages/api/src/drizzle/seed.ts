#!/usr/bin/env bun
/**
 * Drizzle ORM Database Seed Script
 *
 * Creates test data for E2E tests:
 * - Family settings
 * - Test users (admin, member, viewer)
 * - Sample persons and relationships
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { hashPassword } from "./password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

async function main() {
  console.log("Starting database seed...");

  const now = new Date();

  // Create family settings
  const existingSettings = await db.select().from(schema.familySettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(schema.familySettings).values({
      id: crypto.randomUUID(),
      familyName: process.env.VITE_APP_NAME || "The Sharma Family",
      allowSelfRegistration: true,
      requireApprovalForEdits: true,
      updatedAt: now,
    });
    console.log("Default family settings created.");
  }

  // Check if persons already exist
  const existingPersons = await db.select().from(schema.persons);
  const existingUsers = await db.select().from(schema.users);
  console.log(`Current database state: ${existingPersons.length} persons, ${existingUsers.length} users`);

  if (existingPersons.length > 0) {
    console.log("Persons already exist. Skipping person and user creation.");
    await pool.end();
    return;
  }

  console.log("Creating test persons...");

  // Create a few test persons
  const [parentArjun] = await db.insert(schema.persons).values({
    id: crypto.randomUUID(),
    firstName: "Arjun",
    lastName: "Sharma",
    gender: "MALE",
    dateOfBirth: new Date("1988-04-08"),
    birthPlace: "Bangalore, Karnataka",
    nativePlace: "Jaipur, Rajasthan",
    profession: "Product Director",
    employer: "Google",
    isLiving: true,
    email: "arjun.sharma@example.com",
    bio: "Tech enthusiast and family historian. Maintains the family tree.",
    updatedAt: now,
  }).returning();

  const [parentNeha] = await db.insert(schema.persons).values({
    id: crypto.randomUUID(),
    firstName: "Neha",
    lastName: "Sharma",
    maidenName: "Gupta",
    gender: "FEMALE",
    dateOfBirth: new Date("1990-09-15"),
    birthPlace: "Delhi",
    nativePlace: "Delhi",
    profession: "UX Designer",
    employer: "Microsoft",
    isLiving: true,
    email: "neha.sharma@example.com",
    updatedAt: now,
  }).returning();

  const [parentRohan] = await db.insert(schema.persons).values({
    id: crypto.randomUUID(),
    firstName: "Rohan",
    lastName: "Verma",
    gender: "MALE",
    dateOfBirth: new Date("1989-07-20"),
    birthPlace: "Chennai, Tamil Nadu",
    nativePlace: "Chennai, Tamil Nadu",
    profession: "Cardiologist",
    employer: "Fortis Hospital",
    isLiving: true,
    updatedAt: now,
  }).returning();

  const [parentRahul] = await db.insert(schema.persons).values({
    id: crypto.randomUUID(),
    firstName: "Rahul",
    lastName: "Sharma",
    gender: "MALE",
    dateOfBirth: new Date("1992-06-20"),
    birthPlace: "Jaipur, Rajasthan",
    nativePlace: "Jaipur, Rajasthan",
    profession: "Civil Engineer",
    employer: "L&T Construction",
    isLiving: true,
    updatedAt: now,
  }).returning();

  const [parentAditya] = await db.insert(schema.persons).values({
    id: crypto.randomUUID(),
    firstName: "Aditya",
    lastName: "Patel",
    gender: "MALE",
    dateOfBirth: new Date("1990-03-12"),
    birthPlace: "Ahmedabad, Gujarat",
    nativePlace: "Ahmedabad, Gujarat",
    profession: "Investment Banker",
    employer: "Goldman Sachs",
    isLiving: true,
    updatedAt: now,
  }).returning();

  // Create spouse relationship
  await db.insert(schema.relationships).values([
    {
      id: crypto.randomUUID(),
      personId: parentArjun.id,
      relatedPersonId: parentNeha.id,
      type: "SPOUSE",
      marriageDate: new Date("2014-02-14"),
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      personId: parentNeha.id,
      relatedPersonId: parentArjun.id,
      type: "SPOUSE",
      marriageDate: new Date("2014-02-14"),
      updatedAt: now,
    },
  ]);

  console.log("Created test persons and relationships.");

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "arjun@sharma.family";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await hashPassword(adminPassword);

  const [adminUser] = await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    email: adminEmail.toLowerCase(),
    name: "Arjun Sharma",
    passwordHash,
    role: "ADMIN",
    isActive: true,
    emailVerified: true,
    personId: parentArjun.id,
    updatedAt: now,
  }).returning();

  // Create account for admin
  await db.insert(schema.accounts).values({
    id: crypto.randomUUID(),
    userId: adminUser.id,
    accountId: adminEmail.toLowerCase(),
    providerId: "credential",
    password: passwordHash,
    updatedAt: now,
  });

  console.log(`Admin user created: ${adminEmail}`);

  // Create test users for E2E tests
  const testUsers = [
    {
      email: "admin@test.vamsa.local",
      name: "Test Admin",
      password: "TestAdmin123!",
      role: "ADMIN" as const,
      personId: parentRohan.id,
    },
    {
      email: "member@test.vamsa.local",
      name: "Test Member",
      password: "TestMember123!",
      role: "MEMBER" as const,
      personId: parentRahul.id,
    },
    {
      email: "viewer@test.vamsa.local",
      name: "Test Viewer",
      password: "TestViewer123!",
      role: "VIEWER" as const,
      personId: parentAditya.id,
    },
  ];

  for (const user of testUsers) {
    const hash = await hashPassword(user.password);
    const [createdUser] = await db.insert(schema.users).values({
      id: crypto.randomUUID(),
      email: user.email,
      name: user.name,
      passwordHash: hash,
      role: user.role,
      isActive: true,
      emailVerified: true,
      personId: user.personId,
      updatedAt: now,
    }).returning();

    await db.insert(schema.accounts).values({
      id: crypto.randomUUID(),
      userId: createdUser.id,
      accountId: user.email,
      providerId: "credential",
      password: hash,
      updatedAt: now,
    });

    console.log(`Test user created: ${user.email}`);
  }

  console.log("========================================");
  console.log("SEED COMPLETED SUCCESSFULLY!");
  console.log("========================================");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log("Test Admin: admin@test.vamsa.local / TestAdmin123!");
  console.log("Test Member: member@test.vamsa.local / TestMember123!");
  console.log("Test Viewer: viewer@test.vamsa.local / TestViewer123!");
  console.log("========================================");

  await pool.end();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
