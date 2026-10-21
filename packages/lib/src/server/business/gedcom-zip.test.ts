/**
 * exportGedcomDataZip with the real archiver: guards the regression where the
 * "end" listener was attached after finalize() and the export never resolved.
 */

import { drizzleDb } from "@vamsa/api";
import { beforeEach, describe, expect, it } from "vitest";
import { exportGedcomDataZip, validateGedcomImport } from "./gedcom";

// @vamsa/api is mocked by the setup file; drizzleDb is its configurable mock
const mockDb = drizzleDb as unknown as {
  resetQueryMocks: () => void;
  setFindManyResults: (r: Array<unknown>) => void;
  setFindFirstResult: (r: unknown) => void;
};

const noFiles = {
  existsSync: () => false,
  basename: (p: string) => p.split("/").pop() ?? p,
};

describe("exportGedcomDataZip", () => {
  beforeEach(() => {
    mockDb.resetQueryMocks();
    mockDb.setFindManyResults([]);
    mockDb.setFindFirstResult({ id: "u1", name: "Admin" });
  });

  it("resolves with a zip containing the GEDCOM and manifest", async () => {
    const result = await exportGedcomDataZip("u1", false, noFiles, drizzleDb);
    expect(result.success).toBe(true);
    const zip = Buffer.from(result.zipBase64 ?? "", "base64");
    expect(zip.subarray(0, 2).toString("latin1")).toBe("PK");
    expect(zip.toString("latin1")).toContain("manifest.json");
  }, 5000);
});

describe("GEDCOM file extension", () => {
  it("accepts .GED in any case", async () => {
    const res = await validateGedcomImport("TREE.GED", "0 HEAD\n0 TRLR\n");
    expect(res.message).not.toBe("File must be .ged format");
  });

  it("still rejects other extensions", async () => {
    const res = await validateGedcomImport("tree.txt", "0 HEAD\n");
    expect(res.valid).toBe(false);
  });
});
