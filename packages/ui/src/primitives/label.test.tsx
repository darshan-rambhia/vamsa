/**
 * Unit Tests for Label Component
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Label } from "./label";

describe("Label", () => {
  describe("rendering", () => {
    test("renders label element", () => {
      const { container } = render(<Label>Email</Label>);
      const label = container.querySelector("label");
      expect(label).toBeDefined();
    });

    test("renders with children", () => {
      const { getByText } = render(<Label>Username</Label>);
      expect(getByText("Username")).toBeDefined();
    });

    test("renders with custom className", () => {
      const { container } = render(
        <Label className="custom-label">Name</Label>
      );
      const label = container.querySelector("label");
      expect(label?.className).toContain("custom-label");
    });
  });

  describe("styling", () => {
    test("applies base text styles", () => {
      const { container } = render(<Label>Field</Label>);
      const label = container.querySelector("label");
      expect(label?.className).toContain("text-sm");
      expect(label?.className).toContain("font-medium");
    });

    test("applies peer-disabled styles", () => {
      const { container } = render(<Label>Disabled Field</Label>);
      const label = container.querySelector("label");
      expect(label?.className).toContain("peer-disabled:");
    });
  });

  describe("HTML attributes", () => {
    test("passes through htmlFor attribute", () => {
      const { container } = render(<Label htmlFor="email-input">Email</Label>);
      const label = container.querySelector("label");
      expect(label?.getAttribute("for")).toBe("email-input");
    });

    test("passes through id attribute", () => {
      const { container } = render(<Label id="my-label">Name</Label>);
      const label = container.querySelector("label");
      expect(label?.getAttribute("id")).toBe("my-label");
    });

    test("passes through data attributes", () => {
      const { getByTestId } = render(
        <Label data-testid="test-label">Test</Label>
      );
      expect(getByTestId("test-label")).toBeDefined();
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let labelRef: HTMLLabelElement | null = null;
      render(
        <Label
          ref={(el) => {
            labelRef = el;
          }}
        >
          Ref Test
        </Label>
      );
      expect(labelRef).not.toBeNull();
      expect(labelRef!.tagName).toBe("LABEL");
    });
  });
});
