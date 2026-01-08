import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";
import {
  GedcomParser,
  GedcomMapper,
  GedcomGenerator,
} from "@vamsa/lib";
import type { Id } from "./_generated/dataModel";

/**
 * Parse GEDCOM content and return preview data
 */
export const parsePreview = mutation({
  args: {
    token: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const parser = new GedcomParser();
    const mapper = new GedcomMapper();

    try {
      // Parse GEDCOM content
      const gedcomFile = parser.parse(args.content);

      // Map to Vamsa format
      const result = mapper.mapFromGedcom(gedcomFile, {
        ignoreMissingReferences: true,
      });

      return {
        success: true,
        version: gedcomFile.version,
        charset: gedcomFile.charset,
        people: result.people.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth?.toISOString(),
          dateOfPassing: p.dateOfPassing?.toISOString(),
          birthPlace: p.birthPlace,
          gender: p.gender,
          profession: p.profession,
          isLiving: p.isLiving,
        })),
        relationships: result.relationships.length,
        errors: result.errors,
        warnings: result.warnings,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse GEDCOM file",
      };
    }
  },
});

/**
 * Import GEDCOM content into the database
 */
export const importGedcom = mutation({
  args: {
    token: v.string(),
    content: v.string(),
    options: v.optional(
      v.object({
        ignoreMissingReferences: v.optional(v.boolean()),
        skipValidation: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);

    const parser = new GedcomParser();
    const mapper = new GedcomMapper();

    try {
      // Parse GEDCOM content
      const gedcomFile = parser.parse(args.content);

      // Map to Vamsa format
      const result = mapper.mapFromGedcom(gedcomFile, {
        ignoreMissingReferences: args.options?.ignoreMissingReferences ?? true,
        skipValidation: args.options?.skipValidation ?? false,
      });

      if (result.errors.length > 0) {
        const criticalErrors = result.errors.filter(
          (e) => e.type !== "broken_reference"
        );
        if (criticalErrors.length > 0) {
          return {
            success: false,
            error: `Import failed with ${criticalErrors.length} critical errors`,
            errors: criticalErrors,
          };
        }
      }

      // Create ID mapping (temp ID -> Convex ID)
      const idMap = new Map<string, Id<"persons">>();

      // Import people
      let importedPeople = 0;
      for (const person of result.people) {
        if (!person.id) continue;

        const tempId = person.id;

        const personId = await ctx.db.insert("persons", {
          firstName: person.firstName,
          lastName: person.lastName,
          maidenName: person.maidenName,
          dateOfBirth: person.dateOfBirth
            ? person.dateOfBirth.getTime()
            : undefined,
          dateOfPassing: person.dateOfPassing
            ? person.dateOfPassing.getTime()
            : undefined,
          birthPlace: person.birthPlace,
          nativePlace: person.nativePlace,
          gender: person.gender,
          profession: person.profession,
          bio: person.bio,
          isLiving: person.isLiving,
          createdById: admin._id,
        });

        idMap.set(tempId, personId);
        importedPeople++;
      }

      // Import relationships
      let importedRelationships = 0;
      for (const rel of result.relationships) {
        const personId = idMap.get(rel.personId);
        const relatedPersonId = idMap.get(rel.relatedPersonId);

        if (!personId || !relatedPersonId) {
          continue; // Skip relationships with missing people
        }

        await ctx.db.insert("relationships", {
          personId,
          relatedPersonId,
          type: rel.type,
          marriageDate: rel.marriageDate ? rel.marriageDate.getTime() : undefined,
          divorceDate: rel.divorceDate ? rel.divorceDate.getTime() : undefined,
          isActive: rel.isActive ?? true,
        });

        importedRelationships++;
      }

      // Log the import
      await ctx.db.insert("auditLogs", {
        userId: admin._id,
        action: "CREATE",
        entityType: "GEDCOM_IMPORT",
        newData: {
          importedPeople,
          importedRelationships,
          version: gedcomFile.version,
        },
      });

      return {
        success: true,
        importedPeople,
        importedRelationships,
        warnings: result.warnings,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to import GEDCOM file",
      };
    }
  },
});

/**
 * Export all data as GEDCOM format
 */
export const exportGedcom = query({
  args: {
    token: v.string(),
    options: v.optional(
      v.object({
        version: v.optional(v.union(v.literal("5.5.1"), v.literal("7.0"))),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mapper = new GedcomMapper();
    const generator = new GedcomGenerator({
      sourceProgram: "Vamsa",
      submitterName: "Vamsa Export",
      version: args.options?.version ?? "5.5.1",
    });

    try {
      // Fetch all persons
      const persons = await ctx.db.query("persons").collect();

      // Fetch all relationships
      const relationships = await ctx.db.query("relationships").collect();

      // Convert to mapper format
      const vamsaPeople = persons.map((p) => ({
        id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        maidenName: p.maidenName,
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
        dateOfPassing: p.dateOfPassing ? new Date(p.dateOfPassing) : undefined,
        birthPlace: p.birthPlace,
        nativePlace: p.nativePlace,
        gender: p.gender,
        profession: p.profession,
        bio: p.bio,
        isLiving: p.isLiving,
      }));

      const vamsaRelationships = relationships.map((r) => ({
        id: r._id,
        personId: r.personId as unknown as string,
        relatedPersonId: r.relatedPersonId as unknown as string,
        type: r.type,
        marriageDate: r.marriageDate ? new Date(r.marriageDate) : undefined,
        divorceDate: r.divorceDate ? new Date(r.divorceDate) : undefined,
        isActive: r.isActive,
      }));

      // Map to GEDCOM format
      const { individuals, families } = mapper.mapToGedcom(
        vamsaPeople,
        vamsaRelationships
      );

      // Generate GEDCOM content
      const gedcomContent = generator.generate(individuals, families);

      return {
        success: true,
        content: gedcomContent,
        stats: {
          individuals: individuals.length,
          families: families.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export GEDCOM",
      };
    }
  },
});
