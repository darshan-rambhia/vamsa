import { describe, it, expect } from "bun:test";
import { GedcomGenerator } from "./generator";
import { GedcomParser } from "./parser";
import { GedcomMapper } from "./mapper";
import type { GedcomIndividualData, GedcomFamilyData } from "./mapper-types";

describe("GedcomGenerator", () => {
  // Test 1: Header generation
  it("should generate valid GEDCOM header with required tags", () => {
    const generator = new GedcomGenerator({
      sourceProgram: "vamsa",
      submitterName: "Test User",
    });

    const individuals: GedcomIndividualData[] = [];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    // Check for required header elements
    expect(output).toContain("0 HEAD");
    expect(output).toContain("1 SOUR vamsa");
    expect(output).toContain("1 GEDC");
    expect(output).toContain("2 VERS 5.5.1");
    expect(output).toContain("2 FORM LINEAGE-LINKED");
    expect(output).toContain("1 CHAR UTF-8");
    expect(output).toContain("1 SUBM @SUBM1@");
    expect(output).toContain("0 TRLR");
  });

  // Test 2: Submitter record generation
  it("should generate submitter record with name", () => {
    const generator = new GedcomGenerator({
      submitterName: "John Doe",
    });

    const individuals: GedcomIndividualData[] = [];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    expect(output).toContain("0 @SUBM1@ SUBM");
    expect(output).toContain("1 NAME John Doe");
  });

  // Test 3: Individual record generation
  it("should generate INDI record with all fields", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        sex: "M",
        birthDate: "15 JAN 1980",
        birthPlace: "New York, NY",
        deathDate: "10 MAR 2020",
        deathPlace: "Los Angeles, CA",
        occupation: "Engineer",
        notes: ["This is a test note"],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: ["@F2@"],
      },
    ];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    expect(output).toContain("0 @I1@ INDI");
    expect(output).toContain("1 NAME John /Smith/");
    expect(output).toContain("1 SEX M");
    expect(output).toContain("1 BIRT");
    expect(output).toContain("2 DATE 15 JAN 1980");
    expect(output).toContain("2 PLAC New York, NY");
    expect(output).toContain("1 DEAT");
    expect(output).toContain("2 DATE 10 MAR 2020");
    expect(output).toContain("2 PLAC Los Angeles, CA");
    expect(output).toContain("1 OCCU Engineer");
    expect(output).toContain("1 NOTE This is a test note");
    expect(output).toContain("1 FAMS @F1@");
    expect(output).toContain("1 FAMC @F2@");
  });

  // Test 4: Individual without optional fields
  it("should generate INDI record with minimal fields", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "Jane /Doe/",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    expect(output).toContain("0 @I1@ INDI");
    expect(output).toContain("1 NAME Jane /Doe/");
    // Should not contain optional fields
    expect(output).not.toContain("1 SEX");
    expect(output).not.toContain("1 BIRT");
    expect(output).not.toContain("1 DEAT");
  });

  // Test 5: Family record generation
  it("should generate FAM record with all fields", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [];
    const families: GedcomFamilyData[] = [
      {
        xref: "@F1@",
        husband: "@I1@",
        wife: "@I2@",
        children: ["@I3@", "@I4@"],
        marriageDate: "20 JUN 1975",
        marriagePlace: "Boston, MA",
        divorceDate: "15 AUG 1990",
        notes: ["Family note"],
      },
    ];

    const output = generator.generate(individuals, families);

    expect(output).toContain("0 @F1@ FAM");
    expect(output).toContain("1 HUSB @I1@");
    expect(output).toContain("1 WIFE @I2@");
    expect(output).toContain("1 MARR");
    expect(output).toContain("2 DATE 20 JUN 1975");
    expect(output).toContain("2 PLAC Boston, MA");
    expect(output).toContain("1 DIV");
    expect(output).toContain("2 DATE 15 AUG 1990");
    expect(output).toContain("1 CHIL @I3@");
    expect(output).toContain("1 CHIL @I4@");
    expect(output).toContain("1 NOTE Family note");
  });

  // Test 6: Family with minimal fields
  it("should generate FAM record with minimal fields", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [];
    const families: GedcomFamilyData[] = [
      {
        xref: "@F1@",
        children: [],
        notes: [],
      },
    ];

    const output = generator.generate(individuals, families);

    expect(output).toContain("0 @F1@ FAM");
    expect(output).not.toContain("1 HUSB");
    expect(output).not.toContain("1 WIFE");
    expect(output).not.toContain("1 MARR");
  });

  // Test 7: Multiple individuals and families
  it("should generate complete GEDCOM with multiple records", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        sex: "M",
        birthDate: "15 JAN 1980",
        notes: [],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
      {
        xref: "@I2@",
        name: "Jane /Doe/",
        sex: "F",
        birthDate: "20 FEB 1982",
        notes: [],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
      {
        xref: "@I3@",
        name: "Bob /Smith/",
        sex: "M",
        birthDate: "10 MAY 2005",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: ["@F1@"],
      },
    ];

    const families: GedcomFamilyData[] = [
      {
        xref: "@F1@",
        husband: "@I1@",
        wife: "@I2@",
        children: ["@I3@"],
        marriageDate: "15 JUN 2004",
        notes: [],
      },
    ];

    const output = generator.generate(individuals, families);

    // Count records
    const indiMatches = output.match(/0 @I\d+@ INDI/g);
    const famMatches = output.match(/0 @F\d+@ FAM/g);

    expect(indiMatches).toHaveLength(3);
    expect(famMatches).toHaveLength(1);
  });

  // Test 8: Line formatting with proper structure
  it("should format lines with correct GEDCOM structure", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "Test /Person/",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);
    const lines = output.split("\n");

    // Check line format: level tag [value]
    for (const line of lines) {
      if (line.trim().length === 0) continue;

      // Line should start with level (0-4 typically)
      const levelMatch = line.match(/^(\d+)/);
      expect(levelMatch).toBeTruthy();

      const level = parseInt(levelMatch![1], 10);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(4);
    }
  });

  // Test 9: Long value handling with CONC/CONT
  it("should handle long values with CONC continuation", () => {
    const generator = new GedcomGenerator({
      maxLineLength: 50,
    });

    const longNote =
      "This is a very long note that should be split across multiple lines because it exceeds the maximum line length";

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "Test /Person/",
        notes: [longNote],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    // Should contain NOTE and continuation tags
    expect(output).toContain("1 NOTE");
    expect(output).toMatch(/\d+ (CONC|CONT)/);
  });

  // Test 10: Valid GEDCOM can be parsed back
  it("should generate GEDCOM that can be parsed back to structure", () => {
    const generator = new GedcomGenerator({
      sourceProgram: "vamsa",
      submitterName: "Test User",
    });

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        sex: "M",
        birthDate: "15 JAN 1980",
        notes: ["Test note"],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
      {
        xref: "@I2@",
        name: "Jane /Smith/",
        sex: "F",
        birthDate: "20 FEB 1982",
        notes: [],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
    ];

    const families: GedcomFamilyData[] = [
      {
        xref: "@F1@",
        husband: "@I1@",
        wife: "@I2@",
        children: [],
        marriageDate: "15 JUN 2004",
        notes: [],
      },
    ];

    const gedcomContent = generator.generate(individuals, families);

    // Parse it back
    const parser = new GedcomParser();
    const parsed = parser.parse(gedcomContent);

    // Verify parsed structure
    expect(parsed.individuals.length).toBe(2);
    expect(parsed.families.length).toBe(1);
    expect(parsed.header).toBeTruthy();
    expect(parsed.trailer).toBeTruthy();
  });

  // Test 11: Round-trip mapping test
  it("should maintain data integrity through generate->parse->verify cycle", () => {
    const generator = new GedcomGenerator({
      sourceProgram: "vamsa",
      submitterName: "Test User",
    });

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        sex: "M",
        birthDate: "15 JAN 1980",
        birthPlace: "New York, NY",
        occupation: "Engineer",
        notes: ["Note 1", "Note 2"],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
    ];

    const families: GedcomFamilyData[] = [
      {
        xref: "@F1@",
        husband: "@I1@",
        children: [],
        marriageDate: "15 JUN 2004",
        notes: [],
      },
    ];

    const gedcomContent = generator.generate(individuals, families);

    // Parse it back
    const parser = new GedcomParser();
    const parsed = parser.parse(gedcomContent);

    // Verify key data points are preserved
    expect(parsed.individuals.length).toBe(1);
    expect(parsed.families.length).toBe(1);

    // Check individual data
    const individual = parsed.individuals[0];
    expect(individual.id).toBe("I1");

    // Verify through mapper
    const mapper = new GedcomMapper();
    const mapped = mapper.mapFromGedcom(parsed);

    expect(mapped.people.length).toBe(1);
    expect(mapped.people[0].firstName).toBe("John");
    expect(mapped.people[0].lastName).toBe("Smith");
    expect(mapped.people[0].gender).toBe("MALE");
  });

  // Test 12: Date formatting validation
  it("should format dates in correct GEDCOM format (DD MMM YYYY)", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "Test /Person/",
        birthDate: "01 JAN 2000",
        deathDate: "31 DEC 2050",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    // Check date formats
    expect(output).toContain("2 DATE 01 JAN 2000");
    expect(output).toContain("2 DATE 31 DEC 2050");
  });

  // Test 13: Multiple family relationships for individuals
  it("should correctly link individuals to multiple families", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        notes: [],
        familiesAsSpouse: ["@F1@", "@F2@"], // Two marriages
        familiesAsChild: ["@F3@"], // One family as child
      },
    ];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    expect(output).toContain("1 FAMS @F1@");
    expect(output).toContain("1 FAMS @F2@");
    expect(output).toContain("1 FAMC @F3@");
  });

  // Test 14: Sex field validation
  it("should correctly output sex field with valid values", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        sex: "M",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
      {
        xref: "@I2@",
        name: "Jane /Doe/",
        sex: "F",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
      {
        xref: "@I3@",
        name: "Alex /Person/",
        sex: "X",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    const maleCount = (output.match(/1 SEX M/g) || []).length;
    const femaleCount = (output.match(/1 SEX F/g) || []).length;
    const otherCount = (output.match(/1 SEX X/g) || []).length;

    expect(maleCount).toBe(1);
    expect(femaleCount).toBe(1);
    expect(otherCount).toBe(1);
  });

  // Test 15: Empty file generation
  it("should generate valid GEDCOM for empty database", () => {
    const generator = new GedcomGenerator();

    const individuals: GedcomIndividualData[] = [];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    // Should still have header and trailer
    expect(output).toContain("0 HEAD");
    expect(output).toContain("0 TRLR");

    // Parse to verify validity
    const parser = new GedcomParser();
    const parsed = parser.parse(output);

    expect(parsed.individuals.length).toBe(0);
    expect(parsed.families.length).toBe(0);
  });

  // Test 16: GEDCOM 7.0 generation
  it("should generate GEDCOM 7.0 with ISO 8601 date format", () => {
    const generator = new GedcomGenerator({
      version: "7.0",
      sourceProgram: "vamsa",
      submitterName: "Test User",
    });

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        sex: "M",
        birthDate: "1985-01-15",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    // Check for GEDCOM 7.0 version
    expect(output).toContain("2 VERS 7.0");

    // Check for ISO 8601 date format in header
    expect(output).toMatch(/1 DATE \d{4}-\d{2}-\d{2}/);

    // Parse back
    const parser = new GedcomParser();
    const parsed = parser.parse(output);
    expect(parsed.gedcomVersion).toBe("7.0");
  });

  // Test 17: GEDCOM 7.0 with ISO 8601 dates in events
  it("should format event dates as ISO 8601 in GEDCOM 7.0", () => {
    const generator = new GedcomGenerator({
      version: "7.0",
      sourceProgram: "vamsa",
    });

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "Jane /Doe/",
        sex: "F",
        birthDate: "1990-05-20",
        deathDate: "2024-12-25",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];
    const families: GedcomFamilyData[] = [];

    const output = generator.generate(individuals, families);

    // ISO 8601 dates in events should be in YYYY-MM-DD format
    expect(output).toContain("2 DATE 1990-05-20");
    expect(output).toContain("2 DATE 2024-12-25");
  });

  // Test 18: GEDCOM 5.5.1 vs 7.0 date format difference
  it("should use different date formats for GEDCOM 5.5.1 vs 7.0", () => {
    const date551 = new GedcomGenerator({
      version: "5.5.1",
      sourceProgram: "vamsa",
    });

    const date70 = new GedcomGenerator({
      version: "7.0",
      sourceProgram: "vamsa",
    });

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        birthDate: "1985-01-15",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];

    const output551 = date551.generate(individuals, []);
    const output70 = date70.generate(individuals, []);

    // 5.5.1 should have traditional format (15 JAN 1985)
    expect(output551).toMatch(/DATE 15 JAN 1985/);
    // 7.0 should have ISO 8601 format (1985-01-15)
    expect(output70).toMatch(/DATE 1985-01-15/);
  });

  // Test 19: Marriage date in GEDCOM 7.0
  it("should format marriage dates as ISO 8601 in GEDCOM 7.0", () => {
    const generator = new GedcomGenerator({
      version: "7.0",
      sourceProgram: "vamsa",
    });

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        notes: [],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
    ];

    const families: GedcomFamilyData[] = [
      {
        xref: "@F1@",
        children: [],
        marriageDate: "2000-06-15",
        notes: [],
      },
    ];

    const output = generator.generate(individuals, families);

    expect(output).toContain("2 DATE 2000-06-15");
  });

  // Test 20: Round-trip GEDCOM 7.0 generation and parsing
  it("should maintain GEDCOM 7.0 format through generate and parse", () => {
    const generator = new GedcomGenerator({
      version: "7.0",
      sourceProgram: "vamsa",
      submitterName: "Test User",
    });

    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        sex: "M",
        birthDate: "1985-01-15",
        notes: ["Test note"],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
      {
        xref: "@I2@",
        name: "Jane /Smith/",
        sex: "F",
        birthDate: "1988-03-20",
        notes: [],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
    ];

    const families: GedcomFamilyData[] = [
      {
        xref: "@F1@",
        husband: "@I1@",
        wife: "@I2@",
        children: [],
        marriageDate: "2010-07-10",
        notes: [],
      },
    ];

    const output = generator.generate(individuals, families);

    // Parse it back
    const parser = new GedcomParser();
    const parsed = parser.parse(output);

    // Verify GEDCOM 7.0 version preserved
    expect(parsed.gedcomVersion).toBe("7.0");

    // Verify data preserved
    expect(parsed.individuals).toHaveLength(2);
    expect(parsed.families).toHaveLength(1);

    // Verify dates are preserved in ISO format
    const john = parser.parseIndividual(parsed.individuals[0]);
    expect(john.birthDate).toBe("1985-01-15");
  });
});
