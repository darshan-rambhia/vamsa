/**
 * Unit tests for ProfileCard component
 *
 * Tests the ProfileCard presentational component which displays person information
 * and a claim button. Tests cover rendering, prop handling, and user interactions.
 */

import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { ProfileCard } from "./profile-card";

describe("ProfileCard Component", () => {
  const mockPerson = {
    id: "person-1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    dateOfBirth: new Date("1990-01-15"),
  };

  const mockOnClaim = () => {};

  describe("exports", () => {
    it("should export ProfileCard component", () => {
      expect(ProfileCard).toBeDefined();
      expect(typeof ProfileCard).toBe("function");
    });
  });

  describe("rendering", () => {
    it("should render with required props", () => {
      const { container } = render(
        <ProfileCard person={mockPerson} onClaim={mockOnClaim} />
      );

      expect(container).toBeDefined();
      expect(container.querySelector("button")).toBeDefined();
    });

    it("should display person's full name", () => {
      const { getByText } = render(
        <ProfileCard person={mockPerson} onClaim={mockOnClaim} />
      );

      expect(getByText("John Doe")).toBeDefined();
    });

    it("should display person's email", () => {
      const { getByText } = render(
        <ProfileCard person={mockPerson} onClaim={mockOnClaim} />
      );

      expect(getByText("john.doe@example.com")).toBeDefined();
    });

    it("should display formatted date of birth", () => {
      const { getByText } = render(
        <ProfileCard person={mockPerson} onClaim={mockOnClaim} />
      );

      // The component uses formatDate from @vamsa/lib
      // Check that some date text is rendered
      const textContent = getByText(/Born:/);
      expect(textContent).toBeDefined();
    });

    it("should render claim button", () => {
      const { getByRole } = render(
        <ProfileCard person={mockPerson} onClaim={mockOnClaim} />
      );

      const button = getByRole("button");
      expect(button).toBeDefined();
      expect(button.textContent).toContain("Claim Profile");
    });
  });

  describe("optional props", () => {
    it("should apply highlighted styling when highlighted=true", () => {
      const { getByText } = render(
        <ProfileCard
          person={mockPerson}
          onClaim={mockOnClaim}
          highlighted={true}
        />
      );

      // When highlighted, the button should use default (primary) variant
      const button = getByText("Claim Profile");
      expect(button.className).not.toContain("border");
    });

    it("should not apply highlighted styling when highlighted=false", () => {
      const { getByText } = render(
        <ProfileCard
          person={mockPerson}
          onClaim={mockOnClaim}
          highlighted={false}
        />
      );

      // When highlighted=false, the button should use outline variant (has border)
      const button = getByText("Claim Profile");
      expect(button.className).toContain("border");
    });

    it("should disable button when disabled=true", () => {
      const { getByRole } = render(
        <ProfileCard
          person={mockPerson}
          onClaim={mockOnClaim}
          disabled={true}
        />
      );

      const button = getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it("should enable button when disabled=false", () => {
      const { getByRole } = render(
        <ProfileCard
          person={mockPerson}
          onClaim={mockOnClaim}
          disabled={false}
        />
      );

      const button = getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe("handling null values", () => {
    it("should render without email when email is null", () => {
      const personNoEmail = { ...mockPerson, email: null };
      const { container, queryByText } = render(
        <ProfileCard person={personNoEmail} onClaim={mockOnClaim} />
      );

      expect(container).toBeDefined();
      expect(queryByText("john.doe@example.com")).toBeNull();
    });

    it("should render without date of birth when dateOfBirth is null", () => {
      const personNoDOB = { ...mockPerson, dateOfBirth: null };
      const { getByText, queryByText } = render(
        <ProfileCard person={personNoDOB} onClaim={mockOnClaim} />
      );

      // Should still have name and button
      expect(getByText("John Doe")).toBeDefined();
      // Should not have "Born:" text
      expect(queryByText(/Born:/)).toBeNull();
    });

    it("should render with both null values", () => {
      const personMinimal = {
        ...mockPerson,
        email: null,
        dateOfBirth: null,
      };
      const { getByText, getByRole } = render(
        <ProfileCard person={personMinimal} onClaim={mockOnClaim} />
      );

      expect(getByText("John Doe")).toBeDefined();
      expect(getByRole("button")).toBeDefined();
    });
  });

  describe("user interactions", () => {
    it("should call onClaim when button is clicked", () => {
      let claimCalled = false;
      const handleClaim = () => {
        claimCalled = true;
      };

      const { getByRole } = render(
        <ProfileCard person={mockPerson} onClaim={handleClaim} />
      );

      const button = getByRole("button");
      button.click();
      expect(claimCalled).toBe(true);
    });

    it("should not call onClaim when disabled and button is clicked", () => {
      let claimCalled = false;
      const handleClaim = () => {
        claimCalled = true;
      };

      const { getByRole } = render(
        <ProfileCard
          person={mockPerson}
          onClaim={handleClaim}
          disabled={true}
        />
      );

      const button = getByRole("button");
      button.click();
      expect(claimCalled).toBe(false);
    });
  });

  describe("button styling variants", () => {
    it("should use default variant button when highlighted=false", () => {
      const { getByRole } = render(
        <ProfileCard
          person={mockPerson}
          onClaim={mockOnClaim}
          highlighted={false}
        />
      );

      const button = getByRole("button");
      // Outline variant should have border styling
      expect(button.className).toContain("border");
    });

    it("should use primary variant button when highlighted=true", () => {
      const { getByRole } = render(
        <ProfileCard
          person={mockPerson}
          onClaim={mockOnClaim}
          highlighted={true}
        />
      );

      const button = getByRole("button");
      // Primary variant should have different styling than outline
      expect(button.className).not.toContain("border");
    });

    it("should have small button size", () => {
      const { getByRole } = render(
        <ProfileCard person={mockPerson} onClaim={mockOnClaim} />
      );

      const button = getByRole("button");
      // Small size should be present in classname
      expect(button.className).toContain("h-9");
    });
  });

  describe("props validation", () => {
    it("should accept required props", () => {
      const element = <ProfileCard person={mockPerson} onClaim={mockOnClaim} />;
      expect(element).toBeDefined();
    });

    it("should accept all optional props", () => {
      const element = (
        <ProfileCard
          person={mockPerson}
          onClaim={mockOnClaim}
          highlighted={true}
          disabled={false}
        />
      );
      expect(element).toBeDefined();
    });

    it("should work with different person data", () => {
      const differentPerson = {
        id: "person-2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        dateOfBirth: new Date("1985-06-20"),
      };

      const { getByText } = render(
        <ProfileCard person={differentPerson} onClaim={mockOnClaim} />
      );

      expect(getByText("Jane Smith")).toBeDefined();
      expect(getByText("jane.smith@example.com")).toBeDefined();
    });
  });
});
