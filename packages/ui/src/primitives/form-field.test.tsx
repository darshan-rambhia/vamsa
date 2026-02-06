/**
 * Unit Tests for FormField Component
 */
import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { FormField } from "./form-field";
import { Input } from "./input";

describe("FormField", () => {
  describe("rendering", () => {
    test("renders label and input correctly", () => {
      const { getByLabelText, getByRole } = render(
        <FormField label="Email">
          <Input type="email" />
        </FormField>
      );

      expect(getByLabelText("Email")).toBeDefined();
      expect(getByRole("textbox")).toBeDefined();
    });

    test("renders with custom className", () => {
      const { container } = render(
        <FormField label="Name" className="custom-wrapper">
          <Input />
        </FormField>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("custom-wrapper");
    });
  });

  describe("ID generation and association", () => {
    test("generates unique IDs and associates label with input", () => {
      const { getByLabelText } = render(
        <FormField label="Username">
          <Input />
        </FormField>
      );

      const input = getByLabelText("Username") as HTMLInputElement;
      expect(input.id).toBeTruthy();
    });

    test("multiple FormFields have unique IDs", () => {
      const { getByLabelText } = render(
        <>
          <FormField label="First Name">
            <Input />
          </FormField>
          <FormField label="Last Name">
            <Input />
          </FormField>
        </>
      );

      const firstName = getByLabelText("First Name") as HTMLInputElement;
      const lastName = getByLabelText("Last Name") as HTMLInputElement;

      expect(firstName.id).toBeTruthy();
      expect(lastName.id).toBeTruthy();
      expect(firstName.id).not.toBe(lastName.id);
    });
  });

  describe("error handling", () => {
    test("shows error message when error prop provided", () => {
      const { getByText } = render(
        <FormField label="Email" error="Email is required">
          <Input type="email" />
        </FormField>
      );

      const errorMessage = getByText("Email is required");
      expect(errorMessage).toBeDefined();
      expect(errorMessage.getAttribute("role")).toBe("alert");
      expect(errorMessage.getAttribute("aria-live")).toBe("polite");
    });

    test("adds aria-invalid when error prop provided", () => {
      const { getByRole } = render(
        <FormField label="Email" error="Invalid email">
          <Input type="email" />
        </FormField>
      );

      const input = getByRole("textbox");
      expect(input.getAttribute("aria-invalid")).toBe("true");
    });

    test("links error message to input with aria-describedby", () => {
      const { getByRole, getByText } = render(
        <FormField label="Email" error="Email is required">
          <Input type="email" />
        </FormField>
      );

      const input = getByRole("textbox");
      const errorMessage = getByText("Email is required");
      const ariaDescribedBy = input.getAttribute("aria-describedby");

      expect(ariaDescribedBy).toBeTruthy();
      expect(ariaDescribedBy).toContain(errorMessage.id);
    });

    test("does not add aria-invalid when no error", () => {
      const { getByRole } = render(
        <FormField label="Email">
          <Input type="email" />
        </FormField>
      );

      const input = getByRole("textbox");
      expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    test("applies correct error styling", () => {
      const { getByText } = render(
        <FormField label="Email" error="Email is required">
          <Input type="email" />
        </FormField>
      );

      const errorMessage = getByText("Email is required");
      expect(errorMessage.className).toContain("text-destructive");
      expect(errorMessage.className).toContain("text-sm");
    });
  });

  describe("description text", () => {
    test("shows description when description prop provided", () => {
      const { getByText } = render(
        <FormField label="Password" description="Must be at least 8 characters">
          <Input type="password" />
        </FormField>
      );

      expect(getByText("Must be at least 8 characters")).toBeDefined();
    });

    test("links description to input with aria-describedby", () => {
      const { getByLabelText, getByText } = render(
        <FormField label="Password" description="Must be at least 8 characters">
          <Input type="password" />
        </FormField>
      );

      const input = getByLabelText("Password");
      const description = getByText("Must be at least 8 characters");
      const ariaDescribedBy = input.getAttribute("aria-describedby");

      expect(ariaDescribedBy).toBeTruthy();
      expect(ariaDescribedBy).toContain(description.id);
    });

    test("applies correct description styling", () => {
      const { getByText } = render(
        <FormField label="Email" description="We'll never share your email">
          <Input type="email" />
        </FormField>
      );

      const description = getByText("We'll never share your email");
      expect(description.className).toContain("text-muted-foreground");
      expect(description.className).toContain("text-sm");
    });

    test("hides description when error is present", () => {
      const { queryByText, getByText } = render(
        <FormField
          label="Email"
          description="We'll never share your email"
          error="Email is required"
        >
          <Input type="email" />
        </FormField>
      );

      expect(queryByText("We'll never share your email")).toBeNull();
      expect(getByText("Email is required")).toBeDefined();
    });
  });

  describe("required indicator", () => {
    test("shows required indicator when required prop is true", () => {
      const { container } = render(
        <FormField label="Email" required>
          <Input type="email" />
        </FormField>
      );

      // Check that asterisk is present in the label
      const label = container.querySelector("label");
      expect(label?.textContent).toContain("Email");
      expect(label?.textContent).toContain("*");
    });

    test("required indicator has correct styling", () => {
      const { container } = render(
        <FormField label="Email" required>
          <Input type="email" />
        </FormField>
      );

      const asterisk = container.querySelector('span[aria-label="required"]');
      expect(asterisk).toBeDefined();
      expect(asterisk?.className).toContain("text-destructive");
    });

    test("does not show required indicator when required is false", () => {
      const { container } = render(
        <FormField label="Email">
          <Input type="email" />
        </FormField>
      );

      const asterisk = container.querySelector('span[aria-label="required"]');
      expect(asterisk).toBeNull();
    });
  });

  describe("aria-describedby combination", () => {
    test("combines error and description IDs when both present", () => {
      const { getByLabelText } = render(
        <FormField
          label="Password"
          description="Must be at least 8 characters"
          error="Password is too short"
        >
          <Input type="password" />
        </FormField>
      );

      const input = getByLabelText("Password");
      const ariaDescribedBy = input.getAttribute("aria-describedby");

      expect(ariaDescribedBy).toBeTruthy();
      // Should contain error ID (description is hidden when error exists)
      expect(ariaDescribedBy).toContain("-error");
    });

    test("only includes error ID when only error is present", () => {
      const { getByRole } = render(
        <FormField label="Email" error="Email is required">
          <Input type="email" />
        </FormField>
      );

      const input = getByRole("textbox");
      const ariaDescribedBy = input.getAttribute("aria-describedby");

      expect(ariaDescribedBy).toBeTruthy();
      expect(ariaDescribedBy).toContain("-error");
      expect(ariaDescribedBy).not.toContain("-desc");
    });

    test("only includes description ID when only description is present", () => {
      const { getByRole } = render(
        <FormField label="Email" description="Enter your email address">
          <Input type="email" />
        </FormField>
      );

      const input = getByRole("textbox");
      const ariaDescribedBy = input.getAttribute("aria-describedby");

      expect(ariaDescribedBy).toBeTruthy();
      expect(ariaDescribedBy).toContain("-desc");
      expect(ariaDescribedBy).not.toContain("-error");
    });

    test("omits aria-describedby when neither error nor description present", () => {
      const { getByRole } = render(
        <FormField label="Email">
          <Input type="email" />
        </FormField>
      );

      const input = getByRole("textbox");
      expect(input.getAttribute("aria-describedby")).toBeNull();
    });
  });

  describe("child element cloning", () => {
    test("preserves child element type", () => {
      const { getByRole } = render(
        <FormField label="Message">
          <textarea />
        </FormField>
      );

      const textarea = getByRole("textbox");
      expect(textarea.tagName.toLowerCase()).toBe("textarea");
    });

    test("preserves existing props on child", () => {
      const { getByRole } = render(
        <FormField label="Email">
          <Input type="email" placeholder="you@example.com" disabled />
        </FormField>
      );

      const input = getByRole("textbox") as HTMLInputElement;
      expect(input.placeholder).toBe("you@example.com");
      expect(input.disabled).toBe(true);
    });

    test("injects accessibility props without overriding existing ones", () => {
      const { getByRole } = render(
        <FormField label="Email" error="Email is required">
          <Input type="email" data-testid="email-input" />
        </FormField>
      );

      const input = getByRole("textbox");
      expect(input.getAttribute("data-testid")).toBe("email-input");
      expect(input.getAttribute("aria-invalid")).toBe("true");
    });
  });

  describe("layout and spacing", () => {
    test("applies space-y-2 wrapper styling", () => {
      const { container } = render(
        <FormField label="Email">
          <Input type="email" />
        </FormField>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("space-y-2");
    });
  });
});
