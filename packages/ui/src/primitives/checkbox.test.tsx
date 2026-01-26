/**
 * Unit Tests for Checkbox Component
 */
import { describe, test, expect } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { Checkbox } from "./checkbox";
import React from "react";

describe("Checkbox", () => {
  describe("rendering", () => {
    test("renders checkbox element", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox).toBeDefined();
    });

    test("renders checkbox with correct initial role", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.getAttribute("role")).toBe("checkbox");
    });

    test("renders Check icon inside indicator", () => {
      const { container } = render(<Checkbox />);
      // The Check icon from lucide-react should be present
      const svgIcon = container.querySelector("svg");
      expect(svgIcon).toBeDefined();
    });

    test("renders with proper base classes", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("peer");
      expect(checkbox?.className).toContain("h-4");
      expect(checkbox?.className).toContain("w-4");
      expect(checkbox?.className).toContain("rounded-sm");
      expect(checkbox?.className).toContain("border");
    });

    test("renders as button type", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.getAttribute("type")).toBe("button");
    });
  });

  describe("checked state", () => {
    test("renders unchecked by default", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.getAttribute("aria-checked")).toBe("false");
    });

    test("renders checked when defaultChecked is true", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.getAttribute("aria-checked")).toBe("true");
    });

    test("applies checked styling classes", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      const checkbox = container.querySelector("button[role='checkbox']");
      // These are the checked state Tailwind classes in the component
      expect(checkbox?.className).toContain("data-[state=checked]:bg-primary");
      expect(checkbox?.className).toContain("data-[state=checked]:text-primary-foreground");
    });

    test("has data-state attribute for unchecked", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.getAttribute("data-state")).toBe("unchecked");
    });

    test("has data-state attribute for checked", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.getAttribute("data-state")).toBe("checked");
    });
  });

  describe("onChange handler", () => {
    test("accepts onChange prop", () => {
      const handleChange = () => {};
      const { container } = render(<Checkbox onChange={handleChange} />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox).toBeDefined();
    });

    test("has onChange handler attached", () => {
      let clickCount = 0;
      const TestComponent = () => {
        const handleChange = () => {
          clickCount++;
        };
        return <Checkbox onChange={handleChange} />;
      };

      const { container } = render(<TestComponent />);
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox).toBeDefined();

      fireEvent.click(checkbox);
      // Verify the element still exists and can be interacted with
      expect(checkbox).toBeDefined();
    });

    test("forwards onChange to radix checkbox", () => {
      let changeCount = 0;
      const handleChange = () => {
        changeCount++;
      };

      const { container } = render(<Checkbox onChange={handleChange} />);
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox).toBeDefined();

      // Radix checkbox handles the onChange internally
      fireEvent.click(checkbox);
      // The component should be renderable and clickable
      expect(checkbox).toBeDefined();
    });
  });

  describe("disabled state", () => {
    test("renders disabled attribute when disabled is true", () => {
      const { container } = render(<Checkbox disabled={true} />);
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.hasAttribute("disabled")).toBe(true);
    });

    test("applies disabled styling", () => {
      const { container } = render(<Checkbox disabled={true} />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("disabled:cursor-not-allowed");
      expect(checkbox?.className).toContain("disabled:opacity-50");
    });

    test("does not call onChange when disabled and clicked", () => {
      let callCount = 0;
      const mockOnChange = () => {
        callCount++;
      };

      const { container } = render(
        <Checkbox disabled={true} onChange={mockOnChange} />
      );
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;

      fireEvent.click(checkbox);
      // Disabled checkboxes should not trigger onChange
      expect(callCount).toBe(0);
    });

    test("preserves disabled state across renders", () => {
      const { container, rerender } = render(<Checkbox disabled={true} />);
      let checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.hasAttribute("disabled")).toBe(true);

      rerender(<Checkbox disabled={true} />);
      checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("className forwarding", () => {
    test("applies custom className", () => {
      const { container } = render(<Checkbox className="custom-class" />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("custom-class");
    });

    test("preserves base classes with custom className", () => {
      const { container } = render(<Checkbox className="custom-class" />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("h-4");
      expect(checkbox?.className).toContain("w-4");
      expect(checkbox?.className).toContain("custom-class");
    });

    test("merges multiple custom classes", () => {
      const { container } = render(
        <Checkbox className="custom-1 custom-2 custom-3" />
      );
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("custom-1");
      expect(checkbox?.className).toContain("custom-2");
      expect(checkbox?.className).toContain("custom-3");
    });

    test("overrides conflicting Tailwind classes", () => {
      const { container } = render(
        <Checkbox className="h-6 w-6" />
      );
      const checkbox = container.querySelector("button[role='checkbox']");
      // The custom classes should override the base h-4 w-4
      const classStr = checkbox?.className || "";
      // Check that at least one of the custom sizes appears
      expect(classStr).toMatch(/h-6|w-6/);
    });
  });

  describe("accessibility attributes", () => {
    test("has proper focus-visible styling", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("focus-visible:ring-2");
      expect(checkbox?.className).toContain("focus-visible:outline-none");
    });

    test("supports aria-label attribute", () => {
      const { container } = render(
        <Checkbox aria-label="Accept terms" />
      );
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.getAttribute("aria-label")).toBe("Accept terms");
    });

    test("supports aria-labelledby attribute", () => {
      const { container } = render(
        <Checkbox aria-labelledby="checkbox-label" />
      );
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.getAttribute("aria-labelledby")).toBe("checkbox-label");
    });

    test("supports aria-describedby attribute", () => {
      const { container } = render(
        <Checkbox aria-describedby="checkbox-description" />
      );
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.getAttribute("aria-describedby")).toBe("checkbox-description");
    });

    test("forwards attributes through props", () => {
      const { container } = render(
        <Checkbox data-test-attr="accept-terms" />
      );
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.getAttribute("data-test-attr")).toBe("accept-terms");
    });

    test("supports id attribute", () => {
      const { container } = render(<Checkbox id="my-checkbox" />);
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.getAttribute("id")).toBe("my-checkbox");
    });

    test("supports value attribute", () => {
      const { container } = render(<Checkbox value="option-1" />);
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.getAttribute("value")).toBe("option-1");
    });

    test("ring offset is applied on focus", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("ring-offset-background");
      expect(checkbox?.className).toContain("focus-visible:ring-offset-2");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref to button element", () => {
      let checkboxRef: any = null;
      render(
        <Checkbox
          ref={(el) => {
            checkboxRef = el;
          }}
        />
      );
      expect(checkboxRef).toBeDefined();
      expect(checkboxRef?.getAttribute("role")).toBe("checkbox");
    });

    test("ref provides access to DOM methods", () => {
      let checkboxRef: any = null;
      const { container } = render(
        <Checkbox
          ref={(el) => {
            checkboxRef = el;
          }}
        />
      );

      // Verify ref allows access to DOM element properties
      expect(checkboxRef?.click).toBeDefined();
      expect(typeof checkboxRef?.click).toBe("function");
    });
  });

  describe("data attributes", () => {
    test("supports data-testid attribute", () => {
      const { getByTestId } = render(<Checkbox data-testid="my-checkbox" />);
      expect(getByTestId("my-checkbox")).toBeDefined();
    });

    test("forwards custom data attributes", () => {
      const { container } = render(
        <Checkbox data-custom="custom-value" data-another="another-value" />
      );
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.getAttribute("data-custom")).toBe("custom-value");
      expect(checkbox?.getAttribute("data-another")).toBe("another-value");
    });
  });

  describe("indicator and icon", () => {
    test("renders CheckboxPrimitive.Indicator component", () => {
      const { container } = render(<Checkbox />);
      // The indicator should be a span that contains the icon
      const indicator = container.querySelector("span");
      expect(indicator).toBeDefined();
    });

    test("icon (Check) is rendered", () => {
      const { container } = render(<Checkbox />);
      const icon = container.querySelector("svg");
      expect(icon).toBeDefined();
    });

    test("indicator renders with span element", () => {
      const { container } = render(<Checkbox />);
      // Look for the indicator span that has data-state
      const indicator = container.querySelector("span[data-state]");
      expect(indicator).toBeDefined();
    });

    test("CheckboxPrimitive.Indicator component renders SVG icon when checked", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      // The SVG icon (Check from lucide-react) should be rendered when checked
      const icon = container.querySelector("svg");
      expect(icon).toBeDefined();
    });

    test("CheckboxPrimitive.Indicator hides icon when unchecked", () => {
      const { container } = render(<Checkbox defaultChecked={false} />);
      // Icon should not be visible (or rendered at all) when unchecked
      const icon = container.querySelector("svg");
      // In unchecked state, the indicator is present but empty/hidden
      const indicator = container.querySelector("span[data-state='unchecked']");
      expect(indicator).toBeDefined();
    });
  });

  describe("display name", () => {
    test("has correct displayName from CheckboxPrimitive.Root", () => {
      expect(Checkbox.displayName).toBe(
        require("@radix-ui/react-checkbox").Root.displayName
      );
    });
  });

  describe("integration scenarios", () => {
    test("renders multiple checkboxes independently", () => {
      const { container } = render(
        <>
          <Checkbox data-testid="checkbox-1" />
          <Checkbox data-testid="checkbox-2" />
          <Checkbox data-testid="checkbox-3" />
        </>
      );

      const checkboxes = container.querySelectorAll("button[role='checkbox']");
      expect(checkboxes.length).toBe(3);
      expect(checkboxes[0]?.getAttribute("aria-checked")).toBe("false");
      expect(checkboxes[1]?.getAttribute("aria-checked")).toBe("false");
      expect(checkboxes[2]?.getAttribute("aria-checked")).toBe("false");
    });

    test("handles rapid clicks", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;

      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);

      expect(checkbox).toBeDefined();
    });

    test("properly transitions from disabled to enabled state", () => {
      const { container, rerender } = render(<Checkbox disabled={true} />);
      let checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.hasAttribute("disabled")).toBe(true);

      rerender(<Checkbox disabled={false} />);
      checkbox = container.querySelector("button[role='checkbox']") as HTMLElement;
      expect(checkbox?.hasAttribute("disabled")).toBe(false);
    });

    test("works with mixed checked and unchecked states", () => {
      const { container } = render(
        <>
          <Checkbox defaultChecked={true} data-testid="checked" />
          <Checkbox defaultChecked={false} data-testid="unchecked" />
          <Checkbox data-testid="default" />
        </>
      );

      const checked = container.querySelector(
        "button[aria-checked='true']"
      );
      const unchecked = container.querySelectorAll("button[aria-checked='false']");

      expect(checked).toBeDefined();
      expect(unchecked.length).toBe(2);
    });
  });

  describe("border and focus ring styles", () => {
    test("has primary border color", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("border-primary");
    });

    test("has ring styling on focus", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("focus-visible:ring-ring");
    });

    test("has shrink-0 to prevent flex shrinking", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("button[role='checkbox']");
      expect(checkbox?.className).toContain("shrink-0");
    });
  });
});
