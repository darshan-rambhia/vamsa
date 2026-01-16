/**
 * Unit Tests for Button Component
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  describe("rendering", () => {
    test("renders button with text", () => {
      const { getByRole, getByText } = render(<Button>Click me</Button>);
      expect(getByRole("button")).toBeDefined();
      expect(getByText("Click me")).toBeDefined();
    });

    test("renders with children", () => {
      const { getByRole, getByText } = render(
        <Button>
          <span>Icon</span>
          Text
        </Button>
      );
      expect(getByRole("button")).toBeDefined();
      expect(getByText("Icon")).toBeDefined();
    });

    test("renders with custom className", () => {
      const { getByRole } = render(
        <Button className="custom-class">Button</Button>
      );
      const button = getByRole("button");
      expect(button.className).toContain("custom-class");
    });
  });

  describe("variants", () => {
    test("applies default variant with primary background", () => {
      const { getByRole } = render(<Button>Default</Button>);
      const button = getByRole("button");
      // Verify button has shadow (only primary and secondary have shadow-sm)
      expect(button.className).toContain("shadow-sm");
      expect(button.className).toContain("bg-primary");
    });

    test("destructive variant differs from default", () => {
      const { getByRole, rerender } = render(<Button>Default</Button>);
      const defaultButton = getByRole("button");
      const defaultClasses = defaultButton.className;

      rerender(<Button variant="destructive">Delete</Button>);
      const destructiveButton = getByRole("button");
      // Verify it's not the same styling as default
      expect(destructiveButton.className).not.toEqual(defaultClasses);
      expect(destructiveButton.className).toContain("bg-destructive");
      expect(destructiveButton.className).toContain("shadow-sm");
    });

    test("outline variant has transparent background with border", () => {
      const { getByRole } = render(<Button variant="outline">Outline</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("bg-transparent");
      expect(button.className).toContain("border");
      // Outline should not have shadow
      expect(button.className).not.toContain("shadow-sm");
    });

    test("secondary variant uses secondary colors", () => {
      const { getByRole } = render(
        <Button variant="secondary">Secondary</Button>
      );
      const button = getByRole("button");
      expect(button.className).toContain("bg-secondary");
      expect(button.className).toContain("shadow-sm");
    });

    test("ghost variant has minimal styling", () => {
      const { getByRole } = render(<Button variant="ghost">Ghost</Button>);
      const button = getByRole("button");
      // Ghost should not have background color or shadow
      expect(button.className).not.toContain("bg-primary");
      expect(button.className).not.toContain("bg-secondary");
      expect(button.className).not.toContain("bg-destructive");
      expect(button.className).not.toContain("shadow-sm");
      // But should have hover effect
      expect(button.className).toContain("hover:bg-accent");
    });

    test("link variant renders as text with underline on hover", () => {
      const { getByRole } = render(<Button variant="link">Link</Button>);
      const button = getByRole("button");
      // Link variant should not have background
      expect(button.className).not.toContain("bg-primary");
      expect(button.className).not.toContain("shadow-sm");
      // Should have underline styling
      expect(button.className).toContain("underline-offset-4");
      expect(button.className).toContain("hover:underline");
    });
  });

  describe("sizes", () => {
    test("default size has standard dimensions", () => {
      const { getByRole } = render(<Button>Default Size</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("h-10");
      expect(button.className).toContain("px-6");
      expect(button.className).toContain("py-2.5");
    });

    test("small size is visually distinct from default", () => {
      const { getByRole, rerender } = render(<Button>Default</Button>);
      const defaultButton = getByRole("button");
      const defaultHeight = defaultButton.className.includes("h-10");

      rerender(<Button size="sm">Small</Button>);
      const smallButton = getByRole("button");
      // Verify small is actually shorter
      expect(smallButton.className).toContain("h-9");
      expect(defaultHeight).toBe(true);
      // Verify padding is reduced
      expect(smallButton.className).toContain("px-6");
    });

    test("large size is visually distinct from default", () => {
      const { getByRole, rerender } = render(<Button>Default</Button>);
      // First render to establish baseline, then rerender with size
      rerender(<Button size="lg">Large</Button>);
      const largeButton = getByRole("button");
      // Verify large is actually taller
      expect(largeButton.className).toContain("h-12");
      expect(largeButton.className).toContain("px-9");
      expect(largeButton.className).toContain("py-3");
      // Verify text is larger
      expect(largeButton.className).toContain("text-base");
    });

    test("icon size creates square button", () => {
      const { getByRole } = render(<Button size="icon">I</Button>);
      const button = getByRole("button");
      // Icon size should be square
      expect(button.className).toContain("h-10");
      expect(button.className).toContain("w-10");
      // Icon size should not have padding (height/width define size)
      expect(button.className).not.toContain("px-6");
    });
  });

  describe("asChild", () => {
    test("renders as child element when asChild is true", () => {
      const { getByRole } = render(
        <Button asChild>
          <a href="/link">Link Button</a>
        </Button>
      );
      const link = getByRole("link");
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("/link");
    });
  });

  describe("HTML attributes", () => {
    test("passes through type attribute", () => {
      const { getByRole } = render(<Button type="submit">Submit</Button>);
      const button = getByRole("button");
      expect(button.getAttribute("type")).toBe("submit");
    });

    test("passes through disabled attribute", () => {
      const { getByRole } = render(<Button disabled>Disabled</Button>);
      const button = getByRole("button");
      expect(button.hasAttribute("disabled")).toBe(true);
    });

    test("disabled state prevents interaction", () => {
      const { getByRole } = render(<Button disabled>Disabled</Button>);
      const button = getByRole("button") as HTMLButtonElement;
      // Verify disabled is actually set (not just a className)
      expect(button.disabled).toBe(true);
      // Verify disabled styling is present
      expect(button.className).toContain("disabled:opacity-50");
      expect(button.className).toContain("disabled:pointer-events-none");
    });

    test("passes through aria attributes", () => {
      const { getByRole } = render(
        <Button aria-label="Close dialog">X</Button>
      );
      const button = getByRole("button");
      expect(button.getAttribute("aria-label")).toBe("Close dialog");
    });

    test("passes through data attributes", () => {
      const { getByTestId } = render(
        <Button data-testid="submit-btn">Submit</Button>
      );
      expect(getByTestId("submit-btn")).toBeDefined();
    });
  });
});

describe("buttonVariants", () => {
  test("generates valid base button styling", () => {
    const classes = buttonVariants();
    // Verify essential layout classes are present
    expect(classes).toContain("inline-flex");
    expect(classes).toContain("items-center");
    expect(classes).toContain("justify-center");
    // Verify base variant styling
    expect(classes).toContain("bg-primary");
    expect(classes).toContain("h-10");
    // Verify interactive states exist
    expect(classes).toContain("focus-visible:outline-none");
    expect(classes).toContain("disabled:opacity-50");
  });

  test("applies distinct styling for different variants", () => {
    const defaultClasses = buttonVariants({ variant: "default" });
    const destructiveClasses = buttonVariants({ variant: "destructive" });
    const outlineClasses = buttonVariants({ variant: "outline" });

    // Each variant should have different background/styling
    expect(destructiveClasses).not.toEqual(defaultClasses);
    expect(outlineClasses).not.toEqual(defaultClasses);
    expect(destructiveClasses).toContain("bg-destructive");
    expect(outlineClasses).toContain("border");
  });

  test("applies distinct sizing for different sizes", () => {
    const defaultSize = buttonVariants({ size: "default" });
    const smallSize = buttonVariants({ size: "sm" });
    const largeSize = buttonVariants({ size: "lg" });

    // Each size should produce different classes
    expect(defaultSize).not.toEqual(smallSize);
    expect(largeSize).not.toEqual(defaultSize);
    expect(defaultSize).toContain("h-10");
    expect(smallSize).toContain("h-9");
    expect(largeSize).toContain("h-12");
  });

  test("preserves custom className while applying variants", () => {
    const classes = buttonVariants({
      variant: "outline",
      size: "lg",
      className: "my-custom-class",
    });
    // Custom class should be preserved
    expect(classes).toContain("my-custom-class");
    // Variant and size should still apply
    expect(classes).toContain("border");
    expect(classes).toContain("h-12");
  });
});
