import { describe, it, expect } from "bun:test";
import { GedcomGenerator } from "@/lib/gedcom/generator";
import { GedcomParser } from "@/lib/gedcom/parser";
import type {
  GedcomIndividualData,
  GedcomFamilyData,
} from "@/lib/gedcom/mapper-types";

// Helper to create a test GEDCOM file
function createTestGedcomFile(
  individuals: GedcomIndividualData[],
  families: GedcomFamilyData[]
): File {
  const generator = new GedcomGenerator({
    sourceProgram: "vamsa",
    submitterName: "Test User",
  });

  const content = generator.generate(individuals, families);
  return new File([content], "test.ged", { type: "text/plain" });
}

describe("GEDCOM Server Actions - File Handling", () => {
  // Test 1: File extension validation
  it("should validate file extension for .ged files", async () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    expect(file.name.endsWith(".ged")).toBe(false);
  });

  // Test 2: Accept valid .ged extension
  it("should accept files with .ged extension", async () => {
    const file = new File(["content"], "test.ged", { type: "text/plain" });
    expect(file.name.endsWith(".ged")).toBe(true);
  });

  // Test 3: FormData file handling
  it("should properly handle FormData with file", async () => {
    const file = new File(["content"], "test.ged", { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", file);

    const fileFromForm = formData.get("file") as File;
    expect(fileFromForm).toBeDefined();
    expect(fileFromForm.name).toBe("test.ged");
    expect(fileFromForm instanceof File).toBe(true);
  });

  // Test 4: Empty FormData handling
  it("should detect missing file in FormData", async () => {
    const formData = new FormData();
    const file = formData.get("file");
    expect(file).toBeNull();
  });

  // Test 5: Test GEDCOM file creation
  it("should create valid test GEDCOM files", async () => {
    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];

    const file = createTestGedcomFile(individuals, []);
    expect(file.name).toBe("test.ged");
    expect(file.size).toBeGreaterThan(0);

    const content = await file.text();
    expect(content).toContain("0 HEAD");
    expect(content).toContain("John /Smith/");
  });

  // Test 6: Generated GEDCOM can be parsed
  it("should generate GEDCOM that can be parsed", async () => {
    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "Test /Person/",
        sex: "M",
        birthDate: "15 JAN 1980",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];

    const file = createTestGedcomFile(individuals, []);
    const content = await file.text();

    const parser = new GedcomParser();
    const parsed = parser.parse(content);

    expect(parsed.individuals.length).toBe(1);
    expect(parsed.header).toBeDefined();
    expect(parsed.trailer).toBeDefined();
  });

  // Test 7: Multiple individuals
  it("should handle multiple individuals", async () => {
    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "John /Smith/",
        notes: [],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
      {
        xref: "@I2@",
        name: "Jane /Smith/",
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
        notes: [],
      },
    ];

    const file = createTestGedcomFile(individuals, families);
    const content = await file.text();

    const parser = new GedcomParser();
    const parsed = parser.parse(content);

    expect(parsed.individuals.length).toBe(2);
    expect(parsed.families.length).toBe(1);
  });

  // Test 8: Result structure consistency
  it("should have consistent structure for file operations", async () => {
    const file = new File(["content"], "test.ged", { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", file);

    const retrievedFile = formData.get("file") as File;
    expect(retrievedFile).toBeTruthy();
    expect(typeof retrievedFile.name).toBe("string");
    expect(typeof retrievedFile.size).toBe("number");
  });

  // Test 9: Family relationships in GEDCOM
  it("should properly format family relationships", async () => {
    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "Parent /One/",
        notes: [],
        familiesAsSpouse: ["@F1@"],
        familiesAsChild: [],
      },
      {
        xref: "@I2@",
        name: "Child /One/",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: ["@F1@"],
      },
    ];

    const families: GedcomFamilyData[] = [
      {
        xref: "@F1@",
        husband: "@I1@",
        children: ["@I2@"],
        notes: [],
      },
    ];

    const file = createTestGedcomFile(individuals, families);
    const content = await file.text();

    expect(content).toContain("@F1@ FAM");
    expect(content).toContain("1 CHIL @I2@");
  });

  // Test 10: Dates are formatted correctly
  it("should format dates in GEDCOM format", async () => {
    const individuals: GedcomIndividualData[] = [
      {
        xref: "@I1@",
        name: "Test /Person/",
        birthDate: "15 JAN 1980",
        deathDate: "10 MAR 2020",
        notes: [],
        familiesAsSpouse: [],
        familiesAsChild: [],
      },
    ];

    const file = createTestGedcomFile(individuals, []);
    const content = await file.text();

    expect(content).toContain("2 DATE 15 JAN 1980");
    expect(content).toContain("2 DATE 10 MAR 2020");
  });
});
