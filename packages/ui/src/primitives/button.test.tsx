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
      const { getByRole } = render(<Button className="custom-class">Button</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("custom-class");
    });
  });

  describe("variants", () => {
    test("applies default variant", () => {
      const { getByRole } = render(<Button>Default</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("bg-primary");
    });

    test("applies destructive variant", () => {
      const { getByRole } = render(<Button variant="destructive">Delete</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("bg-destructive");
    });

    test("applies outline variant", () => {
      const { getByRole } = render(<Button variant="outline">Outline</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("border");
    });

    test("applies secondary variant", () => {
      const { getByRole } = render(<Button variant="secondary">Secondary</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("bg-secondary");
    });

    test("applies ghost variant", () => {
      const { getByRole } = render(<Button variant="ghost">Ghost</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("hover:bg-accent");
    });

    test("applies link variant", () => {
      const { getByRole } = render(<Button variant="link">Link</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("underline-offset-4");
    });
  });

  describe("sizes", () => {
    test("applies default size", () => {
      const { getByRole } = render(<Button>Default Size</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("h-10");
    });

    test("applies sm size", () => {
      const { getByRole } = render(<Button size="sm">Small</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("h-9");
    });

    test("applies lg size", () => {
      const { getByRole } = render(<Button size="lg">Large</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("h-12");
    });

    test("applies icon size", () => {
      const { getByRole } = render(<Button size="icon">I</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("h-10");
      expect(button.className).toContain("w-10");
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

    test("applies disabled styles", () => {
      const { getByRole } = render(<Button disabled>Disabled</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("disabled:opacity-50");
    });

    test("passes through aria attributes", () => {
      const { getByRole } = render(<Button aria-label="Close dialog">X</Button>);
      const button = getByRole("button");
      expect(button.getAttribute("aria-label")).toBe("Close dialog");
    });

    test("passes through data attributes", () => {
      const { getByTestId } = render(<Button data-testid="submit-btn">Submit</Button>);
      expect(getByTestId("submit-btn")).toBeDefined();
    });
  });
});

describe("buttonVariants", () => {
  test("generates default classes", () => {
    const classes = buttonVariants();
    expect(classes).toContain("inline-flex");
    expect(classes).toContain("items-center");
    expect(classes).toContain("bg-primary");
    expect(classes).toContain("h-10");
  });

  test("generates classes for specific variant", () => {
    const classes = buttonVariants({ variant: "destructive" });
    expect(classes).toContain("bg-destructive");
  });

  test("generates classes for specific size", () => {
    const classes = buttonVariants({ size: "lg" });
    expect(classes).toContain("h-12");
  });

  test("merges custom className", () => {
    const classes = buttonVariants({ className: "my-custom-class" });
    expect(classes).toContain("my-custom-class");
  });
});
