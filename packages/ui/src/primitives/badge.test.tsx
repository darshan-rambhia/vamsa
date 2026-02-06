/**
 * Unit Tests for Badge Component
 */
import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { Badge, badgeVariants } from "./badge";

describe("Badge", () => {
  describe("rendering", () => {
    test("renders badge element", () => {
      const { getByTestId } = render(
        <Badge data-testid="badge">Badge Text</Badge>
      );
      expect(getByTestId("badge")).toBeDefined();
    });

    test("renders with text content", () => {
      const { getByText } = render(<Badge>Active</Badge>);
      expect(getByText("Active")).toBeDefined();
    });

    test("renders with children elements", () => {
      const { getByText } = render(
        <Badge>
          <span>Icon</span>
          Status
        </Badge>
      );
      expect(getByText("Icon")).toBeDefined();
      expect(getByText("Status")).toBeDefined();
    });

    test("renders as div element", () => {
      const { getByTestId } = render(
        <Badge data-testid="badge">Content</Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.tagName).toBe("DIV");
    });
  });

  describe("base styles", () => {
    test("applies base styling classes", () => {
      const { getByTestId } = render(<Badge data-testid="badge">Badge</Badge>);
      const badge = getByTestId("badge");
      // Layout
      expect(badge.className).toContain("inline-flex");
      expect(badge.className).toContain("items-center");
      // Spacing
      expect(badge.className).toContain("px-3");
      expect(badge.className).toContain("py-1");
      // Typography
      expect(badge.className).toContain("text-xs");
      expect(badge.className).toContain("font-semibold");
      expect(badge.className).toContain("tracking-wide");
      // Shape
      expect(badge.className).toContain("rounded-full");
      // Animation
      expect(badge.className).toContain("transition-colors");
    });

    test("applies primary background and text color", () => {
      const { getByTestId } = render(
        <Badge data-testid="badge">Default</Badge>
      );
      const badge = getByTestId("badge");
      // All base classes should be present with default variant
      expect(badge.className).toContain("bg-primary");
      expect(badge.className).toContain("text-primary");
      expect(badge.className).toContain("border");
    });
  });

  describe("variants", () => {
    test("default variant uses primary colors", () => {
      const { getByTestId } = render(
        <Badge variant="default" data-testid="badge">
          Default
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.className).toContain("bg-primary");
      expect(badge.className).toContain("text-primary");
      expect(badge.className).toContain("border-primary");
    });

    test("secondary variant uses green colors", () => {
      const { getByTestId } = render(
        <Badge variant="secondary" data-testid="badge">
          Living
        </Badge>
      );
      const badge = getByTestId("badge");
      // Should contain green color classes
      expect(badge.className).toContain("bg-green");
      expect(badge.className).toContain("text-green");
      expect(badge.className).toContain("border-green");
    });

    test("destructive variant uses red colors", () => {
      const { getByTestId } = render(
        <Badge variant="destructive" data-testid="badge">
          Error
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.className).toContain("bg-destructive");
      expect(badge.className).toContain("text-destructive");
      expect(badge.className).toContain("border-destructive");
    });

    test("outline variant uses amber colors", () => {
      const { getByTestId } = render(
        <Badge variant="outline" data-testid="badge">
          Deceased
        </Badge>
      );
      const badge = getByTestId("badge");
      // Should contain amber color classes
      expect(badge.className).toContain("bg-amber");
      expect(badge.className).toContain("text-amber");
      expect(badge.className).toContain("border-amber");
    });

    test("muted variant uses muted colors with no border", () => {
      const { getByTestId } = render(
        <Badge variant="muted" data-testid="badge">
          Count
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.className).toContain("bg-muted");
      expect(badge.className).toContain("text-muted-foreground");
      // Muted should have transparent border
      expect(badge.className).toContain("border-transparent");
    });

    test("variant classes are applied without base variant changes", () => {
      const { getByTestId, rerender } = render(
        <Badge variant="default" data-testid="badge">
          Default
        </Badge>
      );
      const defaultBadge = getByTestId("badge");
      const defaultClasses = defaultBadge.className;

      rerender(
        <Badge variant="secondary" data-testid="badge">
          Secondary
        </Badge>
      );
      const secondaryBadge = getByTestId("badge");
      // Classes should be different for different variants
      expect(defaultClasses).not.toEqual(secondaryBadge.className);
    });

    test("variant classes are distinct from each other", () => {
      const defaultClasses = badgeVariants({ variant: "default" });
      const secondaryClasses = badgeVariants({ variant: "secondary" });
      const destructiveClasses = badgeVariants({ variant: "destructive" });
      const outlineClasses = badgeVariants({ variant: "outline" });
      const mutedClasses = badgeVariants({ variant: "muted" });

      // All variants should produce different class combinations
      expect(defaultClasses).not.toEqual(secondaryClasses);
      expect(defaultClasses).not.toEqual(destructiveClasses);
      expect(defaultClasses).not.toEqual(outlineClasses);
      expect(defaultClasses).not.toEqual(mutedClasses);
      expect(secondaryClasses).not.toEqual(destructiveClasses);
      expect(destructiveClasses).not.toEqual(outlineClasses);
      expect(outlineClasses).not.toEqual(mutedClasses);
    });
  });

  describe("className forwarding", () => {
    test("merges custom className with variant styles", () => {
      const { getByTestId } = render(
        <Badge className="custom-badge-class" data-testid="badge">
          Custom
        </Badge>
      );
      const badge = getByTestId("badge");
      // Custom class should be present
      expect(badge.className).toContain("custom-badge-class");
      // Default variant styles should still be present
      expect(badge.className).toContain("bg-primary");
      expect(badge.className).toContain("text-primary");
    });

    test("custom className works with default variant", () => {
      const { getByTestId } = render(
        <Badge variant="default" className="test-class" data-testid="badge">
          Test
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.className).toContain("test-class");
    });

    test("custom className works with secondary variant", () => {
      const { getByTestId } = render(
        <Badge variant="secondary" className="test-class" data-testid="badge">
          Test
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.className).toContain("test-class");
    });

    test("custom className works with destructive variant", () => {
      const { getByTestId } = render(
        <Badge variant="destructive" className="test-class" data-testid="badge">
          Test
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.className).toContain("test-class");
    });

    test("custom className works with outline variant", () => {
      const { getByTestId } = render(
        <Badge variant="outline" className="test-class" data-testid="badge">
          Test
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.className).toContain("test-class");
    });

    test("custom className works with muted variant", () => {
      const { getByTestId } = render(
        <Badge variant="muted" className="test-class" data-testid="badge">
          Test
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.className).toContain("test-class");
    });

    test("custom className can override variant styling", () => {
      const { getByTestId } = render(
        <Badge className="!bg-white" data-testid="badge">
          Override
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.className).toContain("!bg-white");
    });
  });

  describe("HTML attributes", () => {
    test("forwards data attributes", () => {
      const { getByTestId } = render(
        <Badge data-testid="badge" data-custom="value">
          Test
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.getAttribute("data-custom")).toBe("value");
    });

    test("forwards aria attributes", () => {
      const { getByTestId } = render(
        <Badge data-testid="badge" aria-label="Status badge">
          Status
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.getAttribute("aria-label")).toBe("Status badge");
    });

    test("forwards title attribute", () => {
      const { getByTestId } = render(
        <Badge data-testid="badge" title="This person is living">
          Living
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.getAttribute("title")).toBe("This person is living");
    });

    test("forwards id attribute", () => {
      const { getByTestId } = render(
        <Badge data-testid="badge" id="status-living">
          Living
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.getAttribute("id")).toBe("status-living");
    });

    test("forwards multiple HTML attributes", () => {
      const { getByTestId } = render(
        <Badge
          data-testid="badge"
          data-status="active"
          aria-label="Active status"
          title="Currently active"
          id="active-badge"
          className="extra"
        >
          Active
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.getAttribute("data-status")).toBe("active");
      expect(badge.getAttribute("aria-label")).toBe("Active status");
      expect(badge.getAttribute("title")).toBe("Currently active");
      expect(badge.getAttribute("id")).toBe("active-badge");
      expect(badge.className).toContain("extra");
    });
  });

  describe("composition", () => {
    test("renders badge with mixed content", () => {
      const { getByText, getByTestId } = render(
        <Badge data-testid="badge">
          <span>✓</span> Verified
        </Badge>
      );
      expect(getByTestId("badge")).toBeDefined();
      expect(getByText("✓")).toBeDefined();
      expect(getByText("Verified")).toBeDefined();
    });

    test("renders empty badge", () => {
      const { getByTestId } = render(<Badge data-testid="badge" />);
      expect(getByTestId("badge")).toBeDefined();
      const badge = getByTestId("badge");
      expect(badge.tagName).toBe("DIV");
      expect(badge.textContent).toBe("");
    });

    test("renders badge with only whitespace", () => {
      const { getByTestId } = render(<Badge data-testid="badge"> </Badge>);
      expect(getByTestId("badge")).toBeDefined();
    });
  });

  describe("accessibility", () => {
    test("maintains semantic div structure", () => {
      const { getByTestId } = render(<Badge data-testid="badge">Status</Badge>);
      const badge = getByTestId("badge");
      expect(badge.tagName).toBe("DIV");
    });

    test("supports aria-label for screen readers", () => {
      const { getByTestId } = render(
        <Badge data-testid="badge" aria-label="Person is deceased">
          Deceased
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.getAttribute("aria-label")).toBe("Person is deceased");
    });

    test("supports role attribute", () => {
      const { getByTestId } = render(
        <Badge data-testid="badge" role="status">
          Status
        </Badge>
      );
      const badge = getByTestId("badge");
      expect(badge.getAttribute("role")).toBe("status");
    });
  });
});

describe("badgeVariants", () => {
  test("generates valid base badge styling", () => {
    const classes = badgeVariants();
    // Layout
    expect(classes).toContain("inline-flex");
    expect(classes).toContain("items-center");
    // Spacing
    expect(classes).toContain("px-3");
    expect(classes).toContain("py-1");
    // Typography
    expect(classes).toContain("text-xs");
    expect(classes).toContain("font-semibold");
    expect(classes).toContain("tracking-wide");
    // Shape
    expect(classes).toContain("rounded-full");
    // Animation
    expect(classes).toContain("transition-colors");
    // Default variant color
    expect(classes).toContain("bg-primary");
  });

  test("default variant is applied when no variant specified", () => {
    const defaultClasses = badgeVariants();
    const explicitDefaultClasses = badgeVariants({ variant: "default" });
    // Should be identical
    expect(defaultClasses).toEqual(explicitDefaultClasses);
  });

  test("each variant produces distinct classes", () => {
    const default_classes = badgeVariants({ variant: "default" });
    const secondary_classes = badgeVariants({ variant: "secondary" });
    const destructive_classes = badgeVariants({ variant: "destructive" });
    const outline_classes = badgeVariants({ variant: "outline" });
    const muted_classes = badgeVariants({ variant: "muted" });

    // Create a Set to ensure uniqueness
    const uniqueVariants = new Set([
      default_classes,
      secondary_classes,
      destructive_classes,
      outline_classes,
      muted_classes,
    ]);

    // All 5 variants should be unique
    expect(uniqueVariants.size).toBe(5);
  });

  test("variant function preserves base classes", () => {
    const defaultVariant = badgeVariants({ variant: "default" });
    // Base classes should be present in all variants
    expect(defaultVariant).toContain("inline-flex");
    expect(defaultVariant).toContain("items-center");
    expect(defaultVariant).toContain("rounded-full");
    expect(defaultVariant).toContain("text-xs");
    expect(defaultVariant).toContain("font-semibold");
    expect(defaultVariant).toContain("px-3");
    expect(defaultVariant).toContain("py-1");
  });

  test("secondary variant produces consistent classes", () => {
    const variant1 = badgeVariants({ variant: "secondary" });
    const variant2 = badgeVariants({ variant: "secondary" });
    // Same variant should always produce same classes
    expect(variant1).toEqual(variant2);
  });

  test("destructive variant produces consistent classes", () => {
    const variant1 = badgeVariants({ variant: "destructive" });
    const variant2 = badgeVariants({ variant: "destructive" });
    // Same variant should always produce same classes
    expect(variant1).toEqual(variant2);
  });

  test("outline variant produces consistent classes", () => {
    const variant1 = badgeVariants({ variant: "outline" });
    const variant2 = badgeVariants({ variant: "outline" });
    // Same variant should always produce same classes
    expect(variant1).toEqual(variant2);
  });

  test("muted variant produces consistent classes", () => {
    const variant1 = badgeVariants({ variant: "muted" });
    const variant2 = badgeVariants({ variant: "muted" });
    // Same variant should always produce same classes
    expect(variant1).toEqual(variant2);
  });

  test("custom className can be merged with variants", () => {
    const classes = badgeVariants({
      variant: "secondary",
      className: "my-custom-badge",
    });
    // Custom class should be preserved
    expect(classes).toContain("my-custom-badge");
    // Variant styling should still be present
    expect(classes).toContain("text-green");
    expect(classes).toContain("bg-green");
  });

  test("multiple variant calls with different options produce correct results", () => {
    const default_with_custom = badgeVariants({
      variant: "default",
      className: "custom",
    });
    const secondary_with_custom = badgeVariants({
      variant: "secondary",
      className: "custom",
    });

    // Both should have the custom class
    expect(default_with_custom).toContain("custom");
    expect(secondary_with_custom).toContain("custom");
    // But variant classes should differ
    expect(default_with_custom).not.toEqual(secondary_with_custom);
  });

  test("variant function returns string", () => {
    const classes = badgeVariants();
    expect(typeof classes).toBe("string");
  });

  test("variant function with null/undefined variant uses default", () => {
    const explicitDefault = badgeVariants({ variant: "default" });
    const implicit = badgeVariants({});
    expect(implicit).toEqual(explicitDefault);
  });
});
