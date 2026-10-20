import { describe, expect, it, vi } from "vitest";
import {
  RELOAD_GUARD_KEY,
  isModuleLoadError,
  parseReloadRecord,
  shouldAutoReload,
  tryAutoReload,
} from "./module-load-recovery";

describe("isModuleLoadError", () => {
  it.each([
    "TypeError: Importing a module script failed.",
    "Failed to fetch dynamically imported module: https://x/a.js",
    "error loading dynamically imported module",
  ])("matches %s", (msg) => {
    expect(isModuleLoadError(new Error(msg))).toBe(true);
    expect(isModuleLoadError(msg)).toBe(true);
    expect(isModuleLoadError({ message: msg })).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isModuleLoadError(new Error("boom"))).toBe(false);
    expect(isModuleLoadError(null)).toBe(false);
    expect(isModuleLoadError(undefined)).toBe(false);
    expect(isModuleLoadError(42)).toBe(false);
  });
});

describe("shouldAutoReload", () => {
  it("allows with no record or different path", () => {
    expect(shouldAutoReload(null, "/a", 1000)).toBe(true);
    expect(shouldAutoReload({ path: "/b", ts: 999 }, "/a", 1000)).toBe(true);
  });
  it("blocks same path within window, allows after", () => {
    expect(shouldAutoReload({ path: "/a", ts: 1000 }, "/a", 5000)).toBe(false);
    expect(shouldAutoReload({ path: "/a", ts: 1000 }, "/a", 11000)).toBe(true);
  });
  it("allows when clock moved backwards", () => {
    expect(shouldAutoReload({ path: "/a", ts: 5000 }, "/a", 1000)).toBe(true);
  });
});

describe("parseReloadRecord", () => {
  it("parses valid and rejects junk", () => {
    expect(parseReloadRecord('{"path":"/a","ts":1}')).toEqual({
      path: "/a",
      ts: 1,
    });
    expect(parseReloadRecord("nope")).toBeNull();
    expect(parseReloadRecord('{"path":1}')).toBeNull();
    expect(parseReloadRecord(null)).toBeNull();
  });
});

describe("tryAutoReload", () => {
  function memStorage() {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
    };
  }

  it("reloads once, then blocks within window", () => {
    const storage = memStorage();
    const reload = vi.fn();
    expect(tryAutoReload(storage, "/a", 1000, reload)).toBe(true);
    expect(tryAutoReload(storage, "/a", 2000, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem(RELOAD_GUARD_KEY)).toContain('"/a"');
    expect(tryAutoReload(storage, "/a", 12000, reload)).toBe(true);
  });

  it("does not reload without usable storage", () => {
    const reload = vi.fn();
    expect(tryAutoReload(null, "/a", 1, reload)).toBe(false);
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(tryAutoReload(broken, "/a", 1, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
