import { describe, expect, it } from "bun:test";
import { CommandPalette } from "./command-palette";
import { CommandPaletteTrigger } from "./command-palette-trigger";

/**
 * Command Palette Component Tests
 *
 * Ensures the command palette:
 * - Exports the necessary components
 * - Is a valid React component
 */
describe("CommandPalette", () => {
  it("should export CommandPalette component", () => {
    expect(CommandPalette).toBeDefined();
    expect(typeof CommandPalette).toBe("function");
  });

  it("should export CommandPaletteTrigger component", () => {
    expect(CommandPaletteTrigger).toBeDefined();
    expect(typeof CommandPaletteTrigger).toBe("function");
  });
});
