# Testing Recipes

Domain-specific testing patterns and fixtures for Vamsa. Use these as templates when writing tests.

---

## React Component Testing

### Package Capabilities

| Package | Test Utilities |
|---------|---------------|
| `@vamsa/ui` | `@testing-library/react`, `jsdom` |
| `@vamsa/lib` | Bun test only (no DOM) |
| `apps/web` | Bun test + Playwright E2E |

### Pattern: Component with Mock Data

```typescript
describe("ProfileCard", () => {
  const mockPerson = {
    id: "person-1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    dateOfBirth: new Date("1990-01-15"),
  };

  it("creates element with required props", () => {
    const element = <ProfileCard person={mockPerson} onClaim={() => {}} />;
    expect(element.type).toBe(ProfileCard);
  });

  it("handles person with null fields", () => {
    const personNoEmail = { ...mockPerson, email: null };
    const element = <ProfileCard person={personNoEmail} onClaim={() => {}} />;
    expect(element).toBeDefined();
  });
});
```

### Pattern: Full DOM Rendering

```typescript
import { render } from "@testing-library/react";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  describe("rendering", () => {
    test("renders button with text", () => {
      const { getByRole, getByText } = render(<Button>Click me</Button>);
      expect(getByRole("button")).toBeDefined();
      expect(getByText("Click me")).toBeDefined();
    });

    test("renders with custom className", () => {
      const { getByRole } = render(
        <Button className="custom-class">Button</Button>
      );
      const button = getByRole("button");
      expect(button.className).toContain("custom-class");
    });
  });

  describe("variants", () => {
    test("applies variant styling", () => {
      const { getByRole, rerender } = render(<Button>Default</Button>);
      const defaultButton = getByRole("button");

      rerender(<Button variant="destructive">Delete</Button>);
      const destructiveButton = getByRole("button");
      expect(destructiveButton.className).toContain("bg-destructive");
    });
  });

  describe("HTML attributes", () => {
    test("passes through disabled attribute", () => {
      const { getByRole } = render(<Button disabled>Disabled</Button>);
      const button = getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });
  });
});
```

---

## GEDCOM Testing

### Inline GEDCOM Fixtures

```typescript
// Minimal valid GEDCOM
const MINIMAL_GEDCOM = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 TRLR`;

// Single person
const SIMPLE_PERSON_GEDCOM = `0 HEAD
1 SOUR Test
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

// Couple with marriage
const COUPLE_GEDCOM = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 15 JAN 1985
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
2 PLAC New York, USA
0 TRLR`;

// Family with children
const FAMILY_GEDCOM = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
0 @I2@ INDI
1 NAME Jane /Smith/
1 SEX F
0 @I3@ INDI
1 NAME Baby /Doe/
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`;

// Multi-generation family
const MULTI_GENERATION_GEDCOM = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Grandpa /Elder/
1 SEX M
0 @I2@ INDI
1 NAME Grandma /Elder/
1 SEX F
0 @I3@ INDI
1 NAME Father /Elder/
1 SEX M
1 FAMC @F1@
0 @I4@ INDI
1 NAME Mother /Smith/
1 SEX F
0 @I5@ INDI
1 NAME Child /Elder/
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 CHIL @I5@
0 TRLR`;
```

### Pattern: GEDCOM Parsing Tests

```typescript
describe("GedcomParser", () => {
  describe("parse", () => {
    test("parses minimal valid GEDCOM", () => {
      const parser = new GedcomParser();
      const result = parser.parse(MINIMAL_GEDCOM);

      expect(result.header).toBeDefined();
      expect(result.trailer).toBeDefined();
      expect(result.version).toBe("5.5.1");
      expect(result.charset).toBe("UTF-8");
    });

    test("throws for missing HEAD", () => {
      const parser = new GedcomParser();
      expect(() => parser.parse(`0 TRLR`)).toThrow("Missing required HEAD");
    });

    test("throws for missing TRLR", () => {
      const content = `0 HEAD
1 GEDC
2 VERS 5.5.1`;
      const parser = new GedcomParser();
      expect(() => parser.parse(content)).toThrow("Missing required TRLR");
    });
  });

  describe("parseDate", () => {
    const parser = new GedcomParser();

    test("parses full date (DD MMM YYYY)", () => {
      expect(parser.parseDate("15 JAN 1985")).toBe("1985-01-15");
      expect(parser.parseDate("1 DEC 2000")).toBe("2000-12-01");
    });

    test("parses month-year (MMM YYYY)", () => {
      expect(parser.parseDate("JAN 1985")).toBe("1985-01");
    });

    test("parses year only (YYYY)", () => {
      expect(parser.parseDate("1985")).toBe("1985");
    });

    test("handles approximate dates (ABT)", () => {
      expect(parser.parseDate("ABT 1985")).toBe("1985");
      expect(parser.parseDate("ABT 15 JAN 1985")).toBe("1985-01-15");
    });

    test("returns null for invalid date", () => {
      expect(parser.parseDate("")).toBeNull();
      expect(parser.parseDate("invalid")).toBeNull();
    });
  });
});
```

### Pattern: GEDCOM Mapping Tests

```typescript
describe("GedcomMapper", () => {
  describe("mapFromGedcom", () => {
    test("maps individuals correctly", () => {
      const parser = new GedcomParser();
      const file = parser.parse(SIMPLE_PERSON_GEDCOM);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      expect(result.people.length).toBe(1);
      const person = result.people[0];
      expect(person.firstName).toBe("John");
      expect(person.lastName).toBe("Doe");
      expect(person.gender).toBe("MALE");
      expect(person.birthPlace).toBe("New York, USA");
    });

    test("maps spouse relationships", () => {
      const parser = new GedcomParser();
      const file = parser.parse(COUPLE_GEDCOM);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      const spouseRels = result.relationships.filter((r) => r.type === "SPOUSE");
      expect(spouseRels.length).toBe(2); // Bidirectional
    });

    test("maps parent-child relationships", () => {
      const parser = new GedcomParser();
      const file = parser.parse(FAMILY_GEDCOM);
      const mapper = new GedcomMapper();
      const result = mapper.mapFromGedcom(file);

      const parentRels = result.relationships.filter((r) => r.type === "PARENT");
      expect(parentRels.length).toBe(2);
    });
  });

  describe("round-trip mapping", () => {
    test("preserves essential data through round-trip", () => {
      const parser = new GedcomParser();
      const mapper = new GedcomMapper();

      // Parse GEDCOM -> Vamsa format
      const file = parser.parse(COUPLE_GEDCOM);
      const vamsaData = mapper.mapFromGedcom(file);

      // Map back to GEDCOM format
      const gedcomData = mapper.mapToGedcom(
        vamsaData.people,
        vamsaData.relationships
      );

      // Verify data preserved
      const john = gedcomData.individuals.find((i) => i.name.includes("John"));
      expect(john).toBeDefined();
      expect(john?.sex).toBe("M");
      expect(gedcomData.families.length).toBe(1);
    });
  });
});
```

### Pattern: GEDCOM Helper Function Tests

```typescript
import {
  parseGedcomFile,
  validateGedcomStructure,
  formatGedcomFileName,
  calculateGedcomStatistics,
} from "./gedcom";

describe("GEDCOM Helper Functions", () => {
  describe("parseGedcomFile", () => {
    it("parses minimal valid GEDCOM", () => {
      const result = parseGedcomFile(MINIMAL_GEDCOM);
      expect(result.header).toBeDefined();
      expect(result.trailer).toBeDefined();
    });
  });

  describe("validateGedcomStructure", () => {
    it("validates correct GEDCOM", () => {
      const gedcomFile = parseGedcomFile(MINIMAL_GEDCOM);
      const result = validateGedcomStructure(gedcomFile);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe("formatGedcomFileName", () => {
    it("formats file name with date", () => {
      const fileName = formatGedcomFileName();
      expect(fileName).toMatch(/^family-tree-\d{4}-\d{2}-\d{2}\.ged$/);
    });
  });

  describe("calculateGedcomStatistics", () => {
    it("calculates correct statistics", () => {
      const gedcomFile = parseGedcomFile(FAMILY_GEDCOM);
      const mapped = mapGedcomToEntities(gedcomFile);
      const stats = calculateGedcomStatistics(mapped);

      expect(stats.peopleCount).toBe(3);
      expect(stats.spousalRelationships).toBeGreaterThan(0);
    });
  });
});
```

---

## Charts Testing

### Chart Node Helpers

```typescript
import type { ChartNode, ChartEdge } from "~/server/charts";

function createMockPerson(overrides: Partial<ChartNode> = {}): ChartNode {
  return {
    id: "person-1",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1980-01-15",
    dateOfPassing: null,
    isLiving: true,
    photoUrl: null,
    gender: "M",
    generation: 0,
    ...overrides,
  };
}

function createMockRelationship(
  type: string,
  personId: string,
  relatedPersonId: string
) {
  return { type, personId, relatedPersonId };
}

function createCollectionState() {
  return {
    nodeIds: new Set<string>(),
    edges: new Map<string, { source: string; target: string; type: string }>(),
    generations: new Map<string, number>(),
  };
}
```

### Family Tree Fixtures

```typescript
/**
 * Three-generation family structure:
 *   GP1 -- GP2
 *      |
 *   P1 -- P2
 *      |
 *   C1   C2
 */
function createThreeGenerationFamily() {
  const people = new Map([
    ["gp1", { id: "gp1", firstName: "Grandpa", lastName: "Elder", gender: "MALE", generation: 2, dateOfBirth: new Date("1940-01-01"), dateOfPassing: null, isLiving: false, photoUrl: null }],
    ["gp2", { id: "gp2", firstName: "Grandma", lastName: "Elder", gender: "FEMALE", generation: 2, dateOfBirth: new Date("1942-01-01"), dateOfPassing: null, isLiving: false, photoUrl: null }],
    ["p1", { id: "p1", firstName: "Dad", lastName: "Elder", gender: "MALE", generation: 1, dateOfBirth: new Date("1965-01-01"), dateOfPassing: null, isLiving: true, photoUrl: null }],
    ["p2", { id: "p2", firstName: "Mom", lastName: "Smith", gender: "FEMALE", generation: 1, dateOfBirth: new Date("1967-01-01"), dateOfPassing: null, isLiving: true, photoUrl: null }],
    ["c1", { id: "c1", firstName: "Son", lastName: "Elder", gender: "MALE", generation: 0, dateOfBirth: new Date("1990-01-01"), dateOfPassing: null, isLiving: true, photoUrl: null }],
    ["c2", { id: "c2", firstName: "Daughter", lastName: "Elder", gender: "FEMALE", generation: 0, dateOfBirth: new Date("1992-01-01"), dateOfPassing: null, isLiving: true, photoUrl: null }],
  ]);

  const relationships = [
    // Spouse relationships
    { type: "SPOUSE", personId: "gp1", relatedPersonId: "gp2" },
    { type: "SPOUSE", personId: "gp2", relatedPersonId: "gp1" },
    { type: "SPOUSE", personId: "p1", relatedPersonId: "p2" },
    { type: "SPOUSE", personId: "p2", relatedPersonId: "p1" },
    // Parent relationships (child has parents)
    { type: "PARENT", personId: "p1", relatedPersonId: "gp1" },
    { type: "PARENT", personId: "p1", relatedPersonId: "gp2" },
    { type: "PARENT", personId: "c1", relatedPersonId: "p1" },
    { type: "PARENT", personId: "c1", relatedPersonId: "p2" },
    { type: "PARENT", personId: "c2", relatedPersonId: "p1" },
    { type: "PARENT", personId: "c2", relatedPersonId: "p2" },
  ];

  return { people, relationships };
}

/**
 * Creates a deep ancestry chain (5+ generations)
 */
function createDeepAncestry(depth: number = 5) {
  const people = new Map();
  const relationships = [];

  let currentId = "root";
  people.set(currentId, {
    id: currentId,
    firstName: "Root",
    lastName: "Person",
    gender: null,
    generation: 0,
    dateOfBirth: new Date("2000-01-01"),
    dateOfPassing: null,
    isLiving: true,
    photoUrl: null,
  });

  for (let gen = 1; gen <= depth; gen++) {
    const parentId = `ancestor-${gen}`;
    people.set(parentId, {
      id: parentId,
      firstName: `Ancestor`,
      lastName: `Gen${gen}`,
      gender: gen % 2 === 0 ? "MALE" : "FEMALE",
      generation: gen,
      dateOfBirth: new Date(`${2000 - gen * 25}-01-01`),
      dateOfPassing: null,
      isLiving: gen < 3,
      photoUrl: null,
    });

    relationships.push({
      type: "PARENT",
      personId: currentId,
      relatedPersonId: parentId,
    });

    currentId = parentId;
  }

  return { people, relationships, rootId: "root" };
}
```

### Pattern: Pure Function Tests

```typescript
describe("Chart Helper Functions", () => {
  describe("buildRelationshipMaps", () => {
    it("builds empty maps from empty array", () => {
      const result = buildRelationshipMaps([]);
      expect(result.childToParents.size).toBe(0);
      expect(result.parentToChildren.size).toBe(0);
      expect(result.spouseMap.size).toBe(0);
    });

    it("builds childToParents map", () => {
      const relationships = [
        createMockRelationship("PARENT", "child1", "parent1"),
        createMockRelationship("PARENT", "child1", "parent2"),
      ];

      const result = buildRelationshipMaps(relationships);
      expect(result.childToParents.get("child1")).toEqual(
        new Set(["parent1", "parent2"])
      );
    });

    it("builds bidirectional spouseMap", () => {
      const relationships = [
        createMockRelationship("SPOUSE", "person1", "person2"),
      ];

      const result = buildRelationshipMaps(relationships);
      expect(result.spouseMap.get("person1")).toEqual(new Set(["person2"]));
      expect(result.spouseMap.get("person2")).toEqual(new Set(["person1"]));
    });
  });

  describe("groupByGeneration", () => {
    it("returns empty map for empty array", () => {
      const result = groupByGeneration([]);
      expect(result.size).toBe(0);
    });

    it("groups nodes by generation number", () => {
      const nodes = [
        createMockPerson({ id: "1", generation: 0 }),
        createMockPerson({ id: "2", generation: 0 }),
        createMockPerson({ id: "3", generation: 1 }),
      ];

      const result = groupByGeneration(nodes);
      expect(result.size).toBe(2);
      expect(result.get(0)?.length).toBe(2);
      expect(result.get(1)?.length).toBe(1);
    });

    it("handles negative generations", () => {
      const nodes = [
        createMockPerson({ id: "1", generation: -1 }),
        createMockPerson({ id: "2", generation: 0 }),
      ];

      const result = groupByGeneration(nodes);
      expect(result.has(-1)).toBe(true);
    });
  });
});
```

### Pattern: Ancestor Collection Tests

```typescript
describe("collectAncestors", () => {
  it("adds root person to collection", () => {
    const personMap = new Map([
      ["person1", createMockPerson({ id: "person1", firstName: "John" })],
    ]);
    const collected = createCollectionState();

    collectAncestors(
      "person1", 0, 3,
      new Map(), personMap, new Map(),
      collected
    );

    expect(collected.nodeIds.has("person1")).toBe(true);
    expect(collected.generations.get("person1")).toBe(0);
  });

  it("collects ancestors up to generation limit", () => {
    const personMap = new Map([
      ["child", createMockPerson({ id: "child", firstName: "Child" })],
      ["parent", createMockPerson({ id: "parent", firstName: "Parent" })],
      ["grandparent", createMockPerson({ id: "grandparent", firstName: "Grandparent" })],
    ]);

    const childToParents = new Map([
      ["child", new Set(["parent"])],
      ["parent", new Set(["grandparent"])],
    ]);

    const collected = createCollectionState();

    collectAncestors(
      "child", 0, 2,
      childToParents, personMap, new Map(),
      collected
    );

    expect(collected.nodeIds.size).toBe(3);
    expect(collected.generations.get("child")).toBe(0);
    expect(collected.generations.get("parent")).toBe(1);
    expect(collected.generations.get("grandparent")).toBe(2);
  });

  it("stops at generation limit", () => {
    const personMap = new Map([
      ["child", createMockPerson({ id: "child" })],
      ["parent", createMockPerson({ id: "parent" })],
      ["grandparent", createMockPerson({ id: "grandparent" })],
      ["greatgrand", createMockPerson({ id: "greatgrand" })],
    ]);

    const childToParents = new Map([
      ["child", new Set(["parent"])],
      ["parent", new Set(["grandparent"])],
      ["grandparent", new Set(["greatgrand"])],
    ]);

    const collected = createCollectionState();

    collectAncestors(
      "child", 0, 1,  // Only 1 generation
      childToParents, personMap, new Map(),
      collected
    );

    expect(collected.nodeIds.size).toBe(2);  // child + parent only
    expect(collected.nodeIds.has("grandparent")).toBe(false);
  });

  it("includes spouses at each generation", () => {
    const personMap = new Map([
      ["child", createMockPerson({ id: "child" })],
      ["father", createMockPerson({ id: "father", gender: "MALE" })],
      ["mother", createMockPerson({ id: "mother", gender: "FEMALE" })],
    ]);

    const childToParents = new Map([
      ["child", new Set(["father"])],
    ]);

    const spouseMap = new Map([
      ["father", new Set(["mother"])],
      ["mother", new Set(["father"])],
    ]);

    const collected = createCollectionState();

    collectAncestors(
      "child", 0, 2,
      childToParents, personMap, spouseMap,
      collected
    );

    expect(collected.nodeIds.has("mother")).toBe(true);
  });
});
```

### Pattern: D3 Utility Tests

```typescript
describe("D3 Utilities", () => {
  describe("Type Interfaces", () => {
    it("creates Position interface", () => {
      const position: Position = { x: 100, y: 50 };
      expect(position.x).toBe(100);
      expect(position.y).toBe(50);
    });

    it("creates Margin interface", () => {
      const margin: Margin = { top: 20, right: 20, bottom: 20, left: 20 };
      expect(margin.top + margin.right + margin.bottom + margin.left).toBe(80);
    });
  });

  describe("Calculation Tests", () => {
    it("calculates scale factor correctly", () => {
      const containerWidth = 800;
      const containerHeight = 600;
      const contentWidth = 400;
      const contentHeight = 300;
      const margin: Margin = { top: 20, right: 20, bottom: 20, left: 20 };

      const scaleX = containerWidth / (contentWidth + margin.left + margin.right);
      const scaleY = containerHeight / (contentHeight + margin.top + margin.bottom);
      const scale = Math.min(scaleX, scaleY, 1);

      expect(scale).toBeGreaterThan(0);
      expect(scale).toBeLessThanOrEqual(1);
    });

    it("calculates node center coordinates", () => {
      const width = 200;
      const height = 100;
      const centerX = width / 2;
      const centerY = height / 2;

      expect(centerX).toBe(100);
      expect(centerY).toBe(50);
    });
  });
});
```

---

## Coverage Targets by Module

| Module | Target | Notes |
|--------|--------|-------|
| GEDCOM helpers | 90%+ | Pure functions, high coverage expected |
| GEDCOM business | 70%+ | Some DB paths tested via E2E |
| Chart helpers | 90%+ | Pure functions |
| Chart business | Export only | Tested via E2E |
| UI components | 80%+ | Focus on user-facing behavior |
| D3 utilities | 70%+ | Calculations testable, DOM via E2E |
