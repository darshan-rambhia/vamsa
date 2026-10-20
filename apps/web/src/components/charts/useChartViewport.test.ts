import { describe, expect, it } from "vitest";
import { computeFitTransform } from "./useChartViewport";

const margin = { top: 40, right: 40, bottom: 40, left: 40 };
const view = { width: 1000, height: 600 };
const focusPoint = { x: 500, y: 300 };
const opts = { minFitScale: 0.85, focusPoint };

describe("computeFitTransform", () => {
  it("fits small content and centers it", () => {
    const t = computeFitTransform(
      { minX: 0, maxX: 400, minY: 0, maxY: 200 },
      view,
      margin,
      0.1,
      opts
    );
    expect(t.scale).toBe(1);
    expect(t.x + 200).toBeCloseTo(500);
    expect(t.y + 100).toBeCloseTo(300);
  });

  it("uses the minimum scale and centers vertically when the height fits", () => {
    // wide tree: needs scale < 0.85 to fit, but height at 0.85 fits
    const bounds = { minX: 0, maxX: 2000, minY: 0, maxY: 500 };
    const t = computeFitTransform(bounds, view, margin, 0.1, opts);
    expect(t.scale).toBe(0.85);
    const topPad = bounds.minY * t.scale + t.y;
    const bottomPad = view.height - (bounds.maxY * t.scale + t.y);
    expect(topPad).toBeCloseTo(bottomPad);
    expect(topPad).toBeGreaterThanOrEqual(margin.top);
    // x centers on the focus
    expect(focusPoint.x * t.scale + t.x).toBeCloseTo(view.width / 2);
  });

  it("keeps top padding and the focus visible when the tree is too tall", () => {
    const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1600 };
    const focus = { x: 500, y: 120 }; // focus near the top
    const t = computeFitTransform(bounds, view, margin, 0.1, {
      minFitScale: 0.85,
      focusPoint: focus,
    });
    expect(t.scale).toBe(0.85);
    expect(bounds.minY * t.scale + t.y).toBeGreaterThanOrEqual(margin.top);
    const focusScreenY = focus.y * t.scale + t.y;
    expect(focusScreenY).toBeGreaterThan(0);
    expect(focusScreenY).toBeLessThan(view.height);
  });

  it("keeps a focus near the bottom on screen", () => {
    const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1600 };
    const focus = { x: 500, y: 1500 };
    const t = computeFitTransform(bounds, view, margin, 0.1, {
      minFitScale: 0.85,
      focusPoint: focus,
    });
    const focusScreenY = focus.y * t.scale + t.y;
    expect(focusScreenY).toBeLessThanOrEqual(view.height - margin.bottom);
    expect(focusScreenY).toBeGreaterThan(0);
  });
});
