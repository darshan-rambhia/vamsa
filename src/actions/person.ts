"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, requireMember } from "@/lib/auth";
import {
  personCreateSchema,
  personUpdateSchema,
  type PersonCreateInput,
  type PersonUpdateInput,
} from "@/schemas/person";

export async function getPersons(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { search, limit = 50, offset = 0 } = options || {};

  const where = search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { maidenName: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [persons, total] = await Promise.all([
    db.person.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
      skip: offset,
      include: {
        relationshipsFrom: {
          include: { relatedPerson: true },
        },
        relationshipsTo: {
          include: { person: true },
        },
      },
    }),
    db.person.count({ where }),
  ]);

  return { persons, total };
}

export async function getPerson(id: string) {
  return db.person.findUnique({
    where: { id },
    include: {
      relationshipsFrom: {
        include: { relatedPerson: true },
      },
      relationshipsTo: {
        include: { person: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function createPerson(input: PersonCreateInput) {
  const user = await requireMember();
  const validated = personCreateSchema.parse(input);

  const person = await db.person.create({
    data: {
      firstName: validated.firstName,
      lastName: validated.lastName,
      maidenName: validated.maidenName,
      dateOfBirth: validated.dateOfBirth,
      dateOfPassing: validated.dateOfPassing,
      birthPlace: validated.birthPlace,
      nativePlace: validated.nativePlace,
      gender: validated.gender,
      bio: validated.bio,
      email: validated.email || null,
      phone: validated.phone,
      currentAddress: validated.currentAddress ?? undefined,
      workAddress: validated.workAddress ?? undefined,
      profession: validated.profession,
      employer: validated.employer,
      socialLinks: validated.socialLinks ?? undefined,
      isLiving: validated.isLiving,
      createdById: user.id,
    },
  });

  revalidatePath("/people");
  revalidatePath("/tree");

  return { success: true, person };
}

export async function updatePerson(id: string, input: PersonUpdateInput) {
  const user = await requireMember();
  const validated = personUpdateSchema.parse(input);

  const existing = await db.person.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Person not found");
  }

  const linkedUser = await db.user.findUnique({
    where: { personId: id },
  });

  const isOwnProfile = linkedUser?.id === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwnProfile && !isAdmin) {
    throw new Error("You can only edit your own profile or request changes");
  }

  const updateData: Parameters<typeof db.person.update>[0]["data"] = {};
  if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
  if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
  if (validated.maidenName !== undefined) updateData.maidenName = validated.maidenName;
  if (validated.dateOfBirth !== undefined) updateData.dateOfBirth = validated.dateOfBirth;
  if (validated.dateOfPassing !== undefined) updateData.dateOfPassing = validated.dateOfPassing;
  if (validated.birthPlace !== undefined) updateData.birthPlace = validated.birthPlace;
  if (validated.nativePlace !== undefined) updateData.nativePlace = validated.nativePlace;
  if (validated.gender !== undefined) updateData.gender = validated.gender;
  if (validated.bio !== undefined) updateData.bio = validated.bio;
  if (validated.email !== undefined) updateData.email = validated.email || null;
  if (validated.phone !== undefined) updateData.phone = validated.phone;
  if (validated.currentAddress !== undefined) updateData.currentAddress = validated.currentAddress ?? undefined;
  if (validated.workAddress !== undefined) updateData.workAddress = validated.workAddress ?? undefined;
  if (validated.profession !== undefined) updateData.profession = validated.profession;
  if (validated.employer !== undefined) updateData.employer = validated.employer;
  if (validated.socialLinks !== undefined) updateData.socialLinks = validated.socialLinks ?? undefined;
  if (validated.isLiving !== undefined) updateData.isLiving = validated.isLiving;

  const person = await db.person.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/people");
  revalidatePath(`/people/${id}`);
  revalidatePath("/tree");

  return { success: true, person };
}

export async function deletePerson(id: string) {
  await requireAuth();

  await db.person.delete({ where: { id } });

  revalidatePath("/people");
  revalidatePath("/tree");

  return { success: true };
}

export async function searchPersons(query: string) {
  if (!query || query.length < 2) {
    return [];
  }

  return db.person.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      isLiving: true,
    },
  });
}

export async function getTreeData() {
  const persons = await db.person.findMany({
    include: {
      relationshipsFrom: true,
      relationshipsTo: true,
    },
  });

  const relationships = await db.relationship.findMany();

  return { persons, relationships };
}
