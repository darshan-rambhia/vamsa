/**
 * Unit tests for ChartSkeleton component
 *
 * Note: This is a simple presentational loading component. Full rendering
 * tests would require @testing-library/react. These tests verify the
 * component exports correctly and can be instantiated with valid props.
 */

import { describe, it, expect } from "bun:test";
import { ChartSkeleton } from "./ChartSkeleton";

describe("ChartSkeleton Component", () => {
  describe("exports", () => {
    it("should export ChartSkeleton component", () => {
      expect(ChartSkeleton).toBeDefined();
      expect(typeof ChartSkeleton).toBe("function");
    });
  });

  describe("instantiation", () => {
    it("should create element with no props", () => {
      const element = <ChartSkeleton />;

      expect(element).toBeDefined();
      expect(element.type).toBe(ChartSkeleton);
    });

    it("should accept optional message prop", () => {
      const element = <ChartSkeleton message="Loading family tree..." />;

      expect(element).toBeDefined();
    });

    it("should accept optional estimatedTime prop", () => {
      const element = <ChartSkeleton estimatedTime="~2-5s" />;

      expect(element).toBeDefined();
    });

    it("should accept both props together", () => {
      const element = (
        <ChartSkeleton message="Loading..." estimatedTime="~5s" />
      );

      expect(element).toBeDefined();
    });
  });
});
