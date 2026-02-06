/**
 * Unit Tests for GEDCOM Mapper
 * Tests bidirectional mapping between GEDCOM and Vamsa data models
 */
import { describe, expect, test } from "vitest";
import { GedcomMapper } from "./mapper";
import { GedcomParser } from "./parser";
import type { VamsaPerson, VamsaRelationship } from "./mapper-types";

describe("GedcomMapper", () => {
  describe("mapFromGedcom", () => {
    test("maps individuals correctly", () => {
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
1 OCCU Software Engineer
1 NOTE A biographical note
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      expect(result.people.length).toBe(1);
      const person = result.people[0];

      expect(person.firstName).toBe("John Michael");
      expect(person.lastName).toBe("Doe");
      expect(person.gender).toBe("MALE");
      expect(person.birthPlace).toBe("New York, USA");
      expect(person.profession).toBe("Software Engineer");
      expect(person.bio).toBe("A biographical note");
      expect(person.isLiving).toBe(false); // Has death date

      // Check dates are Date objects
      expect(person.dateOfBirth).toBeInstanceOf(Date);
      expect(person.dateOfBirth?.getUTCFullYear()).toBe(1985);
      expect(person.dateOfBirth?.getUTCMonth()).toBe(0); // January
      expect(person.dateOfBirth?.getUTCDate()).toBe(15);
    });

    test("maps female individual correctly", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Jane /Smith/
1 SEX F
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      expect(result.people[0].gender).toBe("FEMALE");
    });

    test("maps unknown gender correctly", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Pat /Jones/
1 SEX X
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      expect(result.people[0].gender).toBe("OTHER");
    });

    test("marks living person correctly", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Living /Person/
1 BIRT
2 DATE 1 JAN 2000
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      expect(result.people[0].isLiving).toBe(true);
    });

    test("maps spouse relationships", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Doe/
1 SEX F
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 10 JUN 2010
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      // Should have spouse relationships (bidirectional)
      const spouseRels = result.relationships.filter(
        (r) => r.type === "SPOUSE"
      );
      expect(spouseRels.length).toBe(2);

      // Check marriage date
      const rel = spouseRels[0];
      expect(rel.marriageDate).toBeInstanceOf(Date);
      expect(rel.marriageDate?.getUTCFullYear()).toBe(2010);
    });

    test("maps parent-child relationships", () => {
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
0 @I3@ INDI
1 NAME Baby /Doe/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      // Should have PARENT relationships (from parents to child)
      const parentRels = result.relationships.filter(
        (r) => r.type === "PARENT"
      );
      expect(parentRels.length).toBe(2); // 2 parents

      // Should have CHILD relationships (from child to parents)
      const childRels = result.relationships.filter((r) => r.type === "CHILD");
      expect(childRels.length).toBe(2); // 2 parents
    });

    test("handles missing references with option", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I999@
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const mapper = new GedcomMapper();

      // Without ignoreMissingReferences
      const result1 = mapper.mapFromGedcom(file, {
        ignoreMissingReferences: false,
      });
      expect(result1.errors.some((e) => e.type === "broken_reference")).toBe(
        true
      );

      // With ignoreMissingReferences
      const result2 = mapper.mapFromGedcom(file, {
        ignoreMissingReferences: true,
      });
      expect(
        result2.errors.filter((e) => e.type === "broken_reference").length
      ).toBe(0);
    });

    test("handles individuals without names", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 SEX M
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      expect(result.people[0].firstName).toBe("Unknown");
      expect(result.people[0].lastName).toBe("Unknown");
    });

    test("generates unique IDs for people", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Person /One/
0 @I2@ INDI
1 NAME Person /Two/
0 @I3@ INDI
1 NAME Person /Three/
0 TRLR`;

      const parser = new GedcomParser();
      const file = parser.parse(content);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      const ids = result.people.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test("skips validation when option set", () => {
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
      const mapper = new GedcomMapper();

      // Without skipValidation, should have warnings
      const result1 = mapper.mapFromGedcom(file, { skipValidation: false });
      expect(result1.warnings.length).toBeGreaterThan(0);

      // With skipValidation, no validation warnings
      const result2 = mapper.mapFromGedcom(file, { skipValidation: true });
      expect(result2.warnings.length).toBe(0);
    });
  });

  describe("mapToGedcom", () => {
    test("maps people to individuals", () => {
      const people: Array<VamsaPerson> = [
        {
          id: "person1",
          firstName: "John",
          lastName: "Doe",
          gender: "MALE",
          dateOfBirth: new Date(Date.UTC(1985, 0, 15)),
          birthPlace: "New York, USA",
          profession: "Engineer",
          bio: "A note",
          isLiving: true,
        },
      ];

      const mapper = new GedcomMapper();
      const result = mapper.mapToGedcom(people, []);

      expect(result.individuals.length).toBe(1);
      const individual = result.individuals[0];

      expect(individual.name).toBe("John /Doe/");
      expect(individual.sex).toBe("M");
      expect(individual.birthDate).toBe("15 JAN 1985");
      expect(individual.birthPlace).toBe("New York, USA");
      expect(individual.occupation).toBe("Engineer");
      expect(individual.notes).toContain("A note");
    });

    test("maps female correctly", () => {
      const people: Array<VamsaPerson> = [
        {
          id: "person1",
          firstName: "Jane",
          lastName: "Doe",
          gender: "FEMALE",
          isLiving: true,
        },
      ];

      const mapper = new GedcomMapper();
      const result = mapper.mapToGedcom(people, []);

      expect(result.individuals[0].sex).toBe("F");
    });

    test("maps OTHER gender correctly", () => {
      const people: Array<VamsaPerson> = [
        {
          id: "person1",
          firstName: "Pat",
          lastName: "Smith",
          gender: "OTHER",
          isLiving: true,
        },
      ];

      const mapper = new GedcomMapper();
      const result = mapper.mapToGedcom(people, []);

      expect(result.individuals[0].sex).toBe("X");
    });

    test("maps spouse relationships to families", () => {
      const people: Array<VamsaPerson> = [
        {
          id: "person1",
          firstName: "John",
          lastName: "Doe",
          gender: "MALE",
          isLiving: true,
        },
        {
          id: "person2",
          firstName: "Jane",
          lastName: "Doe",
          gender: "FEMALE",
          isLiving: true,
        },
      ];

      const relationships: Array<VamsaRelationship> = [
        {
          id: "rel1",
          personId: "person1",
          relatedPersonId: "person2",
          type: "SPOUSE",
          marriageDate: new Date(Date.UTC(2010, 5, 10)),
          isActive: true,
        },
        {
          id: "rel2",
          personId: "person2",
          relatedPersonId: "person1",
          type: "SPOUSE",
          marriageDate: new Date(Date.UTC(2010, 5, 10)),
          isActive: true,
        },
      ];

      const mapper = new GedcomMapper();
      const result = mapper.mapToGedcom(people, relationships);

      expect(result.families.length).toBe(1);
      const family = result.families[0];

      expect(family.husband).toBe("@I1@");
      expect(family.wife).toBe("@I2@");
      expect(family.marriageDate).toBe("10 JUN 2010");
    });

    test("maps parent-child relationships", () => {
      const people: Array<VamsaPerson> = [
        {
          id: "person1",
          firstName: "John",
          lastName: "Doe",
          gender: "MALE",
          isLiving: true,
        },
        {
          id: "person2",
          firstName: "Jane",
          lastName: "Doe",
          gender: "FEMALE",
          isLiving: true,
        },
        { id: "person3", firstName: "Baby", lastName: "Doe", isLiving: true },
      ];

      const relationships: Array<VamsaRelationship> = [
        {
          id: "rel1",
          personId: "person1",
          relatedPersonId: "person2",
          type: "SPOUSE",
          isActive: true,
        },
        {
          id: "rel2",
          personId: "person2",
          relatedPersonId: "person1",
          type: "SPOUSE",
          isActive: true,
        },
        {
          id: "rel3",
          personId: "person1",
          relatedPersonId: "person3",
          type: "PARENT",
          isActive: true,
        },
        {
          id: "rel4",
          personId: "person2",
          relatedPersonId: "person3",
          type: "PARENT",
          isActive: true,
        },
      ];

      const mapper = new GedcomMapper();
      const result = mapper.mapToGedcom(people, relationships);

      expect(result.families.length).toBe(1);
      const family = result.families[0];

      expect(family.children).toContain("@I3@");
    });

    test("updates individual family references", () => {
      const people: Array<VamsaPerson> = [
        {
          id: "person1",
          firstName: "John",
          lastName: "Doe",
          gender: "MALE",
          isLiving: true,
        },
        {
          id: "person2",
          firstName: "Jane",
          lastName: "Doe",
          gender: "FEMALE",
          isLiving: true,
        },
        { id: "person3", firstName: "Baby", lastName: "Doe", isLiving: true },
      ];

      const relationships: Array<VamsaRelationship> = [
        {
          id: "rel1",
          personId: "person1",
          relatedPersonId: "person2",
          type: "SPOUSE",
          isActive: true,
        },
        {
          id: "rel2",
          personId: "person2",
          relatedPersonId: "person1",
          type: "SPOUSE",
          isActive: true,
        },
        {
          id: "rel3",
          personId: "person1",
          relatedPersonId: "person3",
          type: "PARENT",
          isActive: true,
        },
        {
          id: "rel4",
          personId: "person2",
          relatedPersonId: "person3",
          type: "PARENT",
          isActive: true,
        },
      ];

      const mapper = new GedcomMapper();
      const result = mapper.mapToGedcom(people, relationships);

      // Parents should have FAMS references
      const parent1 = result.individuals.find((i) => i.xref === "@I1@");
      const parent2 = result.individuals.find((i) => i.xref === "@I2@");
      const child = result.individuals.find((i) => i.xref === "@I3@");

      expect(parent1?.familiesAsSpouse.length).toBeGreaterThan(0);
      expect(parent2?.familiesAsSpouse.length).toBeGreaterThan(0);
      expect(child?.familiesAsChild.length).toBeGreaterThan(0);
    });

    test("handles person without last name", () => {
      const people: Array<VamsaPerson> = [
        { id: "person1", firstName: "Madonna", lastName: "", isLiving: true },
      ];

      const mapper = new GedcomMapper();
      const result = mapper.mapToGedcom(people, []);

      expect(result.individuals[0].name).toBe("Madonna");
    });

    test("handles deceased person", () => {
      const people: Array<VamsaPerson> = [
        {
          id: "person1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date(Date.UTC(1920, 0, 1)),
          dateOfPassing: new Date(Date.UTC(2000, 11, 25)),
          isLiving: false,
        },
      ];

      const mapper = new GedcomMapper();
      const result = mapper.mapToGedcom(people, []);

      const individual = result.individuals[0];
      expect(individual.deathDate).toBe("25 DEC 2000");
    });
  });

  describe("round-trip mapping", () => {
    test("preserves essential data through round-trip", () => {
      const originalContent = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 15 JAN 1985
2 PLAC New York, USA
1 OCCU Engineer
0 @I2@ INDI
1 NAME Jane /Smith/
1 SEX F
1 BIRT
2 DATE 20 MAR 1987
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 10 JUN 2010
0 TRLR`;

      const parser = new GedcomParser();
      const mapper = new GedcomMapper();

      // Parse and map from GEDCOM
      const file = parser.parse(originalContent);
      const vamsaData = mapper.mapFromGedcom(file);

      // Map back to GEDCOM
      const gedcomData = mapper.mapToGedcom(
        vamsaData.people,
        vamsaData.relationships
      );

      // Verify individual data preserved
      const john = gedcomData.individuals.find((i) => i.name.includes("John"));
      expect(john).toBeDefined();
      expect(john?.sex).toBe("M");
      expect(john?.birthDate).toBe("15 JAN 1985");
      expect(john?.birthPlace).toBe("New York, USA");
      expect(john?.occupation).toBe("Engineer");

      // Verify family preserved
      expect(gedcomData.families.length).toBe(1);
      expect(gedcomData.families[0].marriageDate).toBe("10 JUN 2010");
    });
  });
});
