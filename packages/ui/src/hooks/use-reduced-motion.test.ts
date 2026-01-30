import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { prefersReducedMotion, useReducedMotion } from "./use-reduced-motion";

describe("useReducedMotion", () => {
  type Listener = (event: { matches: boolean }) => void;
  let listeners: Array<Listener> = [];
  const originalMatchMedia = window.matchMedia;

  function createMockMatchMedia(matches: boolean) {
    return function (_query: string) {
      return {
        matches,
        media: _query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, callback: Listener) => {
          listeners.push(callback);
        },
        removeEventListener: () => {
          listeners = [];
        },
        dispatchEvent: () => true,
      } as unknown as MediaQueryList;
    };
  }

  beforeEach(() => {
    listeners = [];
    window.matchMedia = createMockMatchMedia(false);
  });

  afterEach(() => {
    listeners = [];
    window.matchMedia = originalMatchMedia;
  });

  it("returns false when user does not prefer reduced motion", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when user prefers reduced motion", () => {
    window.matchMedia = createMockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates when preference changes", () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);

    // Simulate preference change
    act(() => {
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(result.current).toBe(true);
  });
});

describe("prefersReducedMotion", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("returns false when user does not prefer reduced motion", () => {
    window.matchMedia = () =>
      ({
        matches: false,
      }) as unknown as MediaQueryList;
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns true when user prefers reduced motion", () => {
    window.matchMedia = () =>
      ({
        matches: true,
      }) as unknown as MediaQueryList;
    expect(prefersReducedMotion()).toBe(true);
  });
});
