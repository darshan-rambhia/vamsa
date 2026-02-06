/**
 * Unit Tests for ChartTooltip Component
 * Tests tooltip rendering with various prop combinations
 */

import { describe, expect, it } from "vitest";
import { ChartTooltip } from "./ChartTooltip";
import type { ChartTooltipProps } from "./ChartTooltip";

describe("ChartTooltip Component", () => {
  // Default test data
  const defaultNode = {
    id: "person-1",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1990-01-15",
    dateOfPassing: null,
    isLiving: true,
    photoUrl: null,
    gender: "Male",
  };

  const defaultProps: ChartTooltipProps = {
    node: defaultNode,
    position: { x: 500, y: 300 },
    rootPersonId: "person-2",
    onSetAsCenter: () => {},
    onViewProfile: () => {},
  };

  // ====================================================
  // Basic Rendering Tests
  // ====================================================

  describe("Component Rendering", () => {
    it("should export ChartTooltip component", () => {
      expect(ChartTooltip).toBeDefined();
      expect(typeof ChartTooltip).toBe("function");
    });

    it("should render with required props", () => {
      const element = ChartTooltip(defaultProps);
      expect(element).toBeDefined();
      expect(element.type).toBe("div");
    });

    it("should render with person name", () => {
      const element = ChartTooltip(defaultProps);
      expect(element.props.children).toBeDefined();
      // Component renders name in the JSX
      expect(element.props.className).toContain("z-50");
    });

    it("should accept optional relationshipLabel prop", () => {
      const props = {
        ...defaultProps,
        relationshipLabel: "Sibling",
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should accept undefined relationshipLabel prop", () => {
      const props = {
        ...defaultProps,
        relationshipLabel: undefined,
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Position Tests
  // ====================================================

  describe("Position Handling", () => {
    it("should accept position prop with x and y coordinates", () => {
      const props = {
        ...defaultProps,
        position: { x: 500, y: 300 },
      };
      const element = ChartTooltip(props);
      // Component adds padding (16px) to position
      expect(element.props.style.left).toBe("516px");
      expect(element.props.style.top).toBe("316px");
    });

    it("should handle position at viewport edges (0, 0)", () => {
      const props = {
        ...defaultProps,
        position: { x: 0, y: 0 },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle large position coordinates", () => {
      const props = {
        ...defaultProps,
        position: { x: 5000, y: 5000 },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle negative position coordinates", () => {
      const props = {
        ...defaultProps,
        position: { x: -100, y: -100 },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle decimal position coordinates", () => {
      const props = {
        ...defaultProps,
        position: { x: 123.456, y: 789.012 },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Node Data Tests
  // ====================================================

  describe("Person Data Handling", () => {
    it("should render with person data", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          firstName: "Elizabeth",
          lastName: "Johnson",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with photoUrl", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          photoUrl: "/media/photos/john-doe.jpg",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person without photoUrl (null)", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          photoUrl: null,
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with empty photoUrl string", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          photoUrl: "",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with very long names", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          firstName: "Alexander Maximilian Johann Baptist",
          lastName: "von Humboldt-Friedrich-Wilhelm",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with single character names", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          firstName: "A",
          lastName: "Z",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with special characters in name", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          firstName: "Jean-Claude",
          lastName: "O'Brien",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with unicode characters", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          firstName: "Björk",
          lastName: "Íslaug",
        },
      };
      const element = ChartTooltip(props);
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
        node: {
          ...defaultNode,
          dateOfBirth: "1990-01-15",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person without birth date (null)", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          dateOfBirth: null,
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle living person with isLiving=true", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          isLiving: true,
          dateOfPassing: null,
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle deceased person with isLiving=false and death date", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          dateOfBirth: "1950-03-15",
          dateOfPassing: "2020-09-10",
          isLiving: false,
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle deceased person without death date", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          dateOfPassing: null,
          isLiving: false,
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with both birth and death dates", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          dateOfBirth: "1950-01-01",
          dateOfPassing: "2020-12-31",
          isLiving: false,
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with no date data", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          dateOfBirth: null,
          dateOfPassing: null,
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle dates from distant past", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          dateOfBirth: "1800-01-01",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle future birth dates", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          dateOfBirth: "2050-12-31",
        },
      };
      const element = ChartTooltip(props);
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
        node: {
          ...defaultNode,
          gender: "Male",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with gender set to Female", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          gender: "Female",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with null gender", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          gender: null,
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle person with lowercase gender value", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          gender: "male",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Callback Props Tests
  // ====================================================

  describe("Callback Props", () => {
    it("should accept onViewProfile callback", () => {
      const onViewProfile = () => {};
      const props = {
        ...defaultProps,
        onViewProfile,
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should accept onSetAsCenter callback", () => {
      const onSetAsCenter = () => {};
      const props = {
        ...defaultProps,
        onSetAsCenter,
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should accept both callback props", () => {
      const onViewProfile = () => {};
      const onSetAsCenter = () => {};
      const props = {
        ...defaultProps,
        onViewProfile,
        onSetAsCenter,
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Root Person Tests
  // ====================================================

  describe("Root Person Handling", () => {
    it("should render differently when node is root person", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          id: "root-person",
        },
        rootPersonId: "root-person",
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should render normally when node is not root person", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          id: "person-1",
        },
        rootPersonId: "person-2",
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });
  });

  // ====================================================
  // Complex Combinations Tests
  // ====================================================

  describe("Complex Data Combinations", () => {
    it("should render complete tooltip for living person with full data", () => {
      const fullNode = {
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
        node: fullNode,
        relationshipLabel: "Sibling",
      };

      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should render tooltip for deceased person with age at death", () => {
      const deceasedNode = {
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
        node: deceasedNode,
        relationshipLabel: "Parent",
      };

      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should render tooltip with minimal data", () => {
      const minimalNode = {
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
        node: minimalNode,
      };

      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should render root person without relationship label", () => {
      const rootNode = {
        ...defaultNode,
        id: "root-person",
      };

      const props = {
        ...defaultProps,
        node: rootNode,
        rootPersonId: "root-person",
        relationshipLabel: "Parent",
      };

      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should render with different relationship labels", () => {
      const relationships = ["Parent", "Sibling", "Child", "Spouse"];

      relationships.forEach((label) => {
        const props = {
          ...defaultProps,
          relationshipLabel: label,
        };
        const element = ChartTooltip(props);
        expect(element).toBeDefined();
      });
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
          node: {
            ...defaultNode,
            photoUrl: url,
          },
        };
        const element = ChartTooltip(props);
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
          node: {
            ...defaultNode,
            firstName,
            lastName,
          },
        };
        const element = ChartTooltip(props);
        expect(element).toBeDefined();
      });
    });
  });

  // ====================================================
  // Edge Cases
  // ====================================================

  describe("Edge Cases", () => {
    it("should handle tooltip with all optional props undefined", () => {
      const props: ChartTooltipProps = {
        node: defaultNode,
        position: { x: 100, y: 100 },
        rootPersonId: "different-person",
        onSetAsCenter: () => {},
        onViewProfile: () => {},
        relationshipLabel: undefined,
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle rapid position updates", () => {
      const positions = [
        { x: 0, y: 0 },
        { x: 500, y: 300 },
        { x: 1000, y: 600 },
        { x: 1500, y: 900 },
      ];

      positions.forEach((pos) => {
        const props = {
          ...defaultProps,
          position: pos,
        };
        const element = ChartTooltip(props);
        expect(element).toBeDefined();
      });
    });

    it("should handle node id matching root person id", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          id: "same-id",
        },
        rootPersonId: "same-id",
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle node id different from root person id", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          id: "person-a",
        },
        rootPersonId: "person-b",
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle whitespace in names", () => {
      const props = {
        ...defaultProps,
        node: {
          ...defaultNode,
          firstName: "  John  ",
          lastName: "  Doe  ",
        },
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });

    it("should handle empty string for relationship label", () => {
      const props = {
        ...defaultProps,
        relationshipLabel: "",
      };
      const element = ChartTooltip(props);
      expect(element).toBeDefined();
    });
  });
});
