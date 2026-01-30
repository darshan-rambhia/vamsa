/**
 * GEDCOM 5.5.1 and 7.0 Parser
 * Handles parsing of GEDCOM format files into structured TypeScript objects
 */

import { detectEncoding, normalizeEncoding } from "./encoding";
import type {
  GedcomFile,
  GedcomLine,
  GedcomRecord,
  ParsedDate,
  ParsedFamily,
  ParsedIndividual,
  ParsedRepository,
  ParsedSubmitter,
  ValidationError,
} from "./types";

export class GedcomParser {
  private lines: Array<GedcomLine> = [];
  private records: Array<GedcomRecord> = [];
  private errors: Array<ValidationError> = [];
  private gedcomVersion: "5.5.1" | "7.0" = "5.5.1";

  /**
   * Parse GEDCOM 5.5.1 or 7.0 text into structured format
   * Automatically detects and normalizes encoding
   */
  parse(content: string): GedcomFile {
    this.lines = [];
    this.records = [];
    this.errors = [];

    // Step 1: Detect and normalize encoding (ANSEL -> UTF-8)
    const detectedEncoding = detectEncoding(content);
    let processedContent = content;

    if (detectedEncoding === "ANSEL") {
      processedContent = normalizeEncoding(content);
    }

    // Split into lines and filter empty lines
    const rawLines = processedContent
      .split(/\r?\n/)
      .filter((line) => line.trim());

    // Parse each line and handle continuations
    this.parseLines(rawLines);

    // Build hierarchical record structure
    this.buildRecords();

    // Extract specific records
    const header = this.records.find((r) => r.type === "HEAD");
    const trailer = this.records.find((r) => r.type === "TRLR");
    const individuals = this.records.filter((r) => r.type === "INDI");
    const families = this.records.filter((r) => r.type === "FAM");
    const sources = this.records.filter((r) => r.type === "SOUR");
    const objects = this.records.filter((r) => r.type === "OBJE");
    const repositories = this.records.filter((r) => r.type === "REPO");
    const submitters = this.records.filter((r) => r.type === "SUBM");

    if (!header) {
      throw new Error("Missing required HEAD record");
    }
    if (!trailer) {
      throw new Error("Missing required TRLR record");
    }

    // Extract charset and version from header
    const charsetLine = header.tags.get("CHAR")?.[0];

    // Find GEDC > VERS nested structure
    // Look for VERS lines that come after GEDC at level 1
    let version = "5.5.1";
    const gedcLines = header.tags.get("GEDC") || [];
    if (gedcLines.length > 0) {
      const gedcIndex = header.lines.indexOf(gedcLines[0]);
      for (let i = gedcIndex + 1; i < header.lines.length; i++) {
        const line = header.lines[i];
        // Stop if we reach level 1 (sibling of GEDC)
        if (line.level === 1) {
          break;
        }
        // Found VERS as child of GEDC
        if (line.tag === "VERS" && line.level === 2) {
          version = line.value;
          break;
        }
      }
    }

    const charset = charsetLine?.value || "UTF-8";

    // Detect GEDCOM version (5.5.1 vs 7.0)
    const detectedVersion = this.detectGedcomVersion(version);
    this.gedcomVersion = detectedVersion;

    return {
      header,
      individuals,
      families,
      sources,
      objects,
      repositories,
      submitters,
      trailer,
      version,
      charset,
      gedcomVersion: detectedVersion,
    };
  }

  /**
   * Detect GEDCOM version from version string
   */
  private detectGedcomVersion(versionStr: string): "5.5.1" | "7.0" {
    if (!versionStr) {
      return "5.5.1"; // Default to 5.5.1
    }

    const normalized = versionStr.trim().toLowerCase();
    if (normalized.includes("7.0") || normalized.startsWith("7")) {
      return "7.0";
    }

    return "5.5.1";
  }

  /**
   * Parse lines and handle continuation lines (CONT/CONC)
   */
  private parseLines(rawLines: Array<string>): void {
    let i = 0;
    while (i < rawLines.length) {
      const line = rawLines[i];
      const parsedLine = this.parseLine(line);

      if (!parsedLine) {
        i++;
        continue;
      }

      // Handle continuation lines
      let continuedValue = parsedLine.value;
      let nextIndex = i + 1;

      while (nextIndex < rawLines.length) {
        const nextLine = rawLines[nextIndex];
        const nextParsed = this.parseLine(nextLine);

        // Check if it's a continuation line (CONT or CONC)
        if (!nextParsed) {
          break;
        }

        // Check if next line is at higher level or lower level with continuation tags
        const nextLevel = this.getLevel(nextLine);
        const currentLevel = parsedLine.level;

        if (
          nextLevel > currentLevel &&
          (nextParsed.tag === "CONT" || nextParsed.tag === "CONC")
        ) {
          // CONT adds line break, CONC concatenates
          if (nextParsed.tag === "CONT") {
            continuedValue += "\n" + nextParsed.value;
          } else {
            continuedValue += nextParsed.value;
          }
          nextIndex++;
        } else {
          break;
        }
      }

      parsedLine.value = continuedValue;
      this.lines.push(parsedLine);
      i = nextIndex;
    }
  }

  /**
   * Parse a single GEDCOM line
   * Format: <level> <tag> [<xref>] [<value>]
   *
   * Uses deterministic string parsing to avoid ReDoS vulnerabilities
   */
  private parseLine(line: string): GedcomLine | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Parse using deterministic approach: split on first whitespace sequences
    // Find level (digits at start)
    let i = 0;
    while (i < trimmed.length && trimmed[i] >= "0" && trimmed[i] <= "9") {
      i++;
    }
    if (i === 0) return null; // No level found

    const levelStr = trimmed.slice(0, i);
    const level = parseInt(levelStr, 10);

    // Skip whitespace after level
    while (i < trimmed.length && (trimmed[i] === " " || trimmed[i] === "\t")) {
      i++;
    }
    if (i >= trimmed.length) return null; // No content after level

    // Check for optional xref at level 0 (format: @ID@)
    let xref: string | undefined;
    if (trimmed[i] === "@") {
      const xrefStart = i;
      i++; // skip opening @
      // Find closing @
      while (i < trimmed.length && trimmed[i] !== "@") {
        i++;
      }
      if (i >= trimmed.length) return null; // Unclosed xref
      i++; // skip closing @
      xref = trimmed.slice(xrefStart, i);

      // Skip whitespace after xref
      while (
        i < trimmed.length &&
        (trimmed[i] === " " || trimmed[i] === "\t")
      ) {
        i++;
      }
    }

    // Parse tag (word characters)
    const tagStart = i;
    while (
      i < trimmed.length &&
      ((trimmed[i] >= "A" && trimmed[i] <= "Z") ||
        (trimmed[i] >= "a" && trimmed[i] <= "z") ||
        (trimmed[i] >= "0" && trimmed[i] <= "9") ||
        trimmed[i] === "_")
    ) {
      i++;
    }
    if (i === tagStart) return null; // No tag found

    const tag = trimmed.slice(tagStart, i);

    // Skip whitespace after tag
    while (i < trimmed.length && (trimmed[i] === " " || trimmed[i] === "\t")) {
      i++;
    }

    // Rest is value or pointer (optional)
    const valueOrPointer = i < trimmed.length ? trimmed.slice(i) : "";

    // Determine if valueOrPointer is a pointer or value
    let pointer: string | undefined;
    let value: string;

    // Check if it's a pointer (format: @ID@)
    if (
      valueOrPointer.startsWith("@") &&
      valueOrPointer.endsWith("@") &&
      valueOrPointer.length > 2 &&
      !valueOrPointer.slice(1, -1).includes("@")
    ) {
      pointer = valueOrPointer;
      value = "";
    } else {
      value = valueOrPointer;
    }

    return {
      level,
      tag,
      xref,
      value: value.trim(),
      pointer,
    };
  }

  /**
   * Get level from a line string
   */
  private getLevel(line: string): number {
    const match = line.match(/^(\d+)\s+/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Build hierarchical record structure from lines
   */
  private buildRecords(): void {
    const recordStack: Array<GedcomRecord> = [];
    let currentRecord: GedcomRecord | null = null;
    const _currentParent: GedcomRecord | null = null;

    for (const line of this.lines) {
      // Top-level record
      if (line.level === 0) {
        // Save previous record
        if (currentRecord) {
          this.records.push(currentRecord);
        }

        const type = this.getRecordType(line.tag, line.xref);
        currentRecord = {
          type,
          id: line.xref?.replace(/@/g, ""),
          lines: [line],
          tags: new Map(),
        };
        recordStack.length = 0;
        recordStack.push(currentRecord);

        // Add to tag map
        const existing = currentRecord.tags.get(line.tag) || [];
        existing.push(line);
        currentRecord.tags.set(line.tag, existing);
      } else if (currentRecord) {
        // Add to current record
        currentRecord.lines.push(line);

        // Add to tag map
        const existing = currentRecord.tags.get(line.tag) || [];
        existing.push(line);
        currentRecord.tags.set(line.tag, existing);
      }
    }

    // Save last record
    if (currentRecord) {
      this.records.push(currentRecord);
    }
  }

  /**
   * Determine record type from tag
   */
  private getRecordType(
    tag: string,
    _xref?: string
  ):
    | "INDI"
    | "FAM"
    | "HEAD"
    | "TRLR"
    | "SOUR"
    | "OBJE"
    | "REPO"
    | "SUBM"
    | "OTHER" {
    if (tag === "HEAD") return "HEAD";
    if (tag === "TRLR") return "TRLR";
    if (tag === "INDI") return "INDI";
    if (tag === "FAM") return "FAM";
    if (tag === "SOUR") return "SOUR";
    if (tag === "OBJE") return "OBJE";
    if (tag === "REPO") return "REPO";
    if (tag === "SUBM") return "SUBM";
    return "OTHER";
  }

  /**
   * Parse GEDCOM date format
   * GEDCOM 5.5.1: "15 JAN 1985", "JAN 1985", "1985", "ABT 1985", "BEF 1985", "AFT 1985", "BET 1975 AND 1985"
   * GEDCOM 7.0: ISO 8601 format "1985-01-15", "1985-01", "1985"
   * Returns ISO date (YYYY-MM-DD) or partial ISO date (YYYY-MM or YYYY) or null if invalid
   */
  parseDate(
    gedcomDate: string,
    version: "5.5.1" | "7.0" = "5.5.1"
  ): string | null {
    if (!gedcomDate || !gedcomDate.trim()) {
      return null;
    }

    const trimmed = gedcomDate.trim();

    // Try GEDCOM 7.0 ISO 8601 format first if version is 7.0
    if (version === "7.0") {
      const iso8601Result = this.parseDateISO8601(trimmed);
      if (iso8601Result) {
        return iso8601Result;
      }
    }

    // Fall back to GEDCOM 5.5.1 format
    const parsed = this.parseDateComponents(trimmed);

    if (!parsed.year) {
      return null;
    }

    // Validate day is reasonable
    if (parsed.day && (parsed.day < 1 || parsed.day > 31)) {
      return null;
    }

    // Build ISO date with available components
    let isoDate = String(parsed.year).padStart(4, "0");

    if (parsed.month) {
      isoDate += "-" + String(parsed.month).padStart(2, "0");

      if (parsed.day) {
        isoDate += "-" + String(parsed.day).padStart(2, "0");
      }
    }

    return isoDate;
  }

  /**
   * Parse ISO 8601 date format used in GEDCOM 7.0
   * Formats: "1985-01-15", "1985-01", "1985"
   */
  private parseDateISO8601(dateStr: string): string | null {
    // Match ISO 8601 format
    const iso8601Match = dateStr.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);

    if (!iso8601Match) {
      return null;
    }

    const year = iso8601Match[1];
    const month = iso8601Match[2];
    const day = iso8601Match[3];

    // Build result
    let result = year;
    if (month) {
      result += "-" + month;
      if (day) {
        result += "-" + day;
      }
    }

    return result;
  }

  /**
   * Parse date components from GEDCOM date string
   */
  private parseDateComponents(dateStr: string): ParsedDate {
    const result: ParsedDate = {
      isApproximate: false,
      raw: dateStr,
    };

    // Check for date qualifiers
    let workingStr = dateStr.trim();
    const qualifierMatch = workingStr.match(/^(ABT|BEF|AFT|BET)\s+/);
    if (qualifierMatch) {
      result.qualifier = qualifierMatch[1] as "ABT" | "BEF" | "AFT" | "BET";
      result.isApproximate = true;
      workingStr = workingStr.substring(qualifierMatch[0].length).trim();
    }

    if (result.qualifier === "BET") {
      const betFullMatch = workingStr.match(
        /^(\d{1,2})\s+(\w+)\s+(\d{4})\s+AND\s+(\d{1,2})\s+(\w+)\s+(\d{4})$/
      );
      if (betFullMatch) {
        result.day = parseInt(betFullMatch[1], 10);
        result.month = this.monthToNumber(betFullMatch[2]);
        result.year = parseInt(betFullMatch[3], 10);
        return result;
      }

      const betYearMatch = workingStr.match(/^(\d{4})\s+AND\s+(\d{4})$/);
      if (betYearMatch) {
        result.year = parseInt(betYearMatch[1], 10);
        return result;
      }
    }

    const fullMatch = workingStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
    if (fullMatch) {
      result.day = parseInt(fullMatch[1], 10);
      result.month = this.monthToNumber(fullMatch[2]);
      result.year = parseInt(fullMatch[3], 10);
      return result;
    }

    const monthYearMatch = workingStr.match(/^(\w+)\s+(\d{4})$/);
    if (monthYearMatch) {
      result.month = this.monthToNumber(monthYearMatch[1]);
      result.year = parseInt(monthYearMatch[2], 10);
      return result;
    }

    const yearMatch = workingStr.match(/^(\d{4})$/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[1], 10);
      return result;
    }

    return result;
  }

  /**
   * Convert month name to number (1-12)
   */
  private monthToNumber(monthName: string): number | undefined {
    const months: Record<string, number> = {
      JAN: 1,
      FEB: 2,
      MAR: 3,
      APR: 4,
      MAY: 5,
      JUN: 6,
      JUL: 7,
      AUG: 8,
      SEP: 9,
      SEPT: 9,
      OCT: 10,
      NOV: 11,
      DEC: 12,
    };
    return months[monthName.toUpperCase()];
  }

  /**
   * Parse name in GEDCOM format
   * Format: "Given /Surname/" or "Given" or "/Surname/"
   */
  parseName(gedcomName: string): { firstName?: string; lastName?: string } {
    if (!gedcomName || !gedcomName.trim()) {
      return {};
    }

    const trimmed = gedcomName.trim();

    const firstSlash = trimmed.indexOf("/");
    const lastSlash = trimmed.lastIndexOf("/");

    let lastName: string | undefined;
    let firstName: string | undefined;

    if (firstSlash !== -1 && lastSlash > firstSlash) {
      lastName = trimmed.slice(firstSlash + 1, lastSlash).trim() || undefined;

      const withoutSurname =
        `${trimmed.slice(0, firstSlash)}${trimmed.slice(lastSlash + 1)}`.trim();
      firstName = withoutSurname || undefined;
    } else {
      firstName = trimmed || undefined;
    }

    return {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    };
  }

  /**
   * Validate GEDCOM file structure
   */
  validate(file: GedcomFile): Array<ValidationError> {
    const errors: Array<ValidationError> = [];

    if (!file.header) {
      errors.push({
        message: "Missing required HEAD record",
        severity: "error",
      });
    }

    if (!file.trailer) {
      errors.push({
        message: "Missing required TRLR record",
        severity: "error",
      });
    }

    const xrefSet = new Set<string>();
    const allRecords = [
      file.header,
      ...file.individuals,
      ...file.families,
      file.trailer,
    ].filter((r): r is GedcomRecord => r !== null && r !== undefined);

    for (const record of allRecords) {
      if (record.id) {
        if (xrefSet.has(record.id)) {
          errors.push({
            message: `Duplicate xref: ${record.id}`,
            severity: "error",
          });
        }
        xrefSet.add(record.id);
      }
    }

    const personIds = new Set(file.individuals.map((i) => i.id));
    const familyIds = new Set(file.families.map((f) => f.id));

    for (const family of file.families) {
      const husbandLine = family.tags.get("HUSB")?.[0];
      const wifeLine = family.tags.get("WIFE")?.[0];
      const childLines = family.tags.get("CHIL") || [];

      if (
        husbandLine?.pointer &&
        !personIds.has(husbandLine.pointer.replace(/@/g, ""))
      ) {
        errors.push({
          message: `Broken reference in family ${family.id}: HUSB ${husbandLine.pointer} not found`,
          severity: "warning",
        });
      }

      if (
        wifeLine?.pointer &&
        !personIds.has(wifeLine.pointer.replace(/@/g, ""))
      ) {
        errors.push({
          message: `Broken reference in family ${family.id}: WIFE ${wifeLine.pointer} not found`,
          severity: "warning",
        });
      }

      for (const childLine of childLines) {
        if (
          childLine.pointer &&
          !personIds.has(childLine.pointer.replace(/@/g, ""))
        ) {
          errors.push({
            message: `Broken reference in family ${family.id}: CHIL ${childLine.pointer} not found`,
            severity: "warning",
          });
        }
      }
    }

    for (const person of file.individuals) {
      const famcLines = person.tags.get("FAMC") || [];
      const famsLines = person.tags.get("FAMS") || [];

      for (const line of famcLines) {
        if (line.pointer && !familyIds.has(line.pointer.replace(/@/g, ""))) {
          errors.push({
            message: `Broken reference in person ${person.id}: FAMC ${line.pointer} not found`,
            severity: "warning",
          });
        }
      }

      for (const line of famsLines) {
        if (line.pointer && !familyIds.has(line.pointer.replace(/@/g, ""))) {
          errors.push({
            message: `Broken reference in person ${person.id}: FAMS ${line.pointer} not found`,
            severity: "warning",
          });
        }
      }
    }

    return errors;
  }

  /**
   * Parse individual record into structured data
   */
  parseIndividual(record: GedcomRecord): ParsedIndividual {
    const id = record.id || "unknown";

    const names: Array<{
      full: string;
      firstName?: string;
      lastName?: string;
    }> = [];
    const nameLines = record.tags.get("NAME") || [];
    for (const line of nameLines) {
      const { firstName, lastName } = this.parseName(line.value);
      names.push({
        full: line.value,
        firstName,
        lastName,
      });
    }

    const sexLine = record.tags.get("SEX")?.[0];
    const sex =
      sexLine?.value === "M" || sexLine?.value === "F" || sexLine?.value === "X"
        ? sexLine.value
        : undefined;

    const birtLine = record.tags.get("BIRT")?.[0];
    const birthDate = birtLine
      ? this.parseDateFromRecord(record, "BIRT")
      : undefined;
    const birthPlace = this.getPlaceFromEvent(record, "BIRT");

    const deathLine = record.tags.get("DEAT")?.[0];
    const deathDate = deathLine
      ? this.parseDateFromRecord(record, "DEAT")
      : undefined;
    const deathPlace = this.getPlaceFromEvent(record, "DEAT");

    const occuLine = record.tags.get("OCCU")?.[0];
    const occupation = occuLine?.value;

    const notes: Array<string> = [];
    const noteLines = record.tags.get("NOTE") || [];
    for (const line of noteLines) {
      const noteValue = line.value.trim();
      if (noteValue) {
        notes.push(noteValue);
      }
    }

    const familiesAsChild: Array<string> = [];
    const famcLines = record.tags.get("FAMC") || [];
    for (const line of famcLines) {
      if (line.pointer) {
        familiesAsChild.push(line.pointer.replace(/@/g, ""));
      }
    }

    const familiesAsSpouse: Array<string> = [];
    const famsLines = record.tags.get("FAMS") || [];
    for (const line of famsLines) {
      if (line.pointer) {
        familiesAsSpouse.push(line.pointer.replace(/@/g, ""));
      }
    }

    return {
      id,
      names: names.length > 0 ? names : [{ full: "" }],
      sex,
      birthDate,
      birthPlace,
      deathDate,
      deathPlace,
      occupation,
      notes,
      familiesAsChild,
      familiesAsSpouse,
    };
  }

  /**
   * Parse family record into structured data
   */
  parseFamily(record: GedcomRecord): ParsedFamily {
    const id = record.id || "unknown";

    const husbandLine = record.tags.get("HUSB")?.[0];
    const wifeLine = record.tags.get("WIFE")?.[0];
    const husband = husbandLine?.pointer?.replace(/@/g, "");
    const wife = wifeLine?.pointer?.replace(/@/g, "");

    const children: Array<string> = [];
    const childLines = record.tags.get("CHIL") || [];
    for (const line of childLines) {
      if (line.pointer) {
        children.push(line.pointer.replace(/@/g, ""));
      }
    }

    const marriageDate = this.parseDateFromRecord(record, "MARR");
    const marriagePlace = this.getPlaceFromEvent(record, "MARR") || undefined;

    const divorceDate = this.parseDateFromRecord(record, "DIV");

    const notes: Array<string> = [];
    const noteLines = record.tags.get("NOTE") || [];
    for (const line of noteLines) {
      const noteValue = line.value.trim();
      if (noteValue) {
        notes.push(noteValue);
      }
    }

    return {
      id,
      husband,
      wife,
      children,
      marriageDate,
      marriagePlace,
      divorceDate,
      notes,
    };
  }

  /**
   * Parse date from an event tag (BIRT, DEAT, MARR, etc.)
   */
  private parseDateFromRecord(
    record: GedcomRecord,
    eventTag: string
  ): string | undefined {
    const eventLines = record.tags.get(eventTag) || [];
    for (const eventLine of eventLines) {
      const eventIndex = record.lines.indexOf(eventLine);

      for (let i = eventIndex + 1; i < record.lines.length; i++) {
        const line = record.lines[i];

        if (line.level <= eventLine.level) {
          break;
        }

        // Found a DATE child of this event
        if (line.tag === "DATE") {
          const parsed = this.parseDate(line.value, this.gedcomVersion);
          if (parsed) {
            return parsed;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Get place from event tag
   */
  private getPlaceFromEvent(
    record: GedcomRecord,
    eventTag: string
  ): string | undefined {
    const eventLines = record.tags.get(eventTag) || [];
    for (const eventLine of eventLines) {
      const eventIndex = record.lines.indexOf(eventLine);
      for (let i = eventIndex + 1; i < record.lines.length; i++) {
        const line = record.lines[i];
        if (line.level <= eventLine.level) {
          break;
        }
        if (line.tag === "PLAC") {
          return line.value;
        }
      }
    }
    return undefined;
  }

  /**
   * Parse repository record into structured data
   */
  parseRepository(record: GedcomRecord): ParsedRepository {
    const id = record.id || "unknown";

    const nameLine = record.tags.get("NAME")?.[0];
    const name = nameLine?.value || "";

    const addrLine = record.tags.get("ADDR")?.[0];
    const address = addrLine?.value;

    const cityLine = record.tags.get("CITY")?.[0];
    const city = cityLine?.value;

    const stateLine = record.tags.get("STAE")?.[0];
    const state = stateLine?.value;

    const countryLine = record.tags.get("CTRY")?.[0];
    const country = countryLine?.value;

    const phoneLine = record.tags.get("PHON")?.[0];
    const phone = phoneLine?.value;

    const emailLine = record.tags.get("EMAIL")?.[0];
    const email = emailLine?.value;

    const websiteLine = record.tags.get("WWW")?.[0];
    const website = websiteLine?.value;

    const notes: Array<string> = [];
    const noteLines = record.tags.get("NOTE") || [];
    for (const line of noteLines) {
      const noteValue = line.value.trim();
      if (noteValue) {
        notes.push(noteValue);
      }
    }

    return {
      id,
      name,
      address,
      city,
      state,
      country,
      phone,
      email,
      website,
      notes,
    };
  }

  /**
   * Parse submitter record into structured data
   */
  parseSubmitter(record: GedcomRecord): ParsedSubmitter {
    const id = record.id || "unknown";

    const nameLine = record.tags.get("NAME")?.[0];
    const name = nameLine?.value || "";

    const addrLine = record.tags.get("ADDR")?.[0];
    const address = addrLine?.value;

    const phoneLine = record.tags.get("PHON")?.[0];
    const phone = phoneLine?.value;

    const emailLine = record.tags.get("EMAIL")?.[0];
    const email = emailLine?.value;

    const notes: Array<string> = [];
    const noteLines = record.tags.get("NOTE") || [];
    for (const line of noteLines) {
      const noteValue = line.value.trim();
      if (noteValue) {
        notes.push(noteValue);
      }
    }

    return {
      id,
      name,
      address,
      phone,
      email,
      notes,
    };
  }
}
