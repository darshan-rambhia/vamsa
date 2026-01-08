import { describe, it, expect } from "bun:test";
import { GedcomParser } from "./parser";

describe("GedcomParser", () => {
  const parser = new GedcomParser();

  const minimalGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 TRLR`;

  const sampleGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 BIRT
2 DATE 15 JAN 1985
2 PLAC New York, NY
1 OCCU Engineer
1 NOTE This is a note
1 NOTE Second note
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Smith/
1 SEX F
1 BIRT
2 DATE JAN 1988
2 PLAC Boston, MA
1 FAMS @F1@
0 @I3@ INDI
1 NAME Robert /Smith/
1 SEX M
1 BIRT
2 DATE 1990
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 10 JUN 1985
2 PLAC Boston, MA
1 NOTE Family note
0 TRLR`;

  const continuationGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 NOTE This is a long
2 CONT note that spans
2 CONT multiple lines
0 TRLR`;

  describe("parse", () => {
    it("should parse minimal GEDCOM file", () => {
      const result = parser.parse(minimalGedcom);

      expect(result.header).toBeDefined();
      expect(result.trailer).toBeDefined();
      expect(result.individuals).toHaveLength(0);
      expect(result.families).toHaveLength(0);
    });

    it("should parse complete GEDCOM file", () => {
      const result = parser.parse(sampleGedcom);

      expect(result.header).toBeDefined();
      expect(result.trailer).toBeDefined();
      expect(result.individuals).toHaveLength(3);
      expect(result.families).toHaveLength(1);
    });

    it("should extract individual records correctly", () => {
      const result = parser.parse(sampleGedcom);
      const individuals = result.individuals;

      expect(individuals[0].id).toBe("I1");
      expect(individuals[1].id).toBe("I2");
      expect(individuals[2].id).toBe("I3");
    });

    it("should extract family records correctly", () => {
      const result = parser.parse(sampleGedcom);
      const families = result.families;

      expect(families[0].id).toBe("F1");
    });

    it("should handle continuation lines (CONT)", () => {
      const result = parser.parse(continuationGedcom);
      const individual = result.individuals[0];

      const noteLines = individual.tags.get("NOTE");
      expect(noteLines).toBeDefined();
      expect(noteLines![0].value).toContain("\n");
      expect(noteLines![0].value).toBe(
        "This is a long\nnote that spans\nmultiple lines"
      );
    });

    it("should throw error on missing HEAD", () => {
      const noHeader = `0 @I1@ INDI
1 NAME John /Smith/
0 TRLR`;

      expect(() => parser.parse(noHeader)).toThrow("Missing required HEAD");
    });

    it("should throw error on missing TRLR", () => {
      const noTrailer = `0 HEAD
1 SOUR MyApp`;

      expect(() => parser.parse(noTrailer)).toThrow("Missing required TRLR");
    });

    it("should preserve xrefs in records", () => {
      const result = parser.parse(sampleGedcom);
      const individual = result.individuals[0];

      expect(individual.id).toBe("I1");
    });

    it("should extract charset from header", () => {
      const result = parser.parse(sampleGedcom);
      expect(result.charset).toBe("UTF-8");
    });

    it("should extract version from header", () => {
      const result = parser.parse(sampleGedcom);
      expect(result.version).toBe("5.5.1");
    });
  });

  describe("parseDate", () => {
    it("should parse full date format (DD MMM YYYY)", () => {
      expect(parser.parseDate("15 JAN 1985")).toBe("1985-01-15");
      expect(parser.parseDate("1 FEB 2000")).toBe("2000-02-01");
      expect(parser.parseDate("31 DEC 1999")).toBe("1999-12-31");
    });

    it("should parse month-year format (MMM YYYY)", () => {
      expect(parser.parseDate("JAN 1985")).toBe("1985-01");
      expect(parser.parseDate("DEC 2000")).toBe("2000-12");
    });

    it("should parse year only format (YYYY)", () => {
      expect(parser.parseDate("1985")).toBe("1985");
      expect(parser.parseDate("2000")).toBe("2000");
    });

    it("should handle date qualifiers (ABT, BEF, AFT)", () => {
      expect(parser.parseDate("ABT 1985")).toBe("1985");
      expect(parser.parseDate("BEF 1975")).toBe("1975");
      expect(parser.parseDate("AFT 2000")).toBe("2000");
    });

    it("should handle BET ... AND ... date format", () => {
      expect(parser.parseDate("BET 1975 AND 1985")).toBe("1975");
    });

    it("should handle month name variations", () => {
      expect(parser.parseDate("15 SEPT 1985")).toBe("1985-09-15");
      expect(parser.parseDate("15 SEP 1985")).toBe("1985-09-15");
    });

    it("should return null for invalid dates", () => {
      expect(parser.parseDate("")).toBeNull();
      expect(parser.parseDate("invalid")).toBeNull();
      expect(parser.parseDate("99 JAN 1985")).toBeNull();
    });

    it("should be case insensitive for month names", () => {
      expect(parser.parseDate("15 jan 1985")).toBe("1985-01-15");
      expect(parser.parseDate("15 JaN 1985")).toBe("1985-01-15");
    });
  });

  describe("parseName", () => {
    it("should parse name with surname in slashes", () => {
      const result = parser.parseName("John /Smith/");
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Smith");
    });

    it("should parse name with only given name", () => {
      const result = parser.parseName("John");
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBeUndefined();
    });

    it("should parse name with only surname", () => {
      const result = parser.parseName("/Smith/");
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBe("Smith");
    });

    it("should handle multiple given names", () => {
      const result = parser.parseName("John Paul /Smith/");
      expect(result.firstName).toBe("John Paul");
      expect(result.lastName).toBe("Smith");
    });

    it("should handle empty name", () => {
      const result = parser.parseName("");
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
    });

    it("should trim whitespace", () => {
      const result = parser.parseName("  John  /  Smith  /  ");
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Smith");
    });
  });

  describe("validate", () => {
    it("should validate correct GEDCOM", () => {
      const file = parser.parse(sampleGedcom);
      const errors = parser.validate(file);

      const realErrors = errors.filter((e) => e.severity === "error");
      expect(realErrors).toHaveLength(0);
    });

    it("should detect missing header", () => {
      const file = parser.parse(minimalGedcom);
      file.header = null as any;

      const errors = parser.validate(file);
      const missing = errors.find((e) =>
        e.message.includes("Missing required HEAD")
      );
      expect(missing).toBeDefined();
    });

    it("should detect missing trailer", () => {
      const file = parser.parse(minimalGedcom);
      file.trailer = null as any;

      const errors = parser.validate(file);
      const missing = errors.find((e) =>
        e.message.includes("Missing required TRLR")
      );
      expect(missing).toBeDefined();
    });

    it("should detect duplicate xrefs", () => {
      const file = parser.parse(sampleGedcom);
      file.individuals.push(file.individuals[0]); // Duplicate

      const errors = parser.validate(file);
      const duplicate = errors.find((e) =>
        e.message.includes("Duplicate xref")
      );
      expect(duplicate).toBeDefined();
    });

    it("should detect broken family references", () => {
      const file = parser.parse(sampleGedcom);
      file.individuals[0].tags.set("FAMS", [
        {
          level: 1,
          tag: "FAMS",
          value: "",
          pointer: "@F999@",
        },
      ]);

      const errors = parser.validate(file);
      const broken = errors.find((e) => e.message.includes("Broken reference"));
      expect(broken).toBeDefined();
    });
  });

  describe("parseIndividual", () => {
    it("should parse individual record", () => {
      const file = parser.parse(sampleGedcom);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.id).toBe("I1");
      expect(individual.names[0].firstName).toBe("John");
      expect(individual.names[0].lastName).toBe("Smith");
      expect(individual.sex).toBe("M");
      expect(individual.occupation).toBe("Engineer");
    });

    it("should extract birth information", () => {
      const file = parser.parse(sampleGedcom);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.birthDate).toBe("1985-01-15");
      expect(individual.birthPlace).toBe("New York, NY");
    });

    it("should extract multiple names", () => {
      const multiNameGedcom = `0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 NAME Jean /Dupont/
0 TRLR`;

      const file = parser.parse(multiNameGedcom);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.names).toHaveLength(2);
      expect(individual.names[0].firstName).toBe("John");
      expect(individual.names[1].firstName).toBe("Jean");
    });

    it("should extract notes", () => {
      const file = parser.parse(sampleGedcom);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.notes).toContain("This is a note");
      expect(individual.notes).toContain("Second note");
    });

    it("should extract family references", () => {
      const file = parser.parse(sampleGedcom);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.familiesAsSpouse).toContain("F1");
    });

    it("should extract family as child references", () => {
      const file = parser.parse(sampleGedcom);
      const child = parser.parseIndividual(file.individuals[2]);

      expect(child.familiesAsChild).toContain("F1");
    });

    it("should handle missing death information", () => {
      const file = parser.parse(sampleGedcom);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.deathDate).toBeUndefined();
      expect(individual.deathPlace).toBeUndefined();
    });

    it("should handle missing sex field", () => {
      const noSexGedcom = `0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
0 TRLR`;

      const file = parser.parse(noSexGedcom);
      const individual = parser.parseIndividual(file.individuals[0]);

      expect(individual.sex).toBeUndefined();
    });
  });

  describe("parseFamily", () => {
    it("should parse family record", () => {
      const file = parser.parse(sampleGedcom);
      const family = parser.parseFamily(file.families[0]);

      expect(family.id).toBe("F1");
      expect(family.husband).toBe("I1");
      expect(family.wife).toBe("I2");
      expect(family.children).toContain("I3");
    });

    it("should extract marriage information", () => {
      const file = parser.parse(sampleGedcom);
      const family = parser.parseFamily(file.families[0]);

      expect(family.marriageDate).toBe("1985-06-10");
      expect(family.marriagePlace).toBe("Boston, MA");
    });

    it("should extract notes", () => {
      const file = parser.parse(sampleGedcom);
      const family = parser.parseFamily(file.families[0]);

      expect(family.notes).toContain("Family note");
    });

    it("should handle missing divorce information", () => {
      const file = parser.parse(sampleGedcom);
      const family = parser.parseFamily(file.families[0]);

      expect(family.divorceDate).toBeUndefined();
    });

    it("should handle family with no spouse", () => {
      const noSpouseGedcom = `0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 CHIL @I1@
0 TRLR`;

      const file = parser.parse(noSpouseGedcom);
      const family = parser.parseFamily(file.families[0]);

      expect(family.husband).toBeUndefined();
      expect(family.wife).toBeUndefined();
    });

    it("should handle multiple children", () => {
      const multiChildGedcom = `0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 CHIL @I1@
1 CHIL @I2@
1 CHIL @I3@
0 TRLR`;

      const file = parser.parse(multiChildGedcom);
      const family = parser.parseFamily(file.families[0]);

      expect(family.children).toHaveLength(3);
      expect(family.children).toContain("I1");
      expect(family.children).toContain("I2");
      expect(family.children).toContain("I3");
    });
  });

  describe("roundtrip parsing", () => {
    it("should preserve individual data through parse", () => {
      const file = parser.parse(sampleGedcom);
      const individual = parser.parseIndividual(file.individuals[0]);
      const family = parser.parseFamily(file.families[0]);

      // Verify parsed data matches original GEDCOM
      expect(individual.id).toBe("I1");
      expect(individual.names[0].firstName).toBe("John");
      expect(individual.names[0].lastName).toBe("Smith");
      expect(individual.sex).toBe("M");
      expect(individual.birthDate).toBe("1985-01-15");
      expect(individual.birthPlace).toBe("New York, NY");

      expect(family.id).toBe("F1");
      expect(family.husband).toBe("I1");
      expect(family.wife).toBe("I2");
      expect(family.children[0]).toBe("I3");
      expect(family.marriageDate).toBe("1985-06-10");
    });

    it("should handle complex GEDCOM with many records", () => {
      const complexGedcom = `0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Doe/
1 FAMS @F1@
0 @I3@ INDI
1 NAME Robert /Smith/
1 FAMC @F1@
0 @I4@ INDI
1 NAME Alice /Smith/
1 FAMC @F1@
1 FAMS @F2@
0 @I5@ INDI
1 NAME Bob /Johnson/
1 FAMS @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I4@
0 @F2@ FAM
1 HUSB @I5@
1 WIFE @I4@
0 TRLR`;

      const file = parser.parse(complexGedcom);
      expect(file.individuals).toHaveLength(5);
      expect(file.families).toHaveLength(2);

      const alice = file.individuals.find((i) => i.id === "I4");
      expect(alice).toBeDefined();

      const alice_parsed = parser.parseIndividual(alice!);
      expect(alice_parsed.familiesAsChild).toContain("F1");
      expect(alice_parsed.familiesAsSpouse).toContain("F2");
    });
  });

  describe("edge cases", () => {
    it("should handle empty value fields", () => {
      const emptyValueGedcom = `0 HEAD
1 SOUR
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 NOTE
0 TRLR`;

      const file = parser.parse(emptyValueGedcom);
      expect(file.individuals).toHaveLength(1);

      const individual = parser.parseIndividual(file.individuals[0]);
      // Empty notes are skipped
      expect(individual.notes).toHaveLength(0);
    });

    it("should handle names with extra spaces", () => {
      const result = parser.parseName("  John   Paul  /  Smith  /");
      expect(result.firstName).toBe("John   Paul");
      expect(result.lastName).toBe("Smith");
    });

    it("should handle Windows and Unix line endings", () => {
      const unixFormat = `0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 5.5.1
0 TRLR`;

      const windowsFormat = `0 HEAD\r\n1 SOUR MyApp\r\n1 GEDC\r\n2 VERS 5.5.1\r\n0 TRLR`;

      const unixResult = parser.parse(unixFormat);
      const windowsResult = parser.parse(windowsFormat);

      expect(unixResult.individuals).toHaveLength(
        windowsResult.individuals.length
      );
      expect(unixResult.families).toHaveLength(windowsResult.families.length);
    });

    it("should handle partial dates gracefully", () => {
      expect(parser.parseDate("JAN 1985")).toBe("1985-01");
      expect(parser.parseDate("1985")).toBe("1985");

      const file = parser.parse(`0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 BIRT
2 DATE 1985
0 TRLR`);

      const individual = parser.parseIndividual(file.individuals[0]);
      expect(individual.birthDate).toBe("1985");
    });
  });

  describe("GEDCOM 7.0 support", () => {
    it("should detect GEDCOM 7.0 version from header", () => {
      const gedcom70 = `0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 7.0
1 CHAR UTF-8
0 TRLR`;

      const result = parser.parse(gedcom70);
      expect(result.gedcomVersion).toBe("7.0");
      expect(result.version).toBe("7.0");
    });

    it("should default to GEDCOM 5.5.1 when version not specified", () => {
      const minimalGedcom = `0 HEAD
1 SOUR MyApp
0 TRLR`;

      const result = parser.parse(minimalGedcom);
      expect(result.gedcomVersion).toBe("5.5.1");
    });

    it("should handle GEDCOM 7.0 file with ISO 8601 dates", () => {
      const gedcom70WithDates = `0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 7.0
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Smith/
1 BIRT
2 DATE 1985-01-15
0 TRLR`;

      const result = parser.parse(gedcom70WithDates);
      expect(result.gedcomVersion).toBe("7.0");
      expect(result.individuals).toHaveLength(1);

      const individual = parser.parseIndividual(result.individuals[0]);
      expect(individual.birthDate).toBe("1985-01-15");
    });

    it("should handle mixed date formats in GEDCOM 7.0", () => {
      const mixedDatesGedcom = `0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 7.0
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Full /Date/
1 BIRT
2 DATE 1985-01-15
0 @I2@ INDI
1 NAME Month /Year/
1 BIRT
2 DATE 1985-01
0 @I3@ INDI
1 NAME Year /Only/
1 BIRT
2 DATE 1985
0 TRLR`;

      const result = parser.parse(mixedDatesGedcom);
      expect(result.gedcomVersion).toBe("7.0");

      const individuals = result.individuals.map((i) =>
        parser.parseIndividual(i)
      );
      expect(individuals[0].birthDate).toBe("1985-01-15");
      expect(individuals[1].birthDate).toBe("1985-01");
      expect(individuals[2].birthDate).toBe("1985");
    });
  });
});
