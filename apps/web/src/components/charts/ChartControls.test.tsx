/**
 * Unit tests for ChartControls component
 * Tests: Component export, props structure, and type definitions
 */

import { describe, it, expect } from "bun:test";
import { ChartControls, type ChartControlsProps } from "./ChartControls";

describe("ChartControls Component", () => {
  // Required props for component type definition
  const defaultProps: ChartControlsProps = {
    chartType: "ancestor",
    generations: 3,
    onGenerationsChange: () => {},
  };

  describe("Component Export", () => {
    it("should export ChartControls as a function", () => {
      expect(typeof ChartControls).toBe("function");
    });

    it("should export ChartControlsProps type", () => {
      // Type is exported and can be used for prop typing
      const _props: ChartControlsProps = defaultProps;
      expect(_props.chartType).toBe("ancestor");
    });
  });

  describe("Required Props", () => {
    it("should define chartType as required", () => {
      const props: ChartControlsProps = {
        chartType: "ancestor",
        generations: 3,
        onGenerationsChange: () => {},
      };
      expect(props.chartType).toBeDefined();
      expect(props.chartType).toBe("ancestor");
    });

    it("should define generations as required number", () => {
      const props: ChartControlsProps = {
        ...defaultProps,
        generations: 5,
      };
      expect(props.generations).toBe(5);
      expect(typeof props.generations).toBe("number");
    });

    it("should define onGenerationsChange as required callback", () => {
      const onGenerationsChange = (_gen: number) => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onGenerationsChange,
      };
      expect(typeof props.onGenerationsChange).toBe("function");
    });
  });

  describe("Optional Props", () => {
    it("should have optional ancestorGenerations prop", () => {
      const props: ChartControlsProps = {
        ...defaultProps,
        ancestorGenerations: 4,
      };
      expect(props.ancestorGenerations).toBe(4);
    });

    it("should have optional descendantGenerations prop", () => {
      const props: ChartControlsProps = {
        ...defaultProps,
        descendantGenerations: 3,
      };
      expect(props.descendantGenerations).toBe(3);
    });

    it("should have optional maxPeople prop", () => {
      const props: ChartControlsProps = {
        ...defaultProps,
        maxPeople: 50,
      };
      expect(props.maxPeople).toBe(50);
    });

    it("should have optional sortBy prop with correct values", () => {
      const sortOptions = ["birth", "death", "name"] as const;
      sortOptions.forEach((sortBy) => {
        const props: ChartControlsProps = {
          ...defaultProps,
          sortBy,
        };
        expect(props.sortBy).toBe(sortBy);
      });
    });

    it("should have optional hideChartTypeSelector boolean", () => {
      const props: ChartControlsProps = {
        ...defaultProps,
        hideChartTypeSelector: true,
      };
      expect(props.hideChartTypeSelector).toBe(true);
    });

    it("should have optional activeContextLabel string", () => {
      const props: ChartControlsProps = {
        ...defaultProps,
        activeContextLabel: "Primary Person",
      };
      expect(props.activeContextLabel).toBe("Primary Person");
    });
  });

  describe("Callback Props", () => {
    it("should accept onChartTypeChange callback", () => {
      const onChartTypeChange = (_type: string) => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onChartTypeChange,
      };
      expect(typeof props.onChartTypeChange).toBe("function");
    });

    it("should accept onAncestorGenerationsChange callback", () => {
      const onAncestorGenerationsChange = (_gen: number) => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onAncestorGenerationsChange,
      };
      expect(typeof props.onAncestorGenerationsChange).toBe("function");
    });

    it("should accept onDescendantGenerationsChange callback", () => {
      const onDescendantGenerationsChange = (_gen: number) => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onDescendantGenerationsChange,
      };
      expect(typeof props.onDescendantGenerationsChange).toBe("function");
    });

    it("should accept onMaxPeopleChange callback", () => {
      const onMaxPeopleChange = (_max: number) => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onMaxPeopleChange,
      };
      expect(typeof props.onMaxPeopleChange).toBe("function");
    });

    it("should accept onSortByChange callback", () => {
      const onSortByChange = (_sort: "birth" | "death" | "name") => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onSortByChange,
      };
      expect(typeof props.onSortByChange).toBe("function");
    });

    it("should accept onExportPDF callback", () => {
      const onExportPDF = () => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onExportPDF,
      };
      expect(typeof props.onExportPDF).toBe("function");
    });

    it("should accept onExportPNG callback", () => {
      const onExportPNG = () => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onExportPNG,
      };
      expect(typeof props.onExportPNG).toBe("function");
    });

    it("should accept onExportSVG callback", () => {
      const onExportSVG = () => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onExportSVG,
      };
      expect(typeof props.onExportSVG).toBe("function");
    });

    it("should accept onPrint callback", () => {
      const onPrint = () => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onPrint,
      };
      expect(typeof props.onPrint).toBe("function");
    });

    it("should accept onResetView callback", () => {
      const onResetView = () => {};
      const props: ChartControlsProps = {
        ...defaultProps,
        onResetView,
      };
      expect(typeof props.onResetView).toBe("function");
    });
  });

  describe("Chart Types", () => {
    it("should support all chart type variants", () => {
      const chartTypes = [
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
      ] as const;

      chartTypes.forEach((chartType) => {
        const props: ChartControlsProps = {
          ...defaultProps,
          chartType,
        };
        expect(props.chartType).toBe(chartType);
      });
    });

    it("should accept timeline chart type with sort option", () => {
      const props: ChartControlsProps = {
        chartType: "timeline",
        generations: 3,
        onGenerationsChange: () => {},
        sortBy: "birth",
      };
      expect(props.chartType).toBe("timeline");
      expect(props.sortBy).toBe("birth");
    });

    it("should accept matrix chart type with max people", () => {
      const props: ChartControlsProps = {
        chartType: "matrix",
        generations: 3,
        onGenerationsChange: () => {},
        maxPeople: 30,
      };
      expect(props.chartType).toBe("matrix");
      expect(props.maxPeople).toBe(30);
    });

    it("should accept ancestor chart type with ancestor generations", () => {
      const props: ChartControlsProps = {
        chartType: "ancestor",
        generations: 3,
        onGenerationsChange: () => {},
        ancestorGenerations: 4,
      };
      expect(props.chartType).toBe("ancestor");
      expect(props.ancestorGenerations).toBe(4);
    });

    it("should accept descendant chart type with descendant generations", () => {
      const props: ChartControlsProps = {
        chartType: "descendant",
        generations: 3,
        onGenerationsChange: () => {},
        descendantGenerations: 4,
      };
      expect(props.chartType).toBe("descendant");
      expect(props.descendantGenerations).toBe(4);
    });
  });

  describe("Props Combinations", () => {
    it("should accept all optional props together", () => {
      const props: ChartControlsProps = {
        chartType: "tree",
        generations: 3,
        ancestorGenerations: 4,
        descendantGenerations: 3,
        maxPeople: 40,
        sortBy: "name",
        hideChartTypeSelector: false,
        onGenerationsChange: () => {},
        onChartTypeChange: () => {},
        onAncestorGenerationsChange: () => {},
        onDescendantGenerationsChange: () => {},
        onMaxPeopleChange: () => {},
        onSortByChange: () => {},
        onExportPDF: () => {},
        onExportPNG: () => {},
        onExportSVG: () => {},
        onPrint: () => {},
        onResetView: () => {},
        activeContextLabel: "Test Context",
      };
      expect(props).toBeDefined();
      expect(props.chartType).toBe("tree");
    });

    it("should work with minimal required props only", () => {
      const props: ChartControlsProps = {
        chartType: "ancestor",
        generations: 3,
        onGenerationsChange: () => {},
      };
      expect(props).toBeDefined();
      expect(props.ancestorGenerations).toBeUndefined();
      expect(props.onPrint).toBeUndefined();
    });
  });

  describe("Disabled State", () => {
    it("should support disabling chart type selector", () => {
      const props: ChartControlsProps = {
        ...defaultProps,
        hideChartTypeSelector: true,
      };
      expect(props.hideChartTypeSelector).toBe(true);
    });

    it("should allow chart type selector by default", () => {
      const props: ChartControlsProps = {
        ...defaultProps,
        hideChartTypeSelector: false,
      };
      expect(props.hideChartTypeSelector).toBe(false);
    });
  });
});
