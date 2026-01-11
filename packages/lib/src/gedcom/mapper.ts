/**
 * GEDCOM Data Mapper
 * Bidirectional mapping between GEDCOM and Vamsa data models
 */

import type { GedcomFile } from "./types";
import {
  type MappingResult,
  type MappingError,
  type VamsaPerson,
  type VamsaRelationship,
  type GedcomIndividualData,
  type GedcomFamilyData,
  type MapOptions,
  type ParsedName,
} from "./mapper-types";
import { GedcomParser } from "./parser";

/**
 * Generate a CUID-like ID for use in mapping operations
 * Uses timestamp + random characters for collision-resistant IDs
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `c${timestamp}${randomPart}`;
}

export class GedcomMapper {
  private parser: GedcomParser;

  constructor() {
    this.parser = new GedcomParser();
  }

  /**
   * Convert parsed GEDCOM data to Vamsa data model
   */
  mapFromGedcom(gedcomFile: GedcomFile, options?: MapOptions): MappingResult {
    const people: VamsaPerson[] = [];
    const relationships: VamsaRelationship[] = [];
    const errors: MappingError[] = [];
    const warnings: string[] = [];

    // 1. Validate GEDCOM structure
    if (!options?.skipValidation) {
      const validationErrors = this.parser.validate(gedcomFile);
      for (const error of validationErrors) {
        if (error.severity === "error") {
          errors.push({
            type: "invalid_format",
            source: "INDI",
            id: "unknown",
            field: "structure",
            message: error.message,
          });
        } else {
          warnings.push(error.message);
        }
      }
    }

    // 2. Create ID mapping (GEDCOM xrefs -> Vamsa CUIDs)
    const idMap = new Map<string, string>();
    for (const individual of gedcomFile.individuals) {
      if (individual.id) {
        idMap.set(individual.id, generateId());
      }
    }

    // 3. Map individuals (INDI -> Person)
    for (const record of gedcomFile.individuals) {
      if (!record.id) continue;

      const parsed = this.parser.parseIndividual(record);
      const vamsaId = idMap.get(parsed.id);

      if (!vamsaId) {
        errors.push({
          type: "missing_data",
          source: "INDI",
          id: parsed.id,
          field: "id",
          message: `Failed to generate ID for individual ${parsed.id}`,
        });
        continue;
      }

      // Parse name
      const primaryName = parsed.names[0];
      const parsedName = primaryName
        ? this.parseName(primaryName.full)
        : { firstName: "Unknown", lastName: "Unknown" };

      if (!parsedName.firstName) {
        parsedName.firstName = "Unknown";
      }
      if (!parsedName.lastName) {
        parsedName.lastName = "Unknown";
      }

      // Determine if person is living
      const isLiving = !parsed.deathDate;

      // Convert date strings to Date objects
      const dateOfBirth = parsed.birthDate
        ? this.parseISODate(parsed.birthDate)
        : undefined;
      const dateOfPassing = parsed.deathDate
        ? this.parseISODate(parsed.deathDate)
        : undefined;

      // Map gender
      const gender = this.unmapGender(parsed.sex);

      const person: VamsaPerson = {
        id: vamsaId,
        firstName: parsedName.firstName,
        lastName: parsedName.lastName,
        dateOfBirth,
        dateOfPassing,
        birthPlace: parsed.birthPlace,
        gender,
        profession: parsed.occupation,
        bio: parsed.notes.join("\n") || undefined,
        isLiving,
      };

      people.push(person);
    }

    // 4. Map families (FAM -> Relationships)
    for (const record of gedcomFile.families) {
      if (!record.id) continue;

      const parsed = this.parser.parseFamily(record);

      // Create spouse relationships
      if (parsed.husband && parsed.wife) {
        const husbandId = idMap.get(parsed.husband);
        const wifeId = idMap.get(parsed.wife);

        if (!husbandId || !wifeId) {
          if (!options?.ignoreMissingReferences) {
            errors.push({
              type: "broken_reference",
              source: "FAM",
              id: parsed.id,
              field: "HUSB/WIFE",
              message: `Broken spouse reference in family ${parsed.id}`,
            });
          }
          continue;
        }

        const marriageDate = parsed.marriageDate
          ? this.parseISODate(parsed.marriageDate)
          : undefined;
        const divorceDate = parsed.divorceDate
          ? this.parseISODate(parsed.divorceDate)
          : undefined;

        // Create bidirectional SPOUSE relationships
        relationships.push({
          id: generateId(),
          personId: husbandId,
          relatedPersonId: wifeId,
          type: "SPOUSE",
          marriageDate,
          divorceDate,
          isActive: !divorceDate,
        });

        relationships.push({
          id: generateId(),
          personId: wifeId,
          relatedPersonId: husbandId,
          type: "SPOUSE",
          marriageDate,
          divorceDate,
          isActive: !divorceDate,
        });
      }

      // Handle same-sex couples - both parents recorded as spouses
      if (parsed.husband && !parsed.wife && parsed.children.length > 0) {
        // Check if there's another family with same husband to infer second spouse
        const otherFamily = gedcomFile.families.find(
          (f) =>
            f.id !== record.id &&
            (this.parser.parseFamily(f).husband === parsed.husband ||
              this.parser.parseFamily(f).wife === parsed.husband)
        );
        if (otherFamily) {
          const otherParsed = this.parser.parseFamily(otherFamily);
          const secondPartner = otherParsed.wife || otherParsed.husband;
          if (secondPartner && secondPartner !== parsed.husband) {
            const husbandId = idMap.get(parsed.husband);
            const secondId = idMap.get(secondPartner);
            if (husbandId && secondId) {
              relationships.push({
                id: generateId(),
                personId: husbandId,
                relatedPersonId: secondId,
                type: "SPOUSE",
                isActive: true,
              });
              relationships.push({
                id: generateId(),
                personId: secondId,
                relatedPersonId: husbandId,
                type: "SPOUSE",
                isActive: true,
              });
            }
          }
        }
      }

      // Create parent-child relationships
      for (const childId of parsed.children) {
        const childVamsaId = idMap.get(childId);

        if (!childVamsaId) {
          if (!options?.ignoreMissingReferences) {
            errors.push({
              type: "broken_reference",
              source: "FAM",
              id: parsed.id,
              field: "CHIL",
              message: `Broken child reference in family ${parsed.id}: ${childId}`,
            });
          }
          continue;
        }

        // PARENT relationships (from parent to child)
        if (parsed.husband) {
          const husbandId = idMap.get(parsed.husband);
          if (husbandId) {
            relationships.push({
              id: generateId(),
              personId: husbandId,
              relatedPersonId: childVamsaId,
              type: "PARENT",
              isActive: true,
            });
          }
        }

        if (parsed.wife) {
          const wifeId = idMap.get(parsed.wife);
          if (wifeId) {
            relationships.push({
              id: generateId(),
              personId: wifeId,
              relatedPersonId: childVamsaId,
              type: "PARENT",
              isActive: true,
            });
          }
        }

        // CHILD relationships (from child to parents)
        if (parsed.husband) {
          const husbandId = idMap.get(parsed.husband);
          if (husbandId) {
            relationships.push({
              id: generateId(),
              personId: childVamsaId,
              relatedPersonId: husbandId,
              type: "CHILD",
              isActive: true,
            });
          }
        }

        if (parsed.wife) {
          const wifeId = idMap.get(parsed.wife);
          if (wifeId) {
            relationships.push({
              id: generateId(),
              personId: childVamsaId,
              relatedPersonId: wifeId,
              type: "CHILD",
              isActive: true,
            });
          }
        }
      }
    }

    return {
      people,
      relationships,
      errors,
      warnings,
    };
  }

  /**
   * Convert Vamsa data to GEDCOM format
   */
  mapToGedcom(
    people: VamsaPerson[],
    relationships: VamsaRelationship[]
  ): { individuals: GedcomIndividualData[]; families: GedcomFamilyData[] } {
    const individuals: GedcomIndividualData[] = [];
    const families: GedcomFamilyData[] = [];

    // Create ID to xref mapping
    const idToXref = new Map<string, string>();
    let individualsIndex = 1;

    for (const person of people) {
      if (person.id) {
        idToXref.set(person.id, `@I${individualsIndex}@`);
        individualsIndex++;
      }
    }

    // Create individuals
    for (const person of people) {
      if (!person.id) continue;

      const xref = idToXref.get(person.id);
      if (!xref) continue;

      const name = this.formatName(person.firstName, person.lastName);
      const sex = this.mapGender(person.gender);

      const individual: GedcomIndividualData = {
        xref,
        name,
        sex,
        birthDate: person.dateOfBirth
          ? this.formatToGedcomDate(person.dateOfBirth)
          : undefined,
        birthPlace: person.birthPlace,
        deathDate: person.dateOfPassing
          ? this.formatToGedcomDate(person.dateOfPassing)
          : undefined,
        occupation: person.profession,
        notes: person.bio ? [person.bio] : [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      };

      individuals.push(individual);
    }

    // Build family structures from relationships
    const familyMap = new Map<
      string,
      {
        spouses: [string, string] | [string] | undefined;
        children: string[];
        marriages: Map<string, { marriageDate?: Date; divorceDate?: Date }>;
      }
    >();

    // Group relationships by family units
    for (const rel of relationships) {
      if (rel.type === "SPOUSE") {
        // Find or create family for this couple
        let familyKey = `${rel.personId}-${rel.relatedPersonId}`;
        const reverseKey = `${rel.relatedPersonId}-${rel.personId}`;

        // Check if we already have this couple in reverse order
        if (familyMap.has(reverseKey) && !familyMap.has(familyKey)) {
          familyKey = reverseKey;
        }

        if (!familyMap.has(familyKey)) {
          familyMap.set(familyKey, {
            spouses: [rel.personId, rel.relatedPersonId] as [string, string],
            children: [],
            marriages: new Map(),
          });
        }

        const family = familyMap.get(familyKey);
        if (family && rel.marriageDate) {
          const key = `${rel.personId}-${rel.relatedPersonId}`;
          family.marriages.set(key, {
            marriageDate: rel.marriageDate,
            divorceDate: rel.divorceDate,
          });
        }
      }
    }

    // Add children to families
    for (const rel of relationships) {
      if (rel.type === "PARENT") {
        // Find family with this parent
        for (const [, family] of familyMap.entries()) {
          if (
            family.spouses &&
            (family.spouses[0] === rel.personId ||
              family.spouses[1] === rel.personId)
          ) {
            if (!family.children.includes(rel.relatedPersonId)) {
              family.children.push(rel.relatedPersonId);
            }
          }
        }
      }
    }

    // Create FAM records
    let familyIndex = 1;
    for (const [, family] of familyMap.entries()) {
      if (!family.spouses) continue;

      const xref = `@F${familyIndex}@`;
      familyIndex++;

      const husband =
        family.spouses && family.spouses.length > 0
          ? idToXref.get(family.spouses[0] || "")
          : undefined;
      const wife =
        family.spouses && family.spouses.length > 1
          ? idToXref.get((family.spouses as [string, string])[1])
          : undefined;

      const children = family.children
        .map((childId) => idToXref.get(childId))
        .filter((x): x is string => !!x);

      // Get marriage dates from relationship
      let marriageDate: string | undefined;
      let divorceDate: string | undefined;

      for (const [, marriage] of family.marriages.entries()) {
        if (marriage.marriageDate) {
          marriageDate = this.formatToGedcomDate(marriage.marriageDate);
        }
        if (marriage.divorceDate) {
          divorceDate = this.formatToGedcomDate(marriage.divorceDate);
        }
      }

      const familyData: GedcomFamilyData = {
        xref,
        husband,
        wife,
        children,
        marriageDate,
        divorceDate,
        notes: [],
      };

      families.push(familyData);

      // Update individuals with family references
      for (const individual of individuals) {
        if (individual.xref === husband || individual.xref === wife) {
          individual.familiesAsSpouse.push(xref);
        }
        if (children.includes(individual.xref)) {
          individual.familiesAsChild.push(xref);
        }
      }
    }

    return { individuals, families };
  }

  /**
   * Parse GEDCOM name format
   * Format: "Given /Surname/" or "Given" or "/Surname/"
   */
  private parseName(gedcomName: string): ParsedName {
    if (!gedcomName || !gedcomName.trim()) {
      return {};
    }

    const trimmed = gedcomName.trim();

    // Find surname between forward slashes
    const surnameMatch = trimmed.match(/\/([^/]*)\//);
    const lastName = surnameMatch ? surnameMatch[1].trim() : undefined;

    // Extract given names (everything before and after surname)
    let firstName: string | undefined;
    if (surnameMatch) {
      // Remove the /surname/ part and trim
      const withoutSurname = trimmed.replace(/\/[^/]*\//, "").trim();
      firstName = withoutSurname || undefined;
    } else {
      // No surname markers, entire thing is given name
      firstName = trimmed || undefined;
    }

    return {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    };
  }

  /**
   * Format name to GEDCOM style
   */
  private formatName(firstName: string, lastName?: string): string {
    if (!lastName) {
      return firstName || "";
    }
    return `${firstName} /${lastName}/`;
  }

  /**
   * Map Vamsa gender to GEDCOM
   */
  private mapGender(vamsaGender?: string | null): "M" | "F" | "X" | undefined {
    if (!vamsaGender) return undefined;
    switch (vamsaGender) {
      case "MALE":
        return "M";
      case "FEMALE":
        return "F";
      case "OTHER":
        return "X";
      default:
        return undefined;
    }
  }

  /**
   * Map GEDCOM gender to Vamsa
   */
  private unmapGender(
    gedcomGender?: string
  ): "MALE" | "FEMALE" | "OTHER" | undefined {
    if (!gedcomGender) return undefined;
    switch (gedcomGender) {
      case "M":
        return "MALE";
      case "F":
        return "FEMALE";
      case "X":
        return "OTHER";
      default:
        return undefined;
    }
  }

  /**
   * Parse ISO date string (YYYY-MM-DD) to Date object
   */
  private parseISODate(isoDateString: string): Date | undefined {
    if (!isoDateString) return undefined;

    try {
      // Parse ISO date and create UTC date at midnight
      const parts = isoDateString.split("-");
      if (parts.length < 1) return undefined;

      const year = parseInt(parts[0], 10);
      const month = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0; // month is 0-based
      const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;

      // Create date at UTC midnight
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    } catch {
      return undefined;
    }
  }

  /**
   * Format Date to GEDCOM format
   * Returns "DD MMM YYYY" for full dates
   */
  private formatToGedcomDate(date: Date): string {
    if (!date) return "";

    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];

    const year = date.getUTCFullYear();
    const month = monthNames[date.getUTCMonth()];
    const day = date.getUTCDate();

    return `${day} ${month} ${year}`;
  }
}

export type {
  MappingResult,
  MappingError,
  VamsaPerson,
  VamsaRelationship,
  GedcomIndividualData,
  GedcomFamilyData,
  MapOptions,
};
