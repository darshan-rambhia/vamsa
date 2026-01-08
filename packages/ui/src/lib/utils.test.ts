/**
 * Unit Tests for UI Utility Functions
 */
import { describe, test, expect } from "bun:test";
import { cn } from "./utils";

describe("cn (class name utility)", () => {
  test("combines class names", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  test("handles single class", () => {
    const result = cn("single");
    expect(result).toBe("single");
  });

  test("handles empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  test("filters out falsy values", () => {
    const result = cn("keep", false && "skip", undefined, null, "also-keep");
    expect(result).toBe("keep also-keep");
  });

  test("handles conditional classes", () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn("base", isActive && "active", isDisabled && "disabled");
    expect(result).toBe("base active");
  });

  test("merges Tailwind classes correctly", () => {
    // twMerge should resolve conflicts
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  test("merges conflicting Tailwind utilities", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  test("preserves non-conflicting Tailwind utilities", () => {
    const result = cn("text-red-500", "bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });

  test("handles array input via clsx", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toBe("class1 class2");
  });

  test("handles object input via clsx", () => {
    const result = cn({ active: true, disabled: false });
    expect(result).toBe("active");
  });

  test("handles mixed inputs", () => {
    const result = cn("base", ["arr1", "arr2"], { conditional: true }, "end");
    expect(result).toBe("base arr1 arr2 conditional end");
  });

  test("handles nested conditions", () => {
    const isLarge = true;
    const isRounded = false;
    const result = cn(
      "btn",
      isLarge ? "btn-lg" : "btn-sm",
      isRounded && "rounded-full"
    );
    expect(result).toBe("btn btn-lg");
  });

  test("handles spacing utilities correctly", () => {
    const result = cn("p-2", "pt-4");
    // pt-4 should not override p-2 because they're different properties
    expect(result).toContain("p-2");
    expect(result).toContain("pt-4");
  });

  test("handles responsive variants", () => {
    const result = cn("block", "md:flex", "lg:grid");
    expect(result).toBe("block md:flex lg:grid");
  });

  test("handles pseudo-class variants", () => {
    const result = cn("text-black", "hover:text-blue-500", "focus:ring-2");
    expect(result).toContain("text-black");
    expect(result).toContain("hover:text-blue-500");
    expect(result).toContain("focus:ring-2");
  });
});
