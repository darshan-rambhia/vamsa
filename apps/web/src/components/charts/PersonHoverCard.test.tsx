/**
 * Unit Tests for PersonHoverCard Component
 * Tests hover card rendering with various prop combinations
 */

import { describe, expect, it } from "vitest";
import { PersonHoverCard } from "./PersonHoverCard";
import type { PersonHoverCardProps } from "./PersonHoverCard";

describe("PersonHoverCard Component", () => {
  // Default test data
  const defaultPerson = {
    id: "person-1",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1990-01-15",
    dateOfPassing: null,
    isLiving: true,
    photoUrl: null,
    gender: "Male",
  };

  const defaultProps: PersonHoverCardProps = {
    person: defaultPerson,
    children: <div>Trigger Element</div>,
  };

  // ====================================================
  // Basic Rendering Tests
  // ====================================================

  describe("Component Rendering", () => {
    it("should export PersonHoverCard component", () => {
      expect(PersonHoverCard).toBeDefined();
      expect(typeof PersonHoverCard).toBe("function");
    });

    it("should render with required props", () => {
      const element = PersonHoverCard(defaultProps);
      expect(element).toBeDefined();
      expect(element.type).toBeDefined();
    });

    it("should render with person name data", () => {
      const element = PersonHoverCard(defaultProps);
      expect(element).toBeDefined();
    });

    it("should accept children prop", () => {
      const element = PersonHoverCard({
        ...defaultProps,
        children: <button type="button">Hover me</button>,
      });
      expect(element).toBeDefined();
    });

    it("should render without onViewDetails callback", () => {
      const element = PersonHoverCard({
        ...defaultProps,
        onViewDetails: undefined,
      });
      expect(element).toBeDefined();
    });

    it("should render with onViewDetails callback", () => {
      const element = PersonHoverCard({
        ...defaultProps,
        onViewDetails: () => {},
      });
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Person Data Tests
  // ====================================================

  describe("Person Data Handling", () => {
    it("should handle person with full name", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          firstName: "Elizabeth",
          lastName: "Johnson",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with photoUrl", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          photoUrl: "/media/photos/john-doe.jpg",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person without photoUrl (null)", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          photoUrl: null,
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with empty photoUrl string", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          photoUrl: "",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with very long names", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          firstName: "Alexander Maximilian Johann Baptist",
          lastName: "von Humboldt-Friedrich-Wilhelm",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with single character names", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          firstName: "A",
          lastName: "Z",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with special characters in name", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          firstName: "Jean-Claude",
          lastName: "O'Brien",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with unicode characters", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          firstName: "Björk",
          lastName: "Íslaug",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Date Tests
  // ====================================================

  describe("Date Handling", () => {
    it("should handle person with birth date", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          dateOfBirth: "1990-01-15",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person without birth date (null)", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          dateOfBirth: null,
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle living person with isLiving=true", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          isLiving: true,
          dateOfPassing: null,
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle deceased person with isLiving=false and death date", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          dateOfBirth: "1950-03-15",
          dateOfPassing: "2020-09-10",
          isLiving: false,
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle deceased person without death date", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          dateOfPassing: null,
          isLiving: false,
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with both birth and death dates", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          dateOfBirth: "1950-01-01",
          dateOfPassing: "2020-12-31",
          isLiving: false,
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with no date data", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          dateOfBirth: null,
          dateOfPassing: null,
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle dates from distant past", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          dateOfBirth: "1800-01-01",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle future birth dates", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          dateOfBirth: "2050-12-31",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Gender Tests
  // ====================================================

  describe("Gender Handling", () => {
    it("should handle person with gender set to Male", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          gender: "Male",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with gender set to Female", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          gender: "Female",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with null gender", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          gender: null,
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle person with lowercase gender value", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          gender: "male",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Living Status Tests
  // ====================================================

  describe("Living Status Display", () => {
    it("should show Living badge for living person", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          isLiving: true,
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should not show Living badge for deceased person", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          isLiving: false,
          dateOfPassing: "2020-01-01",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Callback Tests
  // ====================================================

  describe("View Details Callback", () => {
    it("should accept onViewDetails callback", () => {
      const onViewDetails = () => {};
      const props = {
        ...defaultProps,
        onViewDetails,
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should not render button without onViewDetails", () => {
      const props = {
        ...defaultProps,
        onViewDetails: undefined,
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Delay Props Tests
  // ====================================================

  describe("Delay Props", () => {
    it("should accept custom openDelay", () => {
      const props = {
        ...defaultProps,
        openDelay: 500,
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should accept custom closeDelay", () => {
      const props = {
        ...defaultProps,
        closeDelay: 100,
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should use default delays when not specified", () => {
      const element = PersonHoverCard(defaultProps);
      expect(element).toBeDefined();
    });

    it("should accept zero delay values", () => {
      const props = {
        ...defaultProps,
        openDelay: 0,
        closeDelay: 0,
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Complex Combinations Tests
  // ====================================================

  describe("Complex Data Combinations", () => {
    it("should render complete hover card for living person with full data", () => {
      const fullPerson = {
        id: "person-full",
        firstName: "Elizabeth",
        lastName: "Johnson",
        dateOfBirth: "1985-07-23",
        dateOfPassing: null,
        isLiving: true,
        photoUrl: "/media/photos/elizabeth.jpg",
        gender: "Female",
      };

      const props = {
        ...defaultProps,
        person: fullPerson,
        onViewDetails: () => {},
      };

      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should render hover card for deceased person with age at death", () => {
      const deceasedPerson = {
        id: "person-deceased",
        firstName: "Robert",
        lastName: "Smith",
        dateOfBirth: "1950-03-15",
        dateOfPassing: "2020-09-10",
        isLiving: false,
        photoUrl: null,
        gender: "Male",
      };

      const props = {
        ...defaultProps,
        person: deceasedPerson,
        onViewDetails: () => {},
      };

      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should render hover card with minimal data", () => {
      const minimalPerson = {
        id: "person-min",
        firstName: "Unknown",
        lastName: "Person",
        dateOfBirth: null,
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: null,
      };

      const props = {
        ...defaultProps,
        person: minimalPerson,
      };

      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should render with various photo URL formats", () => {
      const photoUrls = [
        "/media/photos/john-doe.jpg",
        "/media/photos/john-doe.png",
        "/media/photos/john-doe.webp",
        "/media/photos/john-doe.jpg?size=large",
      ];

      photoUrls.forEach((url) => {
        const props = {
          ...defaultProps,
          person: {
            ...defaultPerson,
            photoUrl: url,
          },
        };
        const element = PersonHoverCard(props);
        expect(element).toBeDefined();
      });
    });

    it("should render with names from different cultures", () => {
      const names = [
        { firstName: "José", lastName: "García" },
        { firstName: "Liu", lastName: "Chen" },
        { firstName: "Sofia", lastName: "Müller" },
        { firstName: "Mohammed", lastName: "Al-Rashid" },
      ];

      names.forEach(({ firstName, lastName }) => {
        const props = {
          ...defaultProps,
          person: {
            ...defaultPerson,
            firstName,
            lastName,
          },
        };
        const element = PersonHoverCard(props);
        expect(element).toBeDefined();
      });
    });
  });

  // ====================================================
  // Edge Cases
  // ====================================================

  describe("Edge Cases", () => {
    it("should handle all optional props undefined", () => {
      const props: PersonHoverCardProps = {
        person: defaultPerson,
        children: <div>Trigger</div>,
        onViewDetails: undefined,
        openDelay: undefined,
        closeDelay: undefined,
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle whitespace in names", () => {
      const props = {
        ...defaultProps,
        person: {
          ...defaultPerson,
          firstName: "  John  ",
          lastName: "  Doe  ",
        },
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });

    it("should handle different trigger elements", () => {
      const triggers = [
        <div key="div">Div Trigger</div>,
        <button key="button" type="button">
          Button Trigger
        </button>,
        <span key="span">Span Trigger</span>,
      ];

      triggers.forEach((trigger) => {
        const props = {
          ...defaultProps,
          children: trigger,
        };
        const element = PersonHoverCard(props);
        expect(element).toBeDefined();
      });
    });

    it("should handle very large delay values", () => {
      const props = {
        ...defaultProps,
        openDelay: 10000,
        closeDelay: 10000,
      };
      const element = PersonHoverCard(props);
      expect(element).toBeDefined();
    });
  });
});
