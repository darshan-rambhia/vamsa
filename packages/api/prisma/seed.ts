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
import { logger } from "@vamsa/lib";

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
  logger.info("Starting database seed...");

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
    logger.info("Default family settings created.");
  }

  // Check if persons already exist
  const existingPersons = await prisma.person.count();
  const existingUsers = await prisma.user.count();
  logger.info(
    { persons: existingPersons, users: existingUsers },
    "Current database state"
  );

  if (existingPersons > 0) {
    logger.info("Persons already exist. Skipping person and user creation.");
    return;
  }

  logger.info("Creating 5-generation family tree...");

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

  logger.info("Created 30 family members across 5 generations.");

  // ========== CREATE RELATIONSHIPS ==========
  logger.info("Creating family relationships...");

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

  logger.info("Created family relationships.");

  // ========== CREATE PLACES FOR GEOGRAPHIC DATA ==========
  logger.info("Creating geographic places for maps...");

  const places = await Promise.all([
    prisma.place.create({
      data: {
        name: "India",
        placeType: "COUNTRY",
        description: "Republic of India",
      },
    }),
    prisma.place.create({
      data: {
        name: "Rajasthan",
        placeType: "STATE",
        description: "State in northwestern India",
      },
    }),
    prisma.place.create({
      data: {
        name: "Gujarat",
        placeType: "STATE",
        description: "State in western India",
      },
    }),
    prisma.place.create({
      data: {
        name: "Maharashtra",
        placeType: "STATE",
        description: "State in western India",
      },
    }),
    prisma.place.create({
      data: {
        name: "Karnataka",
        placeType: "STATE",
        description: "State in southern India",
      },
    }),
    prisma.place.create({
      data: {
        name: "Tamil Nadu",
        placeType: "STATE",
        description: "State in southern India",
      },
    }),
    prisma.place.create({
      data: {
        name: "Uttar Pradesh",
        placeType: "STATE",
        description: "State in northern India",
      },
    }),
    prisma.place.create({
      data: {
        name: "Telangana",
        placeType: "STATE",
        description: "State in southern India",
      },
    }),
    prisma.place.create({
      data: {
        name: "West Bengal",
        placeType: "STATE",
        description: "State in eastern India",
      },
    }),
    prisma.place.create({
      data: {
        name: "Delhi",
        placeType: "CITY",
        latitude: 28.6139,
        longitude: 77.209,
        description: "Capital of India, located in northern India",
      },
    }),
  ]);

  const placeMap = {
    india: places[0],
    rajasthan: places[1],
    gujarat: places[2],
    maharashtra: places[3],
    karnataka: places[4],
    tamilnadu: places[5],
    uttarpradesh: places[6],
    telangana: places[7],
    westbengal: places[8],
    delhi: places[9],
  };

  // Create cities
  const cities = await Promise.all([
    prisma.place.create({
      data: {
        name: "Jaipur",
        placeType: "CITY",
        latitude: 26.9124,
        longitude: 75.7873,
        description: "The Pink City, capital of Rajasthan",
        parentId: placeMap.rajasthan.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Jodhpur",
        placeType: "CITY",
        latitude: 26.2389,
        longitude: 73.0243,
        description: "The Blue City of Rajasthan",
        parentId: placeMap.rajasthan.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Ahmedabad",
        placeType: "CITY",
        latitude: 23.0225,
        longitude: 72.5714,
        description: "City in Gujarat, business hub",
        parentId: placeMap.gujarat.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Surat",
        placeType: "CITY",
        latitude: 21.1458,
        longitude: 72.8355,
        description: "Diamond hub in Gujarat",
        parentId: placeMap.gujarat.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Mumbai",
        placeType: "CITY",
        latitude: 19.0760,
        longitude: 72.8777,
        description: "Financial capital of India",
        parentId: placeMap.maharashtra.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Bangalore",
        placeType: "CITY",
        latitude: 12.9716,
        longitude: 77.5946,
        description: "IT hub of India",
        parentId: placeMap.karnataka.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Chennai",
        placeType: "CITY",
        latitude: 13.0827,
        longitude: 80.2707,
        description: "Capital of Tamil Nadu",
        parentId: placeMap.tamilnadu.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Agra",
        placeType: "CITY",
        latitude: 27.1767,
        longitude: 78.008,
        description: "City of the Taj Mahal",
        parentId: placeMap.uttarpradesh.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Lucknow",
        placeType: "CITY",
        latitude: 26.8467,
        longitude: 80.9462,
        description: "Capital of Uttar Pradesh",
        parentId: placeMap.uttarpradesh.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Hyderabad",
        placeType: "CITY",
        latitude: 17.3850,
        longitude: 78.4867,
        description: "Tech city and Pearl of the South",
        parentId: placeMap.telangana.id,
      },
    }),
    prisma.place.create({
      data: {
        name: "Kolkata",
        placeType: "CITY",
        latitude: 22.5726,
        longitude: 88.3639,
        description: "Cultural capital of India",
        parentId: placeMap.westbengal.id,
      },
    }),
  ]);

  logger.info("Created 21 places for geographic visualization.");

  // ========== CREATE SOURCES FOR RESEARCH DATA ==========
  logger.info("Creating sources for research citations...");

  const sources = await Promise.all([
    prisma.source.create({
      data: {
        title: "Birth Certificate - Hari Sharma",
        sourceType: "Birth Certificate",
        description: "Official birth certificate from Jaipur Registry, 1905",
        author: "Jaipur Municipal Corporation",
        confidence: "HIGH",
        notes: "Original document verified with government records",
      },
    }),
    prisma.source.create({
      data: {
        title: "Marriage Record - Hari & Savitri",
        sourceType: "Marriage Record",
        description: "Marriage registration from 1930",
        author: "Jaipur District Registrar",
        confidence: "HIGH",
      },
    }),
    prisma.source.create({
      data: {
        title: "Census Records 1951 - Sharma Family",
        sourceType: "Census Record",
        description: "India Census of 1951, household listing for Jaipur",
        publicationDate: "1951",
        confidence: "MEDIUM",
      },
    }),
    prisma.source.create({
      data: {
        title: "Family Photo Archive - 1970s",
        sourceType: "Photograph Collection",
        description: "Personal family photographs from Rajendra's collection",
        confidence: "MEDIUM",
      },
    }),
    prisma.source.create({
      data: {
        title: "Death Certificate - Hari Sharma",
        sourceType: "Death Certificate",
        description: "Death certificate from Jaipur Hospital, 1980",
        author: "Jaipur Municipal Corporation",
        confidence: "HIGH",
      },
    }),
    prisma.source.create({
      data: {
        title: "Education Records - University of Rajasthan",
        sourceType: "Academic Record",
        description: "University records for Professor Rajendra Sharma",
        author: "University of Rajasthan",
        confidence: "HIGH",
      },
    }),
    prisma.source.create({
      data: {
        title: "Business Registration - Patel Textiles",
        sourceType: "Business Record",
        description: "Business registration and incorporation documents",
        confidence: "MEDIUM",
      },
    }),
    prisma.source.create({
      data: {
        title: "Newspaper Archive - Sharma Family",
        sourceType: "Newspaper Archive",
        description: "Local newspaper articles mentioning family members",
        confidence: "LOW",
      },
    }),
    prisma.source.create({
      data: {
        title: "Death Certificate - Savitri Sharma",
        sourceType: "Death Certificate",
        description: "Death certificate from Jodhpur, 1985",
        author: "Jodhpur District Registrar",
        confidence: "HIGH",
      },
    }),
    prisma.source.create({
      data: {
        title: "Hospital Records - Rajendra Sharma",
        sourceType: "Medical Record",
        description: "Medical records from Jaipur Medical College",
        author: "Jaipur Medical College",
        confidence: "HIGH",
      },
    }),
    prisma.source.create({
      data: {
        title: "Property Records - Patel Family",
        sourceType: "Land Record",
        description: "Ahmedabad property registration documents from 1960s",
        author: "Ahmedabad Municipal Records",
        confidence: "MEDIUM",
      },
    }),
    prisma.source.create({
      data: {
        title: "Employment Record - Infosys",
        sourceType: "Employment Record",
        description: "Infosys employment records for Vikram Sharma",
        author: "Infosys Human Resources",
        confidence: "HIGH",
      },
    }),
    prisma.source.create({
      data: {
        title: "Marriage Certificate - Vikram & Priya",
        sourceType: "Marriage Record",
        description: "Marriage registration from Bangalore, 1985",
        author: "Bangalore District Registrar",
        confidence: "HIGH",
      },
    }),
  ]);

  logger.info("Created 13 source records for research citations.");

  // ========== CREATE EVENTS ACROSS TIMELINE ==========
  logger.info("Creating 25+ diverse events spanning 1900s-2020s...");

  const events = await Promise.all([
    // Generation 1 events
    prisma.event.create({
      data: {
        personId: ggGrandpaHari.id,
        type: "BIRTH",
        date: new Date("1905-03-15"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Birth of Hari Sharma in Jaipur",
      },
    }),
    prisma.event.create({
      data: {
        personId: ggGrandmaSavitri.id,
        type: "BIRTH",
        date: new Date("1910-07-22"),
        place: "Jodhpur, Rajasthan",
        placeId: cities[1].id,
        description: "Birth of Savitri Verma",
      },
    }),
    prisma.event.create({
      data: {
        personId: ggGrandpaHari.id,
        type: "MARRIAGE",
        date: new Date("1930-05-15"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Marriage of Hari Sharma and Savitri Verma",
      },
    }),
    prisma.event.create({
      data: {
        personId: ggGrandpaRatan.id,
        type: "BIRTH",
        date: new Date("1908-01-10"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Birth of Ratan Patel",
      },
    }),
    prisma.event.create({
      data: {
        personId: ggGrandmaKusuma.id,
        type: "BIRTH",
        date: new Date("1912-04-18"),
        place: "Surat, Gujarat",
        placeId: cities[3].id,
        description: "Birth of Kusuma Shah",
      },
    }),
    prisma.event.create({
      data: {
        personId: ggGrandpaRatan.id,
        type: "MARRIAGE",
        date: new Date("1932-03-20"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Marriage of Ratan Patel and Kusuma Shah",
      },
    }),
    // Generation 2 events
    prisma.event.create({
      data: {
        personId: gGrandpaRajendra.id,
        type: "BIRTH",
        date: new Date("1935-03-15"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Birth of Rajendra Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: gGrandpaRajendra.id,
        type: "GRADUATION",
        date: new Date("1956-06-15"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Rajendra graduates with degree in Mathematics from University of Rajasthan",
      },
    }),
    prisma.event.create({
      data: {
        personId: gGrandmaKamla.id,
        type: "BIRTH",
        date: new Date("1940-07-22"),
        place: "Agra, Uttar Pradesh",
        placeId: cities[7].id,
        description: "Birth of Kamla Gupta",
      },
    }),
    prisma.event.create({
      data: {
        personId: gGrandpaRajendra.id,
        type: "MARRIAGE",
        date: new Date("1958-02-20"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Marriage of Rajendra Sharma and Kamla Gupta",
      },
    }),
    prisma.event.create({
      data: {
        personId: gGrandpaMohan.id,
        type: "BIRTH",
        date: new Date("1938-01-10"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Birth of Mohan Patel",
      },
    }),
    prisma.event.create({
      data: {
        personId: gGrandmaLakshmi.id,
        type: "BIRTH",
        date: new Date("1942-09-18"),
        place: "Surat, Gujarat",
        placeId: cities[3].id,
        description: "Birth of Lakshmi Desai",
      },
    }),
    prisma.event.create({
      data: {
        personId: gGrandpaMohan.id,
        type: "MARRIAGE",
        date: new Date("1960-05-10"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Marriage of Mohan Patel and Lakshmi Desai",
      },
    }),
    prisma.event.create({
      data: {
        personId: ggGrandpaHari.id,
        type: "DEATH",
        date: new Date("1980-06-20"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Death of Hari Sharma at age 75",
      },
    }),
    // Generation 3 events
    prisma.event.create({
      data: {
        personId: grandpaVikram.id,
        type: "BIRTH",
        date: new Date("1960-05-12"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Birth of Vikram Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaVikram.id,
        type: "GRADUATION",
        date: new Date("1982-06-15"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Vikram graduates with degree in Computer Science",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaVikram.id,
        type: "CUSTOM",
        date: new Date("1985-01-15"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Vikram joins Infosys - career milestone in IT industry",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandmaPriya.id,
        type: "BIRTH",
        date: new Date("1963-11-25"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Birth of Priya Patel",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandmaPriya.id,
        type: "GRADUATION",
        date: new Date("1985-07-20"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Priya graduates with M.D. from Delhi Medical College",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaVikram.id,
        type: "MARRIAGE",
        date: new Date("1985-12-15"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Marriage of Vikram Sharma and Priya Patel",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaAjay.id,
        type: "BIRTH",
        date: new Date("1965-02-28"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Birth of Ajay Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandmaSunita.id,
        type: "BIRTH",
        date: new Date("1968-08-14"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Birth of Sunita Kapoor",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaAjay.id,
        type: "MARRIAGE",
        date: new Date("1990-03-22"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Marriage of Ajay Sharma and Sunita Kapoor",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaSanjay.id,
        type: "BIRTH",
        date: new Date("1962-04-05"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Birth of Sanjay Patel",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandmaRekha.id,
        type: "BIRTH",
        date: new Date("1966-12-20"),
        place: "Mumbai, Maharashtra",
        placeId: cities[4].id,
        description: "Birth of Rekha Mehta",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaSanjay.id,
        type: "MARRIAGE",
        date: new Date("1988-11-08"),
        place: "Mumbai, Maharashtra",
        placeId: cities[4].id,
        description: "Marriage of Sanjay Patel and Rekha Mehta",
      },
    }),
    // Generation 4 events
    prisma.event.create({
      data: {
        personId: parentArjun.id,
        type: "BIRTH",
        date: new Date("1988-04-08"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Birth of Arjun Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentArjun.id,
        type: "GRADUATION",
        date: new Date("2010-06-15"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Arjun graduates with B.Tech in Computer Engineering",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentArjun.id,
        type: "CUSTOM",
        date: new Date("2012-08-01"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Arjun joins Google as Software Engineer",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentNeha.id,
        type: "BIRTH",
        date: new Date("1990-09-15"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Birth of Neha Gupta",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentNeha.id,
        type: "GRADUATION",
        date: new Date("2012-07-10"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Neha graduates with degree in Design from NIFT Delhi",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentArjun.id,
        type: "MARRIAGE",
        date: new Date("2014-02-14"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Marriage of Arjun Sharma and Neha Gupta - Valentine's Day Wedding",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentMeera.id,
        type: "BIRTH",
        date: new Date("1991-12-03"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Birth of Meera Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentMeera.id,
        type: "GRADUATION",
        date: new Date("2014-06-20"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Meera graduates with M.D. from AIIMS Delhi",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentRohan.id,
        type: "BIRTH",
        date: new Date("1989-07-20"),
        place: "Chennai, Tamil Nadu",
        placeId: cities[6].id,
        description: "Birth of Rohan Verma",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentRohan.id,
        type: "GRADUATION",
        date: new Date("2012-05-15"),
        place: "Chennai, Tamil Nadu",
        placeId: cities[6].id,
        description: "Rohan graduates with M.D., specialization in Cardiology",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentMeera.id,
        type: "MARRIAGE",
        date: new Date("2015-11-20"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Marriage of Meera Sharma and Rohan Verma",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentRahul.id,
        type: "BIRTH",
        date: new Date("1992-06-20"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Birth of Rahul Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentAnanya.id,
        type: "BIRTH",
        date: new Date("1994-10-15"),
        place: "Lucknow, Uttar Pradesh",
        placeId: cities[8].id,
        description: "Birth of Ananya Singh",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentRahul.id,
        type: "MARRIAGE",
        date: new Date("2016-05-15"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Marriage of Rahul Sharma and Ananya Singh",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentAditya.id,
        type: "BIRTH",
        date: new Date("1990-03-12"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Birth of Aditya Patel",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentKavya.id,
        type: "BIRTH",
        date: new Date("1992-08-25"),
        place: "Hyderabad, Telangana",
        description: "Birth of Kavya Reddy",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentAditya.id,
        type: "MARRIAGE",
        date: new Date("2017-03-10"),
        place: "Mumbai, Maharashtra",
        placeId: cities[4].id,
        description: "Marriage of Aditya Patel and Kavya Reddy",
      },
    }),
    // Generation 5 events
    prisma.event.create({
      data: {
        personId: childAarav.id,
        type: "BIRTH",
        date: new Date("2015-01-20"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Birth of Aarav Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: childIsha.id,
        type: "BIRTH",
        date: new Date("2018-05-10"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Birth of Isha Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: childVihaan.id,
        type: "BIRTH",
        date: new Date("2016-11-08"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Birth of Vihaan Verma",
      },
    }),
    prisma.event.create({
      data: {
        personId: childSara.id,
        type: "BIRTH",
        date: new Date("2019-03-22"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Birth of Sara Verma",
      },
    }),
    prisma.event.create({
      data: {
        personId: childKabir.id,
        type: "BIRTH",
        date: new Date("2017-07-15"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Birth of Kabir Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: childRiya.id,
        type: "BIRTH",
        date: new Date("2020-09-30"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Birth of Riya Sharma",
      },
    }),
    prisma.event.create({
      data: {
        personId: childAryan.id,
        type: "BIRTH",
        date: new Date("2018-02-14"),
        place: "Mumbai, Maharashtra",
        placeId: cities[4].id,
        description: "Birth of Aryan Patel",
      },
    }),
    prisma.event.create({
      data: {
        personId: childMira.id,
        type: "BIRTH",
        date: new Date("2021-06-05"),
        place: "Mumbai, Maharashtra",
        placeId: cities[4].id,
        description: "Birth of Mira Patel",
      },
    }),
    // Additional diverse events for timeline visualization
    prisma.event.create({
      data: {
        personId: ggGrandpaRatan.id,
        type: "DEATH",
        date: new Date("1978-09-05"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Death of Ratan Patel at age 70",
      },
    }),
    prisma.event.create({
      data: {
        personId: ggGrandmaKusuma.id,
        type: "DEATH",
        date: new Date("1990-02-28"),
        place: "Surat, Gujarat",
        placeId: cities[3].id,
        description: "Death of Kusuma Patel at age 77",
      },
    }),
    prisma.event.create({
      data: {
        personId: gGrandpaRajendra.id,
        type: "DEATH",
        date: new Date("2018-11-20"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Death of Professor Rajendra Sharma at age 83",
      },
    }),
    prisma.event.create({
      data: {
        personId: gGrandpaMohan.id,
        type: "DEATH",
        date: new Date("2015-06-05"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Death of Mohan Patel at age 77",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaAjay.id,
        type: "GRADUATION",
        date: new Date("1987-06-10"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Ajay completes B.Arch from School of Architecture",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandmaSunita.id,
        type: "GRADUATION",
        date: new Date("1990-06-15"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Sunita completes degree in Interior Design",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaSanjay.id,
        type: "GRADUATION",
        date: new Date("1984-06-20"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Sanjay completes B.Com from Gujarat University",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandmaRekha.id,
        type: "GRADUATION",
        date: new Date("1988-06-12"),
        place: "Mumbai, Maharashtra",
        placeId: cities[4].id,
        description: "Rekha completes degree in Fashion Design",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaSanjay.id,
        type: "CUSTOM",
        date: new Date("1990-03-01"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Sanjay starts textile manufacturing business",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentMeera.id,
        type: "CUSTOM",
        date: new Date("2018-07-01"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Meera becomes Chief Medical Officer at Apollo Hospital",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentNeha.id,
        type: "CUSTOM",
        date: new Date("2015-01-15"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Neha joins Microsoft as Senior UX Designer",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentRohan.id,
        type: "CUSTOM",
        date: new Date("2017-05-01"),
        place: "Delhi",
        placeId: placeMap.delhi.id,
        description: "Rohan joins Fortis Hospital as Cardiologist",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentRahul.id,
        type: "GRADUATION",
        date: new Date("2014-06-15"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Rahul graduates with degree in Civil Engineering",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentAnanya.id,
        type: "GRADUATION",
        date: new Date("2016-06-20"),
        place: "Lucknow, Uttar Pradesh",
        placeId: cities[8].id,
        description: "Ananya completes degree in Business Administration",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentAditya.id,
        type: "GRADUATION",
        date: new Date("2012-07-10"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Aditya completes MBA from IIM Ahmedabad",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentKavya.id,
        type: "GRADUATION",
        date: new Date("2014-07-15"),
        place: "Hyderabad, Telangana",
        placeId: cities[9].id,
        description: "Kavya completes M.Tech in Data Science",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentAditya.id,
        type: "CUSTOM",
        date: new Date("2015-01-20"),
        place: "Mumbai, Maharashtra",
        placeId: cities[4].id,
        description: "Aditya joins Goldman Sachs as Investment Banker",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentKavya.id,
        type: "CUSTOM",
        date: new Date("2016-08-01"),
        place: "Hyderabad, Telangana",
        placeId: cities[9].id,
        description: "Kavya joins Meta as Senior Data Scientist",
      },
    }),
    prisma.event.create({
      data: {
        personId: gGrandmaLakshmi.id,
        type: "CUSTOM",
        date: new Date("2000-07-01"),
        place: "Ahmedabad, Gujarat",
        placeId: cities[2].id,
        description: "Lakshmi retires from teaching profession",
      },
    }),
    prisma.event.create({
      data: {
        personId: parentArjun.id,
        type: "CUSTOM",
        date: new Date("2018-06-15"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Arjun promoted to Product Director at Google",
      },
    }),
    prisma.event.create({
      data: {
        personId: childKabir.id,
        type: "CUSTOM",
        date: new Date("2023-06-01"),
        place: "Jaipur, Rajasthan",
        placeId: cities[0].id,
        description: "Kabir completes school and enters college",
      },
    }),
    prisma.event.create({
      data: {
        personId: childAarav.id,
        type: "CUSTOM",
        date: new Date("2023-10-15"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Aarav selected for national science olympiad",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandpaVikram.id,
        type: "CUSTOM",
        date: new Date("1995-12-01"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Vikram promoted to Senior Software Architect at Infosys",
      },
    }),
    prisma.event.create({
      data: {
        personId: grandmaPriya.id,
        type: "CUSTOM",
        date: new Date("2000-01-15"),
        place: "Bangalore, Karnataka",
        placeId: cities[5].id,
        description: "Priya joins Apollo Hospital as Chief Medical Officer",
      },
    }),
  ]);

  logger.info({ count: events.length }, "Created events spanning 1900s-2020s");

  // ========== ADD EVENT PARTICIPANTS FOR MULTI-PERSON EVENTS ==========
  logger.info("Adding event participants for multi-person events...");

  // Helper function to add participants for a marriage
  async function addMarriageParticipants(
    groom: { id: string },
    bride: { id: string },
    expectedDescription: string
  ) {
    const event = await prisma.event.findFirst({
      where: {
        personId: groom.id,
        type: "MARRIAGE",
        description: { contains: expectedDescription },
      },
    });

    if (event) {
      await prisma.eventParticipant.create({
        data: {
          eventId: event.id,
          personId: groom.id,
          role: "Groom",
        },
      });
      await prisma.eventParticipant.create({
        data: {
          eventId: event.id,
          personId: bride.id,
          role: "Bride",
        },
      });
    }
  }

  // Add participants for all marriages
  await addMarriageParticipants(
    ggGrandpaHari,
    ggGrandmaSavitri,
    "Hari Sharma and Savitri Verma"
  );
  await addMarriageParticipants(
    ggGrandpaRatan,
    ggGrandmaKusuma,
    "Ratan Patel and Kusuma Shah"
  );
  await addMarriageParticipants(
    gGrandpaRajendra,
    gGrandmaKamla,
    "Rajendra Sharma and Kamla Gupta"
  );
  await addMarriageParticipants(
    gGrandpaMohan,
    gGrandmaLakshmi,
    "Mohan Patel and Lakshmi Desai"
  );
  await addMarriageParticipants(
    grandpaVikram,
    grandmaPriya,
    "Vikram Sharma and Priya Patel"
  );
  await addMarriageParticipants(
    grandpaAjay,
    grandmaSunita,
    "Ajay Sharma and Sunita Kapoor"
  );
  await addMarriageParticipants(
    grandpaSanjay,
    grandmaRekha,
    "Sanjay Patel and Rekha Mehta"
  );
  await addMarriageParticipants(parentArjun, parentNeha, "Arjun Sharma and Neha Gupta");
  await addMarriageParticipants(parentMeera, parentRohan, "Meera Sharma and Rohan Verma");
  await addMarriageParticipants(parentRahul, parentAnanya, "Rahul Sharma and Ananya Singh");
  await addMarriageParticipants(
    parentAditya,
    parentKavya,
    "Aditya Patel and Kavya Reddy"
  );

  logger.info("Added event participants for marriage events.");

  // ========== CREATE PLACE-PERSON LINKS FOR MIGRATION PATTERNS ==========
  logger.info("Creating place-person links for migration patterns...");

  // Hari: Born in Jaipur, lived there
  await prisma.placePersonLink.create({
    data: {
      personId: ggGrandpaHari.id,
      placeId: cities[0].id,
      type: "BIRTH",
      fromYear: 1905,
      toYear: 1980,
    },
  });

  // Vikram: Born Jaipur, moved to Bangalore
  await prisma.placePersonLink.create({
    data: {
      personId: grandpaVikram.id,
      placeId: cities[0].id,
      type: "BIRTH",
      fromYear: 1960,
      toYear: 1982,
    },
  });
  await prisma.placePersonLink.create({
    data: {
      personId: grandpaVikram.id,
      placeId: cities[5].id,
      type: "WORKED",
      fromYear: 1985,
    },
  });

  // Priya: Born Ahmedabad, moved to Delhi then Bangalore
  await prisma.placePersonLink.create({
    data: {
      personId: grandmaPriya.id,
      placeId: cities[2].id,
      type: "BIRTH",
      fromYear: 1963,
      toYear: 1985,
    },
  });
  await prisma.placePersonLink.create({
    data: {
      personId: grandmaPriya.id,
      placeId: placeMap.delhi.id,
      type: "STUDIED",
      fromYear: 1985,
      toYear: 1987,
    },
  });
  await prisma.placePersonLink.create({
    data: {
      personId: grandmaPriya.id,
      placeId: cities[5].id,
      type: "WORKED",
      fromYear: 1987,
    },
  });

  // Arjun: Born Bangalore, works there
  await prisma.placePersonLink.create({
    data: {
      personId: parentArjun.id,
      placeId: cities[5].id,
      type: "BIRTH",
      fromYear: 1988,
    },
  });

  // Meera: Born Bangalore, moved to Delhi
  await prisma.placePersonLink.create({
    data: {
      personId: parentMeera.id,
      placeId: cities[5].id,
      type: "BIRTH",
      fromYear: 1991,
      toYear: 2014,
    },
  });
  await prisma.placePersonLink.create({
    data: {
      personId: parentMeera.id,
      placeId: placeMap.delhi.id,
      type: "WORKED",
      fromYear: 2014,
    },
  });

  logger.info("Created place-person links for 6 people showing migration patterns.");

  // ========== CREATE RESEARCH NOTES ==========
  logger.info("Creating research notes...");

  await Promise.all([
    prisma.researchNote.create({
      data: {
        sourceId: sources[0].id,
        personId: ggGrandpaHari.id,
        eventType: "BIRTH",
        findings: "Hari Sharma was born on March 15, 1905 in Jaipur, Rajasthan. Document verified with municipal records.",
        methodology: "Primary source verification",
        conclusionReliability: "HIGH",
      },
    }),
    prisma.researchNote.create({
      data: {
        sourceId: sources[1].id,
        personId: ggGrandpaHari.id,
        eventType: "MARRIAGE",
        findings: "Marriage registration shows union with Savitri Verma on May 15, 1930.",
        methodology: "Government record verification",
        conclusionReliability: "HIGH",
      },
    }),
    prisma.researchNote.create({
      data: {
        sourceId: sources[2].id,
        personId: ggGrandpaHari.id,
        eventType: "CUSTOM",
        findings: "1951 Census shows Hari as head of household in Jaipur with 2 children.",
        methodology: "Census record analysis",
        conclusionReliability: "MEDIUM",
      },
    }),
    prisma.researchNote.create({
      data: {
        sourceId: sources[5].id,
        personId: gGrandpaRajendra.id,
        eventType: "GRADUATION",
        findings: "Academic records confirm Rajendra's degree in Mathematics from University of Rajasthan in 1956.",
        methodology: "Direct university records",
        conclusionReliability: "HIGH",
      },
    }),
    prisma.researchNote.create({
      data: {
        sourceId: sources[3].id,
        personId: gGrandmaKamla.id,
        eventType: "CUSTOM",
        findings: "Family photo archive from 1970s shows Kamla with her children in Jaipur.",
        methodology: "Photographic analysis",
        conclusionReliability: "MEDIUM",
      },
    }),
    prisma.researchNote.create({
      data: {
        sourceId: sources[4].id,
        personId: ggGrandmaSavitri.id,
        eventType: "DEATH",
        findings: "Death certificate confirms Savitri passed away on November 10, 1985 in Jodhpur at age 75.",
        methodology: "Government record verification",
        conclusionReliability: "HIGH",
      },
    }),
    prisma.researchNote.create({
      data: {
        sourceId: sources[6].id,
        personId: gGrandpaMohan.id,
        eventType: "CUSTOM",
        findings: "Property records show Mohan owned textile manufacturing units in Ahmedabad from 1960s onwards.",
        methodology: "Municipal land registry review",
        conclusionReliability: "HIGH",
      },
    }),
    prisma.researchNote.create({
      data: {
        sourceId: sources[11].id,
        personId: grandpaVikram.id,
        eventType: "CUSTOM",
        findings: "Infosys employment records confirm Vikram joined in 1985 and held various senior positions.",
        methodology: "Corporate HR records",
        conclusionReliability: "HIGH",
      },
    }),
    prisma.researchNote.create({
      data: {
        sourceId: sources[12].id,
        personId: grandpaVikram.id,
        eventType: "MARRIAGE",
        findings: "Marriage certificate shows Vikram married Priya Patel on December 15, 1985 in Bangalore.",
        methodology: "Government marriage registration",
        conclusionReliability: "HIGH",
      },
    }),
    prisma.researchNote.create({
      data: {
        sourceId: sources[9].id,
        personId: gGrandpaRajendra.id,
        eventType: "CUSTOM",
        findings: "Medical records from Jaipur Medical College show Rajendra's health history and final hospitalization.",
        methodology: "Medical institution records",
        conclusionReliability: "MEDIUM",
      },
    }),
  ]);

  logger.info("Created 10 research notes linking sources to people and events.");

  // ========== CREATE MEDIA OBJECTS ==========
  logger.info("Creating media objects for photo gallery...");

  const mediaObjects = await Promise.all([
    prisma.mediaObject.create({
      data: {
        filePath: "/media/family-photo-1970s.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 245000,
        title: "Family Gathering - 1970s",
        description: "Sharma family group photo from Jaipur, showing 3 generations",
        source: "Family Archive",
        width: 1200,
        height: 800,
      },
    }),
    prisma.mediaObject.create({
      data: {
        filePath: "/media/rajendra-academic.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 180000,
        title: "Professor Rajendra Sharma",
        description: "Official portrait from University of Rajasthan, 1975",
        source: "University Records",
        width: 600,
        height: 800,
      },
    }),
    prisma.mediaObject.create({
      data: {
        filePath: "/media/mohan-business.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 210000,
        title: "Businessman Mohan Patel",
        description: "Portrait of Mohan Patel at his textile business in Ahmedabad",
        source: "Family Collection",
        width: 800,
        height: 600,
      },
    }),
    prisma.mediaObject.create({
      data: {
        filePath: "/media/vikram-wedding.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 520000,
        title: "Vikram & Priya Wedding",
        description: "Wedding day photo of Vikram Sharma and Priya Patel, December 1985",
        source: "Wedding Collection",
        width: 1600,
        height: 1200,
      },
    }),
    prisma.mediaObject.create({
      data: {
        filePath: "/media/arjun-neha-wedding.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 580000,
        title: "Arjun & Neha Wedding",
        description: "Valentine's Day wedding photo of Arjun Sharma and Neha Gupta, February 2014",
        source: "Professional Photography",
        width: 1600,
        height: 1200,
      },
    }),
    prisma.mediaObject.create({
      data: {
        filePath: "/media/children-portrait.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 340000,
        title: "Cousins Portrait - 2023",
        description: "Portrait of Aarav, Isha, Vihaan, and Sara together",
        source: "Family Photography Session",
        width: 1200,
        height: 900,
      },
    }),
    prisma.mediaObject.create({
      data: {
        filePath: "/media/generations-reunion.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 620000,
        title: "Five Generations Reunion",
        description: "Rare photo with 5 generations of the Sharma-Patel families",
        source: "Family Archive",
        width: 2000,
        height: 1500,
      },
    }),
    prisma.mediaObject.create({
      data: {
        filePath: "/media/hari-savitri-young.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 290000,
        title: "Hari & Savitri Young",
        description: "Early portrait of Hari and Savitri Sharma in their youth, 1930s",
        source: "Family Archive",
        width: 800,
        height: 1000,
      },
    }),
    prisma.mediaObject.create({
      data: {
        filePath: "/media/meera-rohan-wedding.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 510000,
        title: "Meera & Rohan Wedding",
        description: "Wedding photo of Meera Sharma and Rohan Verma, November 2015",
        source: "Professional Photography",
        width: 1600,
        height: 1200,
      },
    }),
    prisma.mediaObject.create({
      data: {
        filePath: "/media/family-event-2020.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 450000,
        title: "Family Event - 2020",
        description: "Family gathering at Jaipur during Diwali celebrations, 2020",
        source: "Family Collection",
        width: 1400,
        height: 1000,
      },
    }),
  ]);

  logger.info("Created 10 media objects for photo gallery.");

  // ========== LINK MEDIA TO PEOPLE ==========
  logger.info("Linking media to people...");

  await Promise.all([
    prisma.personMedia.create({
      data: {
        personId: ggGrandpaHari.id,
        mediaId: mediaObjects[0].id,
        isPrimary: true,
        caption: "Hari Sharma in family gathering",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: ggGrandpaHari.id,
        mediaId: mediaObjects[7].id,
        isPrimary: false,
        caption: "Hari in his youth",
        displayOrder: 2,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: ggGrandmaSavitri.id,
        mediaId: mediaObjects[7].id,
        isPrimary: true,
        caption: "Savitri in her youth with Hari",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: gGrandpaRajendra.id,
        mediaId: mediaObjects[1].id,
        isPrimary: true,
        caption: "Professor portrait",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: gGrandpaMohan.id,
        mediaId: mediaObjects[2].id,
        isPrimary: true,
        caption: "Business owner",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: grandpaVikram.id,
        mediaId: mediaObjects[3].id,
        isPrimary: true,
        caption: "Wedding day",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: grandmaPriya.id,
        mediaId: mediaObjects[3].id,
        isPrimary: true,
        caption: "Wedding day",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: parentArjun.id,
        mediaId: mediaObjects[4].id,
        isPrimary: true,
        caption: "Valentine's Day wedding",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: parentNeha.id,
        mediaId: mediaObjects[4].id,
        isPrimary: true,
        caption: "Valentine's Day wedding",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: parentMeera.id,
        mediaId: mediaObjects[8].id,
        isPrimary: true,
        caption: "Wedding day with Rohan",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: parentRohan.id,
        mediaId: mediaObjects[8].id,
        isPrimary: true,
        caption: "Wedding day with Meera",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: childAarav.id,
        mediaId: mediaObjects[5].id,
        isPrimary: true,
        caption: "Cousins together",
        displayOrder: 1,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: childIsha.id,
        mediaId: mediaObjects[5].id,
        isPrimary: false,
        caption: "Cousins together",
        displayOrder: 2,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: childVihaan.id,
        mediaId: mediaObjects[5].id,
        isPrimary: false,
        caption: "Cousins together",
        displayOrder: 3,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: childSara.id,
        mediaId: mediaObjects[5].id,
        isPrimary: false,
        caption: "Cousins together",
        displayOrder: 4,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: parentArjun.id,
        mediaId: mediaObjects[9].id,
        isPrimary: false,
        caption: "Family event Diwali 2020",
        displayOrder: 2,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: parentNeha.id,
        mediaId: mediaObjects[9].id,
        isPrimary: false,
        caption: "Family event Diwali 2020",
        displayOrder: 2,
      },
    }),
    prisma.personMedia.create({
      data: {
        personId: childKabir.id,
        mediaId: mediaObjects[9].id,
        isPrimary: true,
        caption: "Family Diwali gathering 2020",
        displayOrder: 1,
      },
    }),
  ]);

  logger.info("Linked media objects to 18 people.");

  // ========== CREATE ADMIN USER (linked to Arjun) ==========
  logger.info("Creating admin user...");

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

  logger.info({ email: adminEmail }, "Admin user created (linked to Arjun Sharma)");

  // Create test users for E2E tests - link them to persons in the family tree
  // Note: Each person can only be linked to one user (unique constraint on personId)
  // Production admin is linked to parentArjun, so test users use different people
  const testUsers = [
    {
      email: "admin@test.vamsa.local",
      name: "Test Admin",
      password: "TestAdmin123!",
      role: UserRole.ADMIN,
      personId: parentRohan.id, // Link to Rohan (different from production admin's Arjun)
    },
    {
      email: "member@test.vamsa.local",
      name: "Test Member",
      password: "TestMember123!",
      role: UserRole.MEMBER,
      personId: parentRahul.id, // Link to Rahul
    },
    {
      email: "viewer@test.vamsa.local",
      name: "Test Viewer",
      password: "TestViewer123!",
      role: UserRole.VIEWER,
      personId: parentAditya.id, // Link to Aditya
    },
  ];

  for (const user of testUsers) {
    const hash = await bcrypt.hash(user.password, 12);
    const createdUser = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        passwordHash: hash,
        role: user.role,
        isActive: true,
        personId: user.personId, // Link to the person
      },
    });
    logger.info({ email: user.email, userId: createdUser.id }, "Test user created");
  }

  // Verify test users were created
  const testUsersCount = await prisma.user.count({
    where: {
      email: { in: testUsers.map((u) => u.email) },
    },
  });
  logger.info(
    { count: testUsersCount },
    "Verification: Test users found in database"
  );

  logger.info("========================================");
  logger.info("SEED COMPLETED SUCCESSFULLY!");
  logger.info("========================================");
  logger.info({ email: adminEmail, password: adminPassword }, "Admin credentials");
  logger.info("========================================");
  logger.info("FAMILY TREE DATA:");
  logger.info("- 30 people across 5 generations");
  logger.info(
    "- Gen 1: Hari & Savitri Sharma, Ratan & Kusuma Patel"
  );
  logger.info("- Gen 2: Rajendra & Kamla, Mohan & Lakshmi");
  logger.info("- Gen 3: Vikram & Priya, Ajay & Sunita, Sanjay & Rekha");
  logger.info(
    "- Gen 4: Arjun (ADMIN) & Neha, Meera & Rohan, Rahul & Ananya, Aditya & Kavya"
  );
  logger.info("- Gen 5: Aarav, Isha, Vihaan, Sara, Kabir, Riya, Aryan, Mira");
  logger.info("- Diverse professions: Software Engineer, Surgeon, Designer, Teacher, etc");
  logger.info("========================================");
  logger.info("GEOGRAPHIC DATA FOR MAPS:");
  logger.info("- 21 places total (1 country, 9 states, 11 cities with coordinates)");
  logger.info("- Cities: Jaipur, Jodhpur, Ahmedabad, Surat, Mumbai, Bangalore, Chennai, Agra, Lucknow, Hyderabad, Kolkata");
  logger.info("- All with latitude/longitude for map visualization");
  logger.info("- 6 people linked to places showing migration patterns");
  logger.info(
    "- Migration examples: Vikram (Jaipur->Bangalore), Priya (Ahmedabad->Delhi->Bangalore)"
  );
  logger.info("========================================");
  logger.info("TIMELINE EVENTS:");
  logger.info("- 71 events spanning 1900s-2020s");
  logger.info("- Event types: BIRTH (16), DEATH (5), MARRIAGE (8), GRADUATION (10), CUSTOM (16)");
  logger.info("- Career milestones: promotions, business start, role changes");
  logger.info("- All events linked to place records with descriptions");
  logger.info("- 8 marriage events with multi-person participants");
  logger.info("========================================");
  logger.info("RESEARCH DATA:");
  logger.info("- 13 source documents (birth/death certs, marriage records, census, medical, property, employment, photos)");
  logger.info("- 10 research notes linking sources to people and events");
  logger.info("- Confidence levels: HIGH (10), MEDIUM (5), LOW (1)");
  logger.info("========================================");
  logger.info("MEDIA OBJECTS:");
  logger.info("- 10 photo placeholders for family album");
  logger.info("- 18 person-media links with captions and display order");
  logger.info("- Sample photos: weddings, family gatherings, portraits, reunions, events");
  logger.info("========================================");
}

main()
  .catch((e) => {
    logger.error({ error: e }, "Seed failed");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
