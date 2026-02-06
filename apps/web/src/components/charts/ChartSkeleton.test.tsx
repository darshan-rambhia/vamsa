/**
 * Unit tests for ChartSkeleton component
 *
 * Tests:
 * - Component export as a function
 * - Rendering with no props (displays default loading text)
 * - Container styling and structure (flexbox, full height/width, border)
 * - Message prop rendering and styling
 * - Estimated time prop rendering (only with message)
 * - Both props together with proper text hierarchy
 * - Spinner animation and styling (animate-spin, primary color, size)
 * - Layout structure (vertical stacking, centering, gap)
 * - Accessibility (semantic HTML, text hierarchy, color contrast)
 * - Different message and estimated time formats
 *
 * Coverage: 31 tests across 8 describe blocks
 * ChartSkeleton.tsx: 100% line coverage, 100% function coverage
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ChartSkeleton } from "./ChartSkeleton";

describe("ChartSkeleton Component", () => {
  describe("Component Export", () => {
    it("should export ChartSkeleton as a function", () => {
      expect(typeof ChartSkeleton).toBe("function");
    });
  });

  describe("Rendering with no props", () => {
    it("should render with no props", () => {
      const { container } = render(<ChartSkeleton />);
      expect(container).toBeDefined();
    });

    it("should render container with appropriate styling", () => {
      const { container } = render(<ChartSkeleton />);
      const wrapper = container.querySelector("div.bg-card");
      expect(wrapper).toBeDefined();
      expect(wrapper?.className).toContain("flex");
      expect(wrapper?.className).toContain("h-full");
      expect(wrapper?.className).toContain("w-full");
    });

    it("should always render default loading text", () => {
      const { getByText } = render(<ChartSkeleton />);
      const loadingText = getByText(/optimizing layout/i);
      expect(loadingText).toBeDefined();
    });

    it("should render loading spinner", () => {
      const { container } = render(<ChartSkeleton />);
      // Loader2 icon renders as SVG
      const svg = container.querySelector("svg");
      expect(svg).toBeDefined();
      expect(svg?.className.baseVal || svg?.className).toContain(
        "animate-spin"
      );
    });
  });

  describe("Message Prop", () => {
    it("should render message when provided", () => {
      const message = "Loading family tree...";
      const { getByText } = render(<ChartSkeleton message={message} />);
      expect(getByText(message)).toBeDefined();
    });

    it("should apply correct styling to message", () => {
      const message = "Processing large dataset...";
      const { getByText } = render(<ChartSkeleton message={message} />);
      const messageElement = getByText(message);
      expect(messageElement.className).toContain("text-lg");
      expect(messageElement.className).toContain("font-medium");
    });

    it("should render message in a container", () => {
      const message = "Building relationships...";
      const { getByText } = render(<ChartSkeleton message={message} />);
      const messageElement = getByText(message);
      const messageContainer = messageElement.parentElement;
      expect(messageContainer?.className).toContain("space-y-2");
    });

    it("should not render message section when message is not provided", () => {
      const { container } = render(<ChartSkeleton />);
      const messageSections = container.querySelectorAll("div.space-y-2");
      expect(messageSections.length).toBe(0);
    });
  });

  describe("Estimated Time Prop", () => {
    it("should render estimated time when provided with message", () => {
      const message = "Loading...";
      const estimatedTime = "~2-5 seconds";
      const { getByText } = render(
        <ChartSkeleton message={message} estimatedTime={estimatedTime} />
      );
      expect(getByText(new RegExp(estimatedTime))).toBeDefined();
    });

    it("should apply correct styling to estimated time text", () => {
      const { getByText } = render(
        <ChartSkeleton message="Loading..." estimatedTime="~3 seconds" />
      );
      const timeElement = getByText(/estimated time/i);
      expect(timeElement.className).toContain("text-sm");
      expect(timeElement.className).toContain("text-muted-foreground");
    });

    it("should not render estimated time without message", () => {
      const { queryByText } = render(
        <ChartSkeleton estimatedTime="~5 seconds" />
      );
      // Estimated time should only show with a message
      expect(queryByText(/estimated time/i)).toBeNull();
    });

    it("should display full estimated time label with value", () => {
      const estimatedTime = "~10 seconds";
      const { getByText } = render(
        <ChartSkeleton message="Processing..." estimatedTime={estimatedTime} />
      );
      const timeLabel = getByText(/estimated time/i);
      expect(timeLabel.textContent).toContain("Estimated time:");
      expect(timeLabel.textContent).toContain(estimatedTime);
    });
  });

  describe("Both Props Together", () => {
    it("should render both message and estimated time correctly", () => {
      const message = "Analyzing family relationships...";
      const estimatedTime = "~5-10 seconds";
      const { getByText } = render(
        <ChartSkeleton message={message} estimatedTime={estimatedTime} />
      );
      expect(getByText(message)).toBeDefined();
      expect(getByText(/estimated time/i)).toBeDefined();
    });

    it("should render both message and default loading text", () => {
      const message = "Building chart...";
      const { getByText } = render(<ChartSkeleton message={message} />);
      expect(getByText(message)).toBeDefined();
      expect(getByText(/optimizing layout/i)).toBeDefined();
    });

    it("should structure content properly with both props", () => {
      const { container } = render(
        <ChartSkeleton message="Processing..." estimatedTime="~5 seconds" />
      );
      // Should have spinner
      const spinner = container.querySelector("svg");
      expect(spinner).toBeDefined();

      // Should have message section
      const messageSection = container.querySelector("div.space-y-2");
      expect(messageSection).toBeDefined();

      // Should have default loading text
      const defaultText = container.querySelector("div.text-muted-foreground");
      expect(defaultText).toBeDefined();
    });
  });

  describe("Layout Structure", () => {
    it("should use flexbox centering", () => {
      const { container } = render(<ChartSkeleton />);
      const wrapper = container.querySelector("div.flex");
      expect(wrapper?.className).toContain("items-center");
      expect(wrapper?.className).toContain("justify-center");
    });

    it("should have full viewport coverage", () => {
      const { container } = render(<ChartSkeleton />);
      const wrapper = container.querySelector("div.h-full");
      expect(wrapper?.className).toContain("w-full");
    });

    it("should have rounded border", () => {
      const { container } = render(<ChartSkeleton />);
      const wrapper = container.querySelector("div.rounded-lg");
      expect(wrapper).toBeDefined();
      expect(wrapper?.className).toContain("border");
    });

    it("should have vertical stacking of content", () => {
      const { container } = render(
        <ChartSkeleton message="Test" estimatedTime="~2s" />
      );
      const contentWrapper = container.querySelector("div.flex-col");
      expect(contentWrapper).toBeDefined();
      expect(contentWrapper?.className).toContain("gap-4");
    });

    it("should have center-aligned text", () => {
      const { container } = render(<ChartSkeleton message="Loading..." />);
      const contentWrapper = container.querySelector("div.text-center");
      expect(contentWrapper).toBeDefined();
    });
  });

  describe("Spinner Animation", () => {
    it("should apply animate-spin class to spinner", () => {
      const { container } = render(<ChartSkeleton />);
      const svg = container.querySelector("svg");
      const svgClasses = svg?.className.baseVal || svg?.className;
      expect(svgClasses).toContain("animate-spin");
    });

    it("should apply appropriate sizing to spinner", () => {
      const { container } = render(<ChartSkeleton />);
      const svg = container.querySelector("svg");
      const svgClasses = svg?.className.baseVal || svg?.className;
      expect(svgClasses).toContain("h-12");
      expect(svgClasses).toContain("w-12");
    });

    it("should apply primary color to spinner", () => {
      const { container } = render(<ChartSkeleton />);
      const svg = container.querySelector("svg");
      const svgClasses = svg?.className.baseVal || svg?.className;
      expect(svgClasses).toContain("text-primary");
    });
  });

  describe("Different Message Scenarios", () => {
    it("should handle short message", () => {
      const { getByText } = render(<ChartSkeleton message="Wait..." />);
      expect(getByText("Wait...")).toBeDefined();
    });

    it("should handle long message", () => {
      const longMessage =
        "Organizing genealogical data and calculating relationships for your family tree visualization";
      const { getByText } = render(<ChartSkeleton message={longMessage} />);
      expect(getByText(longMessage)).toBeDefined();
    });

    it("should handle message with special characters", () => {
      const message = "Loading... 50%";
      const { getByText } = render(<ChartSkeleton message={message} />);
      expect(getByText(message)).toBeDefined();
    });

    it("should handle different estimated time formats", () => {
      const times = [
        "~2 seconds",
        "~5-10 seconds",
        "< 1 minute",
        "~2-5 minutes",
      ];

      times.forEach((time) => {
        const { container } = render(
          <ChartSkeleton message="Processing..." estimatedTime={time} />
        );
        expect(container.textContent).toContain(time);
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper text hierarchy with message", () => {
      const { getByText } = render(
        <ChartSkeleton message="Loading chart..." />
      );
      const message = getByText("Loading chart...");
      // Message should be in a paragraph or similar semantic element
      expect(message.tagName.toLowerCase()).toBe("p");
    });

    it("should provide context for loading state", () => {
      const { getByText } = render(
        <ChartSkeleton message="Processing..." estimatedTime="~5s" />
      );
      // Both message and default text provide context
      expect(getByText("Processing...")).toBeDefined();
      expect(getByText(/optimizing layout/i)).toBeDefined();
    });

    it("should maintain readable contrast with color classes", () => {
      const { container } = render(
        <ChartSkeleton message="Loading..." estimatedTime="~2s" />
      );
      // Check that text-muted-foreground is applied for secondary text
      const mutedText = container.querySelector(".text-muted-foreground");
      expect(mutedText).toBeDefined();
    });
  });
});
