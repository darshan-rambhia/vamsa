import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decode } from "@toon-format/toon";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveConfig } from "../lib/config";
import { parseCsv } from "../lib/csv";
import { json, runCli, tempHome } from "../test-helpers";
import { loadRows, normalize } from "./bulk";
import type { FetchMock } from "../test-helpers";

let home: string;

beforeEach(() => {
  home = tempHome();
  saveConfig(
    {
      current: "default",
      profiles: {
        default: { url: "https://v.test", token: "t", tokenType: "session" },
      },
    },
    { HOME: home }
  );
});

function api(
  handler: (url: URL, init: RequestInit) => Response | Promise<Response>
): FetchMock {
  return vi.fn(async (input: string, init?: RequestInit) =>
    handler(new URL(input), init ?? {})
  );
}

function file(name: string, content: string): string {
  const p = join(home, name);
  writeFileSync(p, content);
  return p;
}

describe("csv", () => {
  it("handles quotes, embedded commas/newlines, CRLF and BOM", () => {
    const rows = parseCsv(
      '﻿firstName,lastName,bio\r\nAsha,Rao,"Teacher, poet"\r\n"Ravi","O""Neil","line1\nline2"\r\n\r\n'
    );
    expect(rows).toEqual([
      { firstName: "Asha", lastName: "Rao", bio: "Teacher, poet" },
      { firstName: "Ravi", lastName: 'O"Neil', bio: "line1\nline2" },
    ]);
  });

  it("loadRows accepts arrays and {items}", () => {
    expect(loadRows("a.json", '[{"a":1}]')).toEqual([{ a: 1 }]);
    expect(loadRows("a.json", '{"items":[{"a":2}]}')).toEqual([{ a: 2 }]);
    expect(() => loadRows("a.json", '{"x":1}')).toThrow(/JSON array/);
  });

  it("normalize drops blanks, coerces booleans and enum case", () => {
    expect(
      normalize({ firstName: "A", bio: "", isLiving: "false", gender: "male" })
    ).toEqual({ firstName: "A", isLiving: false, gender: "MALE" });
  });
});

describe("gedcom", () => {
  it("import --dry-run only validates", async () => {
    const ged = file("tree.ged", "0 HEAD\n0 TRLR\n");
    const fetch = api(() =>
      json({
        valid: true,
        message: "ok",
        preview: { peopleCount: 3, familiesCount: 1, errors: [] },
      })
    );
    const r = await runCli(["gedcom", "import", ged, "--dry-run"], {
      home,
      fetch,
    });
    expect(r.code).toBe(0);
    expect(String(fetch.mock.calls[0][0])).toContain("/gedcom/validate");
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      fileName: "tree.ged",
      content: "0 HEAD\n0 TRLR\n",
    });
    expect(decode(r.stdout)).toMatchObject({
      dryRun: { valid: true, wouldImport: { people: 3, families: 1 } },
    });
  });

  it("rejected import is a structured error with exit 1 and the errors", async () => {
    const ged = file("bad.ged", "junk");
    const fetch = api(() =>
      json({
        success: false,
        message: "Invalid GEDCOM",
        errors: [{ type: "parse", message: "no HEAD" }],
      })
    );
    const r = await runCli(["gedcom", "import", ged], { home, fetch });
    expect(r.code).toBe(1);
    expect(decode(r.stdout)).toMatchObject({
      error: {
        code: "import_failed",
        message: "Invalid GEDCOM",
        errors: [{ type: "parse", message: "no HEAD" }],
        errorCount: 1,
      },
    });
  });

  it("non-.ged and missing files are rejected before any request", async () => {
    const fetch = api(() => json({}));
    const txt = file("a.txt", "x");
    expect(
      (await runCli(["gedcom", "import", txt], { home, fetch })).code
    ).toBe(2);
    const missing = await runCli(["gedcom", "import", "nope.ged"], {
      home,
      fetch,
    });
    expect(missing.code).toBe(1);
    expect(missing.stdout).toContain("file_not_found");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("export writes the server file name, refuses to overwrite without --force", async () => {
    const fetch = api(
      () =>
        new Response("0 HEAD\n", {
          headers: {
            "Content-Type": "text/plain",
            "Content-Disposition":
              'attachment; filename="vamsa-2026-01-01.ged"',
          },
        })
    );
    const first = await runCli(["gedcom", "export"], { home, fetch });
    expect(first.code).toBe(0);
    expect(readFileSync(join(home, "vamsa-2026-01-01.ged"), "utf8")).toBe(
      "0 HEAD\n"
    );
    const again = await runCli(["gedcom", "export"], { home, fetch });
    expect(again.code).toBe(1);
    expect(again.stdout).toContain("file_exists");
    expect(
      (await runCli(["gedcom", "export", "--force"], { home, fetch })).code
    ).toBe(0);
  });

  it("export -o - streams bytes to stdout; --zip hits the zip route", async () => {
    const fetch = api(
      () =>
        new Response(new Uint8Array([0x50, 0x4b]), {
          headers: { "Content-Type": "application/zip" },
        })
    );
    const r = await runCli(
      ["gedcom", "export", "--zip", "--no-media", "-o", "-"],
      {
        home,
        fetch,
      }
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("PK");
    expect(String(fetch.mock.calls[0][0])).toBe(
      "https://v.test/api/v1/gedcom/export.zip?media=false"
    );
  });
});

describe("bulk add", () => {
  const existing = {
    items: [
      {
        id: "p0",
        firstName: "Asha",
        lastName: "Rao",
        dateOfBirth: "1990-01-01",
      },
    ],
    nextCursor: null,
    hasMore: false,
  };

  it("skips existing and duplicate rows, reports created/failed", async () => {
    const csv = file(
      "people.csv",
      [
        "firstName,lastName,dateOfBirth,isLiving",
        "asha,RAO,1990-01-01,true", // exists (case-insensitive)
        "Ravi,Rao,1992-02-02,true",
        "Ravi,Rao,1992-02-02,true", // duplicate within file
        ",NoFirst,,", // invalid
        "Mira,Rao,,false",
      ].join("\n")
    );
    const fetch = api((url, init) => {
      if (url.pathname.endsWith("/persons")) return json(existing);
      const ops = JSON.parse(String(init.body)).operations;
      return json({
        success: false,
        results: ops.map((_: unknown, index: number) =>
          index === 1
            ? { index, success: false, error: "Invalid date" }
            : { index, success: true, id: `n${index}` }
        ),
      });
    });
    const r = await runCli(["bulk", "add", csv, "--type", "person"], {
      home,
      fetch,
    });
    const batch = JSON.parse(String(fetch.mock.calls[1][1]?.body));
    expect(batch.transaction).toBe(false);
    expect(
      batch.operations.map(
        (o: { data: { firstName: string } }) => o.data.firstName
      )
    ).toEqual(["Ravi", "Mira"]);
    expect(batch.operations[1].data).toEqual({
      firstName: "Mira",
      lastName: "Rao",
      isLiving: false,
    });
    // One output block: the error carries the summary and failures
    expect(r.stdout.match(/^bulk:/gm)).toBeNull();
    const out = (decode(r.stdout) as { error: Record<string, unknown> }).error;
    expect(out.code).toBe("partial_failure");
    expect(out.bulk).toMatchObject({
      rows: 5,
      created: 1,
      skipped: 2,
      failed: 2,
    });
    expect(out.failures).toEqual([
      { row: 4, error: "missing firstName" },
      { row: 5, error: "Invalid date" },
    ]);
    expect(r.code).toBe(1);
  });

  it("--dry-run makes no batch request", async () => {
    const j = file(
      "p.json",
      JSON.stringify([{ firstName: "New", lastName: "Person" }])
    );
    const fetch = api(() => json(existing));
    const r = await runCli(
      ["bulk", "add", j, "--type", "person", "--dry-run"],
      {
        home,
        fetch,
      }
    );
    expect(r.code).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(decode(r.stdout)).toMatchObject({
      bulk: { wouldCreate: 1, skipped: 0, failed: 0, dryRun: true },
    });
  });

  it("chunks requests by --chunk", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      firstName: `P${i}`,
      lastName: "X",
    }));
    const j = file("p.json", JSON.stringify(rows));
    const fetch = api((url, init) => {
      if (url.pathname.endsWith("/persons"))
        return json({ items: [], nextCursor: null, hasMore: false });
      const ops = JSON.parse(String(init.body)).operations;
      return json({
        results: ops.map((_: unknown, index: number) => ({
          index,
          success: true,
        })),
      });
    });
    const r = await runCli(
      ["bulk", "add", j, "--type", "person", "--chunk", "2"],
      {
        home,
        fetch,
      }
    );
    expect(r.code).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(4); // 1 list + 3 batches
    expect(decode(r.stdout)).toMatchObject({ bulk: { created: 5 } });
  });

  it("relationships are deduped against each person's existing links", async () => {
    const j = file(
      "r.json",
      JSON.stringify([
        { personId: "a", relatedPersonId: "b", type: "spouse" },
        { personId: "a", relatedPersonId: "c", type: "CHILD" },
      ])
    );
    const fetch = api((url, init) => {
      if (url.pathname.endsWith("/relationships"))
        return json({
          items: [{ id: "r1", type: "SPOUSE", relatedPerson: { id: "b" } }],
          nextCursor: null,
          hasMore: false,
        });
      const ops = JSON.parse(String(init.body)).operations;
      return json({
        results: ops.map((_: unknown, index: number) => ({
          index,
          success: true,
        })),
      });
    });
    const r = await runCli(["bulk", "add", j, "--type", "relationship"], {
      home,
      fetch,
    });
    expect(String(fetch.mock.calls[0][0])).toContain("personId=a");
    expect(decode(r.stdout)).toMatchObject({
      bulk: { created: 1, skipped: 1 },
    });
  });

  it("requires --type", async () => {
    const j = file("p.json", "[]");
    expect((await runCli(["bulk", "add", j], { home })).code).toBe(2);
  });
});

describe("review fixes", () => {
  it("safeFileName keeps plain names and rejects paths", async () => {
    const { safeFileName } = await import("../lib/client");
    expect(safeFileName("vamsa-2026-01-01.ged")).toBe("vamsa-2026-01-01.ged");
    for (const bad of [
      "../../.bashrc",
      "/etc/passwd",
      "dir/file.ged",
      "C:\\x.ged",
      ".hidden",
      "a\u0000b",
      "",
      undefined,
    ]) {
      expect(safeFileName(bad)).toBeUndefined();
    }
  });

  it("export ignores a malicious server file name and uses the default", async () => {
    const fetch = api(
      () =>
        new Response("0 HEAD\n", {
          headers: {
            "Content-Disposition": 'attachment; filename="../../evil.ged"',
          },
        })
    );
    const r = await runCli(["gedcom", "export"], { home, fetch });
    expect(r.code).toBe(0);
    expect(readFileSync(join(home, "vamsa.ged"), "utf8")).toBe("0 HEAD\n");
  });

  it("validate of an invalid file exits 1 with the errors", async () => {
    const ged = file("bad.ged", "x");
    const fetch = api(() =>
      json({
        valid: false,
        message: "Invalid GEDCOM",
        preview: {
          peopleCount: 0,
          familiesCount: 0,
          errors: [{ message: "no HEAD" }],
        },
      })
    );
    const r = await runCli(["gedcom", "validate", ged], { home, fetch });
    expect(r.code).toBe(1);
    expect(decode(r.stdout)).toMatchObject({
      error: { code: "invalid_gedcom", errorCount: 1 },
    });
    const dry = await runCli(["gedcom", "import", ged, "--dry-run"], {
      home,
      fetch,
    });
    expect(dry.code).toBe(1);
  });

  it("accepts .GED in upper case", async () => {
    const ged = file("TREE.GED", "0 HEAD\n0 TRLR\n");
    const fetch = api(() =>
      json({
        valid: true,
        message: "ok",
        preview: { peopleCount: 1, familiesCount: 0, errors: [] },
      })
    );
    expect(
      (await runCli(["gedcom", "validate", ged], { home, fetch })).code
    ).toBe(0);
  });

  it("bulk --dry-run with invalid rows exits 1 and sends nothing", async () => {
    const j = file("p.json", JSON.stringify([{ lastName: "NoFirst" }]));
    const fetch = api(() =>
      json({ items: [], nextCursor: null, hasMore: false })
    );
    const r = await runCli(
      ["bulk", "add", j, "--type", "person", "--dry-run"],
      {
        home,
        fetch,
      }
    );
    expect(r.code).toBe(1);
    expect(decode(r.stdout)).toMatchObject({
      error: {
        code: "invalid_rows",
        failures: [{ row: 1, error: "missing firstName" }],
      },
    });
    expect(fetch).toHaveBeenCalledTimes(1); // only the existing-persons lookup
  });

  it("dates are normalized before dedupe; non-ISO dates fail the row", async () => {
    const existing = {
      items: [
        {
          id: "p0",
          firstName: "Asha",
          lastName: "Rao",
          dateOfBirth: "1990-01-01",
        },
      ],
      nextCursor: null,
      hasMore: false,
    };
    const j = file(
      "p.json",
      JSON.stringify([
        {
          firstName: "Asha",
          lastName: "Rao",
          dateOfBirth: "1990-01-01T00:00:00Z",
        },
        { firstName: "Ravi", lastName: "Rao", dateOfBirth: "01/02/1992" },
        { firstName: "Mira", lastName: "Rao", dateOfBirth: "1992-02-30" },
      ])
    );
    const fetch = api(() => json(existing));
    const r = await runCli(
      ["bulk", "add", j, "--type", "person", "--dry-run"],
      {
        home,
        fetch,
      }
    );
    const err = (decode(r.stdout) as { error: Record<string, unknown> }).error;
    expect(err.bulk).toMatchObject({ skipped: 1, failed: 2, wouldCreate: 0 });
    expect(err.failures).toEqual([
      { row: 2, error: "dateOfBirth must be an ISO date (YYYY-MM-DD)" },
      { row: 3, error: "dateOfBirth must be an ISO date (YYYY-MM-DD)" },
    ]);
  });
});
