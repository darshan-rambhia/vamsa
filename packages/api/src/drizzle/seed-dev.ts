#!/usr/bin/env bun
/**
 * Development Database Seed Script
 *
 * Creates comprehensive test data for local development:
 * - 30 people across 5 generations
 * - Family relationships (spouse, parent-child, sibling)
 * - Test users (admin, member, viewer)
 *
 * This file is ONLY used by the dev script (scripts/dev.ts).
 * Production deployments should use seed.ts instead.
 */

import path from "node:path";
import { config } from "dotenv";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";
import * as schema from "./schema";
import { hashPassword } from "./password";

// Load .env from monorepo root
config({
  path: path.resolve(__dirname, "../../../../.env"),
  quiet: true,
});

const log = loggers.seed;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

type DrizzleDB = typeof db;

/**
 * Ensures the admin user from ADMIN_EMAIL exists with the correct password.
 * This runs even when the database is already seeded, allowing you to change
 * ADMIN_EMAIL and ADMIN_PASSWORD in .env and have them take effect.
 */
async function ensureAdminUser(db: DrizzleDB, now: Date): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    log.warn({ reason: "ADMIN_EMAIL not set" }, "Skipping admin user sync");
    return;
  }

  const normalizedEmail = adminEmail.toLowerCase();

  // Check if admin with this email already exists
  const [existingAdmin] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1);

  if (existingAdmin) {
    // Admin exists, update password if ADMIN_PASSWORD is set
    if (process.env.ADMIN_PASSWORD) {
      const newHash = await hashPassword(process.env.ADMIN_PASSWORD);

      // Update user passwordHash
      await db
        .update(schema.users)
        .set({ passwordHash: newHash, updatedAt: now })
        .where(eq(schema.users.id, existingAdmin.id));

      // Update account password
      await db
        .update(schema.accounts)
        .set({ password: newHash, updatedAt: now })
        .where(eq(schema.accounts.userId, existingAdmin.id));

      log.info({ email: normalizedEmail }, "Admin password updated");
    } else {
      log.info(
        { email: normalizedEmail, passwordUpdated: false },
        "Admin exists"
      );
    }
    return;
  }

  // Admin doesn't exist with this email - create a new one or update existing
  // First, check if there's an admin we should update (the "primary" admin)
  const [primaryAdmin] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, "ADMIN"))
    .limit(1);

  const adminPassword =
    process.env.ADMIN_PASSWORD || crypto.randomUUID().slice(0, 16);
  const isGeneratedPassword = !process.env.ADMIN_PASSWORD;
  const passwordHash = await hashPassword(adminPassword);

  if (primaryAdmin) {
    // Update existing admin with new email and password
    const oldEmail = primaryAdmin.email;

    await db
      .update(schema.users)
      .set({
        email: normalizedEmail,
        passwordHash,
        updatedAt: now,
      })
      .where(eq(schema.users.id, primaryAdmin.id));

    // Update account - need to update both accountId and password
    await db
      .update(schema.accounts)
      .set({
        accountId: normalizedEmail,
        password: passwordHash,
        updatedAt: now,
      })
      .where(eq(schema.accounts.userId, primaryAdmin.id));

    log.info({ oldEmail, newEmail: normalizedEmail }, "Admin email updated");
  } else {
    // No admin exists at all - create one (this shouldn't normally happen if seeded)
    const [newAdmin] = await db
      .insert(schema.users)
      .values({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        name: "Admin",
        passwordHash,
        role: "ADMIN",
        isActive: true,
        emailVerified: true,
        updatedAt: now,
      })
      .returning();

    await db.insert(schema.accounts).values({
      id: crypto.randomUUID(),
      userId: newAdmin.id,
      accountId: normalizedEmail,
      providerId: "credential",
      password: passwordHash,
      updatedAt: now,
    });

    log.info({ email: normalizedEmail }, "Admin user created");
  }

  if (isGeneratedPassword) {
    log.warn(
      { generatedPassword: adminPassword },
      "Save this auto-generated password - it won't be shown again"
    );
  } else {
    log.info({ email: normalizedEmail }, "Admin credentials configured");
  }
}

async function main() {
  log.info({ script: "seed-dev.ts" }, "Starting DEV database seed");

  const now = new Date();

  // Create family settings
  const existingSettings = await db
    .select()
    .from(schema.familySettings)
    .limit(1);
  if (existingSettings.length === 0) {
    await db.insert(schema.familySettings).values({
      id: crypto.randomUUID(),
      familyName: process.env.VITE_APP_NAME || "The Sharma Family",
      allowSelfRegistration: true,
      requireApprovalForEdits: true,
      updatedAt: now,
    });
    log.info({ entity: "familySettings" }, "Default family settings created");
  }

  // Check if data already exists
  const existingPersons = await db.select().from(schema.persons);
  const existingUsers = await db.select().from(schema.users);
  log.info(
    { personsCount: existingPersons.length, usersCount: existingUsers.length },
    "Current database state"
  );

  if (existingPersons.length > 0 && existingUsers.length > 0) {
    log.info(
      { alreadySeeded: true },
      "Database already seeded - ensuring admin user is up to date"
    );
    await ensureAdminUser(db, now);
    await pool.end();
    return;
  }

  if (existingPersons.length > 0 && existingUsers.length === 0) {
    log.warn(
      { personsExist: true, usersExist: false },
      'Persons exist but no users. Run: TRUNCATE "Person", "User", "Relationship" CASCADE; then reseed.'
    );
    await pool.end();
    return;
  }

  log.info({ generations: 5 }, "Creating family tree");

  // ========== GENERATION 1: Great-Great-Grandparents (4 people) ==========
  const [ggGrandpaHari] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Hari",
      lastName: "Sharma",
      gender: "MALE",
      dateOfBirth: new Date("1905-03-15"),
      dateOfPassing: new Date("1980-06-20"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Farmer",
      isLiving: false,
      bio: "Patriarch of the Sharma family, owned vast farmlands in Rajasthan.",
      updatedAt: now,
    })
    .returning();

  const [ggGrandmaSavitri] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Savitri",
      lastName: "Sharma",
      maidenName: "Verma",
      gender: "FEMALE",
      dateOfBirth: new Date("1910-07-22"),
      dateOfPassing: new Date("1985-11-10"),
      birthPlace: "Jodhpur, Rajasthan",
      nativePlace: "Jodhpur, Rajasthan",
      profession: "Homemaker",
      isLiving: false,
      updatedAt: now,
    })
    .returning();

  const [ggGrandpaRatan] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Ratan",
      lastName: "Patel",
      gender: "MALE",
      dateOfBirth: new Date("1908-01-10"),
      dateOfPassing: new Date("1978-09-05"),
      birthPlace: "Ahmedabad, Gujarat",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Merchant",
      isLiving: false,
      updatedAt: now,
    })
    .returning();

  const [ggGrandmaKusuma] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Kusuma",
      lastName: "Patel",
      maidenName: "Shah",
      gender: "FEMALE",
      dateOfBirth: new Date("1912-04-18"),
      dateOfPassing: new Date("1990-02-28"),
      birthPlace: "Surat, Gujarat",
      nativePlace: "Surat, Gujarat",
      profession: "Homemaker",
      isLiving: false,
      updatedAt: now,
    })
    .returning();

  // ========== GENERATION 2: Great-Grandparents (4 people) ==========
  const [gGrandpaRajendra] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Rajendra",
      lastName: "Sharma",
      gender: "MALE",
      dateOfBirth: new Date("1935-03-15"),
      dateOfPassing: new Date("2018-11-20"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Professor",
      employer: "University of Rajasthan",
      isLiving: false,
      bio: "A devoted educator who spent 40 years teaching mathematics.",
      updatedAt: now,
    })
    .returning();

  const [gGrandmaKamla] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Kamla",
      lastName: "Sharma",
      maidenName: "Gupta",
      gender: "FEMALE",
      dateOfBirth: new Date("1940-07-22"),
      birthPlace: "Agra, Uttar Pradesh",
      nativePlace: "Agra, Uttar Pradesh",
      profession: "Homemaker",
      isLiving: true,
      bio: "The loving matriarch of the Sharma family, still going strong at 85.",
      updatedAt: now,
    })
    .returning();

  const [gGrandpaMohan] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Mohan",
      lastName: "Patel",
      gender: "MALE",
      dateOfBirth: new Date("1938-01-10"),
      dateOfPassing: new Date("2015-06-05"),
      birthPlace: "Ahmedabad, Gujarat",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Businessman",
      employer: "Patel Textiles",
      isLiving: false,
      updatedAt: now,
    })
    .returning();

  const [gGrandmaLakshmi] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Lakshmi",
      lastName: "Patel",
      maidenName: "Desai",
      gender: "FEMALE",
      dateOfBirth: new Date("1942-09-18"),
      birthPlace: "Surat, Gujarat",
      nativePlace: "Surat, Gujarat",
      profession: "Retired Teacher",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  // ========== GENERATION 3: Grandparents (6 people) ==========
  const [grandpaVikram] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Vikram",
      lastName: "Sharma",
      gender: "MALE",
      dateOfBirth: new Date("1960-05-12"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Senior Software Architect",
      employer: "Infosys",
      isLiving: true,
      email: "vikram.sharma@example.com",
      phone: "+91 98765 43210",
      bio: "Tech pioneer who helped build India's IT industry.",
      updatedAt: now,
    })
    .returning();

  const [grandmaPriya] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Priya",
      lastName: "Sharma",
      maidenName: "Patel",
      gender: "FEMALE",
      dateOfBirth: new Date("1963-11-25"),
      birthPlace: "Ahmedabad, Gujarat",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Chief Medical Officer",
      employer: "Apollo Hospital",
      isLiving: true,
      email: "priya.sharma@example.com",
      updatedAt: now,
    })
    .returning();

  const [grandpaAjay] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Ajay",
      lastName: "Sharma",
      gender: "MALE",
      dateOfBirth: new Date("1965-02-28"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Architect",
      employer: "Sharma Design Studio",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [grandmaSunita] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Sunita",
      lastName: "Sharma",
      maidenName: "Kapoor",
      gender: "FEMALE",
      dateOfBirth: new Date("1968-08-14"),
      birthPlace: "Delhi",
      nativePlace: "Delhi",
      profession: "Interior Designer",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [grandpaSanjay] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Sanjay",
      lastName: "Patel",
      gender: "MALE",
      dateOfBirth: new Date("1962-04-05"),
      birthPlace: "Ahmedabad, Gujarat",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Textile Manufacturer",
      employer: "Patel Textiles",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [grandmaRekha] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Rekha",
      lastName: "Patel",
      maidenName: "Mehta",
      gender: "FEMALE",
      dateOfBirth: new Date("1966-12-20"),
      birthPlace: "Mumbai, Maharashtra",
      nativePlace: "Mumbai, Maharashtra",
      profession: "Fashion Designer",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  // ========== GENERATION 4: Parents (8 people) - ADMIN IS HERE ==========
  const [parentArjun] = await db
    .insert(schema.persons)
    .values({
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
    })
    .returning();

  const [parentNeha] = await db
    .insert(schema.persons)
    .values({
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
    })
    .returning();

  const [parentMeera] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Meera",
      lastName: "Verma",
      maidenName: "Sharma",
      gender: "FEMALE",
      dateOfBirth: new Date("1991-12-03"),
      birthPlace: "Bangalore, Karnataka",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Surgeon",
      employer: "AIIMS Delhi",
      isLiving: true,
      email: "meera.verma@example.com",
      updatedAt: now,
    })
    .returning();

  const [parentRohan] = await db
    .insert(schema.persons)
    .values({
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
    })
    .returning();

  const [parentRahul] = await db
    .insert(schema.persons)
    .values({
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
    })
    .returning();

  const [parentAnanya] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Ananya",
      lastName: "Sharma",
      maidenName: "Singh",
      gender: "FEMALE",
      dateOfBirth: new Date("1994-10-15"),
      birthPlace: "Lucknow, Uttar Pradesh",
      nativePlace: "Lucknow, Uttar Pradesh",
      profession: "Marketing Manager",
      employer: "Amazon",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [parentAditya] = await db
    .insert(schema.persons)
    .values({
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
    })
    .returning();

  const [parentKavya] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Kavya",
      lastName: "Patel",
      maidenName: "Reddy",
      gender: "FEMALE",
      dateOfBirth: new Date("1992-08-25"),
      birthPlace: "Hyderabad, Telangana",
      nativePlace: "Hyderabad, Telangana",
      profession: "Data Scientist",
      employer: "Meta",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  // ========== GENERATION 5: Children (8 people) ==========
  const [childAarav] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Aarav",
      lastName: "Sharma",
      gender: "MALE",
      dateOfBirth: new Date("2015-01-20"),
      birthPlace: "Bangalore, Karnataka",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Student",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [childIsha] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Isha",
      lastName: "Sharma",
      gender: "FEMALE",
      dateOfBirth: new Date("2018-05-10"),
      birthPlace: "Bangalore, Karnataka",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Student",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [childVihaan] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Vihaan",
      lastName: "Verma",
      gender: "MALE",
      dateOfBirth: new Date("2016-11-08"),
      birthPlace: "Delhi",
      nativePlace: "Chennai, Tamil Nadu",
      profession: "Student",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [childSara] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Sara",
      lastName: "Verma",
      gender: "FEMALE",
      dateOfBirth: new Date("2019-03-22"),
      birthPlace: "Delhi",
      nativePlace: "Chennai, Tamil Nadu",
      profession: "Student",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [childKabir] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Kabir",
      lastName: "Sharma",
      gender: "MALE",
      dateOfBirth: new Date("2017-07-15"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Student",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [childRiya] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Riya",
      lastName: "Sharma",
      gender: "FEMALE",
      dateOfBirth: new Date("2020-09-30"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Toddler",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [childAryan] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Aryan",
      lastName: "Patel",
      gender: "MALE",
      dateOfBirth: new Date("2018-02-14"),
      birthPlace: "Mumbai, Maharashtra",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Student",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  const [childMira] = await db
    .insert(schema.persons)
    .values({
      id: crypto.randomUUID(),
      firstName: "Mira",
      lastName: "Patel",
      gender: "FEMALE",
      dateOfBirth: new Date("2021-06-05"),
      birthPlace: "Mumbai, Maharashtra",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Toddler",
      isLiving: true,
      updatedAt: now,
    })
    .returning();

  log.info({ count: 30, generations: 5 }, "Created family members");

  // ========== CREATE RELATIONSHIPS ==========
  log.info({ entity: "relationships" }, "Creating family relationships");

  // Helper function to create spouse relationship
  async function createSpouse(
    person1Id: string,
    person2Id: string,
    marriageDate?: Date
  ) {
    await db.insert(schema.relationships).values([
      {
        id: crypto.randomUUID(),
        personId: person1Id,
        relatedPersonId: person2Id,
        type: "SPOUSE",
        marriageDate,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        personId: person2Id,
        relatedPersonId: person1Id,
        type: "SPOUSE",
        marriageDate,
        updatedAt: now,
      },
    ]);
  }

  // Helper function to create parent-child relationship
  async function createParentChild(parentId: string, childId: string) {
    await db.insert(schema.relationships).values([
      {
        id: crypto.randomUUID(),
        personId: childId,
        relatedPersonId: parentId,
        type: "PARENT",
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        personId: parentId,
        relatedPersonId: childId,
        type: "CHILD",
        updatedAt: now,
      },
    ]);
  }

  // Helper function to create sibling relationship
  async function createSiblings(sibling1Id: string, sibling2Id: string) {
    await db.insert(schema.relationships).values([
      {
        id: crypto.randomUUID(),
        personId: sibling1Id,
        relatedPersonId: sibling2Id,
        type: "SIBLING",
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        personId: sibling2Id,
        relatedPersonId: sibling1Id,
        type: "SIBLING",
        updatedAt: now,
      },
    ]);
  }

  // Generation 1 spouses
  await createSpouse(
    ggGrandpaHari.id,
    ggGrandmaSavitri.id,
    new Date("1930-05-15")
  );
  await createSpouse(
    ggGrandpaRatan.id,
    ggGrandmaKusuma.id,
    new Date("1932-03-20")
  );

  // Generation 1 -> 2 (parent-child)
  await createParentChild(ggGrandpaHari.id, gGrandpaRajendra.id);
  await createParentChild(ggGrandmaSavitri.id, gGrandpaRajendra.id);
  await createParentChild(ggGrandpaRatan.id, gGrandpaMohan.id);
  await createParentChild(ggGrandmaKusuma.id, gGrandpaMohan.id);

  // Generation 2 spouses
  await createSpouse(
    gGrandpaRajendra.id,
    gGrandmaKamla.id,
    new Date("1958-02-20")
  );
  await createSpouse(
    gGrandpaMohan.id,
    gGrandmaLakshmi.id,
    new Date("1960-05-10")
  );

  // Generation 2 -> 3 (parent-child)
  await createParentChild(gGrandpaRajendra.id, grandpaVikram.id);
  await createParentChild(gGrandmaKamla.id, grandpaVikram.id);
  await createParentChild(gGrandpaRajendra.id, grandpaAjay.id);
  await createParentChild(gGrandmaKamla.id, grandpaAjay.id);
  await createParentChild(gGrandpaMohan.id, grandmaPriya.id);
  await createParentChild(gGrandmaLakshmi.id, grandmaPriya.id);
  await createParentChild(gGrandpaMohan.id, grandpaSanjay.id);
  await createParentChild(gGrandmaLakshmi.id, grandpaSanjay.id);

  // Generation 2 siblings
  await createSiblings(grandpaVikram.id, grandpaAjay.id);
  await createSiblings(grandmaPriya.id, grandpaSanjay.id);

  // Generation 3 spouses
  await createSpouse(grandpaVikram.id, grandmaPriya.id, new Date("1985-12-15"));
  await createSpouse(grandpaAjay.id, grandmaSunita.id, new Date("1990-03-22"));
  await createSpouse(grandpaSanjay.id, grandmaRekha.id, new Date("1988-11-08"));

  // Generation 3 -> 4 (parent-child)
  await createParentChild(grandpaVikram.id, parentArjun.id);
  await createParentChild(grandmaPriya.id, parentArjun.id);
  await createParentChild(grandpaVikram.id, parentMeera.id);
  await createParentChild(grandmaPriya.id, parentMeera.id);
  await createParentChild(grandpaAjay.id, parentRahul.id);
  await createParentChild(grandmaSunita.id, parentRahul.id);
  await createParentChild(grandpaSanjay.id, parentAditya.id);
  await createParentChild(grandmaRekha.id, parentAditya.id);

  // Generation 3 siblings
  await createSiblings(parentArjun.id, parentMeera.id);

  // Generation 4 spouses
  await createSpouse(parentArjun.id, parentNeha.id, new Date("2014-02-14"));
  await createSpouse(parentMeera.id, parentRohan.id, new Date("2015-11-20"));
  await createSpouse(parentRahul.id, parentAnanya.id, new Date("2016-05-15"));
  await createSpouse(parentAditya.id, parentKavya.id, new Date("2017-03-10"));

  // Generation 4 -> 5 (parent-child)
  await createParentChild(parentArjun.id, childAarav.id);
  await createParentChild(parentNeha.id, childAarav.id);
  await createParentChild(parentArjun.id, childIsha.id);
  await createParentChild(parentNeha.id, childIsha.id);
  await createParentChild(parentMeera.id, childVihaan.id);
  await createParentChild(parentRohan.id, childVihaan.id);
  await createParentChild(parentMeera.id, childSara.id);
  await createParentChild(parentRohan.id, childSara.id);
  await createParentChild(parentRahul.id, childKabir.id);
  await createParentChild(parentAnanya.id, childKabir.id);
  await createParentChild(parentRahul.id, childRiya.id);
  await createParentChild(parentAnanya.id, childRiya.id);
  await createParentChild(parentAditya.id, childAryan.id);
  await createParentChild(parentKavya.id, childAryan.id);
  await createParentChild(parentAditya.id, childMira.id);
  await createParentChild(parentKavya.id, childMira.id);

  // Generation 5 siblings
  await createSiblings(childAarav.id, childIsha.id);
  await createSiblings(childVihaan.id, childSara.id);
  await createSiblings(childKabir.id, childRiya.id);
  await createSiblings(childAryan.id, childMira.id);

  log.info({ entity: "relationships" }, "Family relationships created");

  // ========== CREATE ADMIN USER (linked to Arjun) ==========
  log.info({ entity: "adminUser" }, "Creating admin user");

  // Email is required, password is auto-generated if not set
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    log.error(
      { missingEnv: "ADMIN_EMAIL" },
      "ADMIN_EMAIL environment variable is required. Copy .env.example to .env."
    );
    await pool.end();
    process.exit(1);
  }

  // Auto-generate password if not provided
  const adminPassword =
    process.env.ADMIN_PASSWORD || crypto.randomUUID().slice(0, 16);
  const isGeneratedPassword = !process.env.ADMIN_PASSWORD;
  const passwordHash = await hashPassword(adminPassword);

  const [adminUser] = await db
    .insert(schema.users)
    .values({
      id: crypto.randomUUID(),
      email: adminEmail.toLowerCase(),
      name: "Arjun Sharma",
      passwordHash,
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
      personId: parentArjun.id,
      updatedAt: now,
    })
    .returning();

  await db.insert(schema.accounts).values({
    id: crypto.randomUUID(),
    userId: adminUser.id,
    accountId: adminEmail.toLowerCase(),
    providerId: "credential",
    password: passwordHash,
    updatedAt: now,
  });

  log.info({ email: adminEmail, userId: adminUser.id }, "Admin user created");

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

    log.info({ email: user.email, role: user.role }, "Test user created");
  }

  // Log seed completion summary
  log.info(
    {
      success: true,
      adminEmail,
      passwordGenerated: isGeneratedPassword,
      testUsers: [
        "admin@test.vamsa.local",
        "member@test.vamsa.local",
        "viewer@test.vamsa.local",
      ],
      familyTree: { persons: 30, generations: 5 },
    },
    "DEV SEED COMPLETED SUCCESSFULLY"
  );

  if (isGeneratedPassword) {
    log.warn(
      { generatedPassword: adminPassword },
      "Save this auto-generated password - it won't be shown again"
    );
  }

  await pool.end();
}

main().catch((e) => {
  log.withErr(e).msg("Dev seed failed");
  process.exit(1);
});
