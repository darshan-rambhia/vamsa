import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";

// Validation schemas
const createPersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  maidenName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfPassing: z.string().optional(),
  birthPlace: z.string().optional(),
  nativePlace: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  photoUrl: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  profession: z.string().optional(),
  employer: z.string().optional(),
  isLiving: z.boolean().default(true),
});

const updatePersonSchema = createPersonSchema.partial().extend({
  id: z.string(),
});

// List all persons
export const listPersons = createServerFn({ method: "GET" }).handler(
  async () => {
    const persons = await prisma.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        relationshipsFrom: {
          include: { relatedPerson: true },
        },
        relationshipsTo: {
          include: { person: true },
        },
      },
    });

    return {
      items: persons.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        maidenName: p.maidenName,
        dateOfBirth: p.dateOfBirth?.toISOString().split("T")[0] ?? null,
        dateOfPassing: p.dateOfPassing?.toISOString().split("T")[0] ?? null,
        birthPlace: p.birthPlace,
        nativePlace: p.nativePlace,
        gender: p.gender,
        photoUrl: p.photoUrl,
        bio: p.bio,
        email: p.email,
        phone: p.phone,
        profession: p.profession,
        employer: p.employer,
        isLiving: p.isLiving,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      total: persons.length,
    };
  }
);

// Get a single person by ID
export const getPerson = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const person = await prisma.person.findUnique({
      where: { id: data.id },
      include: {
        relationshipsFrom: {
          include: { relatedPerson: true },
        },
        relationshipsTo: {
          include: { person: true },
        },
      },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Build relationships list
    const relationships = [
      ...person.relationshipsFrom.map((r) => ({
        id: r.id,
        type: r.type,
        relatedPerson: {
          id: r.relatedPerson.id,
          firstName: r.relatedPerson.firstName,
          lastName: r.relatedPerson.lastName,
        },
      })),
      ...person.relationshipsTo.map((r) => ({
        id: r.id,
        type:
          r.type === "PARENT"
            ? "CHILD"
            : r.type === "CHILD"
              ? "PARENT"
              : r.type,
        relatedPerson: {
          id: r.person.id,
          firstName: r.person.firstName,
          lastName: r.person.lastName,
        },
      })),
    ];

    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      maidenName: person.maidenName,
      dateOfBirth: person.dateOfBirth?.toISOString().split("T")[0] ?? null,
      dateOfPassing: person.dateOfPassing?.toISOString().split("T")[0] ?? null,
      birthPlace: person.birthPlace,
      nativePlace: person.nativePlace,
      gender: person.gender,
      photoUrl: person.photoUrl,
      bio: person.bio,
      email: person.email,
      phone: person.phone,
      currentAddress: person.currentAddress,
      workAddress: person.workAddress,
      profession: person.profession,
      employer: person.employer,
      socialLinks: person.socialLinks,
      isLiving: person.isLiving,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
      relationships,
    };
  });

// Create a new person
export const createPerson = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createPersonSchema>) => {
    return createPersonSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const person = await prisma.person.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        maidenName: data.maidenName || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        dateOfPassing: data.dateOfPassing ? new Date(data.dateOfPassing) : null,
        birthPlace: data.birthPlace || null,
        nativePlace: data.nativePlace || null,
        gender: data.gender || null,
        photoUrl: data.photoUrl || null,
        bio: data.bio || null,
        email: data.email || null,
        phone: data.phone || null,
        profession: data.profession || null,
        employer: data.employer || null,
        isLiving: data.isLiving ?? true,
      },
    });

    return { id: person.id };
  });

// Update a person
export const updatePerson = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updatePersonSchema>) => {
    return updatePersonSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const { id, ...updates } = data;

    const person = await prisma.person.update({
      where: { id },
      data: {
        ...updates,
        dateOfBirth: updates.dateOfBirth
          ? new Date(updates.dateOfBirth)
          : undefined,
        dateOfPassing: updates.dateOfPassing
          ? new Date(updates.dateOfPassing)
          : undefined,
      },
    });

    return { id: person.id };
  });

// Delete a person
export const deletePerson = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await prisma.person.delete({
      where: { id: data.id },
    });

    return { success: true };
  });

// Search persons
export const searchPersons = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    const persons = await prisma.person.findMany({
      where: {
        OR: [
          { firstName: { contains: data.query, mode: "insensitive" } },
          { lastName: { contains: data.query, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return persons.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      photoUrl: p.photoUrl,
    }));
  });
