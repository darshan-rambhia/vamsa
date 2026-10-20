/**
 * Family tree layout engine (pure, no React/DOM).
 *
 * Classic genealogy-chart layout:
 * - couples sit side by side, joined by a horizontal marriage line
 * - one vertical drop from the marriage-line midpoint to a horizontal bus,
 *   short verticals from the bus to each child's top (orthogonal only)
 * - ancestors use pedigree placement: every parent is centered above their
 *   own parents, so lines never cross
 * - the same engine serves ancestors, descendants and the focused hourglass
 * - siblings / other off-line relatives are collapsed behind a pill that sits
 *   on a dashed stub extending from the relevant bus
 *
 * Layout is computed in three phases: x placement per row, row heights/y, and
 * connector paths.
 */

export const CARD_WIDTH = 200;
export const SPOUSE_GAP = 40;
export const BLOCK_GAP = 48;
export const SIBLING_GAP = 40;
export const ROW_GAP = 88;
export const MARRIAGE_Y = 30;
export const PILL_WIDTH = 104;
export const PILL_HEIGHT = 26;
export const GUTTER_WIDTH = 150;
export const STUB_LENGTH = 18;

/** Card width minus borders, padding, avatar and gap */
export const TEXT_WIDTH = 124;
const NAME_LINE_HEIGHT = 18;
const SUBTITLE_LINE_HEIGHT = 15;
const CARD_PADDING_Y = 14;
const MIN_CARD_HEIGHT = 72;

export interface TreePerson {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  dateOfPassing: string | null;
  isLiving: boolean;
  gender: string | null;
}

export interface TreeRelation {
  source: string;
  target: string;
  type: "parent-child" | "spouse";
}

export interface LayoutCard {
  id: string;
  name: string;
  initials: string;
  /** Full name wrapped onto as many lines as needed, never truncated */
  nameLines: Array<string>;
  relation: string;
  subtitleLines: Array<string>;
  birth: string | null;
  death: string | null;
  deceased: boolean;
  blood: boolean;
  isFocus: boolean;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutConnector {
  id: string;
  kind: "marriage" | "drop" | "bus" | "child" | "stub";
  d: string;
  dashed: boolean;
}

export interface LayoutPill {
  /** Person id whose siblings this pill toggles */
  key: string;
  label: string;
  expanded: boolean;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutRow {
  row: number;
  label: string;
  y: number;
  height: number;
}

export interface TreeLayout {
  cards: Array<LayoutCard>;
  connectors: Array<LayoutConnector>;
  pills: Array<LayoutPill>;
  rows: Array<LayoutRow>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface TreeLayoutInput {
  people: Array<TreePerson>;
  relations: Array<TreeRelation>;
  focusId: string;
  /** Person ids whose collapsed siblings are expanded */
  expanded?: ReadonlySet<string>;
  expandAll?: boolean;
  /** Real text measurement (canvas/DOM); defaults to an estimate */
  measureText?: TextMeasurer;
}

const EMPTY_LAYOUT: TreeLayout = {
  cards: [],
  connectors: [],
  pills: [],
  rows: [],
  bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
};

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export type TextMeasurer = (text: string, kind: "name" | "subtitle") => number;

/** Rough fallback used when no measurer is injected (server / tests) */
export const estimateTextWidth: TextMeasurer = (text, kind) =>
  text.length * (kind === "name" ? 7.4 : 6.2);

/**
 * Greedy word wrap by measured width. Words wider than maxWidth are split by
 * character. Never truncates; non-breaking spaces keep words together.
 */
export function wrapToWidth(
  text: string,
  maxWidth: number,
  kind: "name" | "subtitle",
  measure: TextMeasurer
): Array<string> {
  const words = text.split(/[ \t\n]+/).filter(Boolean);
  const lines: Array<string> = [];
  let current = "";
  for (const word of words) {
    let rest = word;
    while (measure(rest, kind) > maxWidth && rest.length > 1) {
      if (current) {
        lines.push(current);
        current = "";
      }
      let cut = rest.length - 1;
      while (cut > 1 && measure(rest.slice(0, cut), kind) > maxWidth) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (!rest) continue;
    if (!current) current = rest;
    else if (measure(`${current} ${rest}`, kind) <= maxWidth)
      current += ` ${rest}`;
    else {
      lines.push(current);
      current = rest;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function yearOf(date: string | null): string | null {
  if (!date) return null;
  const match = /^(\d{4})/.exec(date);
  return match ? match[1] : null;
}

function initialsOf(person: TreePerson): string {
  const first = person.firstName.trim().charAt(0);
  const last = person.lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "?";
}

type GenderKey = "male" | "female" | "other";

function genderOf(person: TreePerson | undefined): GenderKey {
  const g = person?.gender?.toUpperCase() ?? "";
  if (g.startsWith("M")) return "male";
  if (g.startsWith("F")) return "female";
  return "other";
}

function pick(g: GenderKey, male: string, female: string, other: string) {
  return g === "male" ? male : g === "female" ? female : other;
}

function ancestorRelation(depth: number, g: GenderKey): string {
  if (depth === 1) return pick(g, "Father", "Mother", "Parent");
  const prefix = "Great-".repeat(depth - 2);
  return (
    prefix +
    (depth === 2
      ? pick(g, "Grandfather", "Grandmother", "Grandparent")
      : pick(g, "grandfather", "grandmother", "grandparent"))
  );
}

function descendantRelation(depth: number, g: GenderKey): string {
  if (depth === 1) return pick(g, "Son", "Daughter", "Child");
  const prefix = "Great-".repeat(depth - 2);
  return (
    prefix +
    (depth === 2
      ? pick(g, "Grandson", "Granddaughter", "Grandchild")
      : pick(g, "grandson", "granddaughter", "grandchild"))
  );
}

function collateralRelation(depth: number, g: GenderKey): string {
  if (depth === 0) return pick(g, "Brother", "Sister", "Sibling");
  if (depth === 1) return pick(g, "Uncle", "Aunt", "Uncle / Aunt");
  return "Great-".repeat(depth - 1) + pick(g, "uncle", "aunt", "uncle / aunt");
}

function collateralDescendantRelation(
  lineDepth: number,
  k: number,
  g: GenderKey
): string {
  if (lineDepth === 0) {
    const base = pick(g, "nephew", "niece", "nephew / niece");
    if (k === 1) return base.charAt(0).toUpperCase() + base.slice(1);
    return `${"Great-".repeat(k - 2)}${k === 2 ? "Grand" : "grand"}${base}`;
  }
  if (k === 1) return "Cousin";
  if (k === 2) return "Cousin's child";
  return `Cousin's ${"great-".repeat(k - 3)}grandchild`;
}

export function rowLabel(row: number): string {
  if (row === 0) return "CURRENT";
  const depth = Math.abs(row);
  if (row < 0) {
    if (depth === 1) return "PARENTS";
    return `${"GREAT-".repeat(depth - 2)}GRANDPARENTS`;
  }
  if (depth === 1) return "CHILDREN";
  return `${"GREAT-".repeat(depth - 2)}GRANDCHILDREN`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface Item {
  kind: "card" | "pill";
  id: string;
  row: number;
  cx: number;
}

interface Family {
  parents: Array<string>;
  children: Array<string>;
  /** Pill (by key) hanging off this family's bus, with its side */
  pillKey?: string;
  pillSide?: -1 | 1;
}

interface Extent {
  left: number;
  right: number;
  cx: number;
}

export function computeTreeLayout(input: TreeLayoutInput): TreeLayout {
  const { people, relations, focusId } = input;
  const personMap = new Map(people.map((p) => [p.id, p]));
  if (!personMap.has(focusId)) return EMPTY_LAYOUT;

  const expanded = input.expanded ?? new Set<string>();
  const isExpanded = (key: string) =>
    input.expandAll === true || expanded.has(key);

  // Relationship maps restricted to known people
  const parentsOf = new Map<string, Array<string>>();
  const childrenOf = new Map<string, Array<string>>();
  const spousesOf = new Map<string, Array<string>>();
  const push = (m: Map<string, Array<string>>, k: string, v: string) => {
    const list = m.get(k);
    if (!list) m.set(k, [v]);
    else if (!list.includes(v)) list.push(v);
  };
  for (const rel of relations) {
    if (!personMap.has(rel.source) || !personMap.has(rel.target)) continue;
    if (rel.type === "parent-child") {
      push(parentsOf, rel.target, rel.source);
      push(childrenOf, rel.source, rel.target);
    } else {
      push(spousesOf, rel.source, rel.target);
      push(spousesOf, rel.target, rel.source);
    }
  }

  const byGender = (a: string, b: string) => {
    const order = { male: 0, female: 1, other: 2 } as const;
    const d =
      order[genderOf(personMap.get(a))] - order[genderOf(personMap.get(b))];
    return d !== 0 ? d : a.localeCompare(b);
  };
  const lineParents = (id: string) =>
    (parentsOf.get(id) ?? []).slice().sort(byGender).slice(0, 2);

  // Blood line upward: ancestor depth per person (focus = 0)
  const lineDepth = new Map<string, number>([[focusId, 0]]);
  {
    const queue = [focusId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const parent of lineParents(id)) {
        if (lineDepth.has(parent)) continue;
        lineDepth.set(parent, lineDepth.get(id)! + 1);
        queue.push(parent);
      }
    }
  }
  const inLine = (id: string) => lineDepth.has(id);

  // Blood descendants of the focus
  const descDepth = new Map<string, number>();
  {
    const queue: Array<string> = [focusId];
    descDepth.set(focusId, 0);
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const child of childrenOf.get(id) ?? []) {
        if (descDepth.has(child) || inLine(child)) continue;
        descDepth.set(child, descDepth.get(id)! + 1);
        queue.push(child);
      }
    }
  }

  const collateralOf = (id: string): Array<string> => {
    const result: Array<string> = [];
    for (const parent of lineParents(id)) {
      for (const sibling of childrenOf.get(parent) ?? []) {
        if (!inLine(sibling) && !result.includes(sibling)) result.push(sibling);
      }
    }
    return result;
  };

  const placed = new Set<string>();
  const items: Array<Item> = [];
  const itemById = new Map<string, Item>();
  const families: Array<Family> = [];
  const marriagePairs: Array<[string, string]> = [];
  const rowOf = new Map<string, number>();
  const relationOf = new Map<string, string>();
  const bloodSet = new Set<string>();
  const pillMeta = new Map<
    string,
    { hidden: number; noun: "sibling" | "child" }
  >();

  const addCard = (id: string, row: number, cx: number, relation: string) => {
    const item: Item = { kind: "card", id, row, cx };
    items.push(item);
    itemById.set(id, item);
    placed.add(id);
    rowOf.set(id, row);
    relationOf.set(id, relation);
  };
  const shiftFrom = (start: number, dx: number) => {
    if (dx === 0) return;
    for (let i = start; i < items.length; i++) items[i].cx += dx;
  };
  const extentOf = (start: number): { min: number; max: number } => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = start; i < items.length; i++) {
      const half = (items[i].kind === "card" ? CARD_WIDTH : PILL_WIDTH) / 2;
      min = Math.min(min, items[i].cx - half);
      max = Math.max(max, items[i].cx + half);
    }
    return { min, max };
  };

  const OVERLAP_GAP = 32;
  const halfOf = (it: Item) =>
    (it.kind === "card" ? CARD_WIDTH : PILL_WIDTH) / 2;
  /**
   * Shifts items[start..] horizontally by the smallest amount that keeps them
   * clear of items[0..start) in every row.
   */
  const clearOverlap = (start: number) => {
    const own = items.slice(start);
    const others = items.slice(0, start);
    const conflicts = (dx: number) =>
      own.some((o) =>
        others.some(
          (b) =>
            b.row === o.row &&
            o.cx + dx + halfOf(o) + OVERLAP_GAP > b.cx - halfOf(b) &&
            o.cx + dx - halfOf(o) - OVERLAP_GAP < b.cx + halfOf(b)
        )
      );
    if (own.length === 0 || !conflicts(0)) return;
    const candidates: Array<number> = [];
    for (const o of own) {
      for (const b of others) {
        if (b.row !== o.row) continue;
        candidates.push(b.cx + halfOf(b) + OVERLAP_GAP + halfOf(o) - o.cx);
        candidates.push(b.cx - halfOf(b) - OVERLAP_GAP - halfOf(o) - o.cx);
      }
    }
    const valid = candidates
      .filter((dx) => !conflicts(dx))
      .sort((a, b) => Math.abs(a) - Math.abs(b));
    if (valid.length > 0) shiftFrom(start, valid[0]);
  };

  /**
   * Widens the gap between the first and second parent blocks, symmetrically
   * so the midpoint (and so this person's x) is unchanged, until this
   * person's own cluster (items[ownStart..]) no longer overlaps them.
   */
  const spreadParents = (start: number, mid: number, ownStart: number) => {
    const own = items.slice(ownStart);
    const leftItems = items.slice(start, mid);
    const rightItems = items.slice(mid, ownStart);
    const conflictsAt = (d: number) =>
      own.some((o) =>
        [
          ...leftItems.map((b) => [b, -d] as const),
          ...rightItems.map((b) => [b, d] as const),
        ].some(
          ([b, dx]) =>
            b.row === o.row &&
            o.cx + halfOf(o) + OVERLAP_GAP > b.cx + dx - halfOf(b) &&
            o.cx - halfOf(o) - OVERLAP_GAP < b.cx + dx + halfOf(b)
        )
      );
    if (!conflictsAt(0)) return;
    for (let d = 8; d <= 4000; d += 8) {
      if (!conflictsAt(d)) {
        leftItems.forEach((b) => (b.cx -= d));
        rightItems.forEach((b) => (b.cx += d));
        return;
      }
    }
  };

  const spouseLabel = (ownerId: string) =>
    `Spouse of ${personMap.get(ownerId)?.firstName ?? ""}`.trim();

  /**
   * Places a person's unplaced spouses beside them. `alternate` puts the first
   * spouse on the right, the second on the left, and so on; otherwise all go
   * to `side`. Returns the card-edge extents of the strip.
   */
  const placeSpouses = (
    id: string,
    cx: number,
    row: number,
    alternate: boolean,
    side: -1 | 1,
    relationFor: (spouseId: string) => string
  ): { left: number; right: number } => {
    let leftEdge = cx - CARD_WIDTH / 2;
    let rightEdge = cx + CARD_WIDTH / 2;
    let leftLast = id;
    let rightLast = id;
    const spouses = (spousesOf.get(id) ?? []).filter(
      (s) => !placed.has(s) && !inLine(s)
    );
    spouses.forEach((spouseId, index) => {
      const toRight = alternate ? index % 2 === 0 : side === 1;
      if (toRight) {
        const sx = rightEdge + SPOUSE_GAP + CARD_WIDTH / 2;
        addCard(spouseId, row, sx, relationFor(spouseId));
        marriagePairs.push([rightLast, spouseId]);
        rightLast = spouseId;
        rightEdge = sx + CARD_WIDTH / 2;
      } else {
        const sx = leftEdge - SPOUSE_GAP - CARD_WIDTH / 2;
        addCard(spouseId, row, sx, relationFor(spouseId));
        marriagePairs.push([spouseId, leftLast]);
        leftLast = spouseId;
        leftEdge = sx - CARD_WIDTH / 2;
      }
    });
    return { left: leftEdge, right: rightEdge };
  };

  // ---- Ancestors (pedigree) --------------------------------------------
  // dir: side the person's siblings/extra spouses go to (-1 left, 1 right)
  const placeAncestor = (
    id: string,
    left: number,
    dir: -1 | 1,
    isFocus: boolean
  ): Extent => {
    const depth = lineDepth.get(id)!;
    const row = depth === 0 ? 0 : -depth;
    const start = items.length;
    const parents = lineParents(id);

    let cursor = left;
    const parentXs: Array<number> = [];
    const parentIds: Array<string> = [];
    let firstBlockEnd = items.length;
    parents.forEach((parentId, index) => {
      const parentDir: -1 | 1 = parents.length > 1 && index === 0 ? -1 : 1;
      const ext = placeAncestor(parentId, cursor, parentDir, false);
      if (index === 0) firstBlockEnd = items.length;
      parentXs.push(ext.cx);
      parentIds.push(parentId);
      cursor = ext.right + BLOCK_GAP;
    });
    const cx =
      parents.length > 0
        ? (Math.min(...parentXs) + Math.max(...parentXs)) / 2
        : left + CARD_WIDTH / 2;

    const ownStart = items.length;
    const g = genderOf(personMap.get(id));
    addCard(id, row, cx, isFocus ? "Focus" : ancestorRelation(depth, g));
    bloodSet.add(id);

    // Extra spouses (not the co-parent on the other side)
    const strip = placeSpouses(id, cx, row, isFocus, dir, () =>
      isFocus ? "Spouse" : spouseLabel(id)
    );

    // Siblings (collapsed behind a pill unless expanded)
    const siblings = collateralOf(id).filter((s) => !placed.has(s));
    const siblingCards: Array<string> = [];
    if (siblings.length > 0) {
      const side: -1 | 1 = isFocus ? -1 : dir;
      let edge = side === -1 ? strip.left : strip.right;
      if (isExpanded(id)) {
        for (const siblingId of siblings) {
          if (placed.has(siblingId)) continue;
          const at = items.length;
          const ctx = { lineDepth: depth, kidDepth: 0 };
          if (side === 1) {
            const ext = placeDescendant(
              siblingId,
              edge + SIBLING_GAP,
              row,
              ctx
            );
            edge = ext.right;
          } else {
            const ext = placeDescendant(siblingId, 0, row, ctx);
            const dx = edge - SIBLING_GAP - ext.right;
            shiftFrom(at, dx);
            edge = ext.left + dx;
          }
          siblingCards.push(siblingId);
        }
      }
      families.push({
        parents: parentIds,
        children: [id, ...siblingCards],
        pillKey: id,
        pillSide: side,
      });
      pillMeta.set(id, {
        hidden: siblings.length,
        // The bus sits above this row; "children" of the couple above
        noun: isFocus ? "sibling" : "child",
      });
    } else if (parentIds.length > 0) {
      families.push({ parents: parentIds, children: [id] });
    }

    // Keep the line straight: push the two parent blocks (and any cousin
    // groups inside them) symmetrically outward before moving this cluster
    if (parents.length === 2) spreadParents(start, firstBlockEnd, ownStart);
    // Fallback: shift this cluster clear of everything placed before it
    clearOverlap(ownStart);

    // Keep the block inside [left, ...]: shift right if it overflowed left
    const ext = extentOf(start);
    if (ext.min < left) shiftFrom(start, left - ext.min);
    const after = extentOf(start);
    return {
      left,
      right: after.max,
      cx: itemById.get(id)!.cx,
    };
  };

  // ---- Descendants -----------------------------------------------------
  type CollateralCtx = { lineDepth: number; kidDepth: number };
  const placeDescendantFamilies = (
    strip: Array<string>,
    row: number,
    left: number,
    ctx?: CollateralCtx
  ): { right: number; any: boolean } => {
    // Group children by the subset of strip members that are their parents
    const groups = new Map<string, Family>();
    const order: Array<string> = [];
    strip.forEach((member) => {
      for (const child of childrenOf.get(member) ?? []) {
        if (placed.has(child) || inLine(child)) continue;
        const parents = strip.filter((s) =>
          (parentsOf.get(child) ?? []).includes(s)
        );
        const key = parents.join("|");
        if (!groups.has(key)) {
          groups.set(key, { parents, children: [] });
          order.push(key);
        }
        const group = groups.get(key)!;
        if (!group.children.includes(child)) group.children.push(child);
      }
    });
    let cursor = left;
    let any = false;
    for (const key of order) {
      const group = groups.get(key)!;
      const visible: Array<string> = [];
      for (const child of group.children) {
        if (placed.has(child)) continue;
        // reserve the child immediately so siblings' recursion can't claim it
        const ext = placeDescendant(
          child,
          cursor,
          row + 1,
          ctx && { lineDepth: ctx.lineDepth, kidDepth: ctx.kidDepth + 1 }
        );
        visible.push(child);
        cursor = ext.right + SIBLING_GAP;
        any = true;
      }
      if (visible.length > 0)
        families.push({ parents: group.parents, children: visible });
    }
    return { right: cursor - SIBLING_GAP, any };
  };

  const stripFor = (id: string): Array<string> => {
    const spouses = (spousesOf.get(id) ?? []).filter(
      (s) => !placed.has(s) && !inLine(s)
    );
    const rightSide: Array<string> = [];
    const leftSide: Array<string> = [];
    spouses.forEach((s, i) => (i % 2 === 0 ? rightSide : leftSide).push(s));
    return [...leftSide.reverse(), id, ...rightSide];
  };

  const descendantRelationFor = (id: string, depth: number): string => {
    const parents = parentsOf.get(id) ?? [];
    const isBlood = parents.some((p) => descDepth.has(p) && bloodSet.has(p));
    return isBlood
      ? descendantRelation(depth, genderOf(personMap.get(id)))
      : `Step${descendantRelation(depth, genderOf(personMap.get(id))).toLowerCase()}`;
  };

  const placeDescendant = (
    id: string,
    left: number,
    row: number,
    ctx?: CollateralCtx
  ): Extent => {
    const start = items.length;
    const depth = row;
    const strip = stripFor(id);
    // Mark all strip members placed up front so nothing else claims them
    strip.forEach((member) => placed.add(member));
    const isBloodChild = descDepth.has(id) || ctx !== undefined;
    if (isBloodChild) bloodSet.add(id);

    const kids = placeDescendantFamilies(strip, row, left, ctx);
    const kidsStart = start;
    const kidSpan = kids.any ? kids.right - left : 0;
    const stripWidth =
      strip.length * CARD_WIDTH + (strip.length - 1) * SPOUSE_GAP;
    let stripLeft = left;
    if (kids.any) {
      if (stripWidth > kidSpan)
        shiftFrom(kidsStart, (stripWidth - kidSpan) / 2);
      else stripLeft = left + (kidSpan - stripWidth) / 2;
    }
    strip.forEach((member, index) => {
      const cx = stripLeft + index * (CARD_WIDTH + SPOUSE_GAP) + CARD_WIDTH / 2;
      const g = genderOf(personMap.get(id));
      const ownRelation = ctx
        ? ctx.kidDepth === 0
          ? collateralRelation(ctx.lineDepth, g)
          : collateralDescendantRelation(ctx.lineDepth, ctx.kidDepth, g)
        : descendantRelationFor(id, depth);
      const relation = member === id ? ownRelation : spouseLabel(id);
      addCard(member, row, cx, relation);
      if (index > 0) marriagePairs.push([strip[index - 1], member]);
    });
    return {
      left,
      right: left + Math.max(stripWidth, kidSpan),
      cx: itemById.get(id)!.cx,
    };
  };

  // ---- Run ---------------------------------------------------------------
  placeAncestor(focusId, 0, -1, true);
  const focusStrip = [focusId, ...(spousesOf.get(focusId) ?? [])].filter((s) =>
    placed.has(s)
  );
  {
    const startIdx = items.length;
    const kids = placeDescendantFamilies(focusStrip, 0, 0);
    if (kids.any) {
      // Center the descendants under the focus couple's midpoint
      const stripCx = focusStrip.map((s) => itemById.get(s)!.cx);
      const mid = (Math.min(...stripCx) + Math.max(...stripCx)) / 2;
      const ext = extentOf(startIdx);
      shiftFrom(startIdx, mid - (ext.min + ext.max) / 2);
      clearOverlap(startIdx);
    }
  }

  const measure = input.measureText ?? estimateTextWidth;

  // ---- Phase B: rows ------------------------------------------------------
  const cardsById = new Map<string, LayoutCard>();
  const rowNumbers = new Set<number>();
  items.forEach((it) => rowNumbers.add(it.row));
  const sortedRows = Array.from(rowNumbers).sort((a, b) => a - b);

  const cardMeasures = new Map<
    string,
    { nameLines: Array<string>; subtitleLines: Array<string>; height: number }
  >();
  const rowHeight = new Map<number, number>();
  for (const it of items) {
    if (it.kind !== "card") continue;
    const person = personMap.get(it.id)!;
    const deceased = !person.isLiving;
    const fullName = `${person.firstName} ${person.lastName}`.trim();
    const nameLines = wrapToWidth(
      deceased ? `${fullName}\u00a0\u2020` : fullName,
      TEXT_WIDTH,
      "name",
      measure
    ).map((line) => line.replace(/\u00a0/g, " "));
    const birth = yearOf(person.dateOfBirth);
    const death = yearOf(person.dateOfPassing);
    const years =
      birth && death
        ? `${birth} – ${death}`
        : birth
          ? `b. ${birth}`
          : death
            ? `d. ${death}`
            : "";
    const subtitleLines = [
      ...wrapToWidth(
        relationOf.get(it.id) ?? "",
        TEXT_WIDTH,
        "subtitle",
        measure
      ),
      ...(years ? [years] : []),
    ];
    const height = Math.max(
      MIN_CARD_HEIGHT,
      CARD_PADDING_Y * 2 +
        nameLines.length * NAME_LINE_HEIGHT +
        subtitleLines.length * SUBTITLE_LINE_HEIGHT +
        4
    );
    cardMeasures.set(it.id, { nameLines, subtitleLines, height });
    rowHeight.set(it.row, Math.max(rowHeight.get(it.row) ?? 0, height));
  }
  for (const r of sortedRows)
    if (!rowHeight.has(r)) rowHeight.set(r, MIN_CARD_HEIGHT);

  const rowTop = new Map<number, number>();
  let yCursor = 0;
  for (const r of sortedRows) {
    rowTop.set(r, yCursor);
    yCursor += rowHeight.get(r)! + ROW_GAP;
  }

  const cards: Array<LayoutCard> = [];
  for (const it of items) {
    if (it.kind !== "card") continue;
    const person = personMap.get(it.id)!;
    const measure = cardMeasures.get(it.id)!;
    const card: LayoutCard = {
      id: it.id,
      name: `${person.firstName} ${person.lastName}`.trim(),
      initials: initialsOf(person),
      nameLines: measure.nameLines,
      relation: relationOf.get(it.id) ?? "",
      subtitleLines: measure.subtitleLines,
      birth: yearOf(person.dateOfBirth),
      death: yearOf(person.dateOfPassing),
      deceased: !person.isLiving,
      blood: bloodSet.has(it.id),
      isFocus: it.id === focusId,
      row: it.row,
      x: it.cx - CARD_WIDTH / 2,
      y: rowTop.get(it.row)!,
      width: CARD_WIDTH,
      height: rowHeight.get(it.row)!,
    };
    cards.push(card);
    cardsById.set(it.id, card);
  }

  // ---- Phase C: connectors & pills ------------------------------------------
  const connectors: Array<LayoutConnector> = [];
  const pills: Array<LayoutPill> = [];
  const marriageY = (card: LayoutCard) => card.y + MARRIAGE_Y;

  const seenMarriage = new Set<string>();
  const addMarriage = (aId: string, bId: string) => {
    const key = [aId, bId].sort().join("~");
    if (seenMarriage.has(key)) return;
    seenMarriage.add(key);
    const a = cardsById.get(aId);
    const b = cardsById.get(bId);
    if (!a || !b) return;
    const [l, r] = a.x < b.x ? [a, b] : [b, a];
    const y = marriageY(l);
    connectors.push({
      id: `m-${key}`,
      kind: "marriage",
      d: `M ${l.x + l.width} ${y} H ${r.x}`,
      dashed: false,
    });
  };
  marriagePairs.forEach(([a, b]) => addMarriage(a, b));

  families.forEach((family, index) => {
    const parentCards = family.parents
      .map((p) => cardsById.get(p))
      .filter((c): c is LayoutCard => !!c);
    const childCards = family.children
      .map((c) => cardsById.get(c))
      .filter((c): c is LayoutCard => !!c);
    if (parentCards.length === 0 || childCards.length === 0) return;

    const parentRow = parentCards[0].row;
    const parentBottom = rowTop.get(parentRow)! + rowHeight.get(parentRow)!;
    const childTop = rowTop.get(childCards[0].row)!;
    const busY = childTop - ROW_GAP / 2;

    let dropX: number;
    let dropStartY: number;
    if (parentCards.length >= 2) {
      const sorted = parentCards.slice().sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      for (let i = 0; i < sorted.length - 1; i++)
        addMarriage(sorted[i].id, sorted[i + 1].id);
      dropX = (first.x + first.width + last.x) / 2;
      dropStartY = marriageY(first);
    } else {
      dropX = parentCards[0].x + parentCards[0].width / 2;
      dropStartY = parentBottom;
    }

    const childXs = childCards.map((c) => c.x + c.width / 2);

    // Pill on a dashed stub
    if (family.pillKey) {
      const meta = pillMeta.get(family.pillKey)!;
      const open = isExpanded(family.pillKey);
      const label = open
        ? "− hide"
        : `+${meta.hidden} ${meta.noun === "sibling" ? (meta.hidden === 1 ? "sibling" : "siblings") : meta.hidden === 1 ? "child" : "children"}`;
      const pillRow = childCards[0].row;
      const side = family.pillSide ?? -1;
      // Short stub on the side opposite the siblings, right at the bus end
      const solidMin = Math.min(dropX, ...childXs);
      const solidMax = Math.max(dropX, ...childXs);
      const pillLeft =
        side === -1
          ? solidMax + STUB_LENGTH
          : solidMin - STUB_LENGTH - PILL_WIDTH;
      pills.push({
        key: family.pillKey,
        label,
        expanded: open,
        row: pillRow,
        x: pillLeft,
        y: rowTop.get(pillRow)! - ROW_GAP / 2 - PILL_HEIGHT / 2,
        width: PILL_WIDTH,
        height: PILL_HEIGHT,
      });
      connectors.push({
        id: `stub-${index}`,
        kind: "stub",
        d:
          side === -1
            ? `M ${solidMax} ${busY} H ${pillLeft}`
            : `M ${solidMin} ${busY} H ${pillLeft + PILL_WIDTH}`,
        dashed: true,
      });
    }

    connectors.push({
      id: `drop-${index}`,
      kind: "drop",
      d: `M ${dropX} ${dropStartY} V ${busY}`,
      dashed: false,
    });
    // Solid bus only spans real connections (not the dashed stub)
    const solidMin = Math.min(dropX, ...childXs);
    const solidMax = Math.max(dropX, ...childXs);
    if (solidMax > solidMin) {
      connectors.push({
        id: `bus-${index}`,
        kind: "bus",
        d: `M ${solidMin} ${busY} H ${solidMax}`,
        dashed: false,
      });
    }
    childCards.forEach((child) => {
      connectors.push({
        id: `child-${index}-${child.id}`,
        kind: "child",
        d: `M ${child.x + child.width / 2} ${busY} V ${child.y}`,
        dashed: false,
      });
    });
  });

  // Bounds & rows
  let minX = Infinity;
  let maxX = -Infinity;
  cards.forEach((c) => {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x + c.width);
  });
  pills.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x + p.width);
  });
  const rows: Array<LayoutRow> = sortedRows.map((r) => ({
    row: r,
    label: rowLabel(r),
    y: rowTop.get(r)!,
    height: rowHeight.get(r)!,
  }));
  const last = rows[rows.length - 1];

  return {
    cards,
    connectors,
    pills,
    rows,
    bounds: {
      minX: minX - GUTTER_WIDTH,
      maxX,
      minY: rows[0].y - ROW_GAP / 2,
      maxY: last.y + last.height + ROW_GAP / 2,
    },
  };
}
