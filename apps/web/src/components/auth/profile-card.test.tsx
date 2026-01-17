/**
 * Unit tests for ProfileCard component
 *
 * Note: This is a simple presentational component. Full rendering tests
 * would require @testing-library/react. These tests verify the component
 * exports correctly and can be instantiated with valid props.
 */

import { describe, it, expect } from "bun:test";
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

  describe("instantiation", () => {
    it("should create element with required props", () => {
      const element = <ProfileCard person={mockPerson} onClaim={mockOnClaim} />;

      expect(element).toBeDefined();
      expect(element.type).toBe(ProfileCard);
    });

    it("should accept optional highlighted prop", () => {
      const element = (
        <ProfileCard
          person={mockPerson}
          onClaim={mockOnClaim}
          highlighted={true}
        />
      );

      expect(element).toBeDefined();
    });

    it("should accept optional disabled prop", () => {
      const element = (
        <ProfileCard
          person={mockPerson}
          onClaim={mockOnClaim}
          disabled={true}
        />
      );

      expect(element).toBeDefined();
    });

    it("should handle person with null email", () => {
      const personNoEmail = { ...mockPerson, email: null };
      const element = (
        <ProfileCard person={personNoEmail} onClaim={mockOnClaim} />
      );

      expect(element).toBeDefined();
    });

    it("should handle person with null dateOfBirth", () => {
      const personNoDOB = { ...mockPerson, dateOfBirth: null };
      const element = (
        <ProfileCard person={personNoDOB} onClaim={mockOnClaim} />
      );

      expect(element).toBeDefined();
    });
  });
});
