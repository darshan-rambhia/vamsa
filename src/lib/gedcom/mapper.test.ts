import { describe, it, expect } from "bun:test";
import { GedcomParser } from "./parser";
import { GedcomMapper } from "./mapper";

describe("GedcomMapper", () => {
  const parser = new GedcomParser();
  const mapper = new GedcomMapper();

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
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Smith/
1 SEX F
1 BIRT
2 DATE 10 JAN 1988
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
0 TRLR`;

  const gedcomWithDeathDate = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 BIRT
2 DATE 15 JAN 1900
1 DEAT
2 DATE 10 JUN 1985
0 @I2@ INDI
1 NAME Jane /Smith/
1 SEX F
1 BIRT
2 DATE 10 JAN 1905
0 TRLR`;

  const gedcomWithSameSexCouple = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
0 @I2@ INDI
1 NAME Michael /Johnson/
1 SEX M
0 @I3@ INDI
1 NAME David /Smith-Johnson/
1 SEX M
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I3@
0 @F2@ FAM
1 HUSB @I2@
1 CHIL @I3@
0 TRLR`;

  const gedcomWithDivorce = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Smith/
1 SEX F
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 10 JUN 1985
1 DIV
2 DATE 01 JAN 2000
0 TRLR`;

  describe("mapFromGedcom", () => {
    it("should map individuals with all fields", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      expect(result.people).toHaveLength(3);

      const john = result.people[0];
      expect(john.firstName).toBe("John");
      expect(john.lastName).toBe("Smith");
      expect(john.gender).toBe("MALE");
      expect(john.profession).toBe("Engineer");
      expect(john.isLiving).toBe(true);
      expect(john.birthPlace).toBe("New York, NY");
    });

    it("should parse birth dates correctly", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const john = result.people[0];
      expect(john.dateOfBirth).toBeDefined();
      expect(john.dateOfBirth?.getUTCFullYear()).toBe(1985);
      expect(john.dateOfBirth?.getUTCMonth()).toBe(0); // January is 0
      expect(john.dateOfBirth?.getUTCDate()).toBe(15);
    });

    it("should map female gender correctly", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const jane = result.people[1];
      expect(jane.gender).toBe("FEMALE");
    });

    it("should handle partial birth dates", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const robert = result.people[2];
      expect(robert.dateOfBirth?.getUTCFullYear()).toBe(1990);
    });

    it("should set isLiving based on death date", () => {
      const gedcomFile = parser.parse(gedcomWithDeathDate);
      const result = mapper.mapFromGedcom(gedcomFile);

      const john = result.people[0];
      expect(john.isLiving).toBe(false);
      expect(john.dateOfPassing).toBeDefined();

      const jane = result.people[1];
      expect(jane.isLiving).toBe(true);
    });

    it("should combine notes into bio", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const john = result.people[0];
      expect(john.bio).toContain("This is a note");
    });

    it("should create spouse relationships", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const spouseRels = result.relationships.filter(
        (r) => r.type === "SPOUSE"
      );
      expect(spouseRels).toHaveLength(2); // Bidirectional
    });

    it("should create parent-child relationships", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const parentRels = result.relationships.filter(
        (r) => r.type === "PARENT"
      );
      const childRels = result.relationships.filter((r) => r.type === "CHILD");

      expect(parentRels.length).toBeGreaterThan(0);
      expect(childRels.length).toBeGreaterThan(0);
    });

    it("should parse marriage dates", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const spouseRels = result.relationships.filter(
        (r) => r.type === "SPOUSE"
      );
      const rel = spouseRels[0];

      expect(rel.marriageDate).toBeDefined();
      expect(rel.marriageDate?.getUTCFullYear()).toBe(1985);
      expect(rel.marriageDate?.getUTCMonth()).toBe(5); // June
      expect(rel.marriageDate?.getUTCDate()).toBe(10);
    });

    it("should handle divorce dates", () => {
      const gedcomFile = parser.parse(gedcomWithDivorce);
      const result = mapper.mapFromGedcom(gedcomFile);

      const spouseRels = result.relationships.filter(
        (r) => r.type === "SPOUSE"
      );
      expect(spouseRels[0].divorceDate).toBeDefined();
      expect(spouseRels[0].divorceDate?.getUTCFullYear()).toBe(2000);
      expect(spouseRels[0].isActive).toBe(false);
    });

    it("should generate unique IDs for all people", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const ids = result.people.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should generate unique IDs for all relationships", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const ids = result.relationships.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("mapToGedcom", () => {
    it("should map persons to GEDCOM individuals", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      expect(gedcomResult.individuals).toHaveLength(3);
    });

    it("should format names correctly", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      const individual = gedcomResult.individuals[0];
      expect(individual.name).toMatch(/\/Smith\//);
      expect(individual.name).toContain("John");
    });

    it("should map gender back to GEDCOM format", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      const john = gedcomResult.individuals[0];
      expect(john.sex).toBe("M");

      const jane = gedcomResult.individuals[1];
      expect(jane.sex).toBe("F");
    });

    it("should format dates to GEDCOM format", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      const john = gedcomResult.individuals[0];
      expect(john.birthDate).toMatch(/\d+ JAN \d+/);
    });

    it("should create family records", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      expect(gedcomResult.families.length).toBeGreaterThan(0);
    });

    it("should set husband and wife in family records", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      const family = gedcomResult.families[0];
      expect(family.husband).toBeDefined();
      expect(family.wife).toBeDefined();
    });

    it("should set children in family records", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      const family = gedcomResult.families[0];
      expect(family.children.length).toBeGreaterThan(0);
    });

    it("should include occupation in notes", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      const john = gedcomResult.individuals[0];
      expect(john.occupation).toBe("Engineer");
    });

    it("should preserve birth and death places", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      const john = gedcomResult.individuals[0];
      expect(john.birthPlace).toBe("New York, NY");
    });

    it("should handle divorce dates in families", () => {
      const gedcomFile = parser.parse(gedcomWithDivorce);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const gedcomResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      const family = gedcomResult.families[0];
      expect(family.divorceDate).toBeDefined();
      expect(family.divorceDate).toMatch(/\d+ JAN \d+/);
    });
  });

  describe("bidirectional mapping", () => {
    it("should preserve individual data through import/export cycle", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const exportResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      expect(mapResult.people).toHaveLength(3);
      expect(exportResult.individuals).toHaveLength(3);
    });

    it("should preserve relationships through import/export cycle", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const exportResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      expect(mapResult.relationships.length).toBeGreaterThan(0);
      expect(exportResult.families.length).toBeGreaterThan(0);
    });

    it("should handle multiple marriages correctly", () => {
      const multiMarriageGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 FAMS @F1@
1 FAMS @F2@
0 @I2@ INDI
1 NAME Jane /Doe/
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Mary /Johnson/
1 SEX F
1 FAMS @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
0 @F2@ FAM
1 HUSB @I1@
1 WIFE @I3@
0 TRLR`;

      const gedcomFile = parser.parse(multiMarriageGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);

      const spouseRels = mapResult.relationships.filter(
        (r) => r.type === "SPOUSE"
      );
      expect(spouseRels.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle same-sex couples", () => {
      const gedcomFile = parser.parse(gedcomWithSameSexCouple);
      const mapResult = mapper.mapFromGedcom(gedcomFile);

      expect(mapResult.people.length).toBeGreaterThanOrEqual(3);
      expect(mapResult.relationships.length).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should report broken references", () => {
      const brokenGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I999@
0 TRLR`;

      const gedcomFile = parser.parse(brokenGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe("broken_reference");
    });

    it("should allow ignoring missing references when configured", () => {
      const brokenGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I999@
0 TRLR`;

      const gedcomFile = parser.parse(brokenGedcom);
      const result = mapper.mapFromGedcom(gedcomFile, {
        ignoreMissingReferences: true,
      });

      expect(
        result.errors.filter((e) => e.type === "broken_reference")
      ).toHaveLength(0);
    });

    it("should handle missing names gracefully", () => {
      const missingNameGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 SEX M
0 TRLR`;

      const gedcomFile = parser.parse(missingNameGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      expect(result.people).toHaveLength(1);
      expect(result.people[0].firstName).toBe("Unknown");
    });

    it("should skip validation when requested", () => {
      const invalidGedcom = `0 HEAD
1 SOUR MyApp
0 @I1@ INDI
0 TRLR`;

      const gedcomFile = parser.parse(invalidGedcom);
      const result = mapper.mapFromGedcom(gedcomFile, {
        skipValidation: true,
      });

      // Should not have validation errors
      expect(
        result.errors.filter((e) => e.type === "invalid_format")
      ).toHaveLength(0);
    });
  });

  describe("name parsing", () => {
    it("should parse given name only", () => {
      const nameGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John
0 TRLR`;

      const gedcomFile = parser.parse(nameGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      expect(result.people[0].firstName).toBe("John");
      expect(result.people[0].lastName).toBe("Unknown");
    });

    it("should parse surname only", () => {
      const nameGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME /Smith/
0 TRLR`;

      const gedcomFile = parser.parse(nameGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      expect(result.people[0].lastName).toBe("Smith");
    });

    it("should parse full name with middle names", () => {
      const nameGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John Michael /Smith/
0 TRLR`;

      const gedcomFile = parser.parse(nameGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      expect(result.people[0].firstName).toContain("John");
      expect(result.people[0].lastName).toBe("Smith");
    });
  });

  describe("date handling", () => {
    it("should handle dates at UTC midnight", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const john = result.people[0];
      expect(john.dateOfBirth?.getUTCHours()).toBe(0);
      expect(john.dateOfBirth?.getUTCMinutes()).toBe(0);
      expect(john.dateOfBirth?.getUTCSeconds()).toBe(0);
    });

    it("should format dates with day, month, and year", () => {
      const date = new Date(Date.UTC(1985, 0, 15, 0, 0, 0, 0));
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);

      // Update one date for testing
      mapResult.people[0].dateOfBirth = date;
      const exportResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      const john = exportResult.individuals[0];
      expect(john.birthDate).toMatch(/^15 JAN 1985$/);
    });

    it("should handle leap year dates", () => {
      const leapYearGedcom = `0 HEAD
1 SOUR MyApp
1 VERS 5.5.1
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 BIRT
2 DATE 29 FEB 2000
0 TRLR`;

      const gedcomFile = parser.parse(leapYearGedcom);
      const result = mapper.mapFromGedcom(gedcomFile);

      const john = result.people[0];
      expect(john.dateOfBirth?.getUTCMonth()).toBe(1); // February
      expect(john.dateOfBirth?.getUTCDate()).toBe(29);
    });
  });

  describe("xref generation", () => {
    it("should generate valid xrefs for individuals", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const exportResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      for (const individual of exportResult.individuals) {
        expect(individual.xref).toMatch(/^@I\d+@$/);
      }
    });

    it("should generate valid xrefs for families", () => {
      const gedcomFile = parser.parse(sampleGedcom);
      const mapResult = mapper.mapFromGedcom(gedcomFile);
      const exportResult = mapper.mapToGedcom(
        mapResult.people,
        mapResult.relationships
      );

      for (const family of exportResult.families) {
        expect(family.xref).toMatch(/^@F\d+@$/);
      }
    });
  });
});
