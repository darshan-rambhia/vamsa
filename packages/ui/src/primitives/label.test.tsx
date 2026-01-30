/**
 * Unit Tests for Label Component
 */
import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Label } from "./label";

describe("Label", () => {
  describe("rendering", () => {
    test("renders label element", () => {
      const { container } = render(
        <div>
          <input id="email-input" />
          <Label htmlFor="email-input">Email</Label>
        </div>
      );
      const label = container.querySelector("label");
      expect(label).toBeDefined();
    });

    test("renders with children", () => {
      const { getByText } = render(
        <div>
          <input id="username-input" />
          <Label htmlFor="username-input">Username</Label>
        </div>
      );
      expect(getByText("Username")).toBeDefined();
    });

    test("renders with custom className", () => {
      const { container } = render(
        <div>
          <input id="name-input" />
          <Label className="custom-label" htmlFor="name-input">
            Name
          </Label>
        </div>
      );
      const label = container.querySelector("label");
      expect(label?.className).toContain("custom-label");
    });
  });

  describe("styling", () => {
    test("applies base text styles", () => {
      const { container } = render(
        <div>
          <input id="field-input" />
          <Label htmlFor="field-input">Field</Label>
        </div>
      );
      const label = container.querySelector("label");
      expect(label?.className).toContain("text-sm");
      expect(label?.className).toContain("font-medium");
    });

    test("applies peer-disabled styles", () => {
      const { container } = render(
        <div>
          <input id="disabled-input" />
          <Label htmlFor="disabled-input">Disabled Field</Label>
        </div>
      );
      const label = container.querySelector("label");
      expect(label?.className).toContain("peer-disabled:");
    });
  });

  describe("HTML attributes", () => {
    test("passes through htmlFor attribute", () => {
      const { container } = render(
        <div>
          <input id="email-input" />
          <Label htmlFor="email-input">Email</Label>
        </div>
      );
      const label = container.querySelector("label");
      expect(label?.getAttribute("for")).toBe("email-input");
    });

    test("passes through id attribute", () => {
      const { container } = render(
        <div>
          <input id="id-input" />
          <Label id="my-label" htmlFor="id-input">
            Name
          </Label>
        </div>
      );
      const label = container.querySelector("label");
      expect(label?.getAttribute("id")).toBe("my-label");
    });

    test("passes through data attributes", () => {
      const { getByTestId } = render(
        <div>
          <input id="data-input" />
          <Label data-testid="test-label" htmlFor="data-input">
            Test
          </Label>
        </div>
      );
      expect(getByTestId("test-label")).toBeDefined();
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let labelRef: HTMLLabelElement | null = null;
      render(
        <div>
          <input id="ref-input" />
          <Label
            htmlFor="ref-input"
            ref={(el) => {
              labelRef = el;
            }}
          >
            Ref Test
          </Label>
        </div>
      );
      expect(labelRef).not.toBeNull();
      expect(labelRef!.tagName).toBe("LABEL");
    });
  });
});
