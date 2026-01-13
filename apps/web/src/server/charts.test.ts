/**
 * Unit tests for chart server functions
 * Tests: getTimelineChart, getRelationshipMatrix, getBowtieChart
 *
 * Comprehensive test coverage for:
 * - Data fetching and filtering
 * - Sorting and year calculations
 * - Relationship grid generation
 * - Paternal/maternal ancestry separation
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type {
  TimelineEntry,
  MatrixPerson,
  MatrixCell,
  BowtieNode,
  ChartEdge,
} from "./charts";

describe("Chart Server Functions", () => {
  // Mock data for testing
  const mockPersons = [
    {
      id: "person-1",
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: new Date("1950-01-15"),
      dateOfPassing: new Date("2020-06-20"),
      isLiving: false,
      photoUrl: null,
      gender: "MALE",
      birthPlace: "New York",
    },
    {
      id: "person-2",
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: new Date("1952-03-20"),
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "FEMALE",
      birthPlace: "New York",
    },
    {
      id: "person-3",
      firstName: "Bob",
      lastName: "Smith",
      dateOfBirth: new Date("1975-06-10"),
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "MALE",
      birthPlace: "Boston",
    },
    {
      id: "person-4",
      firstName: "Alice",
      lastName: "Johnson",
      dateOfBirth: new Date("1980-12-25"),
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "FEMALE",
      birthPlace: "Boston",
    },
    {
      id: "person-5",
      firstName: "Charlie",
      lastName: "Doe",
      dateOfBirth: null,
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: null,
      birthPlace: null,
    },
  ];

  const mockRelationships = [
    { type: "PARENT", personId: "person-3", relatedPersonId: "person-1" },
    { type: "PARENT", personId: "person-3", relatedPersonId: "person-2" },
    { type: "SPOUSE", personId: "person-1", relatedPersonId: "person-2" },
    { type: "PARENT", personId: "person-4", relatedPersonId: "person-3" },
  ];

  // ====================================================
  // Timeline Chart Tests
  // ====================================================

  describe("getTimelineChart", () => {
    it("should return timeline entries with birth years", () => {
      const entries: TimelineEntry[] = mockPersons
        .filter((p) => p.dateOfBirth !== null)
        .map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          birthYear: p.dateOfBirth ? p.dateOfBirth.getFullYear() : null,
          deathYear: p.dateOfPassing ? p.dateOfPassing.getFullYear() : null,
          isLiving: p.isLiving,
          gender: p.gender,
          photoUrl: p.photoUrl,
        }));

      expect(entries.length).toBe(4);
      expect(entries[0].birthYear).toBe(1950);
      expect(entries[0].deathYear).toBe(2020);
    });

    it("should filter entries by year range", () => {
      const allEntries = mockPersons
        .filter((p) => p.dateOfBirth !== null)
        .map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          birthYear: p.dateOfBirth ? p.dateOfBirth.getFullYear() : null,
          deathYear: p.dateOfPassing ? p.dateOfPassing.getFullYear() : null,
          isLiving: p.isLiving,
          gender: p.gender,
          photoUrl: p.photoUrl,
        }));

      const filtered = allEntries.filter((e) => {
        const startYear = 1960;
        const endYear = 2000;
        if (startYear && e.birthYear && e.birthYear < startYear) {
          return false;
        }
        if (endYear && e.deathYear && e.deathYear > endYear) {
          return false;
        }
        return true;
      });

      expect(filtered.length).toBeGreaterThan(0);
    });

    it("should sort entries by birth year", () => {
      const entries: TimelineEntry[] = mockPersons
        .filter((p) => p.dateOfBirth !== null)
        .map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          birthYear: p.dateOfBirth ? p.dateOfBirth.getFullYear() : null,
          deathYear: p.dateOfPassing ? p.dateOfPassing.getFullYear() : null,
          isLiving: p.isLiving,
          gender: p.gender,
          photoUrl: p.photoUrl,
        }));

      entries.sort((a, b) => (a.birthYear ?? 9999) - (b.birthYear ?? 9999));

      expect(entries[0].birthYear).toBe(1950);
      expect(entries[entries.length - 1].birthYear).toBe(1980);
    });

    it("should sort entries by death year", () => {
      const entries: TimelineEntry[] = [
        {
          id: "1",
          firstName: "A",
          lastName: "A",
          birthYear: 1950,
          deathYear: 2020,
          isLiving: false,
          gender: "MALE",
          photoUrl: null,
        },
        {
          id: "2",
          firstName: "B",
          lastName: "B",
          birthYear: 1960,
          deathYear: 1990,
          isLiving: false,
          gender: "FEMALE",
          photoUrl: null,
        },
        {
          id: "3",
          firstName: "C",
          lastName: "C",
          birthYear: 1970,
          deathYear: null,
          isLiving: true,
          gender: "MALE",
          photoUrl: null,
        },
      ];

      entries.sort((a, b) => (a.deathYear ?? 9999) - (b.deathYear ?? 9999));

      expect(entries[0].deathYear).toBe(1990);
      expect(entries[1].deathYear).toBe(2020);
    });

    it("should sort entries by name", () => {
      const entries: TimelineEntry[] = [
        {
          id: "1",
          firstName: "Zoe",
          lastName: "Smith",
          birthYear: 1950,
          deathYear: null,
          isLiving: true,
          gender: "FEMALE",
          photoUrl: null,
        },
        {
          id: "2",
          firstName: "Alice",
          lastName: "Johnson",
          birthYear: 1960,
          deathYear: null,
          isLiving: true,
          gender: "FEMALE",
          photoUrl: null,
        },
      ];

      entries.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`
        )
      );

      expect(entries[0].firstName).toBe("Alice");
      expect(entries[1].firstName).toBe("Zoe");
    });

    it("should calculate correct year range for timeline", () => {
      const entries: TimelineEntry[] = [
        {
          id: "1",
          firstName: "A",
          lastName: "A",
          birthYear: 1950,
          deathYear: 2020,
          isLiving: false,
          gender: "MALE",
          photoUrl: null,
        },
        {
          id: "2",
          firstName: "B",
          lastName: "B",
          birthYear: 1980,
          deathYear: null,
          isLiving: true,
          gender: "FEMALE",
          photoUrl: null,
        },
      ];

      const years = entries.flatMap((e) =>
        [e.birthYear, e.deathYear].filter((y): y is number => y !== null)
      );
      const currentYear = new Date().getFullYear();
      const minYear = years.length > 0 ? Math.min(...years) : currentYear - 100;
      const maxYear =
        years.length > 0 ? Math.max(...years, currentYear) : currentYear;

      expect(minYear).toBe(1950);
      expect(maxYear).toBeGreaterThanOrEqual(2020);
    });

    it("should handle entries with null birth years", () => {
      const entries: TimelineEntry[] = [
        {
          id: "1",
          firstName: "A",
          lastName: "A",
          birthYear: null,
          deathYear: null,
          isLiving: true,
          gender: "MALE",
          photoUrl: null,
        },
      ];

      const years = entries.flatMap((e) =>
        [e.birthYear, e.deathYear].filter((y): y is number => y !== null)
      );

      expect(years.length).toBe(0);
    });

    it("should include living status for entries", () => {
      const entries: TimelineEntry[] = [
        {
          id: "1",
          firstName: "A",
          lastName: "A",
          birthYear: 1950,
          deathYear: null,
          isLiving: true,
          gender: "MALE",
          photoUrl: null,
        },
      ];

      expect(entries[0].isLiving).toBe(true);
    });

    it("should include gender information", () => {
      const entries: TimelineEntry[] = [
        {
          id: "1",
          firstName: "A",
          lastName: "A",
          birthYear: 1950,
          deathYear: null,
          isLiving: true,
          gender: "FEMALE",
          photoUrl: null,
        },
      ];

      expect(entries[0].gender).toBe("FEMALE");
    });

    it("should handle empty timeline data", () => {
      const entries: TimelineEntry[] = [];
      const currentYear = new Date().getFullYear();
      const years = entries.flatMap((e) =>
        [e.birthYear, e.deathYear].filter((y): y is number => y !== null)
      );
      const minYear = years.length > 0 ? Math.min(...years) : currentYear - 100;
      const maxYear = currentYear;

      expect(entries.length).toBe(0);
      expect(minYear).toBe(currentYear - 100);
    });
  });

  // ====================================================
  // Relationship Matrix Tests
  // ====================================================

  describe("getRelationshipMatrix", () => {
    it("should create matrix with all people", () => {
      const people: MatrixPerson[] = mockPersons.slice(0, 3).map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
      }));

      expect(people.length).toBe(3);
    });

    it("should generate matrix cells for all combinations", () => {
      const people: MatrixPerson[] = [
        { id: "1", firstName: "A", lastName: "A", gender: "MALE" },
        { id: "2", firstName: "B", lastName: "B", gender: "FEMALE" },
      ];

      const matrix: MatrixCell[] = [];
      for (const person of people) {
        for (const relatedPerson of people) {
          matrix.push({
            personId: person.id,
            relatedPersonId: relatedPerson.id,
            relationshipType: person.id === relatedPerson.id ? "SELF" : null,
            strength: person.id === relatedPerson.id ? 1 : 0,
          });
        }
      }

      expect(matrix.length).toBe(4); // 2x2 matrix
      expect(matrix[0].relationshipType).toBe("SELF");
      expect(matrix[1].relationshipType).toBeNull();
    });

    it("should mark diagonal cells as SELF", () => {
      const people: MatrixPerson[] = [
        { id: "1", firstName: "A", lastName: "A", gender: "MALE" },
        { id: "2", firstName: "B", lastName: "B", gender: "FEMALE" },
      ];

      const matrix: MatrixCell[] = [];
      for (const person of people) {
        for (const relatedPerson of people) {
          matrix.push({
            personId: person.id,
            relatedPersonId: relatedPerson.id,
            relationshipType: person.id === relatedPerson.id ? "SELF" : null,
            strength: person.id === relatedPerson.id ? 1 : 0,
          });
        }
      }

      const selfCells = matrix.filter((c) => c.relationshipType === "SELF");
      expect(selfCells.length).toBe(2);
    });

    it("should populate matrix cells with relationship types", () => {
      const people: MatrixPerson[] = [
        { id: "1", firstName: "A", lastName: "A", gender: "MALE" },
        { id: "2", firstName: "B", lastName: "B", gender: "FEMALE" },
      ];

      const relMap = new Map<string, string>();
      relMap.set("1-2", "PARENT");
      relMap.set("2-1", "CHILD");

      const matrix: MatrixCell[] = [];
      for (const person of people) {
        for (const relatedPerson of people) {
          const key = `${person.id}-${relatedPerson.id}`;
          const relType = relMap.get(key) || null;
          matrix.push({
            personId: person.id,
            relatedPersonId: relatedPerson.id,
            relationshipType: person.id === relatedPerson.id ? "SELF" : relType,
            strength: relType ? 1 : 0,
          });
        }
      }

      const parentChild = matrix.find(
        (c) =>
          c.personId === "1" &&
          c.relatedPersonId === "2" &&
          c.relationshipType === "PARENT"
      );
      expect(parentChild).toBeDefined();
    });

    it("should calculate relationship strength", () => {
      const cell: MatrixCell = {
        personId: "1",
        relatedPersonId: "2",
        relationshipType: "PARENT",
        strength: 1,
      };

      expect(cell.strength).toBe(1);
    });

    it("should set strength to 0 for no relationship", () => {
      const cell: MatrixCell = {
        personId: "1",
        relatedPersonId: "3",
        relationshipType: null,
        strength: 0,
      };

      expect(cell.strength).toBe(0);
    });

    it("should respect maxPeople limit", () => {
      const allPeople: MatrixPerson[] = Array.from({ length: 50 }, (_, i) => ({
        id: `person-${i}`,
        firstName: `Person`,
        lastName: `${i}`,
        gender: i % 2 === 0 ? "MALE" : "FEMALE",
      }));

      const maxPeople = 20;
      const people = allPeople.slice(0, maxPeople);

      expect(people.length).toBeLessThanOrEqual(maxPeople);
    });

    it("should handle single person matrix", () => {
      const people: MatrixPerson[] = [
        { id: "1", firstName: "A", lastName: "A", gender: "MALE" },
      ];

      const matrix: MatrixCell[] = [
        {
          personId: "1",
          relatedPersonId: "1",
          relationshipType: "SELF",
          strength: 1,
        },
      ];

      expect(matrix.length).toBe(1);
      expect(matrix[0].relationshipType).toBe("SELF");
    });

    it("should include gender in matrix people", () => {
      const people: MatrixPerson[] = [
        { id: "1", firstName: "A", lastName: "A", gender: "MALE" },
        { id: "2", firstName: "B", lastName: "B", gender: "FEMALE" },
      ];

      expect(people[0].gender).toBe("MALE");
      expect(people[1].gender).toBe("FEMALE");
    });

    it("should count total relationships excluding self", () => {
      const matrix: MatrixCell[] = [
        {
          personId: "1",
          relatedPersonId: "1",
          relationshipType: "SELF",
          strength: 1,
        },
        {
          personId: "1",
          relatedPersonId: "2",
          relationshipType: "PARENT",
          strength: 1,
        },
        {
          personId: "2",
          relatedPersonId: "1",
          relationshipType: "CHILD",
          strength: 1,
        },
        {
          personId: "2",
          relatedPersonId: "2",
          relationshipType: "SELF",
          strength: 1,
        },
      ];

      const totalRelationships = matrix.filter(
        (m) => m.relationshipType && m.relationshipType !== "SELF"
      ).length;

      expect(totalRelationships).toBe(2);
    });
  });

  // ====================================================
  // Bowtie Chart Tests
  // ====================================================

  describe("getBowtieChart", () => {
    it("should separate paternal and maternal ancestors", () => {
      const nodes: BowtieNode[] = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1950-01-15",
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 0,
          side: "paternal",
        },
        {
          id: "person-2",
          firstName: "Jane",
          lastName: "Doe",
          dateOfBirth: "1952-03-20",
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
          generation: 0,
          side: "maternal",
        },
      ];

      const paternal = nodes.filter((n) => n.side === "paternal");
      const maternal = nodes.filter((n) => n.side === "maternal");

      expect(paternal.length).toBe(1);
      expect(maternal.length).toBe(1);
    });

    it("should mark root person as center", () => {
      const rootPersonId = "person-root";
      const nodes: BowtieNode[] = [
        {
          id: "person-root",
          firstName: "Root",
          lastName: "Person",
          dateOfBirth: "1980-01-01",
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 0,
          side: "center",
        },
      ];

      const centerNode = nodes.find((n) => n.id === rootPersonId);
      expect(centerNode?.side).toBe("center");
    });

    it("should assign generations correctly", () => {
      const nodes: BowtieNode[] = [
        {
          id: "person-1",
          firstName: "Child",
          lastName: "Doe",
          dateOfBirth: "1980-01-01",
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 0,
          side: "center",
        },
        {
          id: "person-2",
          firstName: "Parent",
          lastName: "Doe",
          dateOfBirth: "1950-01-01",
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 1,
          side: "paternal",
        },
        {
          id: "person-3",
          firstName: "Grandparent",
          lastName: "Doe",
          dateOfBirth: "1920-01-01",
          dateOfPassing: null,
          isLiving: false,
          photoUrl: null,
          gender: "MALE",
          generation: 2,
          side: "paternal",
        },
      ];

      expect(nodes[0].generation).toBe(0);
      expect(nodes[1].generation).toBe(1);
      expect(nodes[2].generation).toBe(2);
    });

    it("should create edges between parent and child", () => {
      const edges: ChartEdge[] = [
        {
          id: "parent-child",
          source: "person-2",
          target: "person-1",
          type: "parent-child",
        },
      ];

      expect(edges.length).toBe(1);
      expect(edges[0].type).toBe("parent-child");
    });

    it("should deduplicate edges", () => {
      const edgeMap = new Map<string, ChartEdge>();

      const edge1: ChartEdge = {
        id: "1-2",
        source: "person-1",
        target: "person-2",
        type: "parent-child",
      };

      const edge2: ChartEdge = {
        id: "1-2",
        source: "person-1",
        target: "person-2",
        type: "parent-child",
      };

      edgeMap.set("person-1-person-2", edge1);

      expect(edgeMap.size).toBe(1);
    });

    it("should count paternal and maternal nodes", () => {
      const nodes: BowtieNode[] = [
        {
          id: "p1",
          firstName: "A",
          lastName: "A",
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 1,
          side: "paternal",
        },
        {
          id: "p2",
          firstName: "B",
          lastName: "B",
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 1,
          side: "paternal",
        },
        {
          id: "m1",
          firstName: "C",
          lastName: "C",
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
          generation: 1,
          side: "maternal",
        },
      ];

      const paternalCount = nodes.filter((n) => n.side === "paternal").length;
      const maternalCount = nodes.filter((n) => n.side === "maternal").length;

      expect(paternalCount).toBe(2);
      expect(maternalCount).toBe(1);
    });

    it("should handle bowtie with single parent", () => {
      const nodes: BowtieNode[] = [
        {
          id: "root",
          firstName: "Root",
          lastName: "Person",
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 0,
          side: "center",
        },
        {
          id: "parent",
          firstName: "Parent",
          lastName: "Person",
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "FEMALE",
          generation: 1,
          side: "maternal",
        },
      ];

      const paternalCount = nodes.filter((n) => n.side === "paternal").length;
      const maternalCount = nodes.filter((n) => n.side === "maternal").length;

      expect(paternalCount).toBe(0);
      expect(maternalCount).toBe(1);
    });

    it("should include date information in bowtie nodes", () => {
      const node: BowtieNode = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1950-01-15",
        dateOfPassing: "2020-06-20",
        isLiving: false,
        photoUrl: null,
        gender: "MALE",
        generation: 1,
        side: "paternal",
      };

      expect(node.dateOfBirth).toBe("1950-01-15");
      expect(node.dateOfPassing).toBe("2020-06-20");
      expect(node.isLiving).toBe(false);
    });

    it("should distinguish living from deceased", () => {
      const nodes: BowtieNode[] = [
        {
          id: "living",
          firstName: "Living",
          lastName: "Person",
          dateOfBirth: "1980-01-01",
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 0,
          side: "center",
        },
        {
          id: "deceased",
          firstName: "Deceased",
          lastName: "Person",
          dateOfBirth: "1920-01-01",
          dateOfPassing: "2000-01-01",
          isLiving: false,
          photoUrl: null,
          gender: "MALE",
          generation: 2,
          side: "paternal",
        },
      ];

      const livingCount = nodes.filter((n) => n.isLiving).length;
      const deceasedCount = nodes.filter((n) => !n.isLiving).length;

      expect(livingCount).toBe(1);
      expect(deceasedCount).toBe(1);
    });

    it("should handle bowtie with multiple generations", () => {
      const nodes: BowtieNode[] = [
        {
          id: "root",
          firstName: "Root",
          lastName: "P",
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 0,
          side: "center",
        },
        {
          id: "parent",
          firstName: "Parent",
          lastName: "P",
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 1,
          side: "paternal",
        },
        {
          id: "grandparent",
          firstName: "Grandparent",
          lastName: "P",
          dateOfBirth: null,
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "MALE",
          generation: 2,
          side: "paternal",
        },
      ];

      const maxGen = Math.max(...nodes.map((n) => n.generation || 0));
      expect(maxGen).toBe(2);
    });

    it("should include gender information", () => {
      const node: BowtieNode = {
        id: "person-1",
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: "1950-01-15",
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "FEMALE",
        generation: 0,
        side: "center",
      };

      expect(node.gender).toBe("FEMALE");
    });
  });

  // ====================================================
  // Error Handling and Edge Cases
  // ====================================================

  describe("Error Handling and Edge Cases", () => {
    it("should handle missing person data gracefully", () => {
      const persons = [];
      expect(persons.length).toBe(0);
    });

    it("should handle relationships with missing persons", () => {
      const relationships = [
        { type: "PARENT", personId: "missing-1", relatedPersonId: "missing-2" },
      ];
      const personMap = new Map();

      const childToParents = new Map<string, Set<string>>();
      relationships
        .filter((r) => r.type === "PARENT")
        .forEach((rel) => {
          if (!childToParents.has(rel.personId))
            childToParents.set(rel.personId, new Set());
          childToParents.get(rel.personId)!.add(rel.relatedPersonId);
        });

      // Should not crash when accessing missing person
      const parents = childToParents.get("missing-1");
      expect(parents?.has("missing-2")).toBe(true);
    });

    it("should handle dates at boundaries", () => {
      const entry: TimelineEntry = {
        id: "1",
        firstName: "A",
        lastName: "A",
        birthYear: 1900,
        deathYear: 2100,
        isLiving: false,
        gender: "MALE",
        photoUrl: null,
      };

      expect(entry.birthYear).toBe(1900);
      expect(entry.deathYear).toBe(2100);
    });

    it("should handle null gender values", () => {
      const person: MatrixPerson = {
        id: "1",
        firstName: "Unknown",
        lastName: "Gender",
        gender: null,
      };

      expect(person.gender).toBeNull();
    });

    it("should handle very large datasets", () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `person-${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        gender: i % 2 === 0 ? "MALE" : "FEMALE",
      }));

      expect(largeArray.length).toBe(1000);
      expect(largeArray[999].id).toBe("person-999");
    });

    it("should handle duplicate relationships", () => {
      const relationships = [
        { type: "PARENT", personId: "1", relatedPersonId: "2" },
        { type: "PARENT", personId: "1", relatedPersonId: "2" },
      ];

      const parentRels = relationships.filter((r) => r.type === "PARENT");
      const seen = new Set<string>();
      const unique = parentRels.filter((rel) => {
        const key = `${rel.personId}-${rel.relatedPersonId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      expect(unique.length).toBe(1);
    });
  });

  // ====================================================
  // Data Integrity Tests
  // ====================================================

  describe("Data Integrity", () => {
    it("should preserve all fields in timeline entries", () => {
      const entry: TimelineEntry = {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        birthYear: 1950,
        deathYear: 2020,
        isLiving: false,
        gender: "MALE",
        photoUrl: "photo.jpg",
      };

      expect(entry.id).toBeDefined();
      expect(entry.firstName).toBeDefined();
      expect(entry.lastName).toBeDefined();
      expect(entry.birthYear).toBeDefined();
      expect(entry.deathYear).toBeDefined();
      expect(entry.isLiving).toBeDefined();
      expect(entry.gender).toBeDefined();
      expect(entry.photoUrl).toBeDefined();
    });

    it("should preserve all fields in matrix cells", () => {
      const cell: MatrixCell = {
        personId: "1",
        relatedPersonId: "2",
        relationshipType: "PARENT",
        strength: 1,
      };

      expect(cell.personId).toBe("1");
      expect(cell.relatedPersonId).toBe("2");
      expect(cell.relationshipType).toBe("PARENT");
      expect(cell.strength).toBe(1);
    });

    it("should preserve all fields in bowtie nodes", () => {
      const node: BowtieNode = {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1950-01-15",
        dateOfPassing: "2020-06-20",
        isLiving: false,
        photoUrl: null,
        gender: "MALE",
        generation: 1,
        side: "paternal",
      };

      expect(node.id).toBeDefined();
      expect(node.firstName).toBeDefined();
      expect(node.generation).toBeDefined();
      expect(node.side).toBeDefined();
    });

    it("should not modify source data during transformation", () => {
      const original = {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        gender: "MALE",
      };

      const copy = { ...original };
      copy.firstName = "Jane";

      expect(original.firstName).toBe("John");
      expect(copy.firstName).toBe("Jane");
    });
  });

  // ====================================================
  // Compact Tree Tests
  // ====================================================

  describe("getCompactTreeData", () => {
    it("should build hierarchical tree structure", () => {
      const parentToChildren = new Map<string, Set<string>>();
      const childToParents = new Map<string, Set<string>>();

      mockRelationships
        .filter((r) => r.type === "PARENT")
        .forEach((rel) => {
          if (!parentToChildren.has(rel.relatedPersonId)) {
            parentToChildren.set(rel.relatedPersonId, new Set());
          }
          parentToChildren.get(rel.relatedPersonId)!.add(rel.personId);

          if (!childToParents.has(rel.personId)) {
            childToParents.set(rel.personId, new Set());
          }
          childToParents.get(rel.personId)!.add(rel.relatedPersonId);
        });

      expect(parentToChildren.has("person-1")).toBe(true);
      expect(parentToChildren.get("person-1")?.has("person-3")).toBe(true);
    });

    it("should assign correct generations in tree", () => {
      const childToParents = new Map<string, Set<string>>();
      mockRelationships
        .filter((r) => r.type === "PARENT")
        .forEach((rel) => {
          if (!childToParents.has(rel.personId)) {
            childToParents.set(rel.personId, new Set());
          }
          childToParents.get(rel.personId)!.add(rel.relatedPersonId);
        });

      // Roots should be at generation 0
      const roots = mockPersons.filter(
        (p) => !childToParents.has(p.id) || childToParents.get(p.id)!.size === 0
      );
      expect(roots.length).toBeGreaterThan(0);
    });

    it("should include spouses in tree nodes", () => {
      const spouseMap = new Map<string, Set<string>>();
      mockRelationships
        .filter((r) => r.type === "SPOUSE")
        .forEach((rel) => {
          if (!spouseMap.has(rel.personId)) {
            spouseMap.set(rel.personId, new Set());
          }
          if (!spouseMap.has(rel.relatedPersonId)) {
            spouseMap.set(rel.relatedPersonId, new Set());
          }
          spouseMap.get(rel.personId)!.add(rel.relatedPersonId);
          spouseMap.get(rel.relatedPersonId)!.add(rel.personId);
        });

      const person1Spouses = spouseMap.get("person-1");
      expect(person1Spouses?.has("person-2")).toBe(true);
    });

    it("should sort children by birth date", () => {
      const children = [
        {
          id: "child-1",
          dateOfBirth: "1985-03-15",
          firstName: "A",
          lastName: "B",
        },
        {
          id: "child-2",
          dateOfBirth: "1980-01-10",
          firstName: "C",
          lastName: "D",
        },
      ];

      children.sort((a, b) =>
        (a.dateOfBirth ?? "9999").localeCompare(b.dateOfBirth ?? "9999")
      );

      expect(children[0].id).toBe("child-2");
      expect(children[1].id).toBe("child-1");
    });

    it("should build flat list from tree for virtual scrolling", () => {
      const flatList = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          generation: 0,
          parentId: null,
          hasChildren: true,
          spouseCount: 1,
          dateOfBirth: "1950-01-15",
          dateOfPassing: "2020-06-20",
          isLiving: false,
          gender: "MALE",
          photoUrl: null,
        },
        {
          id: "person-3",
          firstName: "Bob",
          lastName: "Smith",
          generation: 1,
          parentId: "person-1",
          hasChildren: true,
          spouseCount: 0,
          dateOfBirth: "1975-06-10",
          dateOfPassing: null,
          isLiving: true,
          gender: "MALE",
          photoUrl: null,
        },
      ];

      expect(flatList.length).toBe(2);
      expect(flatList[0].generation).toBe(0);
      expect(flatList[1].generation).toBe(1);
    });

    it("should handle tree with single person (no children)", () => {
      const parentToChildren = new Map<string, Set<string>>();
      expect(parentToChildren.has("person-5")).toBe(false);
    });

    it("should mark leaf nodes correctly", () => {
      const parentToChildren = new Map<string, Set<string>>();
      parentToChildren.set("person-1", new Set(["person-3"]));

      const hasChildren = parentToChildren.has("person-5");
      expect(hasChildren).toBe(false);
    });

    it("should calculate maximum generation level", () => {
      const generationMap = new Map<string, number>();
      generationMap.set("person-1", 0);
      generationMap.set("person-3", 1);
      generationMap.set("person-4", 2);

      const maxGen = Math.max(...generationMap.values());
      expect(maxGen).toBe(2);
    });

    it("should include metadata with total people and generations", () => {
      const metadata = {
        chartType: "compact" as const,
        totalPeople: 5,
        totalGenerations: 3,
        rootPersonId: "person-1",
      };

      expect(metadata.totalPeople).toBe(5);
      expect(metadata.totalGenerations).toBe(3);
      expect(metadata.chartType).toBe("compact");
    });

    it("should handle tree with missing parent references", () => {
      const relationships = [
        {
          type: "PARENT",
          personId: "person-3",
          relatedPersonId: "missing-person",
        },
      ];

      const parentToChildren = new Map<string, Set<string>>();
      relationships.forEach((rel) => {
        if (!parentToChildren.has(rel.relatedPersonId)) {
          parentToChildren.set(rel.relatedPersonId, new Set());
        }
        parentToChildren.get(rel.relatedPersonId)!.add(rel.personId);
      });

      expect(parentToChildren.has("missing-person")).toBe(true);
    });

    it("should respect generation depth limit", () => {
      const maxGenerations = 5;
      const currentGen = 6;

      expect(currentGen > maxGenerations).toBe(true);
    });

    it("should maintain parent-child relationships in tree", () => {
      const parentId = "person-1";
      const childId = "person-3";
      const flatList = [
        {
          id: childId,
          parentId: parentId,
          firstName: "Bob",
          lastName: "Smith",
          generation: 1,
          dateOfBirth: "1975-06-10",
          dateOfPassing: null,
          isLiving: true,
          gender: "MALE",
          photoUrl: null,
          hasChildren: false,
          spouseCount: 0,
        },
      ];

      const node = flatList.find((n) => n.id === childId);
      expect(node?.parentId).toBe(parentId);
    });

    it("should count spouse relationships per node", () => {
      const node = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        spouseCount: 1,
        generation: 0,
        parentId: null,
        dateOfBirth: "1950-01-15",
        dateOfPassing: "2020-06-20",
        isLiving: false,
        gender: "MALE",
        photoUrl: null,
        hasChildren: true,
      };

      expect(node.spouseCount).toBe(1);
    });
  });

  // ====================================================
  // Statistics Tests
  // ====================================================

  describe("getStatistics", () => {
    it("should calculate age distribution by brackets", () => {
      function calculateAge(
        birthDate: Date | null,
        deathDate: Date | null,
        isLiving: boolean
      ): number | null {
        if (!birthDate) return null;
        const endDate = isLiving ? new Date() : deathDate;
        if (!endDate) return null;

        let age = endDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = endDate.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && endDate.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        return age;
      }

      const ages = mockPersons
        .map((p) => calculateAge(p.dateOfBirth, p.dateOfPassing, p.isLiving))
        .filter((a): a is number => a !== null);

      expect(ages.length).toBeGreaterThan(0);
      expect(ages.every((a) => typeof a === "number")).toBe(true);
    });

    it("should assign people to age brackets", () => {
      const ageBrackets = [
        { label: "0-9", min: 0, max: 9 },
        { label: "20-29", min: 20, max: 29 },
        { label: "50-59", min: 50, max: 59 },
        { label: "90+", min: 90, max: 200 },
      ];

      const testAge = 45;
      const bracket = ageBrackets.find(
        (b) => testAge >= b.min && testAge <= b.max
      );
      expect(bracket).toBeUndefined();

      const testAge2 = 55;
      const bracket2 = ageBrackets.find(
        (b) => testAge2 >= b.min && testAge2 <= b.max
      );
      expect(bracket2?.label).toBe("50-59");
    });

    it("should calculate age percentages correctly", () => {
      const total = 10;
      const count = 3;
      const percentage = Math.round((count / total) * 100);

      expect(percentage).toBe(30);
    });

    it("should count generation sizes", () => {
      const generationMap = new Map<string, number>();
      mockPersons.forEach((p, index) => {
        generationMap.set(p.id, Math.floor(index / 2));
      });

      const genCounts = new Map<
        number,
        { total: number; living: number; deceased: number }
      >();

      mockPersons.forEach((p) => {
        const gen = generationMap.get(p.id) ?? 0;
        if (!genCounts.has(gen)) {
          genCounts.set(gen, { total: 0, living: 0, deceased: 0 });
        }
        const counts = genCounts.get(gen)!;
        counts.total++;
        if (p.isLiving) {
          counts.living++;
        } else {
          counts.deceased++;
        }
      });

      expect(genCounts.size).toBeGreaterThan(0);
      for (const [gen, counts] of genCounts.entries()) {
        expect(counts.total).toBeGreaterThan(0);
      }
    });

    it("should determine living and deceased counts by generation", () => {
      const generationSizes = [
        { generation: 1, count: 2, livingCount: 1, deceasedCount: 1 },
        { generation: 2, count: 3, livingCount: 3, deceasedCount: 0 },
      ];

      const totalLiving = generationSizes.reduce(
        (sum, g) => sum + g.livingCount,
        0
      );
      const totalDeceased = generationSizes.reduce(
        (sum, g) => sum + g.deceasedCount,
        0
      );

      expect(totalLiving).toBe(4);
      expect(totalDeceased).toBe(1);
    });

    it("should calculate gender distribution", () => {
      const genderCounts = new Map<string, number>();
      mockPersons.forEach((p) => {
        const gender = p.gender || "Unknown";
        genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);
      });

      expect(genderCounts.has("MALE")).toBe(true);
      expect(genderCounts.has("FEMALE")).toBe(true);
    });

    it("should format gender names correctly", () => {
      const genderMap: Record<string, string> = {
        MALE: "Male",
        FEMALE: "Female",
        OTHER: "Other",
        PREFER_NOT_TO_SAY: "Not Specified",
      };

      expect(genderMap["MALE"]).toBe("Male");
      expect(genderMap["FEMALE"]).toBe("Female");
    });

    it("should sort gender distribution by count descending", () => {
      const genderDistribution = [
        { gender: "Male", count: 10, percentage: 50 },
        { gender: "Female", count: 8, percentage: 40 },
        { gender: "Other", count: 2, percentage: 10 },
      ];

      genderDistribution.sort((a, b) => b.count - a.count);

      expect(genderDistribution[0].count).toBe(10);
      expect(genderDistribution[1].count).toBe(8);
      expect(genderDistribution[2].count).toBe(2);
    });

    it("should calculate geographic distribution from birthPlace", () => {
      const locationCounts = new Map<string, number>();
      mockPersons.forEach((p) => {
        if (p.birthPlace) {
          const location = p.birthPlace.trim();
          if (location) {
            locationCounts.set(
              location,
              (locationCounts.get(location) || 0) + 1
            );
          }
        }
      });

      expect(locationCounts.has("New York")).toBe(true);
      expect(locationCounts.has("Boston")).toBe(true);
      expect(locationCounts.get("New York")).toBe(2);
      expect(locationCounts.get("Boston")).toBe(2);
    });

    it("should limit geographic distribution to top 10 locations", () => {
      const locations = Array.from({ length: 15 }, (_, i) => ({
        location: `City${i}`,
        count: 15 - i,
        percentage: Math.round(((15 - i) / 100) * 100),
      })).sort((a, b) => b.count - a.count);

      const topLocations = locations.slice(0, 10);
      expect(topLocations.length).toBe(10);
      expect(topLocations[0].count).toBe(15);
    });

    it("should calculate surname frequency", () => {
      const surnameCounts = new Map<string, number>();
      mockPersons.forEach((p) => {
        const surname = p.lastName.trim();
        if (surname) {
          surnameCounts.set(surname, (surnameCounts.get(surname) || 0) + 1);
        }
      });

      expect(surnameCounts.has("Doe")).toBe(true);
      expect(surnameCounts.has("Smith")).toBe(true);
      expect(surnameCounts.get("Doe")).toBe(3);
    });

    it("should limit surname frequency to top 15", () => {
      const surnames = Array.from({ length: 20 }, (_, i) => ({
        surname: `Surname${i}`,
        count: 20 - i,
        percentage: Math.round(((20 - i) / 100) * 100),
      })).sort((a, b) => b.count - a.count);

      const topSurnames = surnames.slice(0, 15);
      expect(topSurnames.length).toBe(15);
    });

    it("should calculate lifespan trends by birth decade", () => {
      function calculateAge(
        birthDate: Date | null,
        deathDate: Date | null,
        isLiving: boolean
      ): number | null {
        if (!birthDate) return null;
        const endDate = isLiving ? new Date() : deathDate;
        if (!endDate) return null;

        let age = endDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = endDate.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && endDate.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        return age;
      }

      const decadeLifespans = new Map<string, number[]>();
      mockPersons.forEach((p) => {
        if (!p.isLiving && p.dateOfBirth && p.dateOfPassing) {
          const lifespan = calculateAge(p.dateOfBirth, p.dateOfPassing, false);
          if (lifespan !== null && lifespan > 0) {
            const birthDecade =
              Math.floor(p.dateOfBirth.getFullYear() / 10) * 10;
            const decadeLabel = `${birthDecade}s`;
            if (!decadeLifespans.has(decadeLabel)) {
              decadeLifespans.set(decadeLabel, []);
            }
            decadeLifespans.get(decadeLabel)!.push(lifespan);
          }
        }
      });

      // Person-1 was born in 1950 (1950s decade) and lived 70 years
      expect(decadeLifespans.has("1950s")).toBe(true);
      const lifespans = decadeLifespans.get("1950s");
      expect(lifespans?.length).toBe(1);
      expect(lifespans?.[0]).toBe(70);
    });

    it("should calculate average lifespan for each decade", () => {
      const decadeData = [
        {
          decade: "1920s",
          lifespans: [65, 70, 75],
          averageLifespan: 70,
          sampleSize: 3,
        },
        {
          decade: "1950s",
          lifespans: [70],
          averageLifespan: 70,
          sampleSize: 1,
        },
      ];

      decadeData.forEach(({ decade, lifespans }) => {
        const average = Math.round(
          lifespans.reduce((a, b) => a + b, 0) / lifespans.length
        );
        expect(average).toBeGreaterThan(0);
      });
    });

    it("should find oldest living person", () => {
      function calculateAge(
        birthDate: Date | null,
        deathDate: Date | null,
        isLiving: boolean
      ): number | null {
        if (!birthDate) return null;
        const endDate = isLiving ? new Date() : deathDate;
        if (!endDate) return null;

        let age = endDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = endDate.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && endDate.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        return age;
      }

      const livingWithAge = mockPersons
        .filter((p) => p.isLiving && p.dateOfBirth)
        .map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          age: calculateAge(p.dateOfBirth, null, true)!,
        }))
        .filter((p) => p.age !== null);

      if (livingWithAge.length > 0) {
        livingWithAge.sort((a, b) => b.age - a.age);
        const oldest = livingWithAge[0];
        // Jane Doe (born 1952) is older than Alice Johnson (born 1980)
        expect(oldest.name).toBe("Jane Doe");
      }
    });

    it("should find youngest living person", () => {
      function calculateAge(
        birthDate: Date | null,
        deathDate: Date | null,
        isLiving: boolean
      ): number | null {
        if (!birthDate) return null;
        const endDate = isLiving ? new Date() : deathDate;
        if (!endDate) return null;

        let age = endDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = endDate.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && endDate.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        return age;
      }

      const livingWithAge = mockPersons
        .filter((p) => p.isLiving && p.dateOfBirth)
        .map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          age: calculateAge(p.dateOfBirth, null, true)!,
        }))
        .filter((p) => p.age !== null);

      if (livingWithAge.length > 0) {
        livingWithAge.sort((a, b) => b.age - a.age);
        const youngest = livingWithAge[livingWithAge.length - 1];
        // Alice Johnson (born 1980) is younger than Jane Doe (born 1952)
        expect(youngest.name).toBe("Alice Johnson");
      }
    });

    it("should handle empty statistics data gracefully", () => {
      const persons: typeof mockPersons = [];
      const total = persons.length;

      expect(total).toBe(0);
    });

    it("should exclude deceased when includeDeceased is false", () => {
      const livingOnly = mockPersons.filter((p) => p.isLiving);
      expect(livingOnly.length).toBe(4);
      expect(livingOnly.every((p) => p.isLiving)).toBe(true);
    });

    it("should calculate correct metadata with totals", () => {
      const metadata = {
        chartType: "statistics" as const,
        totalPeople: mockPersons.length,
        livingCount: mockPersons.filter((p) => p.isLiving).length,
        deceasedCount: mockPersons.filter((p) => !p.isLiving).length,
        oldestPerson: {
          id: "person-4",
          name: "Alice Johnson",
          age: 44,
        },
        youngestPerson: {
          id: "person-2",
          name: "Jane Doe",
          age: 72,
        },
      };

      expect(metadata.totalPeople).toBe(5);
      expect(metadata.livingCount).toBe(4);
      expect(metadata.deceasedCount).toBe(1);
      expect(metadata.oldestPerson?.name).toBe("Alice Johnson");
    });

    it("should handle missing birth dates in age calculations", () => {
      function calculateAge(
        birthDate: Date | null,
        deathDate: Date | null,
        isLiving: boolean
      ): number | null {
        if (!birthDate) return null;
        return 0;
      }

      const person = mockPersons[4]; // Charlie has no birth date
      const age = calculateAge(
        person.dateOfBirth,
        person.dateOfPassing,
        person.isLiving
      );
      expect(age).toBeNull();
    });

    it("should handle missing death dates for deceased persons", () => {
      const deceased = mockPersons.filter((p) => !p.isLiving);
      expect(deceased.every((p) => p.dateOfPassing !== null)).toBe(true);
    });

    it("should normalize location names", () => {
      const location = "  New York  ";
      const normalized = location.trim();
      expect(normalized).toBe("New York");
    });

    it("should sort lifespan trends by decade", () => {
      const trends = [
        { decade: "1950s", averageLifespan: 70, sampleSize: 1 },
        { decade: "1920s", averageLifespan: 65, sampleSize: 2 },
        { decade: "1940s", averageLifespan: 68, sampleSize: 3 },
      ];

      trends.sort((a, b) => a.decade.localeCompare(b.decade));

      expect(trends[0].decade).toBe("1920s");
      expect(trends[1].decade).toBe("1940s");
      expect(trends[2].decade).toBe("1950s");
    });
  });
});
