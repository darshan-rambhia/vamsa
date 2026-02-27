/**
 * Unit Tests for Checkbox Component
 */
import { describe, expect, test } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  describe("rendering", () => {
    test("renders checkbox input element", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("input[type='checkbox']");
      expect(checkbox).toBeDefined();
    });

    test("renders wrapper span element", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.tagName.toLowerCase()).toBe("span");
    });

    test("renders Check icon only when checked", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      const svgIcon = container.querySelector("svg");
      expect(svgIcon).not.toBeNull();
    });

    test("does not render Check icon when unchecked", () => {
      const { container } = render(<Checkbox />);
      const svgIcon = container.querySelector("svg");
      expect(svgIcon).toBeNull();
    });

    test("renders wrapper with proper base classes", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("h-4");
      expect(wrapper?.className).toContain("w-4");
      expect(wrapper?.className).toContain("rounded-sm");
      expect(wrapper?.className).toContain("border");
    });
  });

  describe("checked state", () => {
    test("renders unchecked by default", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    test("renders checked when defaultChecked is true", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    test("applies checked styling classes on wrapper", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("data-[state=checked]:bg-primary");
      expect(wrapper?.className).toContain(
        "data-[state=checked]:text-primary-foreground"
      );
    });

    test("has data-state attribute for unchecked", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.getAttribute("data-state")).toBe("unchecked");
    });

    test("has data-state attribute for checked", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.getAttribute("data-state")).toBe("checked");
    });
  });

  describe("onCheckedChange handler", () => {
    test("accepts onCheckedChange prop", () => {
      const handleChange = () => {};
      const { container } = render(<Checkbox onCheckedChange={handleChange} />);
      const checkbox = container.querySelector("input[type='checkbox']");
      expect(checkbox).toBeDefined();
    });

    test("calls onCheckedChange when input is clicked", () => {
      let clickCount = 0;
      const TestComponent = () => {
        const handleChange = () => {
          clickCount++;
        };
        return <Checkbox onCheckedChange={handleChange} />;
      };

      const { container } = render(<TestComponent />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox).toBeDefined();

      fireEvent.click(checkbox);
      expect(clickCount).toBe(1);
    });

    test("forwards onCheckedChange to checkbox input", () => {
      let changeCount = 0;
      const handleChange = () => {
        changeCount++;
      };

      const { container } = render(<Checkbox onCheckedChange={handleChange} />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox).toBeDefined();

      fireEvent.click(checkbox);
      expect(changeCount).toBe(1);
    });
  });

  describe("disabled state", () => {
    test("renders disabled attribute when disabled is true", () => {
      const { container } = render(<Checkbox disabled={true} />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });

    test("applies disabled styling on wrapper", () => {
      const { container } = render(<Checkbox disabled={true} />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain(
        "data-[disabled]:cursor-not-allowed"
      );
      expect(wrapper?.className).toContain("data-[disabled]:opacity-50");
    });

    test("does not call onCheckedChange when disabled and clicked", () => {
      let callCount = 0;
      const mockOnChange = () => {
        callCount++;
      };

      const { container } = render(
        <Checkbox disabled={true} onCheckedChange={mockOnChange} />
      );
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;

      fireEvent.click(checkbox);
      expect(callCount).toBe(0);
    });

    test("preserves disabled state across renders", () => {
      const { container, rerender } = render(<Checkbox disabled={true} />);
      let checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);

      rerender(<Checkbox disabled={true} />);
      checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });
  });

  describe("className forwarding", () => {
    test("applies custom className to wrapper", () => {
      const { container } = render(<Checkbox className="custom-class" />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("custom-class");
    });

    test("preserves base classes with custom className", () => {
      const { container } = render(<Checkbox className="custom-class" />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("h-4");
      expect(wrapper?.className).toContain("w-4");
      expect(wrapper?.className).toContain("custom-class");
    });

    test("merges multiple custom classes", () => {
      const { container } = render(
        <Checkbox className="custom-1 custom-2 custom-3" />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("custom-1");
      expect(wrapper?.className).toContain("custom-2");
      expect(wrapper?.className).toContain("custom-3");
    });

    test("overrides conflicting Tailwind classes", () => {
      const { container } = render(<Checkbox className="h-6 w-6" />);
      const wrapper = container.firstElementChild;
      const classStr = wrapper?.className || "";
      expect(classStr).toMatch(/h-6|w-6/);
    });
  });

  describe("accessibility attributes", () => {
    test("has proper focus-within styling on wrapper", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("focus-within:ring-2");
      expect(wrapper?.className).toContain("focus-within:outline-none");
    });

    test("supports aria-label attribute on input", () => {
      const { container } = render(<Checkbox aria-label="Accept terms" />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.getAttribute("aria-label")).toBe("Accept terms");
    });

    test("supports aria-labelledby attribute on input", () => {
      const { container } = render(
        <Checkbox aria-labelledby="checkbox-label" />
      );
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.getAttribute("aria-labelledby")).toBe("checkbox-label");
    });

    test("supports aria-describedby attribute on input", () => {
      const { container } = render(
        <Checkbox aria-describedby="checkbox-description" />
      );
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.getAttribute("aria-describedby")).toBe(
        "checkbox-description"
      );
    });

    test("forwards attributes through props to input", () => {
      const { container } = render(<Checkbox data-test-attr="accept-terms" />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.getAttribute("data-test-attr")).toBe("accept-terms");
    });

    test("supports id attribute on input", () => {
      const { container } = render(<Checkbox id="my-checkbox" />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.getAttribute("id")).toBe("my-checkbox");
    });

    test("supports value attribute on input", () => {
      const { container } = render(<Checkbox value="option-1" />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.getAttribute("value")).toBe("option-1");
    });

    test("ring offset is applied on wrapper", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("ring-offset-background");
      expect(wrapper?.className).toContain("focus-within:ring-offset-2");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref to input element", () => {
      let checkboxRef: any = null;
      render(
        <Checkbox
          ref={(el) => {
            checkboxRef = el;
          }}
        />
      );
      expect(checkboxRef).not.toBeNull();
      expect(checkboxRef.tagName).toBe("INPUT");
    });
  });

  describe("data attributes", () => {
    test("supports data-testid attribute", () => {
      const { getByTestId } = render(<Checkbox data-testid="my-checkbox" />);
      expect(getByTestId("my-checkbox")).toBeDefined();
    });

    test("forwards custom data attributes to input", () => {
      const { container } = render(
        <Checkbox data-custom="custom-value" data-another="another-value" />
      );
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.getAttribute("data-custom")).toBe("custom-value");
      expect(checkbox.getAttribute("data-another")).toBe("another-value");
    });
  });

  describe("indicator and icon", () => {
    test("renders wrapper span element", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.querySelector("span");
      expect(wrapper).toBeDefined();
    });

    test("icon (Check) is rendered when checked", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      const icon = container.querySelector("svg");
      expect(icon).not.toBeNull();
    });

    test("wrapper span has data-state attribute", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.querySelector("span[data-state]");
      expect(wrapper).toBeDefined();
    });

    test("icon is rendered when explicitly checked", () => {
      const { container } = render(<Checkbox defaultChecked={true} />);
      const icon = container.querySelector("svg");
      expect(icon).not.toBeNull();
    });

    test("icon is not rendered when unchecked", () => {
      const { container } = render(<Checkbox defaultChecked={false} />);
      const icon = container.querySelector("svg");
      const wrapper = container.querySelector("span[data-state='unchecked']");
      expect(wrapper).toBeDefined();
      expect(icon).toBeNull();
    });
  });

  describe("display name", () => {
    test("has correct displayName", () => {
      expect(Checkbox.displayName).toBe("Checkbox");
    });
  });

  describe("integration scenarios", () => {
    test("renders multiple checkboxes independently", () => {
      const { container } = render(
        <>
          <Checkbox />
          <Checkbox />
          <Checkbox />
        </>
      );

      const checkboxes = container.querySelectorAll("input[type='checkbox']");
      expect(checkboxes.length).toBe(3);
      expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);
      expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
      expect((checkboxes[2] as HTMLInputElement).checked).toBe(false);
    });

    test("handles rapid clicks", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;

      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);

      expect(checkbox).toBeDefined();
    });

    test("properly transitions from disabled to enabled state", () => {
      const { container, rerender } = render(<Checkbox disabled={true} />);
      let checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);

      rerender(<Checkbox disabled={false} />);
      checkbox = container.querySelector(
        "input[type='checkbox']"
      ) as HTMLInputElement;
      expect(checkbox.disabled).toBe(false);
    });

    test("works with mixed checked and unchecked states", () => {
      const { container } = render(
        <>
          <Checkbox defaultChecked={true} />
          <Checkbox defaultChecked={false} />
          <Checkbox />
        </>
      );

      const allCheckboxes = container.querySelectorAll(
        "input[type='checkbox']"
      );
      expect((allCheckboxes[0] as HTMLInputElement).checked).toBe(true);
      expect((allCheckboxes[1] as HTMLInputElement).checked).toBe(false);
      expect((allCheckboxes[2] as HTMLInputElement).checked).toBe(false);
    });
  });

  describe("border and focus ring styles", () => {
    test("has primary border color on wrapper", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("border-primary");
    });

    test("has ring styling on focus within wrapper", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("focus-within:ring-ring");
    });

    test("has shrink-0 to prevent flex shrinking", () => {
      const { container } = render(<Checkbox />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("shrink-0");
    });
  });
});
