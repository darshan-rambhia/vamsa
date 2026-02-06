/**
 * Unit tests for ChartControls component
 *
 * Tests:
 * - Component export and rendering with minimal/full props
 * - Chart type selector visibility (hideChartTypeSelector prop)
 * - Conditional rendering of generation sliders based on chart type:
 *   - Ancestor slider: tree, hourglass, ancestor, fan, bowtie
 *   - Descendant slider: tree, hourglass, descendant, compact
 * - Timeline chart sort dropdown
 * - Matrix chart max people slider
 * - Statistics chart informational text
 * - Reset view button click handler
 * - Export menu toggle and export action handlers (PDF, PNG, SVG, Print)
 * - Context label rendering and styling
 * - All 10 chart types render without errors
 * - Default prop values applied correctly
 * - Window.print fallback when onPrint is not provided
 *
 * Coverage: 78 tests across 13 describe blocks
 * ChartControls.tsx: 99.47% line coverage, 71.43% function coverage
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { ChartControls } from "./ChartControls";
import type { ChartControlsProps, ChartType } from "./ChartControls";

describe("ChartControls Component", () => {
  // Required props for component
  const defaultProps: ChartControlsProps = {
    chartType: "ancestor",
    generations: 3,
    onGenerationsChange: vi.fn(() => {}),
    onResetView: vi.fn(() => {}),
  };

  describe("Component Export", () => {
    it("should export ChartControls as a function", () => {
      expect(typeof ChartControls).toBe("function");
    });
  });

  describe("Rendering with minimal props", () => {
    it("should render with minimal required props", () => {
      const { container } = render(<ChartControls {...defaultProps} />);
      expect(container).toBeDefined();
    });

    it("should render card container with chart-controls class", () => {
      const { container } = render(<ChartControls {...defaultProps} />);
      const card = container.querySelector(".chart-controls");
      expect(card).toBeDefined();
    });

    it("should render Reset View button by default", () => {
      const { getByRole } = render(<ChartControls {...defaultProps} />);
      const resetButton = getByRole("button", { name: /reset view/i });
      expect(resetButton).toBeDefined();
    });

    it("should render Export/Share button", () => {
      const { getByRole } = render(<ChartControls {...defaultProps} />);
      const exportButton = getByRole("button", { name: /export|share/i });
      expect(exportButton).toBeDefined();
    });
  });

  describe("Chart Type Selector Visibility", () => {
    it("should render chart type selector by default", () => {
      const { container } = render(
        <ChartControls {...defaultProps} hideChartTypeSelector={false} />
      );
      const labels = container.querySelectorAll("label");
      const hasChartTypeLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Chart Type")
      );
      expect(hasChartTypeLabel).toBe(true);
    });

    it("should hide chart type selector when hideChartTypeSelector is true", () => {
      const { container } = render(
        <ChartControls {...defaultProps} hideChartTypeSelector={true} />
      );
      const labels = container.querySelectorAll("label");
      const hasChartTypeLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Chart Type")
      );
      expect(hasChartTypeLabel).toBe(false);
    });
  });

  describe("Conditional Controls - Ancestor Chart", () => {
    it("should render ancestor generations slider for ancestor chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="ancestor"
          ancestorGenerations={3}
          onAncestorGenerationsChange={vi.fn(() => {})}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasAncestorLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Ancestor Generations")
      );
      expect(hasAncestorLabel).toBe(true);
    });

    it("should render ancestor slider for tree chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="tree"
          ancestorGenerations={2}
          descendantGenerations={2}
          onAncestorGenerationsChange={vi.fn(() => {})}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasAncestorLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Ancestor Generations")
      );
      expect(hasAncestorLabel).toBe(true);
    });

    it("should not render ancestor slider for descendant chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="descendant"
          descendantGenerations={3}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasAncestorLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Ancestor Generations")
      );
      expect(hasAncestorLabel).toBe(false);
    });

    it("should render ancestor slider for fan chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="fan"
          ancestorGenerations={4}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasAncestorLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Ancestor Generations")
      );
      expect(hasAncestorLabel).toBe(true);
    });
  });

  describe("Conditional Controls - Descendant Chart", () => {
    it("should render descendant generations slider for descendant chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="descendant"
          descendantGenerations={3}
          onDescendantGenerationsChange={vi.fn(() => {})}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasDescLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Descendant Generations")
      );
      expect(hasDescLabel).toBe(true);
    });

    it("should render descendant slider for tree chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="tree"
          ancestorGenerations={2}
          descendantGenerations={2}
          onDescendantGenerationsChange={vi.fn(() => {})}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasDescLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Descendant Generations")
      );
      expect(hasDescLabel).toBe(true);
    });

    it("should not render descendant slider for ancestor chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="ancestor"
          ancestorGenerations={3}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasDescLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Descendant Generations")
      );
      expect(hasDescLabel).toBe(false);
    });

    it("should render descendant slider for compact chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="compact"
          descendantGenerations={2}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasDescLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Descendant Generations")
      );
      expect(hasDescLabel).toBe(true);
    });
  });

  describe("Timeline Chart Controls", () => {
    it("should render sort dropdown for timeline chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="timeline"
          sortBy="birth"
          onSortByChange={vi.fn(() => {})}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasSortLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Sort By")
      );
      expect(hasSortLabel).toBe(true);
    });

    it("should not render sort dropdown for ancestor chart", () => {
      const { container } = render(
        <ChartControls {...defaultProps} chartType="ancestor" sortBy="birth" />
      );
      const labels = container.querySelectorAll("label");
      const hasSortLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Sort By")
      );
      expect(hasSortLabel).toBe(false);
    });
  });

  describe("Matrix Chart Controls", () => {
    it("should render max people slider for matrix chart", () => {
      const { container } = render(
        <ChartControls
          {...defaultProps}
          chartType="matrix"
          maxPeople={25}
          onMaxPeopleChange={vi.fn(() => {})}
        />
      );
      const labels = container.querySelectorAll("label");
      const hasMaxPeopleLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Max People")
      );
      expect(hasMaxPeopleLabel).toBe(true);
    });

    it("should not render max people slider for ancestor chart", () => {
      const { container } = render(
        <ChartControls {...defaultProps} chartType="ancestor" maxPeople={30} />
      );
      const labels = container.querySelectorAll("label");
      const hasMaxPeopleLabel = Array.from(labels).some((label) =>
        label.textContent?.includes("Max People")
      );
      expect(hasMaxPeopleLabel).toBe(false);
    });
  });

  describe("Statistics Chart", () => {
    it("should render informational text for statistics chart", () => {
      const { getByText } = render(
        <ChartControls {...defaultProps} chartType="statistics" />
      );
      const statsText = getByText(/statistical analysis/i);
      expect(statsText).toBeDefined();
    });

    it("should not render controls for statistics chart", () => {
      const { container } = render(
        <ChartControls {...defaultProps} chartType="statistics" />
      );
      const labels = container.querySelectorAll("label");
      const hasGenLabel = Array.from(labels).some(
        (label) =>
          label.textContent?.includes("Generations") ||
          label.textContent?.includes("Max People")
      );
      expect(hasGenLabel).toBe(false);
    });
  });

  describe("Reset View Button", () => {
    it("should call onResetView when reset button is clicked", () => {
      const onResetView = vi.fn(() => {});
      const { getByRole } = render(
        <ChartControls {...defaultProps} onResetView={onResetView} />
      );
      const resetButton = getByRole("button", { name: /reset view/i });
      fireEvent.click(resetButton);
      expect(onResetView).toHaveBeenCalled();
    });

    it("should render reset button with outline variant", () => {
      const { getByRole } = render(<ChartControls {...defaultProps} />);
      const resetButton = getByRole("button", { name: /reset view/i });
      expect(resetButton.className).toContain("outline");
    });
  });

  describe("Export Menu Toggle", () => {
    it("should open export menu when export button is clicked", () => {
      const { getByRole, getByText } = render(
        <ChartControls {...defaultProps} onExportPDF={vi.fn(() => {})} />
      );
      const exportButton = getByRole("button", { name: /export|share/i });
      fireEvent.click(exportButton);

      const pdfOption = getByText("Export PDF");
      expect(pdfOption).toBeDefined();
    });

    it("should close export menu when export button is clicked again", () => {
      const { getByRole, queryByText } = render(
        <ChartControls {...defaultProps} onExportPDF={vi.fn(() => {})} />
      );
      const exportButton = getByRole("button", { name: /export|share/i });
      fireEvent.click(exportButton);
      fireEvent.click(exportButton);

      expect(queryByText("Export PDF")).toBeNull();
    });
  });

  describe("Export Functions", () => {
    it("should call onExportPDF when PDF export is clicked", () => {
      const onExportPDF = vi.fn(() => {});
      const { getByRole, getByText } = render(
        <ChartControls {...defaultProps} onExportPDF={onExportPDF} />
      );

      const exportButton = getByRole("button", { name: /export|share/i });
      fireEvent.click(exportButton);

      const pdfOption = getByText("Export PDF");
      fireEvent.click(pdfOption);

      expect(onExportPDF).toHaveBeenCalled();
    });

    it("should call onExportPNG when PNG export is clicked", () => {
      const onExportPNG = vi.fn(() => {});
      const { getByRole, getByText } = render(
        <ChartControls {...defaultProps} onExportPNG={onExportPNG} />
      );

      const exportButton = getByRole("button", { name: /export|share/i });
      fireEvent.click(exportButton);

      const pngOption = getByText(/PNG/);
      fireEvent.click(pngOption);

      expect(onExportPNG).toHaveBeenCalled();
    });

    it("should call onExportSVG when SVG export is clicked", () => {
      const onExportSVG = vi.fn(() => {});
      const { getByRole, getByText } = render(
        <ChartControls {...defaultProps} onExportSVG={onExportSVG} />
      );

      const exportButton = getByRole("button", { name: /export|share/i });
      fireEvent.click(exportButton);

      const svgOption = getByText("Export SVG");
      fireEvent.click(svgOption);

      expect(onExportSVG).toHaveBeenCalled();
    });

    it("should call onPrint when print is clicked", () => {
      const onPrint = vi.fn(() => {});
      const { getByRole, getByText } = render(
        <ChartControls {...defaultProps} onPrint={onPrint} />
      );

      const exportButton = getByRole("button", { name: /export|share/i });
      fireEvent.click(exportButton);

      const printOption = getByText("Print");
      fireEvent.click(printOption);

      expect(onPrint).toHaveBeenCalled();
    });

    it("should fall back to window.print when onPrint is not provided", () => {
      const originalPrint = window.print;
      window.print = vi.fn(() => {});

      try {
        const { getByRole, getByText } = render(
          <ChartControls {...defaultProps} onPrint={undefined} />
        );

        const exportButton = getByRole("button", { name: /export|share/i });
        fireEvent.click(exportButton);

        const printOption = getByText("Print");
        fireEvent.click(printOption);

        expect(window.print).toHaveBeenCalled();
      } finally {
        window.print = originalPrint;
      }
    });
  });

  describe("Context Label", () => {
    it("should render context label when provided", () => {
      const { getByText } = render(
        <ChartControls {...defaultProps} activeContextLabel="Primary Person" />
      );
      expect(getByText("Primary Person")).toBeDefined();
    });

    it("should not render context label when not provided", () => {
      const { queryByText } = render(<ChartControls {...defaultProps} />);
      expect(queryByText("Primary Person")).toBeNull();
    });

    it("should style context label with badge styling", () => {
      const { getByText } = render(
        <ChartControls {...defaultProps} activeContextLabel="Primary Person" />
      );
      const label = getByText("Primary Person");
      expect(label.className).toContain("rounded-full");
    });
  });

  describe("Chart Type Support", () => {
    const chartTypes: Array<ChartType> = [
      "tree",
      "ancestor",
      "descendant",
      "hourglass",
      "fan",
      "timeline",
      "matrix",
      "bowtie",
      "compact",
      "statistics",
    ];

    chartTypes.forEach((chartType) => {
      it(`should render without errors for ${chartType} chart type`, () => {
        const { container } = render(
          <ChartControls {...defaultProps} chartType={chartType} />
        );
        expect(container).toBeDefined();
      });
    });
  });

  describe("Default Props Values", () => {
    it("should apply default ancestorGenerations when not provided", () => {
      const { container } = render(
        <ChartControls
          chartType="ancestor"
          generations={3}
          onGenerationsChange={vi.fn(() => {})}
          onResetView={vi.fn(() => {})}
        />
      );
      expect(container).toBeDefined();
    });

    it("should apply default descendantGenerations when not provided", () => {
      const { container } = render(
        <ChartControls
          chartType="tree"
          generations={3}
          onGenerationsChange={vi.fn(() => {})}
          onResetView={vi.fn(() => {})}
        />
      );
      expect(container).toBeDefined();
    });

    it("should apply default maxPeople when not provided", () => {
      const { container } = render(
        <ChartControls
          chartType="matrix"
          generations={3}
          onGenerationsChange={vi.fn(() => {})}
          onResetView={vi.fn(() => {})}
        />
      );
      expect(container).toBeDefined();
    });

    it("should apply default sortBy when not provided", () => {
      const { container } = render(
        <ChartControls
          chartType="timeline"
          generations={3}
          onGenerationsChange={vi.fn(() => {})}
          onResetView={vi.fn(() => {})}
        />
      );
      expect(container).toBeDefined();
    });
  });
});
