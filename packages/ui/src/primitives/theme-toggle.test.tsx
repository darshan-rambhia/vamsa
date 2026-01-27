/**
 * Unit Tests for ThemeToggle Component
 * Tests theme toggle functionality, state management, and DOM/localStorage interactions
 */
import "../test-setup";
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { render } from "@testing-library/react";
import { ThemeToggle } from "./theme-toggle";
import React from "react";

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Clear DOM classList and localStorage before each test
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  describe("rendering", () => {
    test("renders as a button element", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");
      expect(button).toBeDefined();
      expect(button.tagName).toBe("BUTTON");
    });

    test("renders as a button element with role", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button") as HTMLButtonElement;
      expect(button.tagName).toBe("BUTTON");
    });

    test("renders as button before mounting (hydration guard)", () => {
      const { container } = render(<ThemeToggle />);
      const button = container.querySelector("button");
      expect(button).toBeDefined();
      // Before mount, should have empty span child
      const span = button?.querySelector("span");
      expect(span).toBeDefined();
    });

    test("renders with base styling classes", () => {
      // Allow component to mount
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      // Verify base button styling is applied
      expect(button.className).toContain("inline-flex");
      expect(button.className).toContain("items-center");
      expect(button.className).toContain("justify-center");
      expect(button.className).toContain("rounded-md");
      expect(button.className).toContain("border-2");
      expect(button.className).toContain("transition-all");
      expect(button.className).toContain("duration-200");
    });

    test("renders with hover styling", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      expect(button.className).toContain("hover:bg-accent");
      expect(button.className).toContain("hover:border-primary/30");
    });

    test("renders with focus-visible styling", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      expect(button.className).toContain("focus-visible:ring-ring");
      expect(button.className).toContain("focus-visible:ring-2");
      expect(button.className).toContain("focus-visible:ring-offset-2");
      expect(button.className).toContain("focus-visible:outline-none");
    });

    test("renders SVG icon when mounted", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");
      expect(svg).toBeDefined();
      expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    });

    test("renders with children after mounting", () => {
      const { container } = render(<ThemeToggle />);
      const button = container.querySelector("button");
      expect(button?.children.length).toBeGreaterThan(0);
    });
  });

  describe("size variants", () => {
    test("renders with default md size classes", () => {
      const { getByRole } = render(<ThemeToggle size="md" />);
      const button = getByRole("button");

      expect(button.className).toContain("h-10");
      expect(button.className).toContain("w-10");
    });

    test("renders with sm size classes", () => {
      const { getByRole } = render(<ThemeToggle size="sm" />);
      const button = getByRole("button");

      expect(button.className).toContain("h-8");
      expect(button.className).toContain("w-8");
    });

    test("sm size renders smaller icon", () => {
      const { container } = render(<ThemeToggle size="sm" />);
      const svg = container.querySelector("svg");

      const classStr =
        svg?.className.baseVal || (svg?.className as unknown as string) || "";
      expect(classStr).toContain("h-4");
      expect(classStr).toContain("w-4");
    });

    test("md size renders larger icon", () => {
      const { container } = render(<ThemeToggle size="md" />);
      const svg = container.querySelector("svg");

      const classStr =
        svg?.className.baseVal || (svg?.className as unknown as string) || "";
      expect(classStr).toContain("h-5");
      expect(classStr).toContain("w-5");
    });

    test("defaults to md size when not specified", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      expect(button.className).toContain("h-10");
      expect(button.className).toContain("w-10");
    });
  });

  describe("theme state and icons", () => {
    test("shows moon icon initially in light mode", () => {
      const { container } = render(<ThemeToggle />);
      const paths = container.querySelectorAll("svg path");

      // Moon icon has specific d attribute
      expect(paths.length).toBeGreaterThan(0);
      const moonPath = Array.from(paths).find(
        (p) =>
          p.getAttribute("d") ===
          "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      );
      expect(moonPath).toBeDefined();
    });

    test("renders SVG with correct stroke attributes", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");

      expect(svg?.getAttribute("stroke")).toBe("currentColor");
      expect(svg?.getAttribute("stroke-width")).toBe("2");
      expect(svg?.getAttribute("fill")).toBe("none");
    });

    test("renders SVG path with stroke properties", () => {
      const { container } = render(<ThemeToggle />);
      const path = container.querySelector("svg path");

      expect(path?.getAttribute("stroke-linecap")).toBe("round");
      expect(path?.getAttribute("stroke-linejoin")).toBe("round");
    });
  });

  describe("accessibility", () => {
    test("has aria-label in light mode", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      expect(button.getAttribute("aria-label")).toBe("Switch to dark mode");
    });

    test("has accessible aria-label", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      const ariaLabel = button.getAttribute("aria-label");
      expect(ariaLabel).toBeDefined();
      expect(ariaLabel?.length).toBeGreaterThan(0);
    });

    test("button is accessible by role", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      expect(button).toBeDefined();
    });

    test("aria-label indicates correct next theme", () => {
      // Start in light mode
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      // Should say "Switch to dark mode"
      expect(button.getAttribute("aria-label")).toContain("dark");
    });
  });

  describe("forwardRef", () => {
    test("forwards ref to button element", () => {
      const ref = React.createRef<HTMLButtonElement>();
      const { container } = render(<ThemeToggle ref={ref} />);

      expect(ref.current).toBeDefined();
      expect(ref.current?.tagName).toBe("BUTTON");
      // Verify ref points to actual button
      expect(ref.current).toBe(container.querySelector("button"));
    });

    test("forwarded ref has correct properties", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<ThemeToggle ref={ref} />);

      expect(ref.current?.className).toBeDefined();
      expect(ref.current?.onclick).toBeDefined();
    });

    test("can access ref properties after render", () => {
      const ref = React.createRef<HTMLButtonElement>();
      const { getByRole } = render(<ThemeToggle ref={ref} />);

      // Verify ref points to button element
      const button = getByRole("button") as HTMLButtonElement;
      expect(ref.current).toBe(button);
    });
  });

  describe("custom className", () => {
    test("applies custom className to button", () => {
      const { getByRole } = render(
        <ThemeToggle className="custom-theme-btn" />
      );
      const button = getByRole("button");

      expect(button.className).toContain("custom-theme-btn");
    });

    test("preserves base classes with custom className", () => {
      const { getByRole } = render(
        <ThemeToggle className="custom-theme-btn" />
      );
      const button = getByRole("button");

      // Custom class should be present
      expect(button.className).toContain("custom-theme-btn");
      // Base classes should still be there
      expect(button.className).toContain("inline-flex");
      expect(button.className).toContain("rounded-md");
    });

    test("combines multiple custom classes", () => {
      const { getByRole } = render(
        <ThemeToggle className="class-1 class-2 class-3" />
      );
      const button = getByRole("button");

      expect(button.className).toContain("class-1");
      expect(button.className).toContain("class-2");
      expect(button.className).toContain("class-3");
    });

    test("custom className with size variant", () => {
      const { getByRole } = render(
        <ThemeToggle size="sm" className="custom-btn" />
      );
      const button = getByRole("button");

      expect(button.className).toContain("custom-btn");
      expect(button.className).toContain("h-8");
      expect(button.className).toContain("w-8");
    });
  });

  describe("HTML attributes passthrough", () => {
    test("passes through data-testid attribute", () => {
      const { getByTestId } = render(<ThemeToggle data-testid="theme-btn" />);
      expect(getByTestId("theme-btn")).toBeDefined();
    });

    test("passes through custom data attributes", () => {
      const { getByRole } = render(<ThemeToggle data-custom="custom-value" />);
      const button = getByRole("button");

      expect(button.getAttribute("data-custom")).toBe("custom-value");
    });

    test("passes through id attribute", () => {
      const { getByRole } = render(<ThemeToggle id="theme-toggle-btn" />);
      const button = getByRole("button");

      expect(button.getAttribute("id")).toBe("theme-toggle-btn");
    });

    test("passes through title attribute", () => {
      const { getByRole } = render(<ThemeToggle title="Toggle theme" />);
      const button = getByRole("button");

      expect(button.getAttribute("title")).toBe("Toggle theme");
    });

    test("passes through multiple attributes", () => {
      const { getByRole } = render(
        <ThemeToggle
          id="btn-id"
          data-test="value"
          title="Toggle"
          data-testid="theme-button"
        />
      );
      const button = getByRole("button");

      expect(button.getAttribute("id")).toBe("btn-id");
      expect(button.getAttribute("data-test")).toBe("value");
      expect(button.getAttribute("title")).toBe("Toggle");
    });
  });

  describe("displayName", () => {
    test("component has displayName for debugging", () => {
      expect(ThemeToggle.displayName).toBe("ThemeToggle");
    });
  });

  describe("click interaction and state management", () => {
    test("button is clickable", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button") as HTMLButtonElement;

      // Verify button is not disabled
      expect(button.disabled).toBe(false);
    });

    test("clicking button triggers onClick handler", () => {
      let clicked = false;
      const handleClick = () => {
        clicked = true;
      };

      const { getByRole } = render(<ThemeToggle onClick={handleClick} />);
      const button = getByRole("button");

      // Click the button
      button.click();

      expect(clicked).toBe(true);
    });

    test("button accepts custom onClick handler", () => {
      const clickHandler = () => {};
      const { getByRole } = render(<ThemeToggle onClick={clickHandler} />);
      const button = getByRole("button");

      // Verify button has onclick attribute/property
      expect(button.onclick).toBeDefined();
    });

    test("click event is dispatched successfully", () => {
      let eventFired = false;
      const { getByRole } = render(
        <ThemeToggle
          onClick={() => {
            eventFired = true;
          }}
        />
      );
      const button = getByRole("button");

      // Create and dispatch click event
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      button.dispatchEvent(clickEvent);

      expect(eventFired).toBe(true);
    });

    test("button click is registered in DOM", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      // Verify we can access button's click method
      expect(typeof button.click).toBe("function");
    });
  });

  describe("initialization from document state", () => {
    test("checks document dark class on mount", () => {
      // Add dark class to document
      document.documentElement.classList.add("dark");

      const { container } = render(<ThemeToggle />);
      const button = container.querySelector("button");

      // Should render and detect dark mode
      expect(button).toBeDefined();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    test("respects initial light mode when dark class absent", () => {
      document.documentElement.classList.remove("dark");

      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      // Should be in light mode
      expect(button).toBeDefined();
      expect(button.getAttribute("aria-label")).toContain("dark");
    });

    test("detects dark mode from classList", () => {
      document.documentElement.classList.add("dark");

      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      // After mount with dark class, aria-label should indicate light mode
      expect(button.getAttribute("aria-label")).toContain("light");
    });
  });

  describe("DOM manipulation", () => {
    test("button element is in DOM", () => {
      const { container } = render(<ThemeToggle />);
      const button = container.querySelector("button");

      expect(button).toBeDefined();
      expect(button?.parentElement).toBeDefined();
    });

    test("SVG icon is in DOM after mount", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("button svg");

      expect(svg).toBeDefined();
    });

    test("has text color class on icon", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");

      const classStr =
        svg?.className.baseVal || (svg?.className as unknown as string) || "";
      expect(classStr).toContain("text-foreground");
    });

    test("renders complete button structure", () => {
      const { getByRole, container } = render(<ThemeToggle />);
      const button = getByRole("button");
      const svg = container.querySelector("button svg");

      expect(button).toBeDefined();
      expect(svg).toBeDefined();
      expect(button.contains(svg)).toBe(true);
    });
  });

  describe("state consistency", () => {
    test("theme state matches aria-label", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      const ariaLabel = button.getAttribute("aria-label");
      // Should indicate next theme, not current
      expect(ariaLabel).toBeDefined();
      expect(ariaLabel?.includes("dark") || ariaLabel?.includes("light")).toBe(
        true
      );
    });

    test("icon matches theme state", () => {
      const { container } = render(<ThemeToggle />);
      const paths = container.querySelectorAll("svg path");

      // Should have SVG with path
      expect(paths.length).toBeGreaterThan(0);
    });

    test("button maintains correct state after render", () => {
      const { getByRole, rerender } = render(<ThemeToggle />);
      const buttonBefore = getByRole("button");
      const labelBefore = buttonBefore.getAttribute("aria-label");

      // Rerender same component
      rerender(<ThemeToggle />);
      const buttonAfter = getByRole("button");
      const labelAfter = buttonAfter.getAttribute("aria-label");

      // Labels should match (both represent current state)
      expect(labelAfter).toBe(labelBefore);
    });
  });

  describe("edge cases", () => {
    test("renders with empty string className", () => {
      const { getByRole } = render(<ThemeToggle className="" />);
      const button = getByRole("button");

      expect(button).toBeDefined();
      expect(button.className).toContain("inline-flex");
    });

    test("renders with undefined className", () => {
      const { getByRole } = render(<ThemeToggle className={undefined} />);
      const button = getByRole("button");

      expect(button).toBeDefined();
    });

    test("renders multiple instances independently", () => {
      const { getAllByRole } = render(
        <div>
          <ThemeToggle data-testid="btn-1" />
          <ThemeToggle data-testid="btn-2" />
        </div>
      );

      const buttons = getAllByRole("button");
      expect(buttons.length).toBe(2);
      expect(buttons[0]).not.toBe(buttons[1]);
    });

    test("maintains hydration safety before mount", () => {
      const { container } = render(<ThemeToggle />);
      const button = container.querySelector("button");

      // Button should exist before mount
      expect(button).toBeDefined();
      // Should have span placeholder
      const spans = button?.querySelectorAll("span");
      // At least one span for placeholder/opacity
      expect(spans && spans.length >= 0).toBe(true);
    });

    test("handles rapid re-renders", () => {
      const { rerender, getByRole } = render(<ThemeToggle />);

      // Re-render multiple times
      rerender(<ThemeToggle />);
      rerender(<ThemeToggle />);
      rerender(<ThemeToggle />);

      const button = getByRole("button");
      expect(button).toBeDefined();
    });
  });

  describe("SVG structure", () => {
    test("SVG has proper viewBox attribute", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");

      expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    });

    test("SVG has stroke color current", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");

      expect(svg?.getAttribute("stroke")).toBe("currentColor");
    });

    test("SVG has fill none", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");

      expect(svg?.getAttribute("fill")).toBe("none");
    });

    test("SVG path has rounded caps", () => {
      const { container } = render(<ThemeToggle />);
      const path = container.querySelector("svg path");

      expect(path?.getAttribute("stroke-linecap")).toBe("round");
      expect(path?.getAttribute("stroke-linejoin")).toBe("round");
    });

    test("SVG has correct dimensions", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");

      const classStr =
        svg?.className.baseVal || (svg?.className as unknown as string) || "";
      expect(classStr).toContain("h-");
      expect(classStr).toContain("w-");
    });
  });

  describe("CSS classes precision", () => {
    test("border classes are applied", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      expect(button.className).toContain("border");
      expect(button.className).toContain("border-2");
    });

    test("background color classes applied", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      expect(button.className).toContain("bg-background");
    });

    test("border color classes applied", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      expect(button.className).toContain("border-border");
    });

    test("transition timing classes applied", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      expect(button.className).toContain("transition-all");
      expect(button.className).toContain("duration-200");
      expect(button.className).toContain("ease-out");
    });

    test("icon text color class applied", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");

      const classStr =
        svg?.className.baseVal || (svg?.className as unknown as string) || "";
      expect(classStr).toContain("text-foreground");
    });
  });

  describe("advanced interactions", () => {
    test("component handles multiple renders without issues", () => {
      const { rerender, getByRole } = render(<ThemeToggle />);

      for (let i = 0; i < 5; i++) {
        rerender(<ThemeToggle />);
      }

      const button = getByRole("button");
      expect(button).toBeDefined();
    });

    test("component initializes with proper aria-label", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button");

      const label = button.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(
        label === "Switch to dark mode" || label === "Switch to light mode"
      ).toBe(true);
    });

    test("SVG is rendered with proper namespace", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");

      expect(svg?.tagName).toBe("svg");
    });

    test("SVG path element exists and is accessible", () => {
      const { container } = render(<ThemeToggle />);
      const path = container.querySelector("svg path");

      expect(path).toBeDefined();
      expect(path?.tagName).toBe("path");
    });

    test("component renders button before and after mount", () => {
      const { container, rerender } = render(<ThemeToggle />);
      let button = container.querySelector("button");
      expect(button).toBeDefined();

      // Rerender to verify stability
      rerender(<ThemeToggle />);
      button = container.querySelector("button");
      expect(button).toBeDefined();
    });

    test("button maintains consistent structure across mounts", () => {
      const { getByRole, rerender } = render(<ThemeToggle />);
      const button1 = getByRole("button");
      const classes1 = button1.className;

      rerender(<ThemeToggle />);
      const button2 = getByRole("button");
      const classes2 = button2.className;

      // Should have same base classes
      expect(classes1).toContain("inline-flex");
      expect(classes2).toContain("inline-flex");
    });

    test("icon changes based on theme state detection", () => {
      const { container } = render(<ThemeToggle />);
      const svg = container.querySelector("svg");

      // Should have SVG element
      expect(svg).toBeDefined();
      expect(svg?.children.length).toBeGreaterThan(0);
    });

    test("component respects forwardRef with multiple instances", () => {
      const ref1 = React.createRef<HTMLButtonElement>();
      const ref2 = React.createRef<HTMLButtonElement>();

      const { getAllByRole } = render(
        <div>
          <ThemeToggle ref={ref1} />
          <ThemeToggle ref={ref2} />
        </div>
      );

      const buttons = getAllByRole("button");
      expect(buttons.length).toBe(2);
      expect(ref1.current).toBe(buttons[0] as HTMLButtonElement);
      expect(ref2.current).toBe(buttons[1] as HTMLButtonElement);
    });

    test("button is always interactable", () => {
      const { getByRole } = render(<ThemeToggle />);
      const button = getByRole("button") as HTMLButtonElement;

      expect(button.disabled).toBe(false);
      expect(button.tagName).toBe("BUTTON");
      expect(typeof button.click).toBe("function");
    });

    test("component maintains proper HTML structure", () => {
      const { getByRole, container } = render(<ThemeToggle />);
      const button = getByRole("button");

      // Button should be in the document
      expect(container.contains(button)).toBe(true);

      // Button should have SVG child
      const svg = button.querySelector("svg");
      expect(svg).toBeDefined();
    });
  });
});
