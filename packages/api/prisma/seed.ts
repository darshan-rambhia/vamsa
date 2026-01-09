import {
  PrismaClient,
  UserRole,
  Gender,
  RelationshipType,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from monorepo root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database seed...");

  // Create family settings
  const existingSettings = await prisma.familySettings.findFirst();
  if (!existingSettings) {
    await prisma.familySettings.create({
      data: {
        familyName: process.env.VITE_APP_NAME || "The Sharma Family",
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
      },
    });
    console.log("Default family settings created.");
  }

  // Check if persons already exist
  const existingPersons = await prisma.person.count();
  const existingUsers = await prisma.user.count();
  console.log(`Current database state: ${existingPersons} persons, ${existingUsers} users`);

  if (existingPersons > 0) {
    console.log("Persons already exist. Skipping person and user creation.");
    return;
  }

  console.log("Creating 5-generation family tree...");

  // ========== GENERATION 1: Great-Great-Grandparents (4 people) ==========
  const ggGrandpaHari = await prisma.person.create({
    data: {
      firstName: "Hari",
      lastName: "Sharma",
      gender: Gender.MALE,
      dateOfBirth: new Date("1905-03-15"),
      dateOfPassing: new Date("1980-06-20"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Farmer",
      isLiving: false,
      bio: "Patriarch of the Sharma family, owned vast farmlands in Rajasthan.",
    },
  });

  const ggGrandmaSavitri = await prisma.person.create({
    data: {
      firstName: "Savitri",
      lastName: "Sharma",
      maidenName: "Verma",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1910-07-22"),
      dateOfPassing: new Date("1985-11-10"),
      birthPlace: "Jodhpur, Rajasthan",
      nativePlace: "Jodhpur, Rajasthan",
      profession: "Homemaker",
      isLiving: false,
    },
  });

  const ggGrandpaRatan = await prisma.person.create({
    data: {
      firstName: "Ratan",
      lastName: "Patel",
      gender: Gender.MALE,
      dateOfBirth: new Date("1908-01-10"),
      dateOfPassing: new Date("1978-09-05"),
      birthPlace: "Ahmedabad, Gujarat",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Merchant",
      isLiving: false,
    },
  });

  const ggGrandmaKusuma = await prisma.person.create({
    data: {
      firstName: "Kusuma",
      lastName: "Patel",
      maidenName: "Shah",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1912-04-18"),
      dateOfPassing: new Date("1990-02-28"),
      birthPlace: "Surat, Gujarat",
      nativePlace: "Surat, Gujarat",
      profession: "Homemaker",
      isLiving: false,
    },
  });

  // ========== GENERATION 2: Great-Grandparents (4 people) ==========
  const gGrandpaRajendra = await prisma.person.create({
    data: {
      firstName: "Rajendra",
      lastName: "Sharma",
      gender: Gender.MALE,
      dateOfBirth: new Date("1935-03-15"),
      dateOfPassing: new Date("2018-11-20"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Professor",
      employer: "University of Rajasthan",
      isLiving: false,
      bio: "A devoted educator who spent 40 years teaching mathematics.",
    },
  });

  const gGrandmaKamla = await prisma.person.create({
    data: {
      firstName: "Kamla",
      lastName: "Sharma",
      maidenName: "Gupta",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1940-07-22"),
      birthPlace: "Agra, Uttar Pradesh",
      nativePlace: "Agra, Uttar Pradesh",
      profession: "Homemaker",
      isLiving: true,
      bio: "The loving matriarch of the Sharma family, still going strong at 85.",
    },
  });

  const gGrandpaMohan = await prisma.person.create({
    data: {
      firstName: "Mohan",
      lastName: "Patel",
      gender: Gender.MALE,
      dateOfBirth: new Date("1938-01-10"),
      dateOfPassing: new Date("2015-06-05"),
      birthPlace: "Ahmedabad, Gujarat",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Businessman",
      employer: "Patel Textiles",
      isLiving: false,
    },
  });

  const gGrandmaLakshmi = await prisma.person.create({
    data: {
      firstName: "Lakshmi",
      lastName: "Patel",
      maidenName: "Desai",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1942-09-18"),
      birthPlace: "Surat, Gujarat",
      nativePlace: "Surat, Gujarat",
      profession: "Retired Teacher",
      isLiving: true,
    },
  });

  // ========== GENERATION 3: Grandparents (6 people) ==========
  const grandpaVikram = await prisma.person.create({
    data: {
      firstName: "Vikram",
      lastName: "Sharma",
      gender: Gender.MALE,
      dateOfBirth: new Date("1960-05-12"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Senior Software Architect",
      employer: "Infosys",
      isLiving: true,
      email: "vikram.sharma@example.com",
      phone: "+91 98765 43210",
      bio: "Tech pioneer who helped build India's IT industry.",
    },
  });

  const grandmaPriya = await prisma.person.create({
    data: {
      firstName: "Priya",
      lastName: "Sharma",
      maidenName: "Patel",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1963-11-25"),
      birthPlace: "Ahmedabad, Gujarat",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Chief Medical Officer",
      employer: "Apollo Hospital",
      isLiving: true,
      email: "priya.sharma@example.com",
    },
  });

  const grandpaAjay = await prisma.person.create({
    data: {
      firstName: "Ajay",
      lastName: "Sharma",
      gender: Gender.MALE,
      dateOfBirth: new Date("1965-02-28"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Architect",
      employer: "Sharma Design Studio",
      isLiving: true,
    },
  });

  const grandmaSunita = await prisma.person.create({
    data: {
      firstName: "Sunita",
      lastName: "Sharma",
      maidenName: "Kapoor",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1968-08-14"),
      birthPlace: "Delhi",
      nativePlace: "Delhi",
      profession: "Interior Designer",
      isLiving: true,
    },
  });

  const grandpaSanjay = await prisma.person.create({
    data: {
      firstName: "Sanjay",
      lastName: "Patel",
      gender: Gender.MALE,
      dateOfBirth: new Date("1962-04-05"),
      birthPlace: "Ahmedabad, Gujarat",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Textile Manufacturer",
      employer: "Patel Textiles",
      isLiving: true,
    },
  });

  const grandmaRekha = await prisma.person.create({
    data: {
      firstName: "Rekha",
      lastName: "Patel",
      maidenName: "Mehta",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1966-12-20"),
      birthPlace: "Mumbai, Maharashtra",
      nativePlace: "Mumbai, Maharashtra",
      profession: "Fashion Designer",
      isLiving: true,
    },
  });

  // ========== GENERATION 4: Parents (8 people) - ADMIN IS HERE ==========
  const parentArjun = await prisma.person.create({
    data: {
      firstName: "Arjun",
      lastName: "Sharma",
      gender: Gender.MALE,
      dateOfBirth: new Date("1988-04-08"),
      birthPlace: "Bangalore, Karnataka",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Product Director",
      employer: "Google",
      isLiving: true,
      email: "arjun.sharma@example.com",
      bio: "Tech enthusiast and family historian. Maintains the family tree.",
    },
  });

  const parentNeha = await prisma.person.create({
    data: {
      firstName: "Neha",
      lastName: "Sharma",
      maidenName: "Gupta",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1990-09-15"),
      birthPlace: "Delhi",
      nativePlace: "Delhi",
      profession: "UX Designer",
      employer: "Microsoft",
      isLiving: true,
      email: "neha.sharma@example.com",
    },
  });

  const parentMeera = await prisma.person.create({
    data: {
      firstName: "Meera",
      lastName: "Verma",
      maidenName: "Sharma",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1991-12-03"),
      birthPlace: "Bangalore, Karnataka",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Surgeon",
      employer: "AIIMS Delhi",
      isLiving: true,
      email: "meera.verma@example.com",
    },
  });

  const parentRohan = await prisma.person.create({
    data: {
      firstName: "Rohan",
      lastName: "Verma",
      gender: Gender.MALE,
      dateOfBirth: new Date("1989-07-20"),
      birthPlace: "Chennai, Tamil Nadu",
      nativePlace: "Chennai, Tamil Nadu",
      profession: "Cardiologist",
      employer: "Fortis Hospital",
      isLiving: true,
    },
  });

  const parentRahul = await prisma.person.create({
    data: {
      firstName: "Rahul",
      lastName: "Sharma",
      gender: Gender.MALE,
      dateOfBirth: new Date("1992-06-20"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Civil Engineer",
      employer: "L&T Construction",
      isLiving: true,
    },
  });

  const parentAnanya = await prisma.person.create({
    data: {
      firstName: "Ananya",
      lastName: "Sharma",
      maidenName: "Singh",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1994-10-15"),
      birthPlace: "Lucknow, Uttar Pradesh",
      nativePlace: "Lucknow, Uttar Pradesh",
      profession: "Marketing Manager",
      employer: "Amazon",
      isLiving: true,
    },
  });

  const parentAditya = await prisma.person.create({
    data: {
      firstName: "Aditya",
      lastName: "Patel",
      gender: Gender.MALE,
      dateOfBirth: new Date("1990-03-12"),
      birthPlace: "Ahmedabad, Gujarat",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Investment Banker",
      employer: "Goldman Sachs",
      isLiving: true,
    },
  });

  const parentKavya = await prisma.person.create({
    data: {
      firstName: "Kavya",
      lastName: "Patel",
      maidenName: "Reddy",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1992-08-25"),
      birthPlace: "Hyderabad, Telangana",
      nativePlace: "Hyderabad, Telangana",
      profession: "Data Scientist",
      employer: "Meta",
      isLiving: true,
    },
  });

  // ========== GENERATION 5: Children (8 people) ==========
  const childAarav = await prisma.person.create({
    data: {
      firstName: "Aarav",
      lastName: "Sharma",
      gender: Gender.MALE,
      dateOfBirth: new Date("2015-01-20"),
      birthPlace: "Bangalore, Karnataka",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Student",
      isLiving: true,
    },
  });

  const childIsha = await prisma.person.create({
    data: {
      firstName: "Isha",
      lastName: "Sharma",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("2018-05-10"),
      birthPlace: "Bangalore, Karnataka",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Student",
      isLiving: true,
    },
  });

  const childVihaan = await prisma.person.create({
    data: {
      firstName: "Vihaan",
      lastName: "Verma",
      gender: Gender.MALE,
      dateOfBirth: new Date("2016-11-08"),
      birthPlace: "Delhi",
      nativePlace: "Chennai, Tamil Nadu",
      profession: "Student",
      isLiving: true,
    },
  });

  const childSara = await prisma.person.create({
    data: {
      firstName: "Sara",
      lastName: "Verma",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("2019-03-22"),
      birthPlace: "Delhi",
      nativePlace: "Chennai, Tamil Nadu",
      profession: "Student",
      isLiving: true,
    },
  });

  const childKabir = await prisma.person.create({
    data: {
      firstName: "Kabir",
      lastName: "Sharma",
      gender: Gender.MALE,
      dateOfBirth: new Date("2017-07-15"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Student",
      isLiving: true,
    },
  });

  const childRiya = await prisma.person.create({
    data: {
      firstName: "Riya",
      lastName: "Sharma",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("2020-09-30"),
      birthPlace: "Jaipur, Rajasthan",
      nativePlace: "Jaipur, Rajasthan",
      profession: "Toddler",
      isLiving: true,
    },
  });

  const childAryan = await prisma.person.create({
    data: {
      firstName: "Aryan",
      lastName: "Patel",
      gender: Gender.MALE,
      dateOfBirth: new Date("2018-02-14"),
      birthPlace: "Mumbai, Maharashtra",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Student",
      isLiving: true,
    },
  });

  const childMira = await prisma.person.create({
    data: {
      firstName: "Mira",
      lastName: "Patel",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("2021-06-05"),
      birthPlace: "Mumbai, Maharashtra",
      nativePlace: "Ahmedabad, Gujarat",
      profession: "Toddler",
      isLiving: true,
    },
  });

  console.log("Created 30 family members across 5 generations.");

  // ========== CREATE RELATIONSHIPS ==========
  console.log("Creating family relationships...");

  // Helper function to create spouse relationship
  async function createSpouse(
    person1Id: string,
    person2Id: string,
    marriageDate?: Date
  ) {
    await prisma.relationship.create({
      data: {
        personId: person1Id,
        relatedPersonId: person2Id,
        type: RelationshipType.SPOUSE,
        marriageDate,
      },
    });
    await prisma.relationship.create({
      data: {
        personId: person2Id,
        relatedPersonId: person1Id,
        type: RelationshipType.SPOUSE,
        marriageDate,
      },
    });
  }

  // Helper function to create parent-child relationship
  async function createParentChild(parentId: string, childId: string) {
    await prisma.relationship.create({
      data: {
        personId: childId,
        relatedPersonId: parentId,
        type: RelationshipType.PARENT,
      },
    });
    await prisma.relationship.create({
      data: {
        personId: parentId,
        relatedPersonId: childId,
        type: RelationshipType.CHILD,
      },
    });
  }

  // Helper function to create sibling relationship
  async function createSiblings(sibling1Id: string, sibling2Id: string) {
    await prisma.relationship.create({
      data: {
        personId: sibling1Id,
        relatedPersonId: sibling2Id,
        type: RelationshipType.SIBLING,
      },
    });
    await prisma.relationship.create({
      data: {
        personId: sibling2Id,
        relatedPersonId: sibling1Id,
        type: RelationshipType.SIBLING,
      },
    });
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

  const adminEmail = process.env.ADMIN_EMAIL || "arjun@sharma.family";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      name: "Arjun Sharma",
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      personId: parentArjun.id, // Link admin to Arjun
    },
  });

  console.log(`Admin user created: ${adminEmail} (linked to Arjun Sharma)`);

  // Create test users for E2E tests
  const testUsers = [
    {
      email: "admin@test.vamsa.local",
      name: "Test Admin",
      password: "TestAdmin123!",
      role: UserRole.ADMIN,
    },
    {
      email: "member@test.vamsa.local",
      name: "Test Member",
      password: "TestMember123!",
      role: UserRole.MEMBER,
    },
    {
      email: "viewer@test.vamsa.local",
      name: "Test Viewer",
      password: "TestViewer123!",
      role: UserRole.VIEWER,
    },
  ];

  for (const user of testUsers) {
    const hash = await bcrypt.hash(user.password, 12);
    await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        passwordHash: hash,
        role: user.role,
        isActive: true,
      },
    });
    console.log(`Test user created: ${user.email}`);
  }

  console.log("\n========================================");
  console.log("SEED COMPLETED SUCCESSFULLY!");
  console.log("========================================");
  console.log(`Admin Email: ${adminEmail}`);
  console.log(`Admin Password: ${adminPassword}`);
  console.log("========================================");
  console.log("Family Tree: 30 people across 5 generations");
  console.log("- Gen 1: Hari & Savitri Sharma, Ratan & Kusuma Patel");
  console.log("- Gen 2: Rajendra & Kamla, Mohan & Lakshmi");
  console.log("- Gen 3: Vikram & Priya, Ajay & Sunita, Sanjay & Rekha");
  console.log(
    "- Gen 4: Arjun (ADMIN) & Neha, Meera & Rohan, Rahul & Ananya, Aditya & Kavya"
  );
  console.log("- Gen 5: Aarav, Isha, Vihaan, Sara, Kabir, Riya, Aryan, Mira");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
