import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./db";
import { z } from "zod";
import {
  computeTreeLayout,
  type Person,
  type Relationship as LayoutRelationship,
} from "./tree-layout";

const TOKEN_COOKIE_NAME = "vamsa-session";

// Auth helper function
async function requireAuth(
  requiredRole: "VIEWER" | "MEMBER" | "ADMIN" = "VIEWER"
) {
  const token = getCookie(TOKEN_COOKIE_NAME);
  if (!token) {
    throw new Error("Not authenticated");
  }

  const session = await prisma.session.findFirst({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error("Session expired");
  }

  const roleHierarchy = { VIEWER: 0, MEMBER: 1, ADMIN: 2 };
  if (roleHierarchy[session.user.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  return session.user;
}

const relationshipTypeSchema = z.enum(["PARENT", "CHILD", "SPOUSE", "SIBLING"]);

const createRelationshipSchema = z.object({
  personId: z.string(),
  relatedPersonId: z.string(),
  type: relationshipTypeSchema,
  marriageDate: z.string().optional(),
  divorceDate: z.string().optional(),
});

// Get relationships for a person
export const getRelationships = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }) => {
    const relationships = await prisma.relationship.findMany({
      where: {
        OR: [{ personId: data.personId }, { relatedPersonId: data.personId }],
      },
      include: {
        person: true,
        relatedPerson: true,
      },
    });

    return relationships.map((r) => ({
      id: r.id,
      type: r.type,
      isActive: r.isActive,
      marriageDate: r.marriageDate?.toISOString().split("T")[0] ?? null,
      divorceDate: r.divorceDate?.toISOString().split("T")[0] ?? null,
      person: {
        id: r.person.id,
        firstName: r.person.firstName,
        lastName: r.person.lastName,
      },
      relatedPerson: {
        id: r.relatedPerson.id,
        firstName: r.relatedPerson.firstName,
        lastName: r.relatedPerson.lastName,
      },
    }));
  });

// Create a relationship
export const createRelationship = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createRelationshipSchema>) => {
    return createRelationshipSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");

    // Prevent self-relationship
    if (data.personId === data.relatedPersonId) {
      throw new Error("Cannot create relationship with self");
    }

    // Check for duplicate relationship
    const existing = await prisma.relationship.findFirst({
      where: {
        personId: data.personId,
        relatedPersonId: data.relatedPersonId,
        type: data.type,
      },
    });

    if (existing) {
      throw new Error("This relationship already exists");
    }

    // Set isActive based on divorceDate
    const isActive = !data.divorceDate;

    // Create the relationship
    const relationship = await prisma.relationship.create({
      data: {
        personId: data.personId,
        relatedPersonId: data.relatedPersonId,
        type: data.type,
        marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
        divorceDate: data.divorceDate ? new Date(data.divorceDate) : null,
        isActive,
      },
    });

    // Create reciprocal relationship for bidirectional types
    if (data.type === "SPOUSE" || data.type === "SIBLING") {
      await prisma.relationship.create({
        data: {
          personId: data.relatedPersonId,
          relatedPersonId: data.personId,
          type: data.type,
          marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
          divorceDate: data.divorceDate ? new Date(data.divorceDate) : null,
          isActive,
        },
      });
    } else if (data.type === "PARENT") {
      // If A is parent of B, then B is child of A
      await prisma.relationship.create({
        data: {
          personId: data.relatedPersonId,
          relatedPersonId: data.personId,
          type: "CHILD",
          isActive,
        },
      });
    } else if (data.type === "CHILD") {
      // If A is child of B, then B is parent of A
      await prisma.relationship.create({
        data: {
          personId: data.relatedPersonId,
          relatedPersonId: data.personId,
          type: "PARENT",
          isActive,
        },
      });
    }

    console.warn(
      "[Relationships Server] Created relationship:",
      relationship.id,
      "by user:",
      user.id
    );

    return { id: relationship.id };
  });

// Delete a relationship
export const deleteRelationship = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const relationship = await prisma.relationship.findUnique({
      where: { id: data.id },
    });

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Delete the relationship
    await prisma.relationship.delete({
      where: { id: data.id },
    });

    // Delete reciprocal relationship if it exists
    await prisma.relationship.deleteMany({
      where: {
        personId: relationship.relatedPersonId,
        relatedPersonId: relationship.personId,
        type:
          relationship.type === "PARENT"
            ? "CHILD"
            : relationship.type === "CHILD"
              ? "PARENT"
              : relationship.type,
      },
    });

    return { success: true };
  });

// Get family tree data (legacy - returns raw data)
export const getFamilyTree = createServerFn({ method: "GET" }).handler(
  async () => {
    const persons = await prisma.person.findMany({
      include: {
        relationshipsFrom: true,
        relationshipsTo: true,
      },
    });

    const relationships = await prisma.relationship.findMany();

    return {
      nodes: persons.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth?.toISOString().split("T")[0] ?? null,
        dateOfPassing: p.dateOfPassing?.toISOString().split("T")[0] ?? null,
        isLiving: p.isLiving,
        photoUrl: p.photoUrl,
      })),
      edges: relationships.map((r) => ({
        id: r.id,
        source: r.personId,
        target: r.relatedPersonId,
        type: r.type,
      })),
    };
  }
);

// Input schema for tree layout
const treeLayoutInputSchema = z.object({
  focusedPersonId: z.string(),
  view: z.enum(["focused", "full"]).default("focused"),
  expandedNodes: z.array(z.string()).default([]),
  generationDepth: z.number().default(1),
});

// Get family tree with pre-computed layout
export const getFamilyTreeLayout = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof treeLayoutInputSchema>) => {
    return treeLayoutInputSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const { focusedPersonId, view, expandedNodes, generationDepth } = data;

    // Fetch all persons and relationships
    const persons = await prisma.person.findMany();
    const relationships = await prisma.relationship.findMany();

    // Transform to layout types
    const layoutPersons: Person[] = persons.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth?.toISOString().split("T")[0] ?? null,
      dateOfPassing: p.dateOfPassing?.toISOString().split("T")[0] ?? null,
      isLiving: p.isLiving,
      photoUrl: p.photoUrl,
    }));

    const layoutRelationships: LayoutRelationship[] = relationships.map(
      (r) => ({
        id: r.id,
        personId: r.personId,
        relatedPersonId: r.relatedPersonId,
        type: r.type,
        isActive: r.isActive,
        marriageDate: r.marriageDate?.toISOString().split("T")[0] ?? null,
        divorceDate: r.divorceDate?.toISOString().split("T")[0] ?? null,
      })
    );

    // Compute layout
    const layout = computeTreeLayout(layoutPersons, layoutRelationships, {
      focusedPersonId,
      view,
      expandedNodes,
      generationDepth,
    });

    return layout;
  });
