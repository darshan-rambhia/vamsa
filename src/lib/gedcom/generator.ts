/**
 * GEDCOM 5.5.1 Generator
 * Converts mapped GEDCOM data to valid GEDCOM 5.5.1 text format
 */

import type { GedcomIndividualData, GedcomFamilyData } from "./mapper-types";

export interface GeneratorOptions {
  sourceProgram?: string;
  submitterName?: string;
  maxLineLength?: number; // Default 80
}

export class GedcomGenerator {
  private maxLineLength: number;
  private sourceProgram: string;
  private submitterName: string;

  constructor(options?: GeneratorOptions) {
    this.maxLineLength = options?.maxLineLength || 80;
    this.sourceProgram = options?.sourceProgram || "vamsa";
    this.submitterName = options?.submitterName || "Vamsa User";
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
   */
  private generateHeader(): string {
    const today = new Date();
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

    const lines: string[] = [];
    lines.push("0 HEAD");
    lines.push(`1 SOUR ${this.sourceProgram}`);
    lines.push(`2 NAME ${this.sourceProgram}`);
    lines.push("2 VERS 1.0");
    lines.push(`1 DATE ${day} ${month} ${year}`);
    lines.push("1 GEDC");
    lines.push("2 VERS 5.5.1");
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
        lines.push(`2 DATE ${individual.birthDate}`);
      }
      if (individual.birthPlace) {
        lines.push(`2 PLAC ${individual.birthPlace}`);
      }
    }

    // Death event (optional)
    if (individual.deathDate || individual.deathPlace) {
      lines.push("1 DEAT");
      if (individual.deathDate) {
        lines.push(`2 DATE ${individual.deathDate}`);
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
        lines.push(`2 DATE ${family.marriageDate}`);
      }
      if (family.marriagePlace) {
        lines.push(`2 PLAC ${family.marriagePlace}`);
      }
    }

    // Divorce event (optional)
    if (family.divorceDate) {
      lines.push("1 DIV");
      lines.push(`2 DATE ${family.divorceDate}`);
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
}
