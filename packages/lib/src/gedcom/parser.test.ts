/**
 * Unit Tests for GEDCOM Parser
 * Tests parsing of GEDCOM 5.5.1 and 7.0 format files
 */
import { describe, expect, test } from "bun:test";
import { GedcomParser } from "./parser";

describe("GedcomParser", () => {
  describe("parse", () => {
    test("parses minimal valid GEDCOM file", () => {
      const content = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 TRLR`;

      const parser = new GedcomParser();
      const result = parser.parse(content);

      expect(result.header).toBeDefined();
      expect(result.trailer).toBeDefined();
      expect(result.version).toBe("5.5.1");
      expect(result.charset).toBe("UTF-8");
    });

    test("parses GEDCOM 7.0 file", () => {
      const content = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 7.0
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 TRLR`;

      const parser = new GedcomParser();
      const result = parser.parse(content);

      expect(result.gedcomVersion).toBe("7.0");
    });

    test("throws error for missing HEAD", () => {
      const content = `0 TRLR`;

      const parser = new GedcomParser();
      expect(() => parser.parse(content)).toThrow(
        "Missing required HEAD record"
      );
    });

    test("throws error for missing TRLR", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1`;

      const parser = new GedcomParser();
      expect(() => parser.parse(content)).toThrow(
        "Missing required TRLR record"
      );
    });

    test("parses individual records", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 15 JAN 1985
2 PLAC New York, USA
0 TRLR`;

      const parser = new GedcomParser();
      const result = parser.parse(content);

      expect(result.individuals.length).toBe(1);
      expect(result.individuals[0].id).toBe("I1");
    });

    test("parses family records", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
0 @I2@ INDI
1 NAME Jane /Doe/
1 SEX F
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 10 JUN 2010
0 TRLR`;

      const parser = new GedcomParser();
      const result = parser.parse(content);

      expect(result.families.length).toBe(1);
      expect(result.families[0].id).toBe("F1");
    });

    test("handles CONT continuation lines", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 NOTE This is a long note
2 CONT that continues on another line
2 CONT and even a third line
0 TRLR`;

      const parser = new GedcomParser();
      const result = parser.parse(content);
      const individual = result.individuals[0];
      const noteLines = individual.tags.get("NOTE");

      expect(noteLines).toBeDefined();
      expect(noteLines![0].value).toContain("continues on another line");
    });

    test("handles CONC concatenation lines", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 NOTE This is a text
2 CONC that is concatenated
0 TRLR`;

      const parser = new GedcomParser();
      const result = parser.parse(content);
      const individual = result.individuals[0];
      const noteLines = individual.tags.get("NOTE");

      expect(noteLines).toBeDefined();
      expect(noteLines![0].value).toBe("This is a textthat is concatenated");
    });

    test("handles Windows line endings", () => {
      const content =
        "0 HEAD\r\n1 GEDC\r\n2 VERS 5.5.1\r\n1 CHAR UTF-8\r\n0 TRLR";

      const parser = new GedcomParser();
      const result = parser.parse(content);

      expect(result.header).toBeDefined();
      expect(result.trailer).toBeDefined();
    });

    test("filters empty lines", () => {
      const content = `0 HEAD

1 GEDC
2 VERS 5.5.1

1 CHAR UTF-8
0 TRLR`;

      const parser = new GedcomParser();
      const result = parser.parse(content);

      expect(result.header).toBeDefined();
    });
  });

  describe("parseDate", () => {
    test("parses full date (DD MMM YYYY)", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("15 JAN 1985")).toBe("1985-01-15");
      expect(parser.parseDate("1 DEC 2000")).toBe("2000-12-01");
      expect(parser.parseDate("31 JUL 1950")).toBe("1950-07-31");
    });

    test("parses month-year (MMM YYYY)", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("JAN 1985")).toBe("1985-01");
      expect(parser.parseDate("DEC 2000")).toBe("2000-12");
    });

    test("parses year only (YYYY)", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("1985")).toBe("1985");
      expect(parser.parseDate("2000")).toBe("2000");
    });

    test("handles approximate dates (ABT)", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("ABT 1985")).toBe("1985");
      expect(parser.parseDate("ABT 15 JAN 1985")).toBe("1985-01-15");
    });

    test("handles before dates (BEF)", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("BEF 1985")).toBe("1985");
      expect(parser.parseDate("BEF 15 JAN 1985")).toBe("1985-01-15");
    });

    test("handles after dates (AFT)", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("AFT 1985")).toBe("1985");
      expect(parser.parseDate("AFT 15 JAN 1985")).toBe("1985-01-15");
    });

    test("handles between dates (BET...AND)", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("BET 1975 AND 1985")).toBe("1975");
      expect(parser.parseDate("BET 15 JAN 1975 AND 15 JAN 1985")).toBe(
        "1975-01-15"
      );
    });

    test("returns null for invalid date", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("")).toBeNull();
      expect(parser.parseDate("   ")).toBeNull();
      expect(parser.parseDate("invalid")).toBeNull();
    });

    test("handles day 0 by falling back to month-year", () => {
      // Day 0 is invalid but parser still extracts month-year
      const parser = new GedcomParser();
      expect(parser.parseDate("0 JAN 1985")).toBe("1985-01");
    });

    test("returns null for day greater than 31", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("32 JAN 1985")).toBeNull();
    });

    test("parses GEDCOM 7.0 ISO format", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("1985-01-15", "7.0")).toBe("1985-01-15");
      expect(parser.parseDate("1985-01", "7.0")).toBe("1985-01");
      expect(parser.parseDate("1985", "7.0")).toBe("1985");
    });

    test("handles all month abbreviations", () => {
      const parser = new GedcomParser();
      expect(parser.parseDate("1 JAN 2000")).toBe("2000-01-01");
      expect(parser.parseDate("1 FEB 2000")).toBe("2000-02-01");
      expect(parser.parseDate("1 MAR 2000")).toBe("2000-03-01");
      expect(parser.parseDate("1 APR 2000")).toBe("2000-04-01");
      expect(parser.parseDate("1 MAY 2000")).toBe("2000-05-01");
      expect(parser.parseDate("1 JUN 2000")).toBe("2000-06-01");
      expect(parser.parseDate("1 JUL 2000")).toBe("2000-07-01");
      expect(parser.parseDate("1 AUG 2000")).toBe("2000-08-01");
      expect(parser.parseDate("1 SEP 2000")).toBe("2000-09-01");
      expect(parser.parseDate("1 SEPT 2000")).toBe("2000-09-01");
      expect(parser.parseDate("1 OCT 2000")).toBe("2000-10-01");
      expect(parser.parseDate("1 NOV 2000")).toBe("2000-11-01");
      expect(parser.parseDate("1 DEC 2000")).toBe("2000-12-01");
    });
  });

  describe("parseName", () => {
    test("parses name with surname in slashes", () => {
      const parser = new GedcomParser();
      const result = parser.parseName("John /Doe/");
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Doe");
    });

    test("parses name with only surname", () => {
      const parser = new GedcomParser();
      const result = parser.parseName("/Doe/");
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBe("Doe");
    });

    test("parses name with only given name", () => {
      const parser = new GedcomParser();
      const result = parser.parseName("John");
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBeUndefined();
    });

    test("parses name with multiple given names", () => {
      const parser = new GedcomParser();
      const result = parser.parseName("John Michael /Doe/");
      expect(result.firstName).toBe("John Michael");
      expect(result.lastName).toBe("Doe");
    });

    test("handles empty name", () => {
      const parser = new GedcomParser();
      const result = parser.parseName("");
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
    });

    test("handles whitespace-only name", () => {
      const parser = new GedcomParser();
      const result = parser.parseName("   ");
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
    });

    test("trims whitespace", () => {
      const parser = new GedcomParser();
      const result = parser.parseName("  John  /  Doe  /  ");
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Doe");
    });
  });

  describe("parseIndividual", () => {
    test("extracts all individual fields", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John Michael /Doe/
1 SEX M
1 BIRT
2 DATE 15 JAN 1985
2 PLAC New York, USA
1 DEAT
2 DATE 20 DEC 2050
2 PLAC Los Angeles, USA
1 OCCU Software Engineer
1 NOTE A note about John
1 FAMC @F1@
1 FAMS @F2@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.id).toBe("I1");
      expect(individual.names[0].firstName).toBe("John Michael");
      expect(individual.names[0].lastName).toBe("Doe");
      expect(individual.sex).toBe("M");
      expect(individual.birthDate).toBe("1985-01-15");
      expect(individual.birthPlace).toBe("New York, USA");
      expect(individual.deathDate).toBe("2050-12-20");
      expect(individual.deathPlace).toBe("Los Angeles, USA");
      expect(individual.occupation).toBe("Software Engineer");
      expect(individual.notes).toContain("A note about John");
      expect(individual.familiesAsChild).toContain("F1");
      expect(individual.familiesAsSpouse).toContain("F2");
    });

    test("handles female individual", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Jane /Doe/
1 SEX F
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.sex).toBe("F");
    });

    test("handles unknown sex (X)", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Pat /Smith/
1 SEX X
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.sex).toBe("X");
    });

    test("handles individual without optional fields", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Unknown //
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.id).toBe("I1");
      expect(individual.birthDate).toBeUndefined();
      expect(individual.deathDate).toBeUndefined();
      expect(individual.occupation).toBeUndefined();
    });
  });

  describe("parseFamily", () => {
    test("extracts all family fields", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
0 @I2@ INDI
1 NAME Jane /Doe/
0 @I3@ INDI
1 NAME Baby /Doe/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 10 JUN 2010
2 PLAC Las Vegas, USA
1 DIV
2 DATE 1 JAN 2020
1 NOTE Family note
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const family = parser.parseFamily(file.families[0]);

      expect(family.id).toBe("F1");
      expect(family.husband).toBe("I1");
      expect(family.wife).toBe("I2");
      expect(family.children).toContain("I3");
      expect(family.marriageDate).toBe("2010-06-10");
      expect(family.marriagePlace).toBe("Las Vegas, USA");
      expect(family.divorceDate).toBe("2020-01-01");
      expect(family.notes).toContain("Family note");
    });

    test("handles family with multiple children", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @F1@ FAM
1 CHIL @I1@
1 CHIL @I2@
1 CHIL @I3@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const family = parser.parseFamily(file.families[0]);

      expect(family.children.length).toBe(3);
      expect(family.children).toEqual(["I1", "I2", "I3"]);
    });

    test("handles family without spouse", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @F1@ FAM
1 WIFE @I1@
1 CHIL @I2@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const family = parser.parseFamily(file.families[0]);

      expect(family.husband).toBeUndefined();
      expect(family.wife).toBe("I1");
    });
  });

  describe("validate", () => {
    test("validates correct file", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Doe/
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const errors = parser.validate(file);

      expect(errors.filter((e) => e.severity === "error").length).toBe(0);
    });

    test("detects duplicate xrefs", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
0 @I1@ INDI
1 NAME Jane /Doe/
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const errors = parser.validate(file);

      const duplicateError = errors.find((e) =>
        e.message.includes("Duplicate xref")
      );
      expect(duplicateError).toBeDefined();
    });

    test("detects broken HUSB reference", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @F1@ FAM
1 HUSB @I999@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const errors = parser.validate(file);

      const brokenRef = errors.find(
        (e) => e.message.includes("HUSB") && e.message.includes("not found")
      );
      expect(brokenRef).toBeDefined();
    });

    test("detects broken WIFE reference", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @F1@ FAM
1 WIFE @I999@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const errors = parser.validate(file);

      const brokenRef = errors.find(
        (e) => e.message.includes("WIFE") && e.message.includes("not found")
      );
      expect(brokenRef).toBeDefined();
    });

    test("detects broken CHIL reference", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @F1@ FAM
1 CHIL @I999@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const errors = parser.validate(file);

      const brokenRef = errors.find(
        (e) => e.message.includes("CHIL") && e.message.includes("not found")
      );
      expect(brokenRef).toBeDefined();
    });

    test("detects broken FAMC reference", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 FAMC @F999@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const errors = parser.validate(file);

      const brokenRef = errors.find(
        (e) => e.message.includes("FAMC") && e.message.includes("not found")
      );
      expect(brokenRef).toBeDefined();
    });

    test("detects broken FAMS reference", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 FAMS @F999@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const errors = parser.validate(file);

      const brokenRef = errors.find(
        (e) => e.message.includes("FAMS") && e.message.includes("not found")
      );
      expect(brokenRef).toBeDefined();
    });
  });
});
