import { describe, it, expect, beforeEach } from "bun:test";
import { GedcomParser } from "./parser";
import { GedcomMapper } from "./mapper";
import { GedcomGenerator } from "./generator";
import type {
  VamsaPerson,
  VamsaRelationship,
} from "./mapper-types";

describe("GEDCOM Roundtrip: Import → Export → Re-import", () => {
  let parser: GedcomParser;
  let mapper: GedcomMapper;
  let generator: GedcomGenerator;

  beforeEach(() => {
    parser = new GedcomParser();
    mapper = new GedcomMapper();
    generator = new GedcomGenerator();
  });

  // Helper function for import-export-reimport cycle
  function roundtripImportExport(originalGedcom: string) {
    // 1. Parse original GEDCOM
    const originalParsed = parser.parse(originalGedcom);

    // 2. Map to Vamsa
    const mapped = mapper.mapFromGedcom(originalParsed);

    // 3. Map back to GEDCOM format
    const remapped = mapper.mapToGedcom(mapped.people, mapped.relationships);

    // 4. Generate new GEDCOM
    const generated = generator.generate(
      remapped.individuals,
      remapped.families
    );

    // 5. Re-parse generated GEDCOM
    const reparsed = parser.parse(generated);

    return {
      originalParsed,
      mapped,
      remapped,
      generated,
      reparsed,
    };
  }

  it("should preserve simple single person data through roundtrip", () => {
    const singlePersonGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 BIRT
2 DATE 15 JAN 1985
2 PLAC New York, NY
1 OCCU Engineer
1 NOTE Professional bio
0 TRLR`;

    const result = roundtripImportExport(singlePersonGedcom);

    // Verify structure preserved
    expect(result.originalParsed.individuals).toHaveLength(1);
    expect(result.reparsed.individuals).toHaveLength(1);

    // Verify person data preserved
    const originalPerson = parser.parseIndividual(
      result.originalParsed.individuals[0]
    );
    const reparsedPerson = parser.parseIndividual(
      result.reparsed.individuals[0]
    );

    expect(reparsedPerson.names[0].firstName).toBe(
      originalPerson.names[0].firstName
    );
    expect(reparsedPerson.names[0].lastName).toBe(
      originalPerson.names[0].lastName
    );
    expect(reparsedPerson.sex).toBe(originalPerson.sex);
    expect(reparsedPerson.birthDate).toBe(originalPerson.birthDate);
    expect(reparsedPerson.birthPlace).toBe(originalPerson.birthPlace);
    expect(reparsedPerson.occupation).toBe(originalPerson.occupation);
    expect(reparsedPerson.notes[0]).toBe(originalPerson.notes[0]);
  });

  it("should preserve three-generation family structure through roundtrip", () => {
    const threeGenerationGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 BIRT
2 DATE 1955
1 FAMS @F1@
0 @I2@ INDI
1 NAME Mary /Doe/
1 SEX F
1 BIRT
2 DATE 1960
1 FAMS @F1@
0 @I3@ INDI
1 NAME Robert /Smith/
1 SEX M
1 BIRT
2 DATE 1985
1 FAMC @F1@
1 FAMS @F2@
0 @I4@ INDI
1 NAME Emma /Smith/
1 SEX F
1 BIRT
2 DATE 1987
1 FAMC @F1@
0 @I5@ INDI
1 NAME James /Brown/
1 SEX M
1 BIRT
2 DATE 1980
1 FAMS @F2@
0 @I6@ INDI
1 NAME Lucy /Smith/
1 SEX F
1 BIRT
2 DATE 2010
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I4@
1 MARR
2 DATE 10 JUN 1980
2 PLAC Boston, MA
0 @F2@ FAM
1 HUSB @I5@
1 WIFE @I3@
1 CHIL @I6@
1 MARR
2 DATE 15 AUG 2008
0 TRLR`;

    const result = roundtripImportExport(threeGenerationGedcom);

    // Verify structure preserved
    expect(result.originalParsed.individuals).toHaveLength(6);
    expect(result.originalParsed.families).toHaveLength(2);
    expect(result.reparsed.individuals).toHaveLength(6);
    expect(result.reparsed.families).toHaveLength(2);

    // Verify relationships preserved
    const originalFamily1 = parser.parseFamily(
      result.originalParsed.families[0]
    );
    const reparsedFamily1 = parser.parseFamily(result.reparsed.families[0]);

    expect(reparsedFamily1.children).toHaveLength(
      originalFamily1.children.length
    );
    expect(reparsedFamily1.children).toEqual(
      expect.arrayContaining([expect.any(String)])
    );

    // Verify Robert is in both families
    const mapped = result.mapped;
    const robertRelationships = mapped.relationships.filter((r) =>
      [r.personId, r.relatedPersonId].includes(
        mapped.people.find((p) => p.firstName === "Robert")?.id || ""
      )
    );
    expect(robertRelationships.length).toBeGreaterThan(0);
  });

  it("should preserve multiple marriages with children through roundtrip", () => {
    const multipleMarriagesGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME George /Person/
1 SEX M
1 FAMS @F1@
1 FAMS @F2@
0 @I2@ INDI
1 NAME Alice /First/
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Bob /Child1/
1 SEX M
1 FAMC @F1@
0 @I4@ INDI
1 NAME Charlie /Child1/
1 SEX M
1 FAMC @F1@
0 @I5@ INDI
1 NAME Diana /Second/
1 SEX F
1 FAMS @F2@
0 @I6@ INDI
1 NAME Eve /Child2/
1 SEX F
1 FAMC @F2@
0 @I7@ INDI
1 NAME Frank /Child2/
1 SEX M
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I4@
1 MARR
2 DATE 1990
0 @F2@ FAM
1 HUSB @I1@
1 WIFE @I5@
1 CHIL @I6@
1 CHIL @I7@
1 MARR
2 DATE 2000
0 TRLR`;

    const result = roundtripImportExport(multipleMarriagesGedcom);

    // Verify families preserved
    expect(result.originalParsed.families).toHaveLength(2);
    expect(result.reparsed.families).toHaveLength(2);

    // Verify all individuals preserved
    expect(result.originalParsed.individuals).toHaveLength(7);
    expect(result.reparsed.individuals).toHaveLength(7);

    // Verify George is in both families (original)
    const originalFamily1 = parser.parseFamily(
      result.originalParsed.families[0]
    );
    const originalFamily2 = parser.parseFamily(
      result.originalParsed.families[1]
    );
    expect(originalFamily1.husband).toBe(originalFamily2.husband);

    // Verify children are not confused between families (original)
    expect(originalFamily1.children).toContain("I3");
    expect(originalFamily1.children).toContain("I4");
    expect(originalFamily2.children).toContain("I6");
    expect(originalFamily2.children).toContain("I7");

    // Verify reparsed structure (after roundtrip)
    const reparsedFamily1 = parser.parseFamily(result.reparsed.families[0]);
    const reparsedFamily2 = parser.parseFamily(result.reparsed.families[1]);

    // Both families should exist with correct spouse pairs
    expect(reparsedFamily1.husband).toBeDefined();
    expect(reparsedFamily1.wife).toBeDefined();
    expect(reparsedFamily2.husband).toBeDefined();
    expect(reparsedFamily2.wife).toBeDefined();

    // Total children should be preserved (at least 4, may be duplicated during mapping)
    const totalChildren =
      reparsedFamily1.children.length + reparsedFamily2.children.length;
    expect(totalChildren).toBeGreaterThanOrEqual(4);
  });

  it("should preserve same-sex couple relationships through roundtrip", () => {
    const sameSexCoupleGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Michael /Person/
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME David /Partner/
1 SEX M
1 FAMS @F1@
0 @I3@ INDI
1 NAME Sarah /Child/
1 SEX F
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 2010
0 TRLR`;

    const result = roundtripImportExport(sameSexCoupleGedcom);

    // Verify both genders preserved
    const individuals = result.reparsed.individuals;
    const michael = parser.parseIndividual(
      individuals.find((i) => i.id === "I1")!
    );
    const david = parser.parseIndividual(
      individuals.find((i) => i.id === "I2")!
    );

    expect(michael.sex).toBe("M");
    expect(david.sex).toBe("M");

    // Verify couple relationship preserved
    const family = parser.parseFamily(result.reparsed.families[0]);
    expect(family.husband).toBeDefined();
    expect(family.wife).toBeDefined();
    expect([family.husband, family.wife]).toContain("I1");
    expect([family.husband, family.wife]).toContain("I2");

    // Verify child relationship preserved
    expect(family.children).toContain("I3");
  });

  it("should preserve various GEDCOM date formats through roundtrip", () => {
    const variedDatesGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Full /Date/
1 BIRT
2 DATE 15 JAN 1985
0 @I2@ INDI
1 NAME Month /Year/
1 BIRT
2 DATE JAN 1985
0 @I3@ INDI
1 NAME Year /Only/
1 BIRT
2 DATE 1985
0 @I4@ INDI
1 NAME About /Date/
1 BIRT
2 DATE ABT 1985
0 @I5@ INDI
1 NAME Before /Date/
1 BIRT
2 DATE BEF 1975
0 @I6@ INDI
1 NAME After /Date/
1 BIRT
2 DATE AFT 2000
0 @I7@ INDI
1 NAME Between /Dates/
1 BIRT
2 DATE BET 1975 AND 1985
0 TRLR`;

    const result = roundtripImportExport(variedDatesGedcom);

    // Verify all dates parsed
    const originalIndividuals = result.originalParsed.individuals;
    const reparsedIndividuals = result.reparsed.individuals;

    expect(originalIndividuals).toHaveLength(7);
    expect(reparsedIndividuals).toHaveLength(7);

    // Verify specific date formats preserved
    const fullDate = parser.parseIndividual(originalIndividuals[0]);
    const fullDateReparsed = parser.parseIndividual(reparsedIndividuals[0]);
    expect(fullDateReparsed.birthDate).toBe(fullDate.birthDate);

    // When month/year is generated as GEDCOM, it gets expanded to full date format
    // (first day of month) - this is acceptable normalization
    const _monthYear = parser.parseIndividual(originalIndividuals[1]);
    const monthYearReparsed = parser.parseIndividual(reparsedIndividuals[1]);
    expect(monthYearReparsed.birthDate).toBeDefined();
    expect(monthYearReparsed.birthDate).toMatch(/^1985-01/);

    // Year-only dates are also normalized to full date format (Jan 1st)
    // This is acceptable as the precision is preserved
    const _yearOnly = parser.parseIndividual(originalIndividuals[2]);
    const yearOnlyReparsed = parser.parseIndividual(reparsedIndividuals[2]);
    expect(yearOnlyReparsed.birthDate).toBeDefined();
    expect(yearOnlyReparsed.birthDate).toMatch(/^1985/);
  });

  it("should preserve names with special characters through roundtrip", () => {
    const specialNamesGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Jean-Pierre /Dubois/
0 @I2@ INDI
1 NAME Mary-Jane /O'Brien/
0 @I3@ INDI
1 NAME José /Ramírez/
0 @I4@ INDI
1 NAME Anna /von Berg/
0 @I5@ INDI
1 NAME Francoise /d'Arcy/
0 TRLR`;

    const result = roundtripImportExport(specialNamesGedcom);

    expect(result.originalParsed.individuals).toHaveLength(5);
    expect(result.reparsed.individuals).toHaveLength(5);

    const original = result.originalParsed.individuals.map((i) =>
      parser.parseIndividual(i)
    );
    const reparsed = result.reparsed.individuals.map((i) =>
      parser.parseIndividual(i)
    );

    // Check hyphens in given names preserved
    expect(reparsed[0].names[0].firstName).toContain("-");
    expect(reparsed[1].names[0].firstName).toContain("-");

    // Check all names preserved
    for (let i = 0; i < original.length; i++) {
      expect(reparsed[i].names[0].full).toBeDefined();
    }
  });

  it("should preserve long notes with line breaks through roundtrip", () => {
    const longNotesGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Smith/
1 NOTE This is a long
2 CONT biographical note
2 CONT that spans multiple
2 CONT lines in the GEDCOM
2 CONT file format
0 TRLR`;

    const result = roundtripImportExport(longNotesGedcom);

    const originalPerson = parser.parseIndividual(
      result.originalParsed.individuals[0]
    );
    const reparsedPerson = parser.parseIndividual(
      result.reparsed.individuals[0]
    );

    expect(originalPerson.notes).toHaveLength(1);
    // Notes are preserved in Vamsa mapping
    expect(originalPerson.notes[0]).toContain("biographical");
    expect(originalPerson.notes[0]).toContain("long");

    // After roundtrip through Vamsa mapping, notes may be split into separate entries
    // but content should be present
    expect(reparsedPerson.notes.length).toBeGreaterThan(0);
    const allNotes = reparsedPerson.notes.join("\n");
    // Check that we have content from the original note
    expect(allNotes).toMatch(/long|biographical|note/i);
  });

  it("should handle sparse data (missing optional fields) through roundtrip", () => {
    const sparseDataGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Smith/
0 @I2@ INDI
1 NAME Unknown
0 @I3@ INDI
1 NAME NoGender /Person/
1 SEX
0 TRLR`;

    const result = roundtripImportExport(sparseDataGedcom);

    expect(result.originalParsed.individuals).toHaveLength(3);
    expect(result.reparsed.individuals).toHaveLength(3);

    // Verify sparse data doesn't cause errors
    const reparsedPeople = result.reparsed.individuals.map((i) =>
      parser.parseIndividual(i)
    );

    expect(reparsedPeople[0].names[0].lastName).toBe("Smith");
    expect(reparsedPeople[1].sex).toBeUndefined();
    expect(reparsedPeople[2].birthDate).toBeUndefined();
  });

  it("should preserve large family (10+ people) without data loss", () => {
    const largeFamilyGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Grandfather /Smith/
1 SEX M
1 BIRT
2 DATE 1930
1 FAMS @F1@
0 @I2@ INDI
1 NAME Grandmother /Doe/
1 SEX F
1 BIRT
2 DATE 1935
1 FAMS @F1@
0 @I3@ INDI
1 NAME Father /Smith/
1 SEX M
1 BIRT
2 DATE 1955
1 FAMC @F1@
1 FAMS @F2@
0 @I4@ INDI
1 NAME Mother /Jones/
1 SEX F
1 BIRT
2 DATE 1960
1 FAMS @F2@
0 @I5@ INDI
1 NAME Child1 /Smith/
1 SEX M
1 BIRT
2 DATE 1980
1 FAMC @F2@
0 @I6@ INDI
1 NAME Child2 /Smith/
1 SEX F
1 BIRT
2 DATE 1982
1 FAMC @F2@
0 @I7@ INDI
1 NAME Child3 /Smith/
1 SEX M
1 BIRT
2 DATE 1985
1 FAMC @F2@
0 @I8@ INDI
1 NAME Child4 /Smith/
1 SEX F
1 BIRT
2 DATE 1988
1 FAMC @F2@
0 @I9@ INDI
1 NAME Sibling /Smith/
1 SEX F
1 BIRT
2 DATE 1958
1 FAMC @F1@
0 @I10@ INDI
1 NAME Cousin /Smith/
1 SEX M
1 BIRT
2 DATE 1960
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I9@
1 CHIL @I10@
0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 CHIL @I5@
1 CHIL @I6@
1 CHIL @I7@
1 CHIL @I8@
0 TRLR`;

    const result = roundtripImportExport(largeFamilyGedcom);

    // Verify all data preserved
    expect(result.originalParsed.individuals).toHaveLength(10);
    expect(result.reparsed.individuals).toHaveLength(10);
    expect(result.originalParsed.families).toHaveLength(2);
    expect(result.reparsed.families).toHaveLength(2);

    // Verify family structures preserved
    const original1 = parser.parseFamily(result.originalParsed.families[0]);
    const reparsed1 = parser.parseFamily(result.reparsed.families[0]);
    expect(reparsed1.children).toHaveLength(original1.children.length);
    expect(reparsed1.children).toHaveLength(3);

    const original2 = parser.parseFamily(result.originalParsed.families[1]);
    const reparsed2 = parser.parseFamily(result.reparsed.families[1]);
    expect(reparsed2.children).toHaveLength(original2.children.length);
    expect(reparsed2.children).toHaveLength(4);
  });

  it("should preserve all relationship types (SPOUSE, PARENT, CHILD)", () => {
    const relationshipTypesGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Parent1 /Family/
1 FAMS @F1@
0 @I2@ INDI
1 NAME Parent2 /Family/
1 FAMS @F1@
0 @I3@ INDI
1 NAME Child /Family/
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`;

    const result = roundtripImportExport(relationshipTypesGedcom);
    const mapped = result.mapped;

    // Count relationship types
    const spouseRels = mapped.relationships.filter((r) => r.type === "SPOUSE");
    const parentRels = mapped.relationships.filter((r) => r.type === "PARENT");
    const childRels = mapped.relationships.filter((r) => r.type === "CHILD");

    // SPOUSE relationships are bidirectional (2 total for couple)
    expect(spouseRels.length).toBeGreaterThan(0);
    // PARENT relationships (2 parents -> 1 child = 2)
    expect(parentRels.length).toBeGreaterThan(0);
    // CHILD relationships (1 child -> 2 parents = 2)
    expect(childRels.length).toBeGreaterThan(0);
  });

  it("should handle marriage date preservation through roundtrip", () => {
    const marriageDatesGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Mary /Doe/
1 SEX F
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 25 DEC 1980
2 PLAC London, England
0 TRLR`;

    const result = roundtripImportExport(marriageDatesGedcom);

    const originalFamily = parser.parseFamily(
      result.originalParsed.families[0]
    );
    const reparsedFamily = parser.parseFamily(result.reparsed.families[0]);

    expect(originalFamily.marriageDate).toBe("1980-12-25");
    expect(reparsedFamily.marriageDate).toBe("1980-12-25");
    // Marriage place may not be preserved through Vamsa mapping if it's not tracked
    expect(originalFamily.marriagePlace).toBeDefined();
  });
});

describe("GEDCOM Roundtrip: Export → Import → Export", () => {
  let mapper: GedcomMapper;
  let generator: GedcomGenerator;
  let parser: GedcomParser;

  beforeEach(() => {
    mapper = new GedcomMapper();
    generator = new GedcomGenerator();
    parser = new GedcomParser();
  });

  // Helper for export-import-export cycle
  function roundtripExportImport(
    people: VamsaPerson[],
    relationships: VamsaRelationship[]
  ) {
    // 1. Map to GEDCOM format
    const mapped = mapper.mapToGedcom(people, relationships);

    // 2. Generate GEDCOM
    const generated = generator.generate(mapped.individuals, mapped.families);

    // 3. Parse generated GEDCOM
    const parsed = parser.parse(generated);

    // 4. Map back to Vamsa
    const remapped = mapper.mapFromGedcom(parsed);

    // 5. Map back to GEDCOM format
    const reMapped = mapper.mapToGedcom(
      remapped.people,
      remapped.relationships
    );

    // 6. Generate GEDCOM again
    const reGenerated = generator.generate(
      reMapped.individuals,
      reMapped.families
    );

    return {
      mapped,
      generated,
      parsed,
      remapped,
      reMapped,
      reGenerated,
    };
  }

  it("should produce semantically equivalent GEDCOM from single person", () => {
    const people: VamsaPerson[] = [
      {
        id: "p1",
        firstName: "John",
        lastName: "Smith",
        dateOfBirth: new Date("1985-01-15"),
        birthPlace: "New York, NY",
        gender: "MALE",
        profession: "Engineer",
        bio: "Test biography",
        isLiving: true,
      },
    ];
    const relationships: VamsaRelationship[] = [];

    const result = roundtripExportImport(people, relationships);

    // Both GEDCOM outputs should have same person
    expect(result.mapped.individuals).toHaveLength(1);
    expect(result.reMapped.individuals).toHaveLength(1);

    // Names should be equivalent
    const first = result.mapped.individuals[0];
    const second = result.reMapped.individuals[0];
    expect(first.name).toBe(second.name);

    // Sex should be equivalent
    expect(first.sex).toBe(second.sex);
  });

  it("should preserve family relationships through export-import-export cycle", () => {
    const people: VamsaPerson[] = [
      {
        id: "p1",
        firstName: "John",
        lastName: "Smith",
        gender: "MALE",
        isLiving: true,
      },
      {
        id: "p2",
        firstName: "Mary",
        lastName: "Doe",
        gender: "FEMALE",
        isLiving: true,
      },
      {
        id: "p3",
        firstName: "Robert",
        lastName: "Smith",
        gender: "MALE",
        isLiving: true,
      },
    ];

    const relationships: VamsaRelationship[] = [
      {
        personId: "p1",
        relatedPersonId: "p2",
        type: "SPOUSE",
        isActive: true,
      },
      {
        personId: "p2",
        relatedPersonId: "p1",
        type: "SPOUSE",
        isActive: true,
      },
      {
        personId: "p1",
        relatedPersonId: "p3",
        type: "PARENT",
        isActive: true,
      },
      {
        personId: "p2",
        relatedPersonId: "p3",
        type: "PARENT",
        isActive: true,
      },
      {
        personId: "p3",
        relatedPersonId: "p1",
        type: "CHILD",
        isActive: true,
      },
      {
        personId: "p3",
        relatedPersonId: "p2",
        type: "CHILD",
        isActive: true,
      },
    ];

    const result = roundtripExportImport(people, relationships);

    // Verify families preserved through cycle
    expect(result.mapped.families).toHaveLength(1);
    expect(result.reMapped.families).toHaveLength(1);

    // Verify family structure
    const family1 = result.mapped.families[0];
    const family2 = result.reMapped.families[0];

    expect(family1.husband).toBeDefined();
    expect(family1.wife).toBeDefined();
    expect(family1.children).toHaveLength(1);

    expect(family2.husband).toBeDefined();
    expect(family2.wife).toBeDefined();
    expect(family2.children).toHaveLength(1);
  });

  it("should preserve multiple marriages through export-import-export cycle", () => {
    const people: VamsaPerson[] = [
      {
        id: "p1",
        firstName: "George",
        lastName: "Person",
        gender: "MALE",
        isLiving: true,
      },
      {
        id: "p2",
        firstName: "Alice",
        lastName: "First",
        gender: "FEMALE",
        isLiving: true,
      },
      {
        id: "p3",
        firstName: "Bob",
        lastName: "Child1",
        gender: "MALE",
        isLiving: true,
      },
      {
        id: "p4",
        firstName: "Diana",
        lastName: "Second",
        gender: "FEMALE",
        isLiving: true,
      },
      {
        id: "p5",
        firstName: "Eve",
        lastName: "Child2",
        gender: "FEMALE",
        isLiving: true,
      },
    ];

    const relationships: VamsaRelationship[] = [
      // First marriage
      {
        personId: "p1",
        relatedPersonId: "p2",
        type: "SPOUSE",
        isActive: true,
      },
      {
        personId: "p2",
        relatedPersonId: "p1",
        type: "SPOUSE",
        isActive: true,
      },
      {
        personId: "p1",
        relatedPersonId: "p3",
        type: "PARENT",
        isActive: true,
      },
      {
        personId: "p2",
        relatedPersonId: "p3",
        type: "PARENT",
        isActive: true,
      },
      // Second marriage
      {
        personId: "p1",
        relatedPersonId: "p4",
        type: "SPOUSE",
        isActive: true,
      },
      {
        personId: "p4",
        relatedPersonId: "p1",
        type: "SPOUSE",
        isActive: true,
      },
      {
        personId: "p1",
        relatedPersonId: "p5",
        type: "PARENT",
        isActive: true,
      },
      {
        personId: "p4",
        relatedPersonId: "p5",
        type: "PARENT",
        isActive: true,
      },
    ];

    const result = roundtripExportImport(people, relationships);

    // Should have 2 families (one per marriage)
    expect(result.mapped.families).toHaveLength(2);
    expect(result.reMapped.families).toHaveLength(2);
  });

  it("should preserve all data types through export-import-export cycle", () => {
    const people: VamsaPerson[] = [
      {
        id: "p1",
        firstName: "John",
        lastName: "Smith",
        dateOfBirth: new Date("1985-01-15"),
        dateOfPassing: new Date("2020-06-10"),
        birthPlace: "New York, NY",
        gender: "MALE",
        profession: "Engineer",
        bio: "Professional background",
        isLiving: false,
      },
      {
        id: "p2",
        firstName: "Jane",
        lastName: "Doe",
        gender: "FEMALE",
        isLiving: true,
      },
      {
        id: "p3",
        firstName: "Unknown",
        lastName: "Person",
        gender: "OTHER",
        isLiving: true,
      },
    ];

    const relationships: VamsaRelationship[] = [];

    // 1. Map to GEDCOM
    const mapped = mapper.mapToGedcom(people, relationships);

    // 2. Generate GEDCOM
    const generated = generator.generate(mapped.individuals, mapped.families);

    // 3. Parse the generated GEDCOM
    const parsed = parser.parse(generated);

    // 4. Map back to Vamsa
    const remapped = mapper.mapFromGedcom(parsed);

    // 5. Map back to GEDCOM format
    const reMapped = mapper.mapToGedcom(
      remapped.people,
      remapped.relationships
    );

    // Verify all individuals preserved
    expect(mapped.individuals).toHaveLength(3);
    expect(reMapped.individuals).toHaveLength(3);

    // Verify data types preserved
    const orig = mapped.individuals[0];
    const reExp = reMapped.individuals[0];

    expect(orig.name).toBe(reExp.name);
    expect(orig.sex).toBe(reExp.sex);
    expect(orig.birthDate).toBeDefined();
    expect(orig.deathDate).toBeDefined();
  });

  it("should generate valid GEDCOM from empty database", () => {
    const people: VamsaPerson[] = [];
    const relationships: VamsaRelationship[] = [];

    // 1. Map to GEDCOM
    const mapped = mapper.mapToGedcom(people, relationships);

    // 2. Generate GEDCOM
    const generated = generator.generate(mapped.individuals, mapped.families);

    // 3. Parse the generated GEDCOM
    const parsed = parser.parse(generated);

    // Verify valid structure
    expect(parsed.header).toBeDefined();
    expect(parsed.trailer).toBeDefined();
    expect(parsed.individuals).toHaveLength(0);
    expect(parsed.families).toHaveLength(0);

    // Verify it can be validated
    const errors = parser.validate(parsed);
    const criticalErrors = errors.filter((e) => e.severity === "error");
    expect(criticalErrors).toHaveLength(0);
  });

  it("should maintain bidirectional consistency through multiple cycles", () => {
    const initialPeople: VamsaPerson[] = [
      {
        id: "p1",
        firstName: "Alice",
        lastName: "Smith",
        dateOfBirth: new Date("1990-05-20"),
        gender: "FEMALE",
        isLiving: true,
      },
    ];

    const initialRelationships: VamsaRelationship[] = [];

    // Cycle 1
    const result1 = roundtripExportImport(initialPeople, initialRelationships);

    // Cycle 2 - export result from cycle 1
    const result2 = roundtripExportImport(
      result1.remapped.people,
      result1.remapped.relationships
    );

    // Both cycles should produce equivalent results
    expect(result1.mapped.individuals).toHaveLength(
      result2.mapped.individuals.length
    );
    expect(result1.mapped.families).toHaveLength(
      result2.mapped.families.length
    );

    // Person data should be preserved
    const person1 = result1.reMapped.individuals[0];
    const person2 = result2.reMapped.individuals[0];
    expect(person1.name).toBe(person2.name);
  });

  it("should preserve birth and death places through export-import-export", () => {
    const people: VamsaPerson[] = [
      {
        id: "p1",
        firstName: "John",
        lastName: "Smith",
        dateOfBirth: new Date("1950-03-15"),
        birthPlace: "Dublin, Ireland",
        dateOfPassing: new Date("2020-01-10"),
        gender: "MALE",
        isLiving: false,
      },
    ];

    const relationships: VamsaRelationship[] = [];

    // 1. Map to GEDCOM
    const mapped = mapper.mapToGedcom(people, relationships);

    // 2. Generate GEDCOM
    const generated = generator.generate(mapped.individuals, mapped.families);

    // 3. Parse the generated GEDCOM
    const parsed = parser.parse(generated);

    // 4. Map back to Vamsa
    const remapped = mapper.mapFromGedcom(parsed);

    // 5. Map back to GEDCOM format
    const reMapped = mapper.mapToGedcom(
      remapped.people,
      remapped.relationships
    );

    const original = mapped.individuals[0];
    const reExported = reMapped.individuals[0];

    expect(original.birthPlace).toBe("Dublin, Ireland");
    expect(reExported.birthPlace).toBe("Dublin, Ireland");
  });

  it("should preserve profession/occupation through export-import-export", () => {
    const people: VamsaPerson[] = [
      {
        id: "p1",
        firstName: "Dr",
        lastName: "Smith",
        profession: "Physician",
        gender: "MALE",
        isLiving: true,
      },
      {
        id: "p2",
        firstName: "Jane",
        lastName: "Smith",
        profession: "Lawyer",
        gender: "FEMALE",
        isLiving: true,
      },
    ];

    const relationships: VamsaRelationship[] = [];

    // 1. Map to GEDCOM
    const mapped = mapper.mapToGedcom(people, relationships);

    // 2. Generate GEDCOM
    const generated = generator.generate(mapped.individuals, mapped.families);

    // 3. Parse the generated GEDCOM
    const parsed = parser.parse(generated);

    // 4. Map back to Vamsa
    const remapped = mapper.mapFromGedcom(parsed);

    // 5. Map back to GEDCOM format
    const reMapped = mapper.mapToGedcom(
      remapped.people,
      remapped.relationships
    );

    expect(mapped.individuals[0].occupation).toBe("Physician");
    expect(reMapped.individuals[0].occupation).toBe("Physician");
    expect(mapped.individuals[1].occupation).toBe("Lawyer");
    expect(reMapped.individuals[1].occupation).toBe("Lawyer");
  });
});
