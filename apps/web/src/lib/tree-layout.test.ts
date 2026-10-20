import { describe, expect, it } from "vitest";
import {
  CARD_WIDTH,
  STUB_LENGTH,
  TEXT_WIDTH,
  computeTreeLayout,
  wrapToWidth,
} from "./tree-layout";
import type { TreePerson, TreeRelation } from "./tree-layout";

const person = (
  id: string,
  firstName: string,
  gender: string,
  overrides: Partial<TreePerson> = {}
): TreePerson => ({
  id,
  firstName,
  lastName: "Rao",
  dateOfBirth: "1970-01-01",
  dateOfPassing: null,
  isLiving: true,
  gender,
  ...overrides,
});

const people: Array<TreePerson> = [
  person("gf1", "Gopal", "MALE", {
    isLiving: false,
    dateOfPassing: "2001-01-01",
  }),
  person("gm1", "Gita", "FEMALE"),
  person("gf2", "Govind", "MALE"),
  person("gm2", "Gauri", "FEMALE"),
  person("dad", "Dad", "MALE"),
  person("mom", "Mom", "FEMALE", {
    firstName: "Maximiliana-Alexandrina",
    lastName: "Van Der Westhuizen-Montgomery",
  }),
  person("uncle", "Uncle", "MALE"),
  person("focus", "Focus", "MALE"),
  person("sis", "Sis", "FEMALE"),
  person("spouse", "Spouse", "FEMALE"),
  person("c1", "Child1", "MALE"),
  person("c2", "Child2", "FEMALE"),
  person("cousin", "Cousin", "FEMALE"),
  person("cousinSpouse", "CousinSpouse", "MALE"),
];

const pc = (parent: string, child: string): TreeRelation => ({
  source: parent,
  target: child,
  type: "parent-child",
});
const sp = (a: string, b: string): TreeRelation => ({
  source: a,
  target: b,
  type: "spouse",
});

const relations: Array<TreeRelation> = [
  pc("gf1", "dad"),
  pc("gm1", "dad"),
  pc("gf1", "uncle"),
  pc("gm1", "uncle"),
  pc("gf2", "mom"),
  pc("gm2", "mom"),
  pc("dad", "focus"),
  pc("mom", "focus"),
  pc("dad", "sis"),
  pc("mom", "sis"),
  pc("focus", "c1"),
  pc("spouse", "c1"),
  pc("focus", "c2"),
  pc("spouse", "c2"),
  sp("gf1", "gm1"),
  sp("gf2", "gm2"),
  pc("uncle", "cousin"),
  sp("dad", "mom"),
  sp("cousin", "cousinSpouse"),
  sp("focus", "spouse"),
];

const layout = (expanded: Array<string> = [], expandAll = false) =>
  computeTreeLayout({
    people,
    relations,
    focusId: "focus",
    expanded: new Set(expanded),
    expandAll,
    measureText: fakeMeasure,
  });

const byId = (l: ReturnType<typeof layout>) =>
  new Map(l.cards.map((c) => [c.id, c]));
const cx = (c: { x: number; width: number }) => c.x + c.width / 2;

const fakeMeasure = (text: string) => text.length * 8;

describe("wrapToWidth", () => {
  it("wraps by measured width without dropping characters", () => {
    const text = "Maximiliana-Alexandrina Van Der Westhuizen";
    const lines = wrapToWidth(text, TEXT_WIDTH, "name", fakeMeasure);
    expect(lines.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
    lines.forEach((l) =>
      expect(fakeMeasure(l)).toBeLessThanOrEqual(TEXT_WIDTH)
    );
    expect(lines.length).toBeGreaterThan(2);
  });

  it("uses the injected measurer (narrow glyphs fit more per line)", () => {
    const wide = wrapToWidth(
      "Alexander Hamilton",
      100,
      "name",
      (t) => t.length * 10
    );
    const narrow = wrapToWidth(
      "Alexander Hamilton",
      100,
      "name",
      (t) => t.length * 4
    );
    expect(wide.length).toBeGreaterThan(narrow.length);
    expect(narrow).toEqual(["Alexander Hamilton"]);
  });

  it("keeps non-breaking-space words together", () => {
    const lines = wrapToWidth(
      "Abcdefghijkl\u00a0\u2020",
      90,
      "name",
      fakeMeasure
    );
    expect(lines.join("")).toContain("\u2020");
    expect(lines.every((l) => l !== "\u2020")).toBe(true);
  });
});

describe("computeTreeLayout", () => {
  it("returns empty layout when focus is unknown", () => {
    const l = computeTreeLayout({ people, relations, focusId: "nope" });
    expect(l.cards).toHaveLength(0);
  });

  it("shows only the direct line when collapsed, with sibling pills", () => {
    const l = layout();
    const ids = l.cards.map((c) => c.id).sort();
    expect(ids).toEqual(
      [
        "c1",
        "c2",
        "dad",
        "focus",
        "gf1",
        "gf2",
        "gm1",
        "gm2",
        "mom",
        "spouse",
      ].sort()
    );
    const labels = l.pills.map((p) => p.label).sort();
    expect(labels).toEqual(["+1 child", "+1 sibling"]);
  });

  it("assigns generation rows and labels", () => {
    const l = layout();
    const rowLabels = l.rows.map((r) => r.label);
    expect(rowLabels).toEqual([
      "GRANDPARENTS",
      "PARENTS",
      "CURRENT",
      "CHILDREN",
    ]);
  });

  it("has no overlapping cards in any row, collapsed or expanded", () => {
    for (const l of [layout(), layout(["focus", "dad"])]) {
      const rows = new Map<number, Array<(typeof l.cards)[number]>>();
      l.cards.forEach((c) => rows.set(c.row, [...(rows.get(c.row) ?? []), c]));
      rows.forEach((cards) => {
        const sorted = cards.slice().sort((a, b) => a.x - b.x);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].x).toBeGreaterThanOrEqual(
            sorted[i - 1].x + sorted[i - 1].width
          );
        }
      });
      l.pills.forEach((p) => {
        expect(Number.isFinite(p.x)).toBe(true);
      });
    }
  });

  it("keeps each spouse above their own parents", () => {
    const m = byId(layout());
    expect(cx(m.get("dad")!)).toBeCloseTo(
      (cx(m.get("gf1")!) + cx(m.get("gm1")!)) / 2
    );
    expect(cx(m.get("mom")!)).toBeCloseTo(
      (cx(m.get("gf2")!) + cx(m.get("gm2")!)) / 2
    );
    expect(m.get("dad")!.x).toBeLessThan(m.get("mom")!.x);
    // paternal grandparents entirely left of maternal ones
    expect(m.get("gm1")!.x + CARD_WIDTH).toBeLessThanOrEqual(m.get("gf2")!.x);
  });

  it("equalizes card heights per row and grows for long names", () => {
    const l = layout();
    const m = byId(l);
    const parentsRow = l.cards.filter((c) => c.row === -1);
    const heights = new Set(parentsRow.map((c) => c.height));
    expect(heights.size).toBe(1);
    expect(m.get("mom")!.nameLines.length).toBeGreaterThan(2);
    expect(m.get("dad")!.height).toBe(m.get("mom")!.height);
    expect(m.get("mom")!.height).toBeGreaterThan(m.get("focus")!.height);
    // full name preserved across lines
    expect(m.get("mom")!.nameLines.join("").replace(/\s/g, "")).toBe(
      "Maximiliana-AlexandrinaVanDerWesthuizen-Montgomery"
    );
  });

  it("emits only orthogonal connector paths", () => {
    const l = layout(["focus", "dad"]);
    expect(l.connectors.length).toBeGreaterThan(0);
    l.connectors.forEach((c) => {
      expect(c.d).toMatch(/^M [-\d.]+ [-\d.]+ [HV] [-\d.]+$/);
    });
    expect(l.connectors.some((c) => c.kind === "marriage")).toBe(true);
    expect(l.connectors.some((c) => c.kind === "stub" && c.dashed)).toBe(true);
  });

  it("expands siblings (and re-flows) when toggled", () => {
    const collapsed = layout();
    const open = layout(["focus"]);
    expect(open.cards.map((c) => c.id)).toContain("sis");
    expect(open.cards).toHaveLength(collapsed.cards.length + 1);
    expect(open.pills.find((p) => p.key === "focus")?.label).toBe("− hide");
    const sis = byId(open).get("sis")!;
    expect(sis.row).toBe(0);
    expect(sis.blood).toBe(true);
    expect(sis.relation).toBe("Sister");
  });

  it("marks blood relatives and in-laws", () => {
    const m = byId(layout());
    expect(m.get("dad")!.blood).toBe(true);
    expect(m.get("c1")!.blood).toBe(true);
    expect(m.get("spouse")!.blood).toBe(false);
    expect(m.get("focus")!.isFocus).toBe(true);
    expect(m.get("gf1")!.deceased).toBe(true);
    expect(m.get("gf1")!.nameLines.join(" ")).toContain("†");
  });

  it("shows an expanded uncle's children (with spouses) in the next row", () => {
    const l = layout(["dad"]);
    const m = byId(l);
    expect(m.has("uncle")).toBe(true);
    expect(m.get("cousin")!.row).toBe(0);
    expect(m.get("cousin")!.relation).toBe("Cousin");
    expect(m.get("cousin")!.blood).toBe(true);
    expect(m.get("cousinSpouse")!.blood).toBe(false);
    // hidden when collapsed
    expect(byId(layout()).has("cousin")).toBe(false);
  });

  it("never overlaps cards when cousins share a row with the focus", () => {
    for (const l of [
      layout(["dad"]),
      layout(["dad", "focus"]),
      layout([], true),
    ]) {
      const rows = new Map<number, Array<(typeof l.cards)[number]>>();
      l.cards.forEach((c) => rows.set(c.row, [...(rows.get(c.row) ?? []), c]));
      rows.forEach((cards) => {
        const sorted = cards.slice().sort((a, b) => a.x - b.x);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].x).toBeGreaterThanOrEqual(
            sorted[i - 1].x + sorted[i - 1].width
          );
        }
      });
    }
  });

  it("expandAll reveals every collateral relative and removes hide-less pills", () => {
    const l = layout([], true);
    const ids = l.cards.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["sis", "uncle", "cousin"]));
    expect(l.pills.every((p) => p.expanded)).toBe(true);
  });

  it("supports ancestors-only and descendants-only focus", () => {
    const top = computeTreeLayout({
      people,
      relations,
      focusId: "gf1",
      measureText: fakeMeasure,
    });
    expect(top.rows.map((r) => r.label)).toEqual([
      "CURRENT",
      "CHILDREN",
      "GRANDCHILDREN",
      "GREAT-GRANDCHILDREN",
    ]);
    const leaf = computeTreeLayout({
      people,
      relations,
      focusId: "c1",
      measureText: fakeMeasure,
    });
    expect(leaf.rows[0].label).toBe("GREAT-GRANDPARENTS");
    expect(leaf.rows.at(-1)!.label).toBe("CURRENT");
  });

  it("keeps wrapped lines within the text width", () => {
    layout().cards.forEach((c) =>
      c.nameLines.forEach((line) =>
        expect(fakeMeasure(line)).toBeLessThanOrEqual(TEXT_WIDTH)
      )
    );
  });

  it("keeps the focus on the parents' midpoint when cousins are shown", () => {
    for (const l of [
      layout(["dad"]),
      layout(["dad", "focus"]),
      layout([], true),
    ]) {
      const m = byId(l);
      const mid = (cx(m.get("dad")!) + cx(m.get("mom")!)) / 2;
      expect(cx(m.get("focus")!)).toBeCloseTo(mid);
    }
  });

  it("places pills on a short stub next to the bus, expanded or not", () => {
    for (const l of [layout(), layout(["focus", "dad"])]) {
      const stubs = l.connectors.filter((c) => c.kind === "stub");
      expect(stubs.length).toBe(l.pills.length);
      stubs.forEach((stub) => {
        const [, x1, , , x2] = stub.d.split(" ");
        expect(Math.abs(Number(x2) - Number(x1))).toBeLessThanOrEqual(
          STUB_LENGTH
        );
      });
    }
  });
});
