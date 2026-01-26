#!/usr/bin/env bun
/**
 * Drizzle ORM Database Seed Script
 *
 * Creates comprehensive test data:
 * - 30 people across 5 generations
 * - Family relationships (spouse, parent-child, sibling)
 * - Geographic places with coordinates
 * - Timeline events (birth, death, marriage, graduation, career)
 * - Research sources and notes
 * - Media objects and links
 * - Test users (admin, member, viewer)
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
    console.log("Default family settings created.");
  }

  // Check if data already exists
  const existingPersons = await db.select().from(schema.persons);
  const existingUsers = await db.select().from(schema.users);
  console.log(
    `Current database state: ${existingPersons.length} persons, ${existingUsers.length} users`
  );

  if (existingPersons.length > 0 && existingUsers.length > 0) {
    console.log("Database already seeded. Skipping.");
    await pool.end();
    return;
  }

  if (existingPersons.length > 0 && existingUsers.length === 0) {
    console.log(
      'Persons exist but no users. Run: TRUNCATE "Person", "User", "Relationship" CASCADE; then reseed.'
    );
    await pool.end();
    return;
  }

  console.log("Creating 5-generation family tree...");

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

  console.log("Created 30 family members across 5 generations.");

  // ========== CREATE RELATIONSHIPS ==========
  console.log("Creating family relationships...");

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

  console.log("Created family relationships.");

  // ========== CREATE ADMIN USER (linked to Arjun) ==========
  console.log("Creating admin user...");

  // Email is required, password is auto-generated if not set
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error("ERROR: ADMIN_EMAIL environment variable is required.");
    console.error("Copy .env.example to .env and configure your credentials.");
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

    console.log(`Test user created: ${user.email}`);
  }

  console.log("========================================");
  console.log("SEED COMPLETED SUCCESSFULLY!");
  console.log("========================================");
  if (isGeneratedPassword) {
    console.log(`Admin: ${adminEmail}`);
    console.log(`Password (auto-generated): ${adminPassword}`);
    console.log("⚠️  Save this password - it won't be shown again!");
  } else {
    console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  }
  console.log("Test Admin: admin@test.vamsa.local / TestAdmin123!");
  console.log("Test Member: member@test.vamsa.local / TestMember123!");
  console.log("Test Viewer: viewer@test.vamsa.local / TestViewer123!");
  console.log("========================================");
  console.log("FAMILY TREE DATA:");
  console.log("- 30 people across 5 generations");
  console.log("- Gen 1: Hari & Savitri Sharma, Ratan & Kusuma Patel");
  console.log("- Gen 2: Rajendra & Kamla, Mohan & Lakshmi");
  console.log("- Gen 3: Vikram & Priya, Ajay & Sunita, Sanjay & Rekha");
  console.log(
    "- Gen 4: Arjun (ADMIN) & Neha, Meera & Rohan, Rahul & Ananya, Aditya & Kavya"
  );
  console.log("- Gen 5: Aarav, Isha, Vihaan, Sara, Kabir, Riya, Aryan, Mira");
  console.log("========================================");

  await pool.end();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
