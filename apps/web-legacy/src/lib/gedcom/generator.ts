/**
 * GEDCOM 5.5.1 Generator
 * Converts mapped GEDCOM data to valid GEDCOM 5.5.1 text format
 */

import type { GedcomIndividualData, GedcomFamilyData } from "./mapper-types";
import type { VamsaSource } from "./source-mapper";
import type { VamsaMediaObject } from "./object-mapper";

export interface GeneratorOptions {
  sourceProgram?: string;
  submitterName?: string;
  maxLineLength?: number; // Default 80
  version?: "5.5.1" | "7.0"; // GEDCOM version to export (default 5.5.1)
}

export class GedcomGenerator {
  private maxLineLength: number;
  private sourceProgram: string;
  private submitterName: string;
  private version: "5.5.1" | "7.0";

  constructor(options?: GeneratorOptions) {
    this.maxLineLength = options?.maxLineLength || 80;
    this.sourceProgram = options?.sourceProgram || "vamsa";
    this.submitterName = options?.submitterName || "Vamsa User";
    this.version = options?.version || "5.5.1";
  }

  /**
   * Generate GEDCOM 5.5.1 file content
   */
  generate(
    individuals: GedcomIndividualData[],
    families: GedcomFamilyData[]
  ): string {
    const lines: string[] = [];

    // 1. Generate header
    lines.push(this.generateHeader());

    // 2. Generate submitter record
    lines.push(this.generateSubmitter());

    // 3. Add all INDI records
    for (const individual of individuals) {
      lines.push(this.generateIndividual(individual));
    }

    // 4. Add all FAM records
    for (const family of families) {
      lines.push(this.generateFamily(family));
    }

    // 5. Add trailer
    lines.push("0 TRLR");

    // 6. Join with newlines and return
    return lines.join("\n");
  }

  /**
   * Generate GEDCOM header
   * Supports both GEDCOM 5.5.1 and 7.0 formats
   */
  private generateHeader(): string {
    const today = new Date();

    const lines: string[] = [];
    lines.push("0 HEAD");
    lines.push(`1 SOUR ${this.sourceProgram}`);
    lines.push(`2 NAME ${this.sourceProgram}`);
    lines.push("2 VERS 1.0");

    // Format date based on version
    if (this.version === "7.0") {
      // GEDCOM 7.0 uses ISO 8601 format
      const isoDate = today.toISOString().split("T")[0];
      lines.push(`1 DATE ${isoDate}`);
    } else {
      // GEDCOM 5.5.1 uses traditional format
      const day = String(today.getDate()).padStart(2, "0");
      const months = [
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
      const month = months[today.getMonth()];
      const year = today.getFullYear();
      lines.push(`1 DATE ${day} ${month} ${year}`);
    }

    lines.push("1 GEDC");
    lines.push(`2 VERS ${this.version}`);
    lines.push("2 FORM LINEAGE-LINKED");
    lines.push("1 CHAR UTF-8");
    lines.push("1 SUBM @SUBM1@");

    return lines.join("\n");
  }

  /**
   * Generate submitter record
   */
  private generateSubmitter(): string {
    const lines: string[] = [];
    lines.push("0 @SUBM1@ SUBM");
    lines.push(`1 NAME ${this.submitterName}`);

    return lines.join("\n");
  }

  /**
   * Generate INDI record
   */
  private generateIndividual(individual: GedcomIndividualData): string {
    const lines: string[] = [];

    // Opening record
    lines.push(`0 ${individual.xref} INDI`);

    // Name (required)
    lines.push(`1 NAME ${individual.name}`);

    // Sex (optional)
    if (individual.sex) {
      lines.push(`1 SEX ${individual.sex}`);
    }

    // Birth event (optional)
    if (individual.birthDate || individual.birthPlace) {
      lines.push("1 BIRT");
      if (individual.birthDate) {
        const formattedDate = this.formatDate(individual.birthDate);
        lines.push(`2 DATE ${formattedDate}`);
      }
      if (individual.birthPlace) {
        lines.push(`2 PLAC ${individual.birthPlace}`);
      }
    }

    // Death event (optional)
    if (individual.deathDate || individual.deathPlace) {
      lines.push("1 DEAT");
      if (individual.deathDate) {
        const formattedDate = this.formatDate(individual.deathDate);
        lines.push(`2 DATE ${formattedDate}`);
      }
      if (individual.deathPlace) {
        lines.push(`2 PLAC ${individual.deathPlace}`);
      }
    }

    // Occupation (optional)
    if (individual.occupation) {
      lines.push(`1 OCCU ${individual.occupation}`);
    }

    // Notes (optional)
    for (const note of individual.notes) {
      const noteLines = this.formatLongLine(1, "NOTE", note);
      lines.push(...noteLines);
    }

    // Family references
    // Families as spouse (families where this person is a spouse)
    for (const familyRef of individual.familiesAsSpouse) {
      lines.push(`1 FAMS ${familyRef}`);
    }

    // Families as child (families where this person is a child)
    for (const familyRef of individual.familiesAsChild) {
      lines.push(`1 FAMC ${familyRef}`);
    }

    return lines.join("\n");
  }

  /**
   * Generate FAM record
   */
  private generateFamily(family: GedcomFamilyData): string {
    const lines: string[] = [];

    // Opening record
    lines.push(`0 ${family.xref} FAM`);

    // Husband (optional)
    if (family.husband) {
      lines.push(`1 HUSB ${family.husband}`);
    }

    // Wife (optional)
    if (family.wife) {
      lines.push(`1 WIFE ${family.wife}`);
    }

    // Marriage event (optional)
    if (family.marriageDate || family.marriagePlace) {
      lines.push("1 MARR");
      if (family.marriageDate) {
        const formattedDate = this.formatDate(family.marriageDate);
        lines.push(`2 DATE ${formattedDate}`);
      }
      if (family.marriagePlace) {
        lines.push(`2 PLAC ${family.marriagePlace}`);
      }
    }

    // Divorce event (optional)
    if (family.divorceDate) {
      lines.push("1 DIV");
      const formattedDate = this.formatDate(family.divorceDate);
      lines.push(`2 DATE ${formattedDate}`);
    }

    // Children
    for (const childRef of family.children) {
      lines.push(`1 CHIL ${childRef}`);
    }

    // Notes (optional)
    for (const note of family.notes) {
      const noteLines = this.formatLongLine(1, "NOTE", note);
      lines.push(...noteLines);
    }

    return lines.join("\n");
  }

  /**
   * Format individual GEDCOM line
   * Format: "<level> [<xref>] <tag> [<value>]"
   */
  private formatLine(
    level: number,
    tag: string,
    value?: string,
    xref?: string
  ): string {
    let line = `${level}`;

    if (xref) {
      line += ` ${xref}`;
    }

    line += ` ${tag}`;

    if (value) {
      line += ` ${value}`;
    }

    return line;
  }

  /**
   * Format date for GEDCOM output based on version
   * GEDCOM 5.5.1: "15 JAN 1985"
   * GEDCOM 7.0: "1985-01-15" (ISO 8601)
   */
  private formatDate(isoDate: string): string {
    if (!isoDate) {
      return "";
    }

    if (this.version === "7.0") {
      // ISO 8601 format - already in correct format
      return isoDate;
    }

    // GEDCOM 5.5.1 format - convert from ISO to traditional format
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      const day = String(parseInt(parts[2], 10));
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const months = [
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
      const month = months[monthIndex];
      return `${day} ${month} ${year}`;
    } else if (parts.length === 2) {
      // Month-year only
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const months = [
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
      const month = months[monthIndex];
      return `${month} ${year}`;
    } else if (parts.length === 1) {
      // Year only
      return parts[0];
    }

    return isoDate;
  }

  /**
   * Handle long lines with continuation
   * Splits lines longer than maxLineLength using CONC/CONT
   * CONC = concatenate (no space between continuation)
   * CONT = continue (line break in original)
   */
  private formatLongLine(level: number, tag: string, value: string): string[] {
    const lines: string[] = [];

    if (!value || value.length === 0) {
      return [this.formatLine(level, tag)];
    }

    // First line with tag
    const firstLineMaxLength = this.maxLineLength - `${level} ${tag} `.length;

    if (value.length <= firstLineMaxLength) {
      // Fits in one line
      return [this.formatLine(level, tag, value)];
    }

    // Split into multiple lines
    let remaining = value;
    let isFirst = true;

    while (remaining.length > 0) {
      if (isFirst) {
        // First line with original tag
        const chunk = remaining.substring(0, firstLineMaxLength);
        lines.push(this.formatLine(level, tag, chunk));
        remaining = remaining.substring(firstLineMaxLength);
        isFirst = false;
      } else {
        // Continuation lines - prefer CONT for word boundaries
        const contLineMaxLength =
          this.maxLineLength - `${level + 1} CONT `.length;

        if (remaining.length <= contLineMaxLength) {
          // Last chunk
          lines.push(this.formatLine(level + 1, "CONT", remaining));
          remaining = "";
        } else {
          // Find word boundary for better readability
          const chunk = remaining.substring(0, contLineMaxLength);
          const lastSpace = chunk.lastIndexOf(" ");

          if (lastSpace > 0 && lastSpace > contLineMaxLength / 2) {
            // Use word boundary
            lines.push(
              this.formatLine(level + 1, "CONT", chunk.substring(0, lastSpace))
            );
            remaining = remaining.substring(lastSpace + 1);
          } else {
            // No good word boundary, use CONC for hard break
            lines.push(this.formatLine(level + 1, "CONC", chunk));
            remaining = remaining.substring(contLineMaxLength);
          }
        }
      }
    }

    return lines;
  }

  /**
   * Generate SOUR (Source) record
   * GEDCOM Phase 2: Source Citations Support
   */
  generateSource(source: VamsaSource & { xref: string }): string {
    const lines: string[] = [];

    // Opening record
    lines.push(`0 ${source.xref} SOUR`);

    // Title (required)
    lines.push(`1 TITL ${source.title}`);

    // Author (optional)
    if (source.author) {
      lines.push(`1 AUTH ${source.author}`);
    }

    // Publication date (optional)
    if (source.publicationDate) {
      lines.push(`1 PUBL ${source.publicationDate}`);
    }

    // Repository (optional)
    if (source.repository) {
      lines.push(`1 REPO ${source.repository}`);
    }

    // Notes (optional)
    if (source.notes) {
      const noteLines = this.formatLongLine(1, "NOTE", source.notes);
      lines.push(...noteLines);
    }

    return lines.join("\n");
  }

  /**
   * Generate OBJE (Object/Multimedia) record
   * GEDCOM Phase 2: Multimedia Object Support
   */
  generateObject(object: VamsaMediaObject & { xref: string }): string {
    const lines: string[] = [];

    // Opening record
    lines.push(`0 ${object.xref} OBJE`);

    // File path (required)
    lines.push(`1 FILE ${object.filePath}`);

    // Format (optional but recommended)
    if (object.format) {
      lines.push(`1 FORM ${object.format}`);
    }

    // Title (optional)
    if (object.title) {
      lines.push(`1 TITL ${object.title}`);
    }

    // Description/Notes (optional)
    if (object.description) {
      const noteLines = this.formatLongLine(1, "NOTE", object.description);
      lines.push(...noteLines);
    }

    return lines.join("\n");
  }
}
