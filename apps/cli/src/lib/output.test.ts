import { decode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { CliError } from "./errors";
import {
  TRUNCATE_AT,
  format,
  formatError,
  listView,
  parseFields,
  tildify,
  truncate,
} from "./output";

const people = [
  { id: "p1", name: "Asha Rao", bio: "short", isLiving: true },
  { id: "p2", name: "Ravi Rao", bio: "x".repeat(200), isLiving: false },
];

describe("TOON output", () => {
  it("renders lists as a header + rows table", () => {
    const out = format(
      listView({
        name: "persons",
        items: people,
        fields: ["id", "name"],
        full: false,
        total: 12,
        emptyMessage: "none",
      }),
      "toon"
    );
    expect(out).toBe(
      [
        "persons[2]{id,name}:",
        "  p1,Asha Rao",
        "  p2,Ravi Rao",
        "total: 12",
        "showing: 2",
      ].join("\n")
    );
  });

  it("renders help as one command per line and stays valid TOON", () => {
    const out = format(
      { ok: true, help: ["vamsa person get <id>", "a, b"] },
      "toon"
    );
    expect(out).toContain("help[2]:\n  - vamsa person get <id>\n");
    expect(decode(out)).toEqual({
      ok: true,
      help: ["vamsa person get <id>", "a, b"],
    });
  });

  it("--json gives the same data as JSON", () => {
    const data = { a: 1, help: ["x"] };
    expect(JSON.parse(format(data, "json"))).toEqual(data);
  });
});

describe("listView", () => {
  it("never renders an empty list silently", () => {
    const view = listView({
      name: "persons",
      items: [],
      fields: ["id"],
      full: false,
      total: 0,
      emptyMessage: "No people yet.",
      help: ["vamsa person create --first-name <f> --last-name <l>"],
    });
    expect(view).toEqual({
      persons: [],
      total: 0,
      message: "No people yet.",
      help: ["vamsa person create --first-name <f> --last-name <l>"],
    });
  });

  it("truncates long text with a size hint, unless --full", () => {
    const short = listView({
      name: "p",
      items: people,
      fields: ["bio"],
      full: false,
      emptyMessage: "",
    }) as { p: Array<{ bio: string }> };
    expect(short.p[1].bio).toBe(
      `${"x".repeat(TRUNCATE_AT)}... (+${200 - TRUNCATE_AT} chars, --full to show)`
    );
    const full = listView({
      name: "p",
      items: people,
      fields: ["bio"],
      full: true,
      emptyMessage: "",
    }) as { p: Array<{ bio: string }> };
    expect(full.p[1].bio).toHaveLength(200);
  });

  it("fills unknown fields with null so columns line up", () => {
    const v = listView({
      name: "p",
      items: [{ id: "1" }],
      fields: ["id", "nope"],
      full: false,
      emptyMessage: "",
    }) as { p: Array<Record<string, unknown>> };
    expect(v.p[0]).toEqual({ id: "1", nope: null });
  });
});

describe("helpers", () => {
  it("parseFields falls back to defaults", () => {
    expect(parseFields(undefined, ["a"])).toEqual(["a"]);
    expect(parseFields(" b, c ,", ["a"])).toEqual(["b", "c"]);
    expect(parseFields(",", ["a"])).toEqual(["a"]);
  });

  it("truncate leaves short values and non-strings alone", () => {
    expect(truncate("hi", false)).toBe("hi");
    expect(truncate(5, false)).toBe(5);
  });

  it("tildify replaces the home prefix only", () => {
    expect(tildify("/home/u/bin/vamsa", "/home/u")).toBe("~/bin/vamsa");
    expect(tildify("/home/user2/x", "/home/u")).toBe("/home/user2/x");
  });

  it("formats errors as an error block with code, message and hint", () => {
    const out = formatError(
      new CliError(
        "not_found",
        "Person not found",
        "vamsa person list",
        1,
        404
      ),
      "toon"
    );
    expect(decode(out)).toEqual({
      error: {
        code: "not_found",
        message: "Person not found",
        status: 404,
        hint: "vamsa person list",
      },
    });
  });
});
