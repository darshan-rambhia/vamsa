/**
 * Unit Tests for Input Component
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  describe("rendering", () => {
    test("renders input element", () => {
      const { getByRole } = render(<Input />);
      expect(getByRole("textbox")).toBeDefined();
    });

    test("renders with placeholder", () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enter text" />
      );
      expect(getByPlaceholderText("Enter text")).toBeDefined();
    });

    test("renders with default value", () => {
      const { getByRole } = render(<Input defaultValue="test value" />);
      const input = getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("test value");
    });
  });

  describe("types", () => {
    test("renders text type by default", () => {
      const { getByRole } = render(<Input />);
      const input = getByRole("textbox");
      expect(input.getAttribute("type")).toBe(null); // implicit text
    });

    test("renders email type", () => {
      const { getByRole } = render(<Input type="email" />);
      const input = getByRole("textbox");
      expect(input.getAttribute("type")).toBe("email");
    });

    test("renders password type", () => {
      const { container } = render(<Input type="password" />);
      // Password inputs don't have textbox role
      const input = container.querySelector('input[type="password"]');
      expect(input).toBeDefined();
    });

    test("renders number type", () => {
      const { getByRole } = render(<Input type="number" />);
      const input = getByRole("spinbutton");
      expect(input).toBeDefined();
    });

    test("renders date type", () => {
      const { getByTestId } = render(
        <Input type="date" data-testid="date-input" />
      );
      const input = getByTestId("date-input");
      expect(input.getAttribute("type")).toBe("date");
    });

    test("renders file type", () => {
      const { getByTestId } = render(
        <Input type="file" data-testid="file-input" />
      );
      const input = getByTestId("file-input");
      expect(input.getAttribute("type")).toBe("file");
    });
  });

  describe("styling", () => {
    test("applies base styles", () => {
      const { getByTestId } = render(<Input data-testid="styled-input" />);
      const input = getByTestId("styled-input");
      expect(input.className).toContain("rounded-md");
      expect(input.className).toContain("border");
    });

    test("applies custom className", () => {
      const { getByTestId } = render(
        <Input className="custom-class" data-testid="custom-input" />
      );
      const input = getByTestId("custom-input");
      expect(input.className).toContain("custom-class");
    });

    test("has focus styles", () => {
      const { getByTestId } = render(<Input data-testid="focus-input" />);
      const input = getByTestId("focus-input");
      expect(input.className).toContain("focus-visible:");
    });

    test("has hover styles", () => {
      const { getByTestId } = render(<Input data-testid="hover-input" />);
      const input = getByTestId("hover-input");
      expect(input.className).toContain("hover:");
    });

    test("has disabled styles", () => {
      const { getByTestId } = render(
        <Input disabled data-testid="disabled-input" />
      );
      const input = getByTestId("disabled-input");
      expect(input.className).toContain("disabled:");
    });
  });

  describe("HTML attributes", () => {
    test("passes through disabled attribute", () => {
      const { getByRole } = render(<Input disabled />);
      const input = getByRole("textbox");
      expect(input.hasAttribute("disabled")).toBe(true);
    });

    test("passes through required attribute", () => {
      const { getByRole } = render(<Input required />);
      const input = getByRole("textbox");
      expect(input.hasAttribute("required")).toBe(true);
    });

    test("passes through name attribute", () => {
      const { getByRole } = render(<Input name="email" />);
      const input = getByRole("textbox");
      expect(input.getAttribute("name")).toBe("email");
    });

    test("passes through id attribute", () => {
      const { getByRole } = render(<Input id="my-input" />);
      const input = getByRole("textbox");
      expect(input.getAttribute("id")).toBe("my-input");
    });

    test("passes through aria attributes", () => {
      const { getByLabelText } = render(<Input aria-label="Search" />);
      const input = getByLabelText("Search");
      expect(input).toBeDefined();
    });

    test("passes through data attributes", () => {
      const { getByTestId } = render(<Input data-testid="search-input" />);
      expect(getByTestId("search-input")).toBeDefined();
    });

    test("passes through autoComplete attribute", () => {
      const { getByRole } = render(<Input autoComplete="email" />);
      const input = getByRole("textbox");
      expect(input.getAttribute("autocomplete")).toBe("email");
    });

    test("passes through maxLength attribute", () => {
      const { getByRole } = render(<Input maxLength={10} />);
      const input = getByRole("textbox");
      expect(input.getAttribute("maxlength")).toBe("10");
    });

    test("passes through min and max for number type", () => {
      const { getByRole } = render(<Input type="number" min={0} max={100} />);
      const input = getByRole("spinbutton");
      expect(input.getAttribute("min")).toBe("0");
      expect(input.getAttribute("max")).toBe("100");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let inputRef: HTMLInputElement | null = null;
      render(
        <Input
          ref={(el) => {
            inputRef = el;
          }}
        />
      );
      expect(inputRef).toBeInstanceOf(HTMLInputElement);
    });
  });
});
